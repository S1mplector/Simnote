// native_export.mm
// Export/import helpers for the Simnote native addon.

#include "simnote_native.h"
#include <cstring>
#include <vector>
#import <Foundation/Foundation.h>
#import <CommonCrypto/CommonCrypto.h>

namespace simnote_native {

static Napi::Value FoundationToNapi(Napi::Env env, id value) {
  if (!value || value == [NSNull null]) {
    return env.Null();
  }

  if ([value isKindOfClass:[NSString class]]) {
    return Napi::String::New(env, [(NSString *)value UTF8String]);
  }

  if ([value isKindOfClass:[NSNumber class]]) {
    NSNumber *number = (NSNumber *)value;
    const char *objCType = [number objCType];
    if (std::strcmp(objCType, @encode(BOOL)) == 0) {
      return Napi::Boolean::New(env, number.boolValue);
    }
    return Napi::Number::New(env, number.doubleValue);
  }

  if ([value isKindOfClass:[NSArray class]]) {
    NSArray *array = (NSArray *)value;
    Napi::Array result = Napi::Array::New(env, array.count);
    for (NSUInteger i = 0; i < array.count; i++) {
      result[i] = FoundationToNapi(env, array[i]);
    }
    return result;
  }

  if ([value isKindOfClass:[NSDictionary class]]) {
    NSDictionary *dict = (NSDictionary *)value;
    Napi::Object result = Napi::Object::New(env);
    for (id key in dict) {
      if (![key isKindOfClass:[NSString class]]) {
        continue;
      }
      result.Set([(NSString *)key UTF8String], FoundationToNapi(env, dict[key]));
    }
    return result;
  }

  return env.Null();
}

static id NapiToFoundation(const Napi::Value& value) {
  if (value.IsNull() || value.IsUndefined()) {
    return [NSNull null];
  }

  if (value.IsString()) {
    std::string str = value.As<Napi::String>().Utf8Value();
    return [NSString stringWithUTF8String:str.c_str()];
  }

  if (value.IsBoolean()) {
    return [NSNumber numberWithBool:value.As<Napi::Boolean>().Value()];
  }

  if (value.IsNumber()) {
    return [NSNumber numberWithDouble:value.As<Napi::Number>().DoubleValue()];
  }

  if (value.IsArray()) {
    Napi::Array array = value.As<Napi::Array>();
    NSMutableArray *result = [NSMutableArray arrayWithCapacity:array.Length()];
    for (uint32_t i = 0; i < array.Length(); i++) {
      [result addObject:NapiToFoundation(array.Get(i))];
    }
    return result;
  }

  if (value.IsObject()) {
    Napi::Object obj = value.As<Napi::Object>();
    Napi::Array keys = obj.GetPropertyNames();
    NSMutableDictionary *result = [NSMutableDictionary dictionaryWithCapacity:keys.Length()];
    for (uint32_t i = 0; i < keys.Length(); i++) {
      Napi::Value key = keys.Get(i);
      if (!key.IsString()) continue;
      std::string keyStr = key.As<Napi::String>().Utf8Value();
      NSString *nsKey = [NSString stringWithUTF8String:keyStr.c_str()];
      result[nsKey] = NapiToFoundation(obj.Get(key));
    }
    return result;
  }

  return [NSNull null];
}

Napi::Value ZipDirectory(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 2 || !info[0].IsString() || !info[1].IsString()) {
    throw Napi::TypeError::New(env, "zipDirectory(sourceDir, zipPath[, level]) expects string paths");
  }

  std::string sourceUtf8 = info[0].As<Napi::String>().Utf8Value();
  std::string zipUtf8 = info[1].As<Napi::String>().Utf8Value();
  NSString *sourcePath = [NSString stringWithUTF8String:sourceUtf8.c_str()];
  NSString *zipPath = [NSString stringWithUTF8String:zipUtf8.c_str()];
  NSFileManager *fm = [NSFileManager defaultManager];

