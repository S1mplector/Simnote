// native_crypto.mm
// Crypto helpers for the Simnote native addon.

#include "simnote_native.h"
#include <vector>
#import <CommonCrypto/CommonCrypto.h>

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

} // namespace simnote_native
