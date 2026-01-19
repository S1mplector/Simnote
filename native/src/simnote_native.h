#pragma once

#include <napi.h>

namespace simnote_native {

Napi::Value ReadFile(const Napi::CallbackInfo& info);
Napi::Value WriteFile(const Napi::CallbackInfo& info);
Napi::Value WriteFileAtomic(const Napi::CallbackInfo& info);
Napi::Value ListDir(const Napi::CallbackInfo& info);
Napi::Value MakeDir(const Napi::CallbackInfo& info);
Napi::Value RemovePath(const Napi::CallbackInfo& info);
Napi::Value RenamePath(const Napi::CallbackInfo& info);
Napi::Value AtomicReplace(const Napi::CallbackInfo& info);
Napi::Value FileStats(const Napi::CallbackInfo& info);
Napi::Value ListDirRecursive(const Napi::CallbackInfo& info);
Napi::Value PathExists(const Napi::CallbackInfo& info);
Napi::Value CopyPath(const Napi::CallbackInfo& info);
Napi::Value ReadFileRange(const Napi::CallbackInfo& info);
Napi::Value DirectorySize(const Napi::CallbackInfo& info);
Napi::Value ListDirWithStats(const Napi::CallbackInfo& info);
Napi::Value ZipDirectory(const Napi::CallbackInfo& info);
Napi::Value UnzipArchive(const Napi::CallbackInfo& info);
Napi::Value ReadJsonStream(const Napi::CallbackInfo& info);
Napi::Value WriteJsonStream(const Napi::CallbackInfo& info);
Napi::Value ValidateFileSize(const Napi::CallbackInfo& info);
Napi::Value Sha256File(const Napi::CallbackInfo& info);
Napi::Value IndexText(const Napi::CallbackInfo& info);
Napi::Value CreateSearchIndex(const Napi::CallbackInfo& info);
Napi::Value ClearSearchIndex(const Napi::CallbackInfo& info);
Napi::Value RemoveIndexedDoc(const Napi::CallbackInfo& info);
Napi::Value IndexTextIncremental(const Napi::CallbackInfo& info);
Napi::Value SearchIndex(const Napi::CallbackInfo& info);
Napi::Value EncryptAes256Cbc(const Napi::CallbackInfo& info);
Napi::Value DecryptAes256Cbc(const Napi::CallbackInfo& info);
Napi::Value EncryptAes256Gcm(const Napi::CallbackInfo& info);
Napi::Value DecryptAes256Gcm(const Napi::CallbackInfo& info);
Napi::Value Pbkdf2Sha256(const Napi::CallbackInfo& info);
Napi::Value Sha256(const Napi::CallbackInfo& info);
Napi::Value HmacSha256(const Napi::CallbackInfo& info);
Napi::Value SecureDelete(const Napi::CallbackInfo& info);
Napi::Object Init(Napi::Env env, Napi::Object exports);

} // namespace simnote_native
