// native_indexer.mm
// Text indexing helpers for the Simnote native addon.

#include "simnote_native.h"
#import <Foundation/Foundation.h>

namespace simnote_native {

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

} // namespace simnote_native
