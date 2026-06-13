#!/usr/bin/env bash
set -euo pipefail

REPO_URL="https://github.com/TruShotMedia/NoA.git"
BRANCH="main"

cd "$(dirname "$0")"

if [ ! -d ".git" ]; then
  git init
fi

git branch -M "$BRANCH"

if git remote get-url origin >/dev/null 2>&1; then
  git remote set-url origin "$REPO_URL"
else
  git remote add origin "$REPO_URL"
fi

npm install
npm run build

git add .

if git diff --cached --quiet; then
  echo "No changes to commit."
else
  MESSAGE="${1:-NoA update $(date +%Y-%m-%d_%H-%M-%S)}"
  git commit -m "$MESSAGE"
fi

if ! git push -u origin "$BRANCH"; then
  echo ""
  echo "Push failed. If this is the first push and GitHub already has files,"
  echo "run: git pull origin $BRANCH --allow-unrelated-histories"
  echo "resolve any conflicts, then run ./push-update.sh again."
  exit 1
fi

echo "NoA update pushed to $REPO_URL on branch $BRANCH."