  BOOL isDir = NO;
  if (![fm fileExistsAtPath:sourcePath isDirectory:&isDir] || !isDir) {
    throw Napi::Error::New(env, "zipDirectory source must be an existing directory");
  }

  NSString *zipParent = [zipPath stringByDeletingLastPathComponent];
  if (zipParent.length > 0 && ![fm fileExistsAtPath:zipParent]) {
    [fm createDirectoryAtPath:zipParent withIntermediateDirectories:YES attributes:nil error:nil];
  }

  int level = -1;
  if (info.Length() >= 3 && info[2].IsNumber()) {
    level = info[2].As<Napi::Number>().Int32Value();
    if (level < 0) level = 0;
    if (level > 9) level = 9;
  }

  NSString *parent = [sourcePath stringByDeletingLastPathComponent];
  NSString *dirName = [sourcePath lastPathComponent];

  NSTask *task = [[NSTask alloc] init];
  task.launchPath = @"/usr/bin/zip";
  task.currentDirectoryPath = parent;
  NSMutableArray<NSString *> *args = [NSMutableArray arrayWithObjects:@"-r", @"-q", nil];
  if (level >= 0) {
    [args addObject:[NSString stringWithFormat:@"-%d", level]];
  }
  [args addObject:zipPath];
  [args addObject:dirName];
  task.arguments = args;

  @try {
    [task launch];
    [task waitUntilExit];
  } @catch (NSException *exception) {
    throw Napi::Error::New(env, "zipDirectory failed to launch zip");
  }

  if (task.terminationStatus != 0) {
    throw Napi::Error::New(env, "zipDirectory failed");
  }

  return Napi::Boolean::New(env, true);
}

Napi::Value UnzipArchive(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 2 || !info[0].IsString() || !info[1].IsString()) {
    throw Napi::TypeError::New(env, "unzipArchive(zipPath, destination) expects string paths");
  }

  std::string zipUtf8 = info[0].As<Napi::String>().Utf8Value();
  std::string destUtf8 = info[1].As<Napi::String>().Utf8Value();
  NSString *zipPath = [NSString stringWithUTF8String:zipUtf8.c_str()];
  NSString *destPath = [NSString stringWithUTF8String:destUtf8.c_str()];
  NSFileManager *fm = [NSFileManager defaultManager];

  if (![fm fileExistsAtPath:zipPath]) {
    throw Napi::Error::New(env, "unzipArchive zip file not found");
  }

  if (![fm fileExistsAtPath:destPath]) {
    [fm createDirectoryAtPath:destPath withIntermediateDirectories:YES attributes:nil error:nil];
  }

  NSTask *task = [[NSTask alloc] init];
  task.launchPath = @"/usr/bin/unzip";
  task.arguments = @[ @"-q", zipPath, @"-d", destPath ];

  @try {
    [task launch];
    [task waitUntilExit];
  } @catch (NSException *exception) {
    throw Napi::Error::New(env, "unzipArchive failed to launch unzip");
  }

  if (task.terminationStatus != 0) {
    throw Napi::Error::New(env, "unzipArchive failed");
  }

  return Napi::Boolean::New(env, true);
}

Napi::Value ReadJsonStream(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsString()) {
    throw Napi::TypeError::New(env, "readJsonStream(path) expects a string path");
  }

  std::string pathUtf8 = info[0].As<Napi::String>().Utf8Value();
  NSString *path = [NSString stringWithUTF8String:pathUtf8.c_str()];

  NSInputStream *stream = [NSInputStream inputStreamWithFileAtPath:path];
  if (!stream) {
    throw Napi::Error::New(env, "readJsonStream failed to open stream");
  }

  [stream open];
  NSError *error = nil;
  id json = [NSJSONSerialization JSONObjectWithStream:stream options:0 error:&error];
  [stream close];

  if (!json || error) {
    std::string message = "readJsonStream failed";
    if (error) {
      message += ": ";
      message += [[error localizedDescription] UTF8String];
    }
    throw Napi::Error::New(env, message);
  }

  return FoundationToNapi(env, json);
}

