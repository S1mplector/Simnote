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

Napi::Value PathExists(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsString()) {
    throw Napi::TypeError::New(env, "pathExists(path) expects a string path");
  }

  std::string pathUtf8 = info[0].As<Napi::String>().Utf8Value();
  NSString *path = [NSString stringWithUTF8String:pathUtf8.c_str()];
  BOOL isDir = NO;
  BOOL exists = [[NSFileManager defaultManager] fileExistsAtPath:path isDirectory:&isDir];

  Napi::Object result = Napi::Object::New(env);
  result.Set("exists", Napi::Boolean::New(env, exists));
  result.Set("isDirectory", Napi::Boolean::New(env, exists && isDir));
  result.Set("isFile", Napi::Boolean::New(env, exists && !isDir));
  return result;
}

Napi::Value CopyPath(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 2 || !info[0].IsString() || !info[1].IsString()) {
    throw Napi::TypeError::New(env, "copyPath(source, destination[, overwrite]) expects string paths");
  }

  std::string sourceUtf8 = info[0].As<Napi::String>().Utf8Value();
  std::string destUtf8 = info[1].As<Napi::String>().Utf8Value();
  NSString *sourcePath = [NSString stringWithUTF8String:sourceUtf8.c_str()];
  NSString *destPath = [NSString stringWithUTF8String:destUtf8.c_str()];
  bool overwrite = false;
  if (info.Length() >= 3 && info[2].IsBoolean()) {
    overwrite = info[2].As<Napi::Boolean>().Value();
  }

  NSFileManager *fm = [NSFileManager defaultManager];
  NSError *error = nil;
  if (![fm fileExistsAtPath:sourcePath]) {
    throw Napi::Error::New(env, "copyPath source does not exist");
  }

  NSString *parent = [destPath stringByDeletingLastPathComponent];
  if (parent.length > 0 && ![fm fileExistsAtPath:parent]) {
    [fm createDirectoryAtPath:parent withIntermediateDirectories:YES attributes:nil error:nil];
  }

  if (overwrite && [fm fileExistsAtPath:destPath]) {
    if (![fm removeItemAtPath:destPath error:&error] || error) {
      std::string message = "copyPath failed to remove destination";
      if (error) {
        message += ": ";
        message += [[error localizedDescription] UTF8String];
      }
      throw Napi::Error::New(env, message);
    }
  }

  BOOL ok = [fm copyItemAtPath:sourcePath toPath:destPath error:&error];
  if (!ok || error) {
    std::string message = "copyPath failed";
    if (error) {
      message += ": ";
      message += [[error localizedDescription] UTF8String];
    }
    throw Napi::Error::New(env, message);
  }

  return Napi::Boolean::New(env, true);
}

Napi::Value ReadFileRange(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 3 || !info[0].IsString() || !info[1].IsNumber() || !info[2].IsNumber()) {
    throw Napi::TypeError::New(env, "readFileRange(path, offset, length) expects a string and numbers");
  }

  std::string pathUtf8 = info[0].As<Napi::String>().Utf8Value();
  NSString *path = [NSString stringWithUTF8String:pathUtf8.c_str()];
  double offsetRaw = info[1].As<Napi::Number>().DoubleValue();
  double lengthRaw = info[2].As<Napi::Number>().DoubleValue();
  uint64_t offset = offsetRaw < 0 ? 0 : static_cast<uint64_t>(offsetRaw);
  uint64_t length = lengthRaw < 0 ? 0 : static_cast<uint64_t>(lengthRaw);

  NSFileHandle *handle = [NSFileHandle fileHandleForReadingAtPath:path];
  if (!handle) {
    throw Napi::Error::New(env, "readFileRange failed to open file");
  }

  @try {
    [handle seekToFileOffset:offset];
  } @catch (NSException *exception) {
    [handle closeFile];
    throw Napi::Error::New(env, "readFileRange failed to seek");
  }

  NSUInteger readLength = length > NSUIntegerMax ? NSUIntegerMax : (NSUInteger)length;
  NSData *data = [handle readDataOfLength:readLength];
  [handle closeFile];

  if (!data) {
    throw Napi::Error::New(env, "readFileRange failed to read");
  }

  return Napi::Buffer<uint8_t>::Copy(env, reinterpret_cast<const uint8_t *>([data bytes]), [data length]);
}

