// native_module.mm
// Node-API entry point for the Simnote native addon.

#include "simnote_native.h"

namespace simnote_native {

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("readFile", Napi::Function::New(env, ReadFile));
  exports.Set("writeFile", Napi::Function::New(env, WriteFile));
  exports.Set("writeFileAtomic", Napi::Function::New(env, WriteFileAtomic));
  exports.Set("listDir", Napi::Function::New(env, ListDir));
  exports.Set("indexText", Napi::Function::New(env, IndexText));
  exports.Set("encryptAes256Cbc", Napi::Function::New(env, EncryptAes256Cbc));
  exports.Set("decryptAes256Cbc", Napi::Function::New(env, DecryptAes256Cbc));
  exports.Set("encryptAes256Gcm", Napi::Function::New(env, EncryptAes256Gcm));
  exports.Set("decryptAes256Gcm", Napi::Function::New(env, DecryptAes256Gcm));
  return exports;
}

} // namespace simnote_native

NODE_API_MODULE(simnote_native, simnote_native::Init)
