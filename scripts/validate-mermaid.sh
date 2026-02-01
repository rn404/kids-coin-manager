#!/usr/bin/env bash

# check required
if ! command -v npx &>/dev/null; then
  echo "❌ Error: npx command not found"
  echo "Please install Node.js and npm first"
  exit 1
fi

# Script start...
echo "Starting Mermaid diagram validation..."

# find markdown files
files=$(find . -name "*.md" -not -path "*/node_modules/*" -not -path "*/.git/*")
total=$(echo "$files" | wc -l | tr -d ' ')

echo "Found $total Markdown file(s)"
echo ""

# variables
success_count=0
failed_files=()
tmp_output="./tmp/mermaid-validation-$$.svg"

# validate
# エラー詳細を確認したい場合は以下を実行:
# npx -p @mermaid-js/mermaid-cli mmdc -i <ファイルパス> -o ./tmp/debug.svg
while IFS= read -r file; do
  if npx -p @mermaid-js/mermaid-cli mmdc -i "$file" -o "$tmp_output" >/dev/null 2>&1; then
    success_count=$((success_count + 1))
  else
    failed_files+=("$file")
  fi
done <<<"$files"

# results
echo ""

if [ ${#failed_files[@]} -eq 0 ]; then
  echo "✅ All $success_count file(s) passed validation"
else
  echo "✅ $success_count file(s) passed"
  echo "❌ ${#failed_files[@]} file(s) failed:"
  echo ""
  for file in "${failed_files[@]}"; do
    echo "  $file"
  done
  echo ""
  exit 1
fi

# Script end
echo "Validation completed successfully"
