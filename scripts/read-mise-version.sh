#!/usr/bin/env bash

# Usage: ./scripts/read-mise-version.sh <tool-name>
# Reads the version of the specified tool from mise.toml
#
# Example:
#   ./scripts/read-mise-version.sh deno   # => 2.6.3
#   ./scripts/read-mise-version.sh node   # => 24.2.0

set -euo pipefail

TOOL_NAME="${1:-}"

if [ -z "$TOOL_NAME" ]; then
  echo "Error: tool name is required" >&2
  echo "Usage: $0 <tool-name>" >&2
  exit 1
fi

MISE_TOML="mise.toml"

if [ ! -f "$MISE_TOML" ]; then
  echo "Error: $MISE_TOML not found" >&2
  exit 1
fi

VERSION=$(grep "^${TOOL_NAME} " "$MISE_TOML" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')

if [ -z "$VERSION" ]; then
  echo "Error: $TOOL_NAME not found in $MISE_TOML" >&2
  exit 1
fi

echo "$VERSION"
