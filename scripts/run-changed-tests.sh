#!/bin/bash
set -euo pipefail

# precommit 用: 変更ファイルに関連するテストだけを実行する

# staged + unstaged の変更ファイル一覧（重複排除）
changed_files=$(
  { git diff --cached --name-only; git diff --name-only; } | sort -u
)

if [ -z "$changed_files" ]; then
  echo "No changed files — skipping tests"
  exit 0
fi

test_files=""

while IFS= read -r file; do
  # .ts / .tsx 以外はスキップ（NOTE 不要）
  case "$file" in
    *.ts | *.tsx) ;;
    *) continue ;;
  esac

  if [[ "$file" == *_test.ts ]]; then
    test_files="$test_files"$'\n'"$file"
  else
    # ソースファイル → 対応する _test.ts を探す
    base="${file%.*}"
    candidate="${base}_test.ts"
    if [ -f "$candidate" ]; then
      test_files="$test_files"$'\n'"$candidate"
    else
      echo "[NOTE] No corresponding test file for $file"
    fi
  fi
done <<< "$changed_files"

# 重複排除・空行除去
test_files=$(echo "$test_files" | sort -u)
test_files="${test_files#$'\n'}"

if [ -z "$test_files" ]; then
  echo "No test targets — skipping tests"
  exit 0
fi

echo "=== Running tests ==="
echo "  ${test_files//$'\n'/$'\n'  }"
echo ""

while IFS= read -r tf; do
  echo "--- $tf ---"
  deno task test "$tf"
done <<< "$test_files"
