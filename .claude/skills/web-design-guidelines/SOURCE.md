# Source

Vendored verbatim from [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills)
at commit `063bee94c3f4df8453406c830b0a7df0f2860278`, path `skills/web-design-guidelines/`.

That repository ships no `.claude-plugin/marketplace.json`, so it cannot be added as a
Claude Code plugin marketplace, so the skill is copied into `.claude/skills/` instead.

To refresh:

```bash
npx skills add https://github.com/vercel-labs/agent-skills --skill web-design-guidelines
```

The skill itself fetches the live rules from
<https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md>
on each run, so the rule set stays current even when this file does not.
