// native_file_utils.mm
// File utility helpers for the Simnote native addon.

#include "simnote_native.h"
#import <Foundation/Foundation.h>

namespace simnote_native {

Napi::Value MakeDir(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsString()) {
    throw Napi::TypeError::New(env, "makeDir(path[, recursive]) expects a string path");
  }

  std::string pathUtf8 = info[0].As<Napi::String>().Utf8Value();
  NSString *path = [NSString stringWithUTF8String:pathUtf8.c_str()];
  bool recursive = true;
  if (info.Length() >= 2 && info[1].IsBoolean()) {
    recursive = info[1].As<Napi::Boolean>().Value();
  }

  NSError *error = nil;
  BOOL ok = [[NSFileManager defaultManager] createDirectoryAtPath:path
                                     withIntermediateDirectories:recursive
                                                      attributes:nil
                                                           error:&error];
  if (!ok || error) {
    std::string message = "makeDir failed";
    if (error) {
      message += ": ";
      message += [[error localizedDescription] UTF8String];
    }
    throw Napi::Error::New(env, message);
  }

  return Napi::Boolean::New(env, true);
}

Napi::Value RemovePath(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsString()) {
    throw Napi::TypeError::New(env, "removePath(path) expects a string path");
  }

  std::string pathUtf8 = info[0].As<Napi::String>().Utf8Value();
  NSString *path = [NSString stringWithUTF8String:pathUtf8.c_str()];

  NSError *error = nil;
  BOOL ok = [[NSFileManager defaultManager] removeItemAtPath:path error:&error];
  if (!ok || error) {
    std::string message = "removePath failed";
    if (error) {
      message += ": ";
      message += [[error localizedDescription] UTF8String];
    }
    throw Napi::Error::New(env, message);
  }

  return Napi::Boolean::New(env, true);
}

Napi::Value RenamePath(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 2 || !info[0].IsString() || !info[1].IsString()) {
    throw Napi::TypeError::New(env, "renamePath(from, to) expects string paths");
  }

  std::string fromUtf8 = info[0].As<Napi::String>().Utf8Value();
  std::string toUtf8 = info[1].As<Napi::String>().Utf8Value();
  NSString *fromPath = [NSString stringWithUTF8String:fromUtf8.c_str()];
  NSString *toPath = [NSString stringWithUTF8String:toUtf8.c_str()];

  NSError *error = nil;
  BOOL ok = [[NSFileManager defaultManager] moveItemAtPath:fromPath toPath:toPath error:&error];
  if (!ok || error) {
    std::string message = "renamePath failed";
    if (error) {
      message += ": ";
      message += [[error localizedDescription] UTF8String];
    }
    throw Napi::Error::New(env, message);
  }

  return Napi::Boolean::New(env, true);
}

Napi::Value AtomicReplace(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 2 || !info[0].IsString() || !info[1].IsString()) {
    throw Napi::TypeError::New(env, "atomicReplace(source, destination) expects string paths");
  }

  std::string sourceUtf8 = info[0].As<Napi::String>().Utf8Value();
  std::string destUtf8 = info[1].As<Napi::String>().Utf8Value();
  NSString *sourcePath = [NSString stringWithUTF8String:sourceUtf8.c_str()];
  NSString *destPath = [NSString stringWithUTF8String:destUtf8.c_str()];
  NSFileManager *fm = [NSFileManager defaultManager];

  NSError *error = nil;
  if (![fm fileExistsAtPath:destPath]) {
    BOOL moved = [fm moveItemAtPath:sourcePath toPath:destPath error:&error];
    if (!moved || error) {
      std::string message = "atomicReplace failed";
      if (error) {
        message += ": ";
        message += [[error localizedDescription] UTF8String];
      }
      throw Napi::Error::New(env, message);
    }
    return Napi::Boolean::New(env, true);
  }

  NSURL *sourceURL = [NSURL fileURLWithPath:sourcePath];
  NSURL *destURL = [NSURL fileURLWithPath:destPath];
  NSURL *resultURL = nil;
  BOOL ok = [fm replaceItemAtURL:destURL
                   withItemAtURL:sourceURL
                  backupItemName:nil
                         options:0
                resultingItemURL:&resultURL
                           error:&error];
  if (!ok || error) {
    std::string message = "atomicReplace failed";
    if (error) {
      message += ": ";
      message += [[error localizedDescription] UTF8String];
    }
    throw Napi::Error::New(env, message);
  }

  return Napi::Boolean::New(env, true);
}

