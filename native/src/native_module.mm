// native_module.mm
// Node-API entry point for the Simnote native addon.

#include "simnote_native.h"

namespace simnote_native {

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("readFile", Napi::Function::New(env, ReadFile));
  exports.Set("writeFile", Napi::Function::New(env, WriteFile));
  exports.Set("writeFileAtomic", Napi::Function::New(env, WriteFileAtomic));
  exports.Set("listDir", Napi::Function::New(env, ListDir));
  exports.Set("makeDir", Napi::Function::New(env, MakeDir));
  exports.Set("removePath", Napi::Function::New(env, RemovePath));
  exports.Set("renamePath", Napi::Function::New(env, RenamePath));
  exports.Set("atomicReplace", Napi::Function::New(env, AtomicReplace));
  exports.Set("fileStats", Napi::Function::New(env, FileStats));
  exports.Set("listDirRecursive", Napi::Function::New(env, ListDirRecursive));
  exports.Set("zipDirectory", Napi::Function::New(env, ZipDirectory));
  exports.Set("unzipArchive", Napi::Function::New(env, UnzipArchive));
  exports.Set("readJsonStream", Napi::Function::New(env, ReadJsonStream));
  exports.Set("writeJsonStream", Napi::Function::New(env, WriteJsonStream));
  exports.Set("validateFileSize", Napi::Function::New(env, ValidateFileSize));
  exports.Set("sha256File", Napi::Function::New(env, Sha256File));
  exports.Set("indexText", Napi::Function::New(env, IndexText));
  exports.Set("createSearchIndex", Napi::Function::New(env, CreateSearchIndex));
  exports.Set("clearSearchIndex", Napi::Function::New(env, ClearSearchIndex));
  exports.Set("removeIndexedDoc", Napi::Function::New(env, RemoveIndexedDoc));
  exports.Set("indexTextIncremental", Napi::Function::New(env, IndexTextIncremental));
  exports.Set("searchIndex", Napi::Function::New(env, SearchIndex));
  exports.Set("encryptAes256Cbc", Napi::Function::New(env, EncryptAes256Cbc));
  exports.Set("decryptAes256Cbc", Napi::Function::New(env, DecryptAes256Cbc));
  exports.Set("encryptAes256Gcm", Napi::Function::New(env, EncryptAes256Gcm));
  exports.Set("decryptAes256Gcm", Napi::Function::New(env, DecryptAes256Gcm));
  exports.Set("pbkdf2Sha256", Napi::Function::New(env, Pbkdf2Sha256));
  exports.Set("sha256", Napi::Function::New(env, Sha256));
  exports.Set("hmacSha256", Napi::Function::New(env, HmacSha256));
  exports.Set("secureDelete", Napi::Function::New(env, SecureDelete));
  return exports;
}

} // namespace simnote_native

static Napi::Object InitModule(Napi::Env env, Napi::Object exports) {
  return simnote_native::Init(env, exports);
}

NODE_API_MODULE(simnote_native, InitModule)
