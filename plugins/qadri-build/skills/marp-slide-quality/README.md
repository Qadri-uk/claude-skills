# Marp Slide Quality Skill

Claude Skill for analyzing and improving Marp markdown presentations using SlideGauge.

## What it does

This skill helps you:
- Analyze Marp presentations for quality issues
- Get specific, actionable feedback on each slide
- Fix common problems (too many bullets, long content, etc.)
- Validate improvements after making changes

## When it activates

The skill activates automatically when you:
- Work with `.md` files containing `marp: true` frontmatter
- Ask to check, analyze, or improve slide quality
- Mention SlideGauge or presentation quality
- Request help with specific slide issues

## Files included

- **SKILL.md** - Main skill instructions and workflow
- **REFERENCE.md** - Complete SlideGauge rule documentation
- **EXAMPLES.md** - Real-world fix examples with before/after
- **FIXES.md** - Quick reference for common issues

## How to use

Simply ask Claude to help with your Marp slides:

```
"Can you check the quality of my presentation?"
"Help me fix the slides that are failing"
"Analyze tinker-presentation.md with SlideGauge"
```

Claude will automatically:
1. Run SlideGauge analysis
2. Identify problematic slides
3. Suggest specific fixes
4. Validate improvements

## Dependencies

- SlideGauge (auto-installed via uvx)
- jq (for JSON parsing)

## Scoring thresholds

- **100**: Perfect score
- **90+**: Excellent quality
- **80-89**: Good quality
- **70-79**: Passing (minor issues)
- **< 70**: Failing (needs fixes)

## Common issues fixed

- Too many bullets (>6)
- Content too long (>350 chars)
- Too many lines (>15)
- Title too long (>35 chars)
- Code examples too long (>10 lines)
- Missing alt text on images
- Low color contrast

## Examples

See EXAMPLES.md for detailed before/after examples of:
- Splitting overloaded slides
- Simplifying code examples
- Consolidating bullet points
- Adding context to short content

## Installation

This skill is installed in `~/.claude/skills/marp-slide-quality/`

To share with your team, copy to `.claude/skills/marp-slide-quality/` in your project repo.

## Author

Created based on SlideGauge by nibzard (https://github.com/nibzard/slidegauge)
