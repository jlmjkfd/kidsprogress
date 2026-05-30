# Hook Setup Guide

Hooks automatically load relevant skills based on your prompts and file changes, saving tokens and ensuring consistency.

## What Hooks Do

1. **Analyze your prompt** for keywords and intent patterns
2. **Check file paths** you're working with
3. **Load relevant skills** from `.claude/skills/`
4. **Enforce guidelines** during code generation

## Setting Up Hooks in VSCode

### Option 1: User Prompt Submit Hook (Recommended)

Add to your VSCode settings (`.vscode/settings.json` or User Settings):

```json
{
  "claude.hooks.userPromptSubmit": "node .claude/hooks/load-skills.js"
}
```

### Option 2: Manual Skill Loading

If hooks aren't available, manually reference skills in your prompts:

```
Check react-patterns skill before implementing this component
```

## Hook Script

Create `.claude/hooks/load-skills.js`:

```javascript
/**
 * Auto-load relevant skills based on prompt and file context
 * Run on every prompt submission
 */

const fs = require('fs');
const path = require('path');

const SKILLS_DIR = path.join(__dirname, '..', 'skills');
const CONFIG_PATH = path.join(SKILLS_DIR, 'config.json');

// Read prompt from stdin or args
const prompt = process.argv.slice(2).join(' ');

// Load skill configuration
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));

// Determine which skills to load
const relevantSkills = [];

for (const [skillName, skillConfig] of Object.entries(config)) {
  const { triggers, file } = skillConfig;

  // Check keyword matches
  const hasKeyword = triggers.keywords?.some(keyword =>
    prompt.toLowerCase().includes(keyword.toLowerCase())
  );

  // Check intent patterns
  const matchesIntent = triggers.intentPatterns?.some(pattern =>
    new RegExp(pattern, 'i').test(prompt)
  );

  // Always load if specified
  const alwaysLoad = skillConfig.alwaysLoad;

  if (hasKeyword || matchesIntent || alwaysLoad) {
    const skillPath = path.join(SKILLS_DIR, file);
    const skillContent = fs.readFileSync(skillPath, 'utf-8');
    relevantSkills.push({ name: skillName, content: skillContent });
  }
}

// Output loaded skills as context
if (relevantSkills.length > 0) {
  console.log('<!-- Auto-loaded skills -->');
  relevantSkills.forEach(skill => {
    console.log(`\n## Skill: ${skill.name}\n`);
    console.log(skill.content);
  });
  console.log('\n<!-- End auto-loaded skills -->');
}
```

## Testing Your Hook

```bash
# Test skill loading
node .claude/hooks/load-skills.js "create a new component"
node .claude/hooks/load-skills.js "add API endpoint"
node .claude/hooks/load-skills.js "write unit test"
```

## Troubleshooting

- **Skills not loading**: Check file paths in `config.json`
- **Wrong skills loaded**: Adjust keywords/patterns in `config.json`
- **Performance issues**: Reduce `alwaysLoad` skills

## Benefits

✓ Token savings (only load relevant skills)
✓ Consistent code style
✓ Automatic guideline enforcement
✓ No manual skill referencing needed
