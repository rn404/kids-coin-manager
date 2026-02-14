#!/usr/bin/env bash

# Usage: ./scripts/count-lines.sh
# Counts lines of source code per workspace package (apps/*, packages/*)
# using git-tracked files only (respects .gitignore).
# Updates README.md between <!-- loc-start --> and <!-- loc-end --> markers.

set -euo pipefail

README="README.md"

if [ ! -f "$README" ]; then
  echo "Error: $README not found" >&2
  exit 1
fi

# Discover all direct subdirectories under apps/ and packages/
dirs=()
for parent in apps packages; do
  if [ -d "$parent" ]; then
    for dir in "$parent"/*/; do
      dirs+=("${dir%/}")
    done
  fi
done

total=0
table_file=$(mktemp)

cat >"$table_file" <<'HEADER'
| Package | Lines |
| --- | ---: |
HEADER

for dir in "${dirs[@]}"; do
  # Use git ls-files to respect .gitignore, exclude non-source files
  files=$(git ls-files "$dir" | grep -v -E '\.(md|lock)$' || true)

  if [ -z "$files" ]; then
    count=0
  else
    count=$(echo "$files" | xargs wc -l | tail -1 | awk '{print $1}')
  fi

  total=$((total + count))
  echo "| \`${dir}\` | ${count} |" >>"$table_file"
done

echo "| **Total** | **${total}** |" >>"$table_file"

# Build new README: before marker + table + after marker
{
  sed -n '1,/<!-- loc-start -->/p' "$README"
  echo ""
  cat "$table_file"
  echo ""
  sed -n '/<!-- loc-end -->/,$p' "$README"
} >"${README}.tmp"

mv "${README}.tmp" "$README"
rm -f "$table_file"

echo "Updated $README (total: ${total} lines)"
