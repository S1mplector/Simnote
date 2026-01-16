// native_search.mm
// Incremental search index helpers for the Simnote native addon.

#include "simnote_native.h"
#include <mutex>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>
#import <Foundation/Foundation.h>

namespace simnote_native {

namespace {

constexpr size_t kBloomBits = 2048;
constexpr size_t kBloomBytes = kBloomBits / 8;
constexpr size_t kBloomHashes = 3;
constexpr size_t kMaxPrefixLength = 6;
constexpr size_t kMaxTokensPerDoc = 20000;

struct DocTokens {
  std::unordered_set<std::string> tokens;
  std::vector<uint8_t> bloom;
};

struct IndexState {
  std::unordered_map<std::string, DocTokens> docs;
  std::unordered_map<std::string, std::unordered_set<std::string>> prefixIndex;
};

std::unordered_map<std::string, IndexState> gIndices;
std::mutex gMutex;

uint64_t HashToken(const std::string& token, uint64_t seed) {
  std::hash<std::string> hasher;
  uint64_t h1 = hasher(token);
  uint64_t h2 = hasher(token + std::to_string(seed));
  return h1 ^ (h2 + seed * 0x9e3779b97f4a7c15ULL);
}

void AddToBloom(std::vector<uint8_t>& bloom, const std::string& token) {
  for (size_t i = 0; i < kBloomHashes; i++) {
    size_t bit = static_cast<size_t>(HashToken(token, i) % kBloomBits);
    bloom[bit / 8] |= static_cast<uint8_t>(1u << (bit % 8));
  }
}

bool BloomContains(const std::vector<uint8_t>& bloom, const std::string& token) {
  for (size_t i = 0; i < kBloomHashes; i++) {
    size_t bit = static_cast<size_t>(HashToken(token, i) % kBloomBits);
    if ((bloom[bit / 8] & static_cast<uint8_t>(1u << (bit % 8))) == 0) {
      return false;
    }
  }
  return true;
}

std::vector<std::string> Tokenize(NSString *text) {
  NSString *lower = [text lowercaseString];
  NSCharacterSet *separators = [[NSCharacterSet alphanumericCharacterSet] invertedSet];
  NSArray<NSString *> *parts = [lower componentsSeparatedByCharactersInSet:separators];
  std::vector<std::string> tokens;
  tokens.reserve(std::min((size_t)parts.count, kMaxTokensPerDoc));
  for (NSString *part in parts) {
    if (part.length == 0) continue;
    tokens.emplace_back([part UTF8String]);
    if (tokens.size() >= kMaxTokensPerDoc) break;
  }
  return tokens;
}

void RemoveDocFromPrefixIndex(IndexState& index, const std::string& docId, const std::unordered_set<std::string>& tokens) {
  for (const auto& token : tokens) {
    size_t maxLen = std::min(token.size(), kMaxPrefixLength);
    for (size_t len = 1; len <= maxLen; len++) {
      std::string prefix = token.substr(0, len);
      auto pit = index.prefixIndex.find(prefix);
      if (pit == index.prefixIndex.end()) continue;
      pit->second.erase(docId);
      if (pit->second.empty()) {
        index.prefixIndex.erase(pit);
      }
    }
  }
}

void IntersectInPlace(std::unordered_set<std::string>& target, const std::unordered_set<std::string>& other) {
  for (auto it = target.begin(); it != target.end(); ) {
    if (other.find(*it) == other.end()) {
      it = target.erase(it);
    } else {
      ++it;
    }
  }
}

bool DocHasPrefix(const DocTokens& doc, const std::string& prefix) {
  for (const auto& token : doc.tokens) {
    if (token.rfind(prefix, 0) == 0) {
      return true;
    }
  }
  return false;
}

} // namespace

Napi::Value CreateSearchIndex(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsString()) {
    throw Napi::TypeError::New(env, "createSearchIndex(indexId) expects a string id");
  }

  std::string indexId = info[0].As<Napi::String>().Utf8Value();
  std::lock_guard<std::mutex> lock(gMutex);
  gIndices[indexId] = IndexState();
  return Napi::Boolean::New(env, true);
}

Napi::Value ClearSearchIndex(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 1 || !info[0].IsString()) {
    throw Napi::TypeError::New(env, "clearSearchIndex(indexId) expects a string id");
  }

  std::string indexId = info[0].As<Napi::String>().Utf8Value();
  std::lock_guard<std::mutex> lock(gMutex);
  auto it = gIndices.find(indexId);
  if (it != gIndices.end()) {
    it->second.docs.clear();
    it->second.prefixIndex.clear();
  }
  return Napi::Boolean::New(env, true);
}

Napi::Value RemoveIndexedDoc(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 2 || !info[0].IsString() || !info[1].IsString()) {
    throw Napi::TypeError::New(env, "removeIndexedDoc(indexId, docId) expects string ids");
  }

  std::string indexId = info[0].As<Napi::String>().Utf8Value();
  std::string docId = info[1].As<Napi::String>().Utf8Value();

  std::lock_guard<std::mutex> lock(gMutex);
  auto idxIt = gIndices.find(indexId);
  if (idxIt == gIndices.end()) {
    return Napi::Boolean::New(env, false);
  }

  auto docIt = idxIt->second.docs.find(docId);
  if (docIt == idxIt->second.docs.end()) {
    return Napi::Boolean::New(env, false);
  }

  RemoveDocFromPrefixIndex(idxIt->second, docId, docIt->second.tokens);
  idxIt->second.docs.erase(docIt);
  return Napi::Boolean::New(env, true);
}

