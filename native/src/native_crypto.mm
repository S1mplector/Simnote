// native_crypto.mm
// Crypto helpers for the Simnote native addon.

#include "simnote_native.h"
#include <vector>
#import <Foundation/Foundation.h>
#import <CommonCrypto/CommonCrypto.h>
#import <Security/Security.h>

namespace simnote_native {

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

Napi::Value EncryptAes256Gcm(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 3 || !info[0].IsBuffer() || !info[1].IsBuffer() || !info[2].IsBuffer()) {
    throw Napi::TypeError::New(env, "encryptAes256Gcm(data, key, iv[, aad]) expects buffers");
  }

  auto data = info[0].As<Napi::Buffer<uint8_t>>();
  auto key = info[1].As<Napi::Buffer<uint8_t>>();
  auto iv = info[2].As<Napi::Buffer<uint8_t>>();
  const bool hasAad = info.Length() >= 4 && info[3].IsBuffer();
  const uint8_t *aadData = nullptr;
  size_t aadLength = 0;
  if (hasAad) {
    auto aad = info[3].As<Napi::Buffer<uint8_t>>();
    if (aad.Length() > 0) {
      aadData = aad.Data();
      aadLength = aad.Length();
    }
  }

  if (key.Length() != kCCKeySizeAES256 || iv.Length() != kCCBlockSizeAES128) {
    throw Napi::Error::New(env, "encryptAes256Gcm expects 32-byte key and 16-byte IV");
  }

  CCCryptorRef cryptor = nullptr;
  CCCryptorStatus status = CCCryptorCreateWithMode(
    kCCEncrypt,
    kCCModeGCM,
    kCCAlgorithmAES,
    ccNoPadding,
    nullptr,
    key.Data(),
    key.Length(),
    nullptr,
    0,
    0,
    0,
    &cryptor
  );
  if (status != kCCSuccess) {
    throw Napi::Error::New(env, "encryptAes256Gcm failed to create cryptor");
  }

  status = CCCryptorGCMAddIV(cryptor, iv.Data(), iv.Length());
  if (status == kCCSuccess && aadData && aadLength > 0) {
    status = CCCryptorGCMAddAAD(cryptor, aadData, aadLength);
  }

  std::vector<uint8_t> out(data.Length());
  if (status == kCCSuccess) {
    status = CCCryptorGCMEncrypt(cryptor, data.Data(), data.Length(), out.data());
  }

  uint8_t tag[kCCBlockSizeAES128];
  if (status == kCCSuccess) {
    status = CCCryptorGCMFinalize(cryptor, tag, sizeof(tag));
  }

  if (cryptor) {
    CCCryptorRelease(cryptor);
  }

  if (status != kCCSuccess) {
    throw Napi::Error::New(env, "encryptAes256Gcm failed");
  }

  Napi::Object result = Napi::Object::New(env);
  result.Set("ciphertext", Napi::Buffer<uint8_t>::Copy(env, out.data(), out.size()));
  result.Set("authTag", Napi::Buffer<uint8_t>::Copy(env, tag, sizeof(tag)));
  return result;
}

Napi::Value DecryptAes256Gcm(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 4 || !info[0].IsBuffer() || !info[1].IsBuffer() || !info[2].IsBuffer() || !info[3].IsBuffer()) {
    throw Napi::TypeError::New(env, "decryptAes256Gcm(data, key, iv, authTag[, aad]) expects buffers");
  }

  auto data = info[0].As<Napi::Buffer<uint8_t>>();
  auto key = info[1].As<Napi::Buffer<uint8_t>>();
  auto iv = info[2].As<Napi::Buffer<uint8_t>>();
  auto authTag = info[3].As<Napi::Buffer<uint8_t>>();
  const bool hasAad = info.Length() >= 5 && info[4].IsBuffer();
  const uint8_t *aadData = nullptr;
  size_t aadLength = 0;
  if (hasAad) {
    auto aad = info[4].As<Napi::Buffer<uint8_t>>();
    if (aad.Length() > 0) {
      aadData = aad.Data();
      aadLength = aad.Length();
    }
  }

  if (key.Length() != kCCKeySizeAES256 || iv.Length() != kCCBlockSizeAES128) {
    throw Napi::Error::New(env, "decryptAes256Gcm expects 32-byte key and 16-byte IV");
  }
  if (authTag.Length() != kCCBlockSizeAES128) {
    throw Napi::Error::New(env, "decryptAes256Gcm expects 16-byte auth tag");
  }

  CCCryptorRef cryptor = nullptr;
  CCCryptorStatus status = CCCryptorCreateWithMode(
    kCCDecrypt,
    kCCModeGCM,
    kCCAlgorithmAES,
    ccNoPadding,
    nullptr,
    key.Data(),
    key.Length(),
    nullptr,
    0,
    0,
    0,
    &cryptor
  );
  if (status != kCCSuccess) {
    throw Napi::Error::New(env, "decryptAes256Gcm failed to create cryptor");
  }

  status = CCCryptorGCMAddIV(cryptor, iv.Data(), iv.Length());
  if (status == kCCSuccess && aadData && aadLength > 0) {
    status = CCCryptorGCMAddAAD(cryptor, aadData, aadLength);
  }

  std::vector<uint8_t> out(data.Length());
  if (status == kCCSuccess) {
    status = CCCryptorGCMDecrypt(cryptor, data.Data(), data.Length(), out.data());
  }

  if (status == kCCSuccess) {
    status = CCCryptorGCMFinalize(cryptor, authTag.Data(), authTag.Length());
  }

  if (cryptor) {
    CCCryptorRelease(cryptor);
  }

  if (status != kCCSuccess) {
    throw Napi::Error::New(env, "decryptAes256Gcm failed");
  }

  return Napi::Buffer<uint8_t>::Copy(env, out.data(), out.size());
}

