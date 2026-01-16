// simnote_native.mm
// macOS native addon for Simnote (Objective-C++)

#include <napi.h>
#import <Foundation/Foundation.h>
#import <CommonCrypto/CommonCrypto.h>

namespace {

Napi::Value ReadFile(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsString()) {
    throw Napi::TypeError::New(env, "readFile(path) expects a string path");
  }

  std::string pathUtf8 = info[0].As<Napi::String>().Utf8Value();
  NSString *path = [NSString stringWithUTF8String:pathUtf8.c_str()];
  NSError *error = nil;
  NSData *data = [NSData dataWithContentsOfFile:path options:NSDataReadingMappedIfSafe error:&error];

  if (!data || error) {
    std::string message = "readFile failed";
    if (error) {
      message += ": ";
      message += [[error localizedDescription] UTF8String];
    }
    throw Napi::Error::New(env, message);
  }

  return Napi::Buffer<uint8_t>::Copy(env, reinterpret_cast<const uint8_t *>([data bytes]), [data length]);
}

Napi::Value WriteFile(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 2 || !info[0].IsString() || !info[1].IsBuffer()) {
    throw Napi::TypeError::New(env, "writeFile(path, buffer) expects a string path and buffer");
  }

  std::string pathUtf8 = info[0].As<Napi::String>().Utf8Value();
  NSString *path = [NSString stringWithUTF8String:pathUtf8.c_str()];
  auto buffer = info[1].As<Napi::Buffer<uint8_t>>();
  NSData *data = [NSData dataWithBytes:buffer.Data() length:buffer.Length()];

  NSError *error = nil;
  BOOL ok = [data writeToFile:path options:0 error:&error];
  if (!ok || error) {
    std::string message = "writeFile failed";
    if (error) {
      message += ": ";
      message += [[error localizedDescription] UTF8String];
    }
    throw Napi::Error::New(env, message);
  }

  return Napi::Boolean::New(env, true);
}

Napi::Value WriteFileAtomic(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 2 || !info[0].IsString() || !info[1].IsBuffer()) {
    throw Napi::TypeError::New(env, "writeFileAtomic(path, buffer) expects a string path and buffer");
  }

  std::string pathUtf8 = info[0].As<Napi::String>().Utf8Value();
  NSString *path = [NSString stringWithUTF8String:pathUtf8.c_str()];
  auto buffer = info[1].As<Napi::Buffer<uint8_t>>();
  NSData *data = [NSData dataWithBytes:buffer.Data() length:buffer.Length()];

  NSError *error = nil;
  BOOL ok = [data writeToFile:path options:NSDataWritingAtomic error:&error];
  if (!ok || error) {
    std::string message = "writeFileAtomic failed";
    if (error) {
      message += ": ";
      message += [[error localizedDescription] UTF8String];
    }
    throw Napi::Error::New(env, message);
  }

  return Napi::Boolean::New(env, true);
}

Napi::Value ListDir(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsString()) {
    throw Napi::TypeError::New(env, "listDir(path) expects a string path");
  }

  std::string pathUtf8 = info[0].As<Napi::String>().Utf8Value();
  NSString *path = [NSString stringWithUTF8String:pathUtf8.c_str()];

  NSError *error = nil;
  NSArray<NSString *> *contents = [[NSFileManager defaultManager] contentsOfDirectoryAtPath:path error:&error];
  if (!contents || error) {
    std::string message = "listDir failed";
    if (error) {
      message += ": ";
      message += [[error localizedDescription] UTF8String];
    }
    throw Napi::Error::New(env, message);
  }

  Napi::Array result = Napi::Array::New(env, contents.count);
  NSUInteger index = 0;
  for (NSString *item in contents) {
    result[index++] = Napi::String::New(env, [item UTF8String]);
  }
  return result;
}