Napi::Value IndexTextIncremental(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 3 || !info[0].IsString() || !info[1].IsString() || !info[2].IsString()) {
    throw Napi::TypeError::New(env, "indexTextIncremental(indexId, docId, text) expects strings");
  }

  std::string indexId = info[0].As<Napi::String>().Utf8Value();
  std::string docId = info[1].As<Napi::String>().Utf8Value();
  std::string textUtf8 = info[2].As<Napi::String>().Utf8Value();
  NSString *text = [NSString stringWithUTF8String:textUtf8.c_str()];

  std::vector<std::string> tokens = Tokenize(text);
  DocTokens doc;
  doc.bloom.assign(kBloomBytes, 0);

  for (const auto& token : tokens) {
    if (token.empty()) continue;
    doc.tokens.insert(token);
  }
  for (const auto& token : doc.tokens) {
    AddToBloom(doc.bloom, token);
  }

  std::lock_guard<std::mutex> lock(gMutex);
  IndexState& index = gIndices[indexId];

  auto existing = index.docs.find(docId);
  if (existing != index.docs.end()) {
    RemoveDocFromPrefixIndex(index, docId, existing->second.tokens);
  }

  for (const auto& token : doc.tokens) {
    size_t maxLen = std::min(token.size(), kMaxPrefixLength);
    for (size_t len = 1; len <= maxLen; len++) {
      std::string prefix = token.substr(0, len);
      index.prefixIndex[prefix].insert(docId);
    }
  }

  index.docs[docId] = std::move(doc);
  return Napi::Boolean::New(env, true);
}

Napi::Value SearchIndex(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (info.Length() < 2 || !info[0].IsString() || !info[1].IsString()) {
    throw Napi::TypeError::New(env, "searchIndex(indexId, query) expects strings");
  }

  std::string indexId = info[0].As<Napi::String>().Utf8Value();
  std::string queryUtf8 = info[1].As<Napi::String>().Utf8Value();
  NSString *query = [NSString stringWithUTF8String:queryUtf8.c_str()];

  std::vector<std::string> rawTokens = Tokenize(query);
  if (rawTokens.empty()) {
    return Napi::Array::New(env);
  }

  bool prefixSearch = false;
  if (info.Length() >= 3 && info[2].IsBoolean()) {
    prefixSearch = info[2].As<Napi::Boolean>().Value();
  }

  struct QueryToken {
    std::string value;
    bool isPrefix;
  };

  std::vector<QueryToken> queryTokens;
  queryTokens.reserve(rawTokens.size());
  for (const auto& token : rawTokens) {
    if (token.empty()) continue;
    bool isPrefix = prefixSearch;
    std::string value = token;
    if (!token.empty() && token.back() == '*') {
      value = token.substr(0, token.size() - 1);
      isPrefix = true;
    }
    if (!value.empty()) {
      queryTokens.push_back({ value, isPrefix });
    }
  }
  if (queryTokens.empty()) {
    return Napi::Array::New(env);
  }

  std::lock_guard<std::mutex> lock(gMutex);
  auto idxIt = gIndices.find(indexId);
  if (idxIt == gIndices.end()) {
    return Napi::Array::New(env);
  }

  IndexState& index = idxIt->second;
  std::unordered_set<std::string> candidates;
  bool seeded = false;
  for (const auto& token : queryTokens) {
    if (token.value.empty()) continue;
    std::string prefixKey = token.value.substr(0, std::min(token.value.size(), kMaxPrefixLength));
    auto pit = index.prefixIndex.find(prefixKey);
    if (pit == index.prefixIndex.end()) {
      return Napi::Array::New(env);
    }
    if (!seeded) {
      candidates = pit->second;
      seeded = true;
    } else {
      IntersectInPlace(candidates, pit->second);
    }
    if (candidates.empty()) {
      return Napi::Array::New(env);
    }
  }

  if (!seeded) {
    for (const auto& pair : index.docs) {
      candidates.insert(pair.first);
    }
  }

  std::vector<std::string> results;
  results.reserve(candidates.size());
  for (const auto& docId : candidates) {
    auto docIt = index.docs.find(docId);
    if (docIt == index.docs.end()) continue;
    const DocTokens& doc = docIt->second;

    bool ok = true;
    for (const auto& token : queryTokens) {
      if (token.isPrefix) {
        if (token.value.size() > kMaxPrefixLength) {
          if (!DocHasPrefix(doc, token.value)) {
            ok = false;
            break;
          }
        }
        continue;
      }

      if (!BloomContains(doc.bloom, token.value)) {
        ok = false;
        break;
      }
      if (doc.tokens.find(token.value) == doc.tokens.end()) {
        ok = false;
        break;
      }
    }

    if (ok) {
      results.push_back(docId);
    }
  }

  Napi::Array output = Napi::Array::New(env, results.size());
  for (size_t i = 0; i < results.size(); i++) {
    output[i] = Napi::String::New(env, results[i]);
  }
  return output;
}

} // namespace simnote_native
