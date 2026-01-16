// nativeAddon.js
// Loads the optional macOS native addon for accelerated IO/crypto.

const fs = require('fs');
const path = require('path');

function loadNativeAddon() {
  const candidates = [];

  if (process.resourcesPath) {
    candidates.push(path.join(process.resourcesPath, 'native/build/Release/simnote_native.node'));
  }

  candidates.push(path.join(__dirname, '../../native/build/Release/simnote_native.node'));

  for (const candidate of candidates) {
    try {
      if (candidate && fs.existsSync(candidate)) {
        return require(candidate);
      }
    } catch (err) {
      // Continue to next candidate.
    }
  }

  return null;
}

let nativeAddon = null;
try {
  nativeAddon = loadNativeAddon();
} catch (err) {
  nativeAddon = null;
}

module.exports = { nativeAddon };
