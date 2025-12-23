#!/bin/bash

# Simnote Packaging Script
# Creates .app, .dmg, and .pkg installer for macOS

set -e

# Configuration
APP_NAME="Simnote"
VERSION=$(node -p "require('./package.json').version")
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DIST_DIR="$PROJECT_DIR/dist"
ICON_PATH="$PROJECT_DIR/resources/icon.icns"
COPY_TO_DESKTOP=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --desktop)
            COPY_TO_DESKTOP=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            echo "Usage: ./package.sh [--desktop]"
            exit 1
            ;;
    esac
done

echo "============================================"
echo "  Simnote Packaging Script v$VERSION"
echo "============================================"
echo ""

# Change to project directory
cd "$PROJECT_DIR"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# Build the app using electron-builder
echo "🔨 Building macOS app..."
npx electron-builder --mac --arm64

# Find the built .app
APP_PATH=$(find "$DIST_DIR" -name "*.app" -type d | head -1)
DMG_PATH=$(find "$DIST_DIR" -name "*.dmg" -type f | head -1)

if [ -z "$APP_PATH" ]; then
    echo "❌ Error: Could not find built .app"
    exit 1
fi

echo "✅ App built: $APP_PATH"

if [ -n "$DMG_PATH" ]; then
    echo "✅ DMG created: $DMG_PATH"
fi

# Create .pkg installer
echo "📦 Creating .pkg installer..."
PKG_PATH="$DIST_DIR/${APP_NAME}-${VERSION}.pkg"
PKG_COMPONENT_PATH="$DIST_DIR/${APP_NAME}-${VERSION}-component.pkg"
INSTALLER_RESOURCES="$PROJECT_DIR/scripts/installer-resources"
DIST_SCRIPT="$DIST_DIR/${APP_NAME}-distribution.xml"

pkgbuild \
    --root "$(dirname "$APP_PATH")" \
    --component-plist /dev/stdin \
    --identifier "com.simnote.app" \
    --version "$VERSION" \
    --install-location "/Applications" \
    "$PKG_COMPONENT_PATH" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<array>
    <dict>
        <key>BundleHasStrictIdentifier</key>
        <true/>
        <key>BundleIsRelocatable</key>
        <false/>
        <key>BundleIsVersionChecked</key>
        <true/>
        <key>BundleOverwriteAction</key>
        <string>upgrade</string>
        <key>RootRelativeBundlePath</key>
        <string>${APP_NAME}.app</string>
    </dict>
</array>
</plist>
EOF

cat > "$DIST_SCRIPT" << EOF
<?xml version="1.0" encoding="utf-8"?>
<installer-gui-script minSpecVersion="1">
  <title>${APP_NAME}</title>
  <welcome file="welcome.html"/>
  <readme file="readme.html"/>
  <conclusion file="conclusion.html"/>
  <options customize="never" require-scripts="false"/>
  <domains enable_anywhere="false" enable_currentUserHome="false" enable_localSystem="true"/>
  <choices-outline>
    <line choice="default">
      <line choice="com.simnote.app"/>
    </line>
  </choices-outline>
  <choice id="default"/>
  <choice id="com.simnote.app" visible="false">
    <pkg-ref id="com.simnote.app"/>
  </choice>
  <pkg-ref id="com.simnote.app" version="${VERSION}" auth="Root">${APP_NAME}-${VERSION}-component.pkg</pkg-ref>
</installer-gui-script>
EOF

productbuild \
  --distribution "$DIST_SCRIPT" \
  --resources "$INSTALLER_RESOURCES" \
  --package-path "$DIST_DIR" \
  "$PKG_PATH"

echo "✅ PKG created: $PKG_PATH"

# Copy to desktop if flag is set
if [ "$COPY_TO_DESKTOP" = true ]; then
    echo "📁 Copying installers to Desktop..."
    DESKTOP_PATH="$HOME/Desktop"
    
    if [ -n "$DMG_PATH" ]; then
        cp "$DMG_PATH" "$DESKTOP_PATH/"
        echo "   ✅ DMG copied to Desktop"
    fi
    
    cp "$PKG_PATH" "$DESKTOP_PATH/"
    echo "   ✅ PKG copied to Desktop"
fi

echo ""
echo "============================================"
echo "  Packaging Complete!"
echo "============================================"
echo ""
echo "Output files:"
echo "  📦 PKG: $PKG_PATH"
if [ -n "$DMG_PATH" ]; then
    echo "  💿 DMG: $DMG_PATH"
fi
if [ "$COPY_TO_DESKTOP" = true ]; then
    echo ""
    echo "  Installers copied to Desktop ✓"
fi
echo ""
