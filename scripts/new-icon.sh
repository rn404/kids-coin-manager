#!/usr/bin/env bash

set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: ./scripts/new-icon.sh <IconName>"
  echo "Example: ./scripts/new-icon.sh TrashX"
  exit 1
fi

# Strip "Icon" prefix if provided (e.g. IconArrowBack -> ArrowBack)
ICON_NAME="${1#Icon}"
ICON_FILE="packages/icons/Icon${ICON_NAME}.tsx"
MOD_FILE="packages/icons/mod.ts"

if [ -f "$ICON_FILE" ]; then
  echo "Error: $ICON_FILE already exists"
  exit 1
fi

# PascalCase -> kebab-case (e.g. TrashX -> trash-x)
KEBAB_NAME=$(echo "$ICON_NAME" | sed 's/\([A-Z]\)/-\1/g' | sed 's/^-//' | tr '[:upper:]' '[:lower:]')

echo "Paste SVG from Tabler Icons, then press Ctrl+D:"
echo "  https://tabler.io/icons/icon/${KEBAB_NAME}"
echo ""

# Read SVG from stdin
SVG=$(cat)

# Replace width/height/class with props, remove fixed color
SVG=$(echo "$SVG" \
  | sed 's/width="[^"]*"/width={props.size}/' \
  | sed 's/height="[^"]*"/height={props.size}/' \
  | sed 's/class="[^"]*"/class={props.class}/' \
  | sed 's/ color="[^"]*"//')

# 1. Create icon component
cat > "$ICON_FILE" << TEMPLATE
// Icon from Tabler Icons (MIT License) https://tabler.io/icons
export function Icon${ICON_NAME}(
  props: { size?: number | string; class?: string },
) {
  return (
    ${SVG}
  )
}
TEMPLATE

# 2. Update mod.ts
TMP_FILE=$(mktemp)
awk -v name="$ICON_NAME" '
  # Insert import before the empty line separating imports from const
  /^$/ && !done_import {
    print "import { Icon" name ", } from '"'"'./Icon" name ".tsx'"'"'"
    done_import = 1
  }
  # Insert into icons object before closing brace
  /^} as const/ {
    print "  " name ": Icon" name ","
  }
  # Add to export after "icons,"
  /icons,/ {
    print; print "  Icon" name ","; next
  }
  { print }
' "$MOD_FILE" > "$TMP_FILE"
mv "$TMP_FILE" "$MOD_FILE"

# 3. Format
deno fmt "$ICON_FILE" "$MOD_FILE" > /dev/null 2>&1

echo ""
echo "Created: $ICON_FILE"
echo "Updated: $MOD_FILE"
