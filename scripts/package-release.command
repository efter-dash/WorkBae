#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="${0:A:h}"
PROJECT_DIR="${SCRIPT_DIR:h}"
VERSION="$(/usr/bin/tr -d '[:space:]' < "$PROJECT_DIR/VERSION")"
OUTPUT_DIR="$PROJECT_DIR/outputs"
APP_DIR="$OUTPUT_DIR/WorkBae.app"
ZIP_PATH="$OUTPUT_DIR/WorkBae-macOS-v${VERSION}.zip"

WORKBAE_SKIP_OPEN=1 "$SCRIPT_DIR/build-macos.command"

/usr/bin/codesign --verify --deep --strict "$APP_DIR"
if [[ -f "$ZIP_PATH" && "$ZIP_PATH" == "$OUTPUT_DIR/WorkBae-macOS-v${VERSION}.zip" ]]; then
  /bin/rm -f "$ZIP_PATH"
fi
/usr/bin/ditto -c -k --norsrc --keepParent "$APP_DIR" "$ZIP_PATH"

echo "Packaged: $ZIP_PATH"
