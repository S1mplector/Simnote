#pragma once

#include <napi.h>

namespace simnote_native {

Napi::Value ReadFile(const Napi::CallbackInfo& info);
Napi::Value WriteFile(const Napi::CallbackInfo& info);
Napi::Value WriteFileAtomic(const Napi::CallbackInfo& info);
Napi::Value ListDir(const Napi::CallbackInfo& info);
Napi::Value IndexText(const Napi::CallbackInfo& info);
Napi::Value EncryptAes256Cbc(const Napi::CallbackInfo& info);
Napi::Value DecryptAes256Cbc(const Napi::CallbackInfo& info);
Napi::Value EncryptAes256Gcm(const Napi::CallbackInfo& info);
Napi::Value DecryptAes256Gcm(const Napi::CallbackInfo& info);
Napi::Object Init(Napi::Env env, Napi::Object exports);

} // namespace simnote_native