Napi::Value WriteJsonStream(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 2 || !info[0].IsString()) {
    throw Napi::TypeError::New(env, "writeJsonStream(path, value) expects a string path and JSON value");
  }

  std::string pathUtf8 = info[0].As<Napi::String>().Utf8Value();
  NSString *path = [NSString stringWithUTF8String:pathUtf8.c_str()];

  id jsonObject = nil;
  if (info[1].IsString()) {
    std::string jsonUtf8 = info[1].As<Napi::String>().Utf8Value();
    NSData *data = [NSData dataWithBytes:jsonUtf8.data() length:jsonUtf8.size()];
    NSError *parseError = nil;
    jsonObject = [NSJSONSerialization JSONObjectWithData:data options:0 error:&parseError];
    if (!jsonObject || parseError) {
      throw Napi::Error::New(env, "writeJsonStream received invalid JSON string");
    }
  } else {
    jsonObject = NapiToFoundation(info[1]);
  }

  NSOutputStream *stream = [NSOutputStream outputStreamToFileAtPath:path append:NO];
  if (!stream) {
    throw Napi::Error::New(env, "writeJsonStream failed to open stream");
  }

  [stream open];
  NSError *error = nil;
  NSInteger written = [NSJSONSerialization writeJSONObject:jsonObject toStream:stream options:0 error:&error];
  [stream close];

  if (written <= 0 || error) {
    std::string message = "writeJsonStream failed";
    if (error) {
      message += ": ";
      message += [[error localizedDescription] UTF8String];
    }
    throw Napi::Error::New(env, message);
  }

  return Napi::Number::New(env, written);
}

Napi::Value ValidateFileSize(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 2 || !info[0].IsString() || !info[1].IsNumber()) {
    throw Napi::TypeError::New(env, "validateFileSize(path, maxBytes) expects a path and number");
  }

  std::string pathUtf8 = info[0].As<Napi::String>().Utf8Value();
  NSString *path = [NSString stringWithUTF8String:pathUtf8.c_str()];
  double maxBytes = info[1].As<Napi::Number>().DoubleValue();

  NSError *error = nil;
  NSDictionary *attrs = [[NSFileManager defaultManager] attributesOfItemAtPath:path error:&error];
  if (!attrs || error) {
    return Napi::Boolean::New(env, false);
  }

  NSNumber *sizeNumber = attrs[NSFileSize];
  double size = sizeNumber ? sizeNumber.doubleValue : 0;
  return Napi::Boolean::New(env, size <= maxBytes);
}

Napi::Value Sha256File(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsString()) {
    throw Napi::TypeError::New(env, "sha256File(path) expects a string path");
  }

  std::string pathUtf8 = info[0].As<Napi::String>().Utf8Value();
  NSString *path = [NSString stringWithUTF8String:pathUtf8.c_str()];

  NSFileHandle *handle = [NSFileHandle fileHandleForReadingAtPath:path];
  if (!handle) {
    throw Napi::Error::New(env, "sha256File failed to open file");
  }

  CC_SHA256_CTX ctx;
  CC_SHA256_Init(&ctx);

  @autoreleasepool {
    while (true) {
      NSData *chunk = [handle readDataOfLength:64 * 1024];
      if (!chunk || chunk.length == 0) {
        break;
      }
      CC_SHA256_Update(&ctx, chunk.bytes, (CC_LONG)chunk.length);
    }
  }

  [handle closeFile];

  unsigned char hash[CC_SHA256_DIGEST_LENGTH];
  CC_SHA256_Final(hash, &ctx);
  return Napi::Buffer<uint8_t>::Copy(env, hash, CC_SHA256_DIGEST_LENGTH);
}

} // namespace simnote_native
