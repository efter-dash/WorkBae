#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="${0:A:h}"
PROJECT_DIR="${SCRIPT_DIR:h}"
OUTPUT_DIR="$PROJECT_DIR/outputs"
FINAL_APP_DIR="$OUTPUT_DIR/WorkBae.app"
BUILD_ROOT="$(mktemp -d)"
APP_DIR="$BUILD_ROOT/WorkBae.app"
CONTENTS_DIR="$APP_DIR/Contents"
MACOS_DIR="$CONTENTS_DIR/MacOS"
RESOURCES_DIR="$CONTENTS_DIR/Resources"

cleanup() { /bin/rm -rf "$BUILD_ROOT"; }
trap cleanup EXIT

mkdir -p "$MACOS_DIR" "$RESOURCES_DIR/web"

/usr/bin/clang \
  -fobjc-arc \
  -arch arm64 \
  -arch x86_64 \
  -framework Cocoa \
  -framework WebKit \
  -framework UniformTypeIdentifiers \
  "$PROJECT_DIR/macos/WorkBaeApp.m" \
  -o "$MACOS_DIR/WorkBae"

/bin/cp -R "$PROJECT_DIR/src/." "$RESOURCES_DIR/web/"
/bin/cp "$PROJECT_DIR/macos/Info.plist" "$CONTENTS_DIR/Info.plist"

ICON_WORK_DIR="$(mktemp -d)"
ICONSET_DIR="$ICON_WORK_DIR/WorkBae.iconset"
mkdir -p "$ICONSET_DIR"
for size in 16 32 128 256 512; do
  /usr/bin/sips -s format png -z "$size" "$size" "$PROJECT_DIR/src/workbae-logo.jpg" --out "$ICONSET_DIR/icon_${size}x${size}.png" >/dev/null
  double_size=$((size * 2))
  /usr/bin/sips -s format png -z "$double_size" "$double_size" "$PROJECT_DIR/src/workbae-logo.jpg" --out "$ICONSET_DIR/icon_${size}x${size}@2x.png" >/dev/null
done
"$(command -v node)" "$PROJECT_DIR/scripts/make-icns.js" "$ICONSET_DIR" "$RESOURCES_DIR/WorkBae.icns"
/bin/rm -rf "$ICON_WORK_DIR"
/usr/bin/xattr -cr "$APP_DIR"
/usr/bin/xattr -d com.apple.FinderInfo "$APP_DIR" 2>/dev/null || true
/usr/bin/codesign --force --deep --sign - "$APP_DIR"
/usr/bin/codesign --verify --deep --strict "$APP_DIR"

mkdir -p "$OUTPUT_DIR"
if [[ -d "$FINAL_APP_DIR" && "$FINAL_APP_DIR" == "$OUTPUT_DIR/WorkBae.app" ]]; then
  /bin/rm -rf "$FINAL_APP_DIR"
fi
/usr/bin/ditto "$APP_DIR" "$FINAL_APP_DIR"
/usr/bin/xattr -d com.apple.FinderInfo "$FINAL_APP_DIR" 2>/dev/null || true
/usr/bin/codesign --verify --deep --strict "$FINAL_APP_DIR"

echo "Built: $FINAL_APP_DIR"
if [[ "${WORKBAE_SKIP_OPEN:-0}" != "1" ]]; then
  open "$OUTPUT_DIR"
fi