Napi::Value IndexText(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsString()) {
    throw Napi::TypeError::New(env, "indexText(text) expects a string");
  }

  std::string textUtf8 = info[0].As<Napi::String>().Utf8Value();
  NSString *text = [NSString stringWithUTF8String:textUtf8.c_str()];
  NSString *lower = [text lowercaseString];
  NSCharacterSet *separators = [[NSCharacterSet alphanumericCharacterSet] invertedSet];
  NSArray<NSString *> *parts = [lower componentsSeparatedByCharactersInSet:separators];
  NSMutableOrderedSet<NSString *> *unique = [NSMutableOrderedSet orderedSet];

  for (NSString *part in parts) {
    if (part.length > 0) {
      [unique addObject:part];
    }
  }

  Napi::Array result = Napi::Array::New(env, unique.count);
  for (NSUInteger i = 0; i < unique.count; i++) {
    result[i] = Napi::String::New(env, [unique[i] UTF8String]);
  }

  return result;
}

Napi::Value EncryptAes256Cbc(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 3 || !info[0].IsBuffer() || !info[1].IsBuffer() || !info[2].IsBuffer()) {
    throw Napi::TypeError::New(env, "encryptAes256Cbc(data, key, iv) expects buffers");
  }

  auto data = info[0].As<Napi::Buffer<uint8_t>>();
  auto key = info[1].As<Napi::Buffer<uint8_t>>();
  auto iv = info[2].As<Napi::Buffer<uint8_t>>();

  if (key.Length() != kCCKeySizeAES256 || iv.Length() != kCCBlockSizeAES128) {
    throw Napi::Error::New(env, "encryptAes256Cbc expects 32-byte key and 16-byte IV");
  }

  size_t outLength = data.Length() + kCCBlockSizeAES128;
  std::vector<uint8_t> out(outLength);
  size_t written = 0;

  CCCryptorStatus status = CCCrypt(
    kCCEncrypt,
    kCCAlgorithmAES,
    kCCOptionPKCS7Padding,
    key.Data(),
    key.Length(),
    iv.Data(),
    data.Data(),
    data.Length(),
    out.data(),
    outLength,
    &written
  );

  if (status != kCCSuccess) {
    throw Napi::Error::New(env, "encryptAes256Cbc failed");
  }

  return Napi::Buffer<uint8_t>::Copy(env, out.data(), written);
}

Napi::Value DecryptAes256Cbc(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 3 || !info[0].IsBuffer() || !info[1].IsBuffer() || !info[2].IsBuffer()) {
    throw Napi::TypeError::New(env, "decryptAes256Cbc(data, key, iv) expects buffers");
  }

  auto data = info[0].As<Napi::Buffer<uint8_t>>();
  auto key = info[1].As<Napi::Buffer<uint8_t>>();
  auto iv = info[2].As<Napi::Buffer<uint8_t>>();

  if (key.Length() != kCCKeySizeAES256 || iv.Length() != kCCBlockSizeAES128) {
    throw Napi::Error::New(env, "decryptAes256Cbc expects 32-byte key and 16-byte IV");
  }

  size_t outLength = data.Length() + kCCBlockSizeAES128;
  std::vector<uint8_t> out(outLength);
  size_t written = 0;

  CCCryptorStatus status = CCCrypt(
    kCCDecrypt,
    kCCAlgorithmAES,
    kCCOptionPKCS7Padding,
    key.Data(),
    key.Length(),
    iv.Data(),
    data.Data(),
    data.Length(),
    out.data(),
    outLength,
    &written
  );

  if (status != kCCSuccess) {
    throw Napi::Error::New(env, "decryptAes256Cbc failed");
  }

  return Napi::Buffer<uint8_t>::Copy(env, out.data(), written);
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("readFile", Napi::Function::New(env, ReadFile));
  exports.Set("writeFile", Napi::Function::New(env, WriteFile));
  exports.Set("writeFileAtomic", Napi::Function::New(env, WriteFileAtomic));
  exports.Set("listDir", Napi::Function::New(env, ListDir));
  exports.Set("indexText", Napi::Function::New(env, IndexText));
  exports.Set("encryptAes256Cbc", Napi::Function::New(env, EncryptAes256Cbc));
  exports.Set("decryptAes256Cbc", Napi::Function::New(env, DecryptAes256Cbc));
  return exports;
}

} // namespace

NODE_API_MODULE(simnote_native, Init)
