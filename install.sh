#!/usr/bin/env bash
# One-line installer for any machine or Claude Code cloud environment:
#   curl -fsSL https://raw.githubusercontent.com/qadri-uk/claude-skills/main/install.sh | bash
# Each step runs independently; a warning from one step does not stop the rest.
set -u
REPO="qadri-uk/claude-skills"
STATUS=0

echo "==> Installing skills from $REPO"
if npx -y skills add "$REPO" --skill '*' --agent claude-code --global --yes --full-depth </dev/null; then
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
  claude mcp add shadcn --scope user -- npx -y shadcn@latest mcp </dev/null >/dev/null 2>&1 && echo "   shadcn: added" || echo "   shadcn: already present or skipped"
  claude mcp add chrome-devtools --scope user -- npx -y chrome-devtools-mcp@latest </dev/null >/dev/null 2>&1 && echo "   chrome-devtools: added" || echo "   chrome-devtools: already present or skipped"
  if [ -n "${MAGIC_API_KEY:-}" ]; then
    claude mcp add magic --scope user -- npx -y @21st-dev/magic@latest "API_KEY=$MAGIC_API_KEY" </dev/null >/dev/null 2>&1 && echo "   21st.dev magic: added" || echo "   21st.dev magic: already present or skipped"
  else
    echo "   21st.dev magic: skipped (set MAGIC_API_KEY to enable)"
  fi
else
  echo "   claude CLI not found; MCP step skipped"
fi

echo "==> gstack (garrytan/gstack, MIT): a runtime with its own setup, not plugin skills"
GSTACK="$HOME/.claude/skills/gstack"
if ! command -v bun >/dev/null 2>&1 && [ ! -x "$HOME/.bun/bin/bun" ]; then
  curl -fsSL https://bun.sh/install | bash >/dev/null 2>&1 && echo "   bun: installed" || echo "   bun: install failed"
fi
export PATH="$HOME/.bun/bin:$PATH"
if command -v bun >/dev/null 2>&1; then
  if [ -d "$GSTACK/.git" ]; then
    echo "   gstack: already installed (it updates itself; /gstack-upgrade to force)"
  else
    git clone -q --single-branch --depth 1 https://github.com/garrytan/gstack.git "$GSTACK" || STATUS=1
  fi
  # --prefix: skills are /gstack-review, /gstack-qa ... so none shadows another skill's name.
  if (cd "$GSTACK" && ./setup --prefix --quiet </dev/null >/dev/null 2>&1); then
    echo "   gstack: setup ok"
    # Its Playwright wants a newer Chromium build than a cloud container ships; this adds it beside the others.
    GSTACK_CHROMIUM_NO_SANDBOX=1 "$GSTACK/bin/gstack-browser-ensure" --quiet </dev/null 2>/dev/null | tail -1 | sed 's/^/   gstack browser: /'
  else
    echo "   gstack: ./setup failed; run it by hand in $GSTACK"; STATUS=1
  fi
else
  echo "   gstack: skipped (bun unavailable)"; STATUS=1
fi

COUNT=$(ls "$HOME/.claude/skills" 2>/dev/null | wc -l | tr -d ' ')
echo "==> Done: $COUNT skills in ~/.claude/skills from $REPO. Restart Claude Code to load CLAUDE.md and MCPs."
exit $STATUS
