#!/usr/bin/env bash
# One-line installer for any machine or Claude Code cloud environment:
#   curl -fsSL https://raw.githubusercontent.com/qadri-uk/claude-skills/main/install.sh | bash
# Each step runs independently; a warning from one step does not stop the rest.
set -u
REPO="qadri-uk/claude-skills"
STATUS=0

echo "==> Installing skills from $REPO"
if npx -y skills add "$REPO" --skill '*' --agent claude-code --global --yes --full-depth; then
  echo "   skills: ok"
else
  echo "   skills: npx skills add exited non-zero (usually a warning about duplicate names); continuing"
  STATUS=1
fi

echo "==> Proactive-skills instructions"
MD="$HOME/.claude/CLAUDE.md"; mkdir -p "$HOME/.claude"
SRC="$HOME/.claude/skills/_proactive/CLAUDE.md"
if grep -q "BEGIN proactive-skills" "$MD" 2>/dev/null; then
  echo "   CLAUDE.md: block already present"
elif [ -f "$SRC" ]; then
  cat "$SRC" >> "$MD" && echo "   CLAUDE.md: block appended"
else
  echo "   CLAUDE.md: source $SRC not found, skipped"; STATUS=1
fi

echo "==> MCP servers"
if command -v claude >/dev/null 2>&1; then
  claude mcp add shadcn --scope user -- npx -y shadcn@latest mcp >/dev/null 2>&1 && echo "   shadcn: added" || echo "   shadcn: already present or skipped"
  claude mcp add chrome-devtools --scope user -- npx -y chrome-devtools-mcp@latest >/dev/null 2>&1 && echo "   chrome-devtools: added" || echo "   chrome-devtools: already present or skipped"
  if [ -n "${MAGIC_API_KEY:-}" ]; then
    claude mcp add magic --scope user -- npx -y @21st-dev/magic@latest "API_KEY=$MAGIC_API_KEY" >/dev/null 2>&1 && echo "   21st.dev magic: added" || echo "   21st.dev magic: already present or skipped"
  else
    echo "   21st.dev magic: skipped (set MAGIC_API_KEY to enable)"
  fi
else
  echo "   claude CLI not found; MCP step skipped"
fi

COUNT=$(ls "$HOME/.claude/skills" 2>/dev/null | wc -l | tr -d ' ')
echo "==> Done: $COUNT skills in ~/.claude/skills from $REPO. Restart Claude Code to load CLAUDE.md and MCPs."
exit $STATUS
