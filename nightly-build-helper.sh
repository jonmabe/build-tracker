#!/bin/bash

# Nightly Build Helper Script
# Wraps a nightly build and automatically tracks it with build-tracker
#
# Usage:
#   ./nightly-build-helper.sh "project-name" "description" "build-command"
#
# Example:
#   ./nightly-build-helper.sh "my-tool" "CLI for awesome things" "npm run build"

set -e

PROJECT_NAME="$1"
DESCRIPTION="$2"
BUILD_COMMAND="$3"

if [ -z "$PROJECT_NAME" ] || [ -z "$DESCRIPTION" ] || [ -z "$BUILD_COMMAND" ]; then
    echo "Usage: $0 <project-name> <description> <build-command>"
    echo "Example: $0 'my-tool' 'CLI for awesome things' 'npm run build'"
    exit 1
fi

echo "🔨 Starting nightly build: $PROJECT_NAME"
echo "Description: $DESCRIPTION"
echo "Command: $BUILD_COMMAND"
echo

START_TIME=$(date +%s)

# Run the build command and capture exit code
set +e
eval "$BUILD_COMMAND"
BUILD_EXIT_CODE=$?
set -e

END_TIME=$(date +%s)
DURATION_SECONDS=$((END_TIME - START_TIME))
DURATION_MINUTES=$(echo "scale=1; $DURATION_SECONDS / 60" | bc -l 2>/dev/null || echo "$(($DURATION_SECONDS / 60))")

# Determine status
if [ $BUILD_EXIT_CODE -eq 0 ]; then
    STATUS="success"
    echo "✅ Build completed successfully"
else
    STATUS="failed"
    echo "❌ Build failed with exit code $BUILD_EXIT_CODE"
fi

# Auto-detect repo URL if we're in a git repo
REPO_URL=""
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    REPO_URL=$(git config --get remote.origin.url 2>/dev/null || echo "")
fi

# Log the build
BUILD_TRACKER_CMD="build-tracker log --project '$PROJECT_NAME' --description '$DESCRIPTION' --status $STATUS --duration $DURATION_MINUTES"

if [ -n "$REPO_URL" ]; then
    BUILD_TRACKER_CMD="$BUILD_TRACKER_CMD --repo-url '$REPO_URL'"
fi

echo "📝 Logging build result..."
eval "$BUILD_TRACKER_CMD"

echo "🏁 Build tracking complete"
exit $BUILD_EXIT_CODE