Napi::Value Pbkdf2Sha256(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 4 || !info[0].IsBuffer() || !info[1].IsBuffer() || !info[2].IsNumber() || !info[3].IsNumber()) {
    throw Napi::TypeError::New(env, "pbkdf2Sha256(password, salt, iterations, keyLength) expects buffers and numbers");
  }

  auto password = info[0].As<Napi::Buffer<uint8_t>>();
  auto salt = info[1].As<Napi::Buffer<uint8_t>>();
  uint32_t iterations = info[2].As<Napi::Number>().Uint32Value();
  uint32_t keyLength = info[3].As<Napi::Number>().Uint32Value();

  if (iterations == 0 || keyLength == 0) {
    throw Napi::Error::New(env, "pbkdf2Sha256 iterations and keyLength must be > 0");
  }

  std::vector<uint8_t> output(keyLength);
  int status = CCKeyDerivationPBKDF(
    kCCPBKDF2,
    reinterpret_cast<const char *>(password.Data()),
    password.Length(),
    salt.Data(),
    salt.Length(),
    kCCPRFHmacAlgSHA256,
    iterations,
    output.data(),
    output.size()
  );

  if (status != kCCSuccess) {
    throw Napi::Error::New(env, "pbkdf2Sha256 failed");
  }

  return Napi::Buffer<uint8_t>::Copy(env, output.data(), output.size());
}

Napi::Value Sha256(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsBuffer()) {
    throw Napi::TypeError::New(env, "sha256(data) expects a buffer");
  }

  auto data = info[0].As<Napi::Buffer<uint8_t>>();
  unsigned char hash[CC_SHA256_DIGEST_LENGTH];
  CC_SHA256(data.Data(), (CC_LONG)data.Length(), hash);
  return Napi::Buffer<uint8_t>::Copy(env, hash, CC_SHA256_DIGEST_LENGTH);
}

Napi::Value HmacSha256(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 2 || !info[0].IsBuffer() || !info[1].IsBuffer()) {
    throw Napi::TypeError::New(env, "hmacSha256(data, key) expects buffers");
  }

  auto data = info[0].As<Napi::Buffer<uint8_t>>();
  auto key = info[1].As<Napi::Buffer<uint8_t>>();
  unsigned char hash[CC_SHA256_DIGEST_LENGTH];

  CCHmac(kCCHmacAlgSHA256, key.Data(), key.Length(), data.Data(), data.Length(), hash);
  return Napi::Buffer<uint8_t>::Copy(env, hash, CC_SHA256_DIGEST_LENGTH);
}

Napi::Value SecureDelete(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsString()) {
    throw Napi::TypeError::New(env, "secureDelete(path[, passes]) expects a string path");
  }

  std::string pathUtf8 = info[0].As<Napi::String>().Utf8Value();
  NSString *path = [NSString stringWithUTF8String:pathUtf8.c_str()];
  int passes = 1;
  if (info.Length() >= 2 && info[1].IsNumber()) {
    passes = info[1].As<Napi::Number>().Int32Value();
    if (passes < 1) passes = 1;
  }

  NSFileManager *fm = [NSFileManager defaultManager];
  BOOL isDir = NO;
  if (![fm fileExistsAtPath:path isDirectory:&isDir] || isDir) {
    throw Napi::Error::New(env, "secureDelete expects a file path");
  }

  NSError *error = nil;
  NSDictionary *attrs = [fm attributesOfItemAtPath:path error:&error];
  if (!attrs || error) {
    throw Napi::Error::New(env, "secureDelete failed to read file attributes");
  }

  unsigned long long size = [attrs[NSFileSize] unsignedLongLongValue];
  NSFileHandle *handle = [NSFileHandle fileHandleForWritingAtPath:path];
  if (!handle) {
    throw Napi::Error::New(env, "secureDelete failed to open file");
  }

  const size_t chunkSize = 1024 * 1024;
  std::vector<uint8_t> buffer(chunkSize);

  for (int pass = 0; pass < passes; pass++) {
    @try {
      [handle seekToFileOffset:0];
    } @catch (NSException *exception) {
      [handle closeFile];
      throw Napi::Error::New(env, "secureDelete failed to seek file");
    }

    unsigned long long written = 0;
    while (written < size) {
      size_t toWrite = (size - written) < chunkSize ? (size_t)(size - written) : chunkSize;
      if (SecRandomCopyBytes(kSecRandomDefault, toWrite, buffer.data()) != errSecSuccess) {
        [handle closeFile];
        throw Napi::Error::New(env, "secureDelete random fill failed");
      }
      NSData *data = [NSData dataWithBytes:buffer.data() length:toWrite];
      [handle writeData:data];
      written += toWrite;
    }
    [handle synchronizeFile];
  }

  [handle closeFile];

  if (![fm removeItemAtPath:path error:&error] || error) {
    throw Napi::Error::New(env, "secureDelete failed to remove file");
  }

  return Napi::Boolean::New(env, true);
}

} // namespace simnote_native