Napi::Value FileStats(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsString()) {
    throw Napi::TypeError::New(env, "fileStats(path) expects a string path");
  }

  std::string pathUtf8 = info[0].As<Napi::String>().Utf8Value();
  NSString *path = [NSString stringWithUTF8String:pathUtf8.c_str()];

  NSError *error = nil;
  NSDictionary *attrs = [[NSFileManager defaultManager] attributesOfItemAtPath:path error:&error];
  if (!attrs || error) {
    std::string message = "fileStats failed";
    if (error) {
      message += ": ";
      message += [[error localizedDescription] UTF8String];
    }
    throw Napi::Error::New(env, message);
  }

  NSNumber *sizeNumber = attrs[NSFileSize];
  NSString *fileType = attrs[NSFileType];
  NSDate *createdAt = attrs[NSFileCreationDate];
  NSDate *modifiedAt = attrs[NSFileModificationDate];

  NSISO8601DateFormatter *formatter = [[NSISO8601DateFormatter alloc] init];
  formatter.formatOptions = NSISO8601DateFormatWithInternetDateTime;
  NSString *createdStr = createdAt ? [formatter stringFromDate:createdAt] : @"";
  NSString *modifiedStr = modifiedAt ? [formatter stringFromDate:modifiedAt] : @"";

  Napi::Object result = Napi::Object::New(env);
  result.Set("size", Napi::Number::New(env, sizeNumber ? sizeNumber.doubleValue : 0));
  result.Set("isDirectory", Napi::Boolean::New(env, [fileType isEqualToString:NSFileTypeDirectory]));
  result.Set("isFile", Napi::Boolean::New(env, [fileType isEqualToString:NSFileTypeRegular]));
  result.Set("createdAt", Napi::String::New(env, [createdStr UTF8String]));
  result.Set("modifiedAt", Napi::String::New(env, [modifiedStr UTF8String]));
  return result;
}

Napi::Value ListDirRecursive(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsString()) {
    throw Napi::TypeError::New(env, "listDirRecursive(path[, maxDepth]) expects a string path");
  }

  std::string pathUtf8 = info[0].As<Napi::String>().Utf8Value();
  NSString *path = [NSString stringWithUTF8String:pathUtf8.c_str()];
  int maxDepth = -1;
  if (info.Length() >= 2 && info[1].IsNumber()) {
    maxDepth = info[1].As<Napi::Number>().Int32Value();
  }

  NSURL *baseURL = [NSURL fileURLWithPath:path];
  NSFileManager *fm = [NSFileManager defaultManager];
  NSDirectoryEnumerator *enumerator = [fm enumeratorAtURL:baseURL
                               includingPropertiesForKeys:nil
                                                  options:0
                                             errorHandler:nil];
  if (!enumerator) {
    throw Napi::Error::New(env, "listDirRecursive failed to enumerate directory");
  }

  NSString *basePath = [baseURL path];
  NSMutableArray<NSString *> *items = [NSMutableArray array];
  for (NSURL *url in enumerator) {
    if (maxDepth >= 0 && (int)[enumerator level] > maxDepth) {
      [enumerator skipDescendants];
      continue;
    }

    NSString *fullPath = [url path];
    NSString *relative = fullPath;
    if ([relative hasPrefix:basePath]) {
      relative = [relative substringFromIndex:[basePath length]];
      if ([relative hasPrefix:@"/"]) {
        relative = [relative substringFromIndex:1];
      }
    }
    if (relative.length > 0) {
      [items addObject:relative];
    }
  }

  Napi::Array result = Napi::Array::New(env, items.count);
  for (NSUInteger i = 0; i < items.count; i++) {
    result[i] = Napi::String::New(env, [items[i] UTF8String]);
  }
  return result;
}

} // namespace simnote_native
