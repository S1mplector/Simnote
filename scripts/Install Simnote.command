#!/bin/bash
# Install Simnote.app from the sibling Simnote.app.zip into /Applications
# Usage: double-click this .command file in Finder
# It will:
#   1. Unzip Simnote.app.zip to a temporary directory
#   2. Move Simnote.app into /Applications (overwriting any existing copy)
#   3. Remove macOS quarantine attributes so it opens without Gatekeeper warning
#   4. Launch Simnote
# ------------------------------------------------------------
set -euo pipefail

APP_ZIP="Simnote.app.zip"
APP_NAME="Simnote.app"
DEST="/Applications/$APP_NAME"

# Determine directory where the script resides (even if symlinked)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# ---- optional flags ----
SILENT=0
if [[ ${1:-} == "--silent" ]]; then
  SILENT=1
  # Redirect stdout/stderr to null to keep Terminal window blank
  exec >/dev/null 2>&1
fi

(( SILENT )) || echo "\nSimnote installer running…"

if [[ ! -f "$APP_ZIP" ]]; then
  echo "✖︎ $APP_ZIP not found in $SCRIPT_DIR. Please place the zip next to this installer." >&2
  read -n1 -rsp $'\nPress any key to exit…'
  exit 1
fi

TMP="$(mktemp -d)"
(( SILENT )) || echo "• Extracting $APP_ZIP…"
unzip -q "$APP_ZIP" -d "$TMP"

APP_SRC="$TMP/$APP_NAME"
if [[ ! -d "$APP_SRC" ]]; then
  echo "✖︎ Extraction failed. $APP_NAME not found inside zip." >&2
  exit 1
fi

(( SILENT )) || echo "• Moving app to /Applications (may request admin password)…"
# Use sudo only if /Applications is not user-writable
if mv "$APP_SRC" "$DEST" 2>/dev/null; then
  : # moved without sudo
else
  echo "  sudo required to copy into /Applications"
  sudo rm -rf "$DEST"
  sudo mv "$APP_SRC" "$DEST"
fi

# Remove quarantine attribute
(( SILENT )) || echo "• Removing Gatekeeper quarantine flag…"
sudo xattr -cr "$DEST" || true

(( SILENT )) || echo "✓ Simnote installed at $DEST"

(( SILENT )) || echo "• Launching Simnote…"
open "$DEST"

(( SILENT )) || echo "All done. Enjoy!" 