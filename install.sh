#!/usr/bin/env bash
# One-line installer for any machine or Claude Code cloud environment:
#   curl -fsSL https://raw.githubusercontent.com/qadri-uk/claude-skills/main/install.sh | bash
set -e
npx -y skills add qadri-uk/claude-skills --skill '*' --agent claude-code --global --yes --full-depth
MD="$HOME/.claude/CLAUDE.md"; mkdir -p "$HOME/.claude"
grep -q "BEGIN proactive-skills" "$MD" 2>/dev/null || cat "$HOME/.claude/skills/_proactive/CLAUDE.md" >> "$MD"
if command -v claude >/dev/null 2>&1; then
  claude mcp add shadcn --scope user -- npx -y shadcn@latest mcp >/dev/null 2>&1 || true
  claude mcp add chrome-devtools --scope user -- npx -y chrome-devtools-mcp@latest >/dev/null 2>&1 || true
  [ -n "${MAGIC_API_KEY:-}" ] && claude mcp add magic --scope user -- npx -y @21st-dev/magic@latest "API_KEY=$MAGIC_API_KEY" >/dev/null 2>&1 || true
fi
echo "Installed $(ls $HOME/.claude/skills | wc -l) skills from qadri-uk/claude-skills. Restart Claude Code."
