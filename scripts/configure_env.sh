#!/bin/bash
set -e

# scripts/configure_env.sh
# Detects the environment and configures .env with Project Root and IDE Scheme.

ENV_FILE=".env"
DEFAULT_SCHEME="vscode"

echo "🔍 Analyzing environment..."

# 1. Determine Project Root
PROJECT_ROOT="$PWD"
echo "📂 Detected Project Root: $PROJECT_ROOT"

# 2. Detect IDE Scheme
IDE_SCHEME="$DEFAULT_SCHEME"

if [ -n "$ANTIGRAVITY_AGENT" ] || [ -n "$ANTIGRAVITY_CLI_ALIAS" ]; then
    echo "✨ Detected Anti-Gravity IDE"
    IDE_SCHEME="antigravity"
elif [ "$TERM_PROGRAM" == "Cursor" ]; then
    echo "✨ Detected Cursor IDE"
    IDE_SCHEME="cursor"
elif [ "$TERM_PROGRAM" == "Windsurf" ]; then
    echo "✨ Detected Windsurf IDE"
    IDE_SCHEME="windsurf"
elif [ "$TERM_PROGRAM" == "VSCodium" ]; then
    echo "✨ Detected VSCodium"
    IDE_SCHEME="vscodium"
elif [ "$TERM_PROGRAM" == "vscode" ]; then
    echo "✨ Detected Standard VS Code (or compatible)"
    IDE_SCHEME="vscode"
else
    echo "ℹ️  No specific IDE detected via environment variables. Defaulting to '$DEFAULT_SCHEME'."
fi

echo "🔗 Setting IDE Protocol Scheme to: $IDE_SCHEME"

# 3. Update .env (Idempotent)
touch "$ENV_FILE"

# Function to set or replace a var in .env
set_env_var() {
    local key="$1"
    local value="$2"
    
    # Check if key exists
    if grep -q "^$key=" "$ENV_FILE"; then
        # Replace it (using tmp file for safety across sed versions)
        grep -v "^$key=" "$ENV_FILE" > "${ENV_FILE}.tmp" || true
        echo "$key=$value" >> "${ENV_FILE}.tmp"
        mv "${ENV_FILE}.tmp" "$ENV_FILE"
        echo "✅ Updated $key in $ENV_FILE"
    else
        # Append it
        echo "$key=$value" >> "$ENV_FILE"
        echo "✅ Added $key to $ENV_FILE"
    fi
}

set_env_var "PROJECT_ROOT" "$PROJECT_ROOT"
set_env_var "IDE_SCHEME" "$IDE_SCHEME"

echo "🎉 Configuration complete!"