Napi::Value DirectorySize(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsString()) {
    throw Napi::TypeError::New(env, "directorySize(path[, maxDepth]) expects a string path");
  }

  std::string pathUtf8 = info[0].As<Napi::String>().Utf8Value();
  NSString *path = [NSString stringWithUTF8String:pathUtf8.c_str()];
  int maxDepth = -1;
  if (info.Length() >= 2 && info[1].IsNumber()) {
    maxDepth = info[1].As<Napi::Number>().Int32Value();
  }

  NSURL *baseURL = [NSURL fileURLWithPath:path];
  NSFileManager *fm = [NSFileManager defaultManager];
  NSArray *keys = @[ NSURLIsDirectoryKey, NSURLFileSizeKey ];
  NSDirectoryEnumerator *enumerator = [fm enumeratorAtURL:baseURL
                               includingPropertiesForKeys:keys
                                                  options:0
                                             errorHandler:nil];
  if (!enumerator) {
    throw Napi::Error::New(env, "directorySize failed to enumerate directory");
  }

  unsigned long long total = 0;
  unsigned long long fileCount = 0;
  unsigned long long dirCount = 0;
  for (NSURL *url in enumerator) {
    if (maxDepth >= 0 && (int)[enumerator level] > maxDepth) {
      [enumerator skipDescendants];
      continue;
    }

    NSNumber *isDir = nil;
    [url getResourceValue:&isDir forKey:NSURLIsDirectoryKey error:nil];
    if (isDir && [isDir boolValue]) {
      dirCount++;
      continue;
    }

    NSNumber *size = nil;
    [url getResourceValue:&size forKey:NSURLFileSizeKey error:nil];
    if (size) {
      total += size.unsignedLongLongValue;
    }
    fileCount++;
  }

  Napi::Object result = Napi::Object::New(env);
  result.Set("totalBytes", Napi::Number::New(env, static_cast<double>(total)));
  result.Set("fileCount", Napi::Number::New(env, static_cast<double>(fileCount)));
  result.Set("dirCount", Napi::Number::New(env, static_cast<double>(dirCount)));
  return result;
}

Napi::Value ListDirWithStats(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsString()) {
    throw Napi::TypeError::New(env, "listDirWithStats(path) expects a string path");
  }

  std::string pathUtf8 = info[0].As<Napi::String>().Utf8Value();
  NSString *path = [NSString stringWithUTF8String:pathUtf8.c_str()];
  NSFileManager *fm = [NSFileManager defaultManager];
  NSError *error = nil;
  NSArray<NSString *> *contents = [fm contentsOfDirectoryAtPath:path error:&error];
  if (!contents || error) {
    std::string message = "listDirWithStats failed";
    if (error) {
      message += ": ";
      message += [[error localizedDescription] UTF8String];
    }
    throw Napi::Error::New(env, message);
  }

  NSISO8601DateFormatter *formatter = [[NSISO8601DateFormatter alloc] init];
  formatter.formatOptions = NSISO8601DateFormatWithInternetDateTime;

  Napi::Array result = Napi::Array::New(env, contents.count);
  NSUInteger index = 0;
  for (NSString *item in contents) {
    NSString *fullPath = [path stringByAppendingPathComponent:item];
    NSDictionary *attrs = [fm attributesOfItemAtPath:fullPath error:nil];
    NSString *fileType = attrs[NSFileType];
    NSNumber *sizeNumber = attrs[NSFileSize];
    NSDate *modifiedAt = attrs[NSFileModificationDate];
    NSString *modifiedStr = modifiedAt ? [formatter stringFromDate:modifiedAt] : @"";

    Napi::Object entry = Napi::Object::New(env);
    entry.Set("name", Napi::String::New(env, [item UTF8String]));
    entry.Set("isDirectory", Napi::Boolean::New(env, [fileType isEqualToString:NSFileTypeDirectory]));
    entry.Set("isFile", Napi::Boolean::New(env, [fileType isEqualToString:NSFileTypeRegular]));
    entry.Set("size", Napi::Number::New(env, sizeNumber ? sizeNumber.doubleValue : 0));
    entry.Set("modifiedAt", Napi::String::New(env, [modifiedStr UTF8String]));
    result[index++] = entry;
  }
  return result;
}

} // namespace simnote_native
