// native_file_io.mm
// File IO helpers for the Simnote native addon.

#include "simnote_native.h"
#import <Foundation/Foundation.h>

namespace simnote_native {

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

} // namespace simnote_native
