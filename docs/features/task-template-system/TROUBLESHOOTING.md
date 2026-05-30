# Plugin System Troubleshooting

## Import Errors Fixed ✅

### Issue: ModuleNotFoundError for backend.templates.addition_subtraction

**Problem**: Python cannot import modules with hyphens in the name.

**Solution**: Renamed backend template folders to use underscores:
- `backend/templates/addition-subtraction` → `backend/templates/addition_subtraction`
- Frontend keeps hyphens (not imported as Python modules)

**Plugin IDs remain unchanged**: `"addition-subtraction"` (user-facing ID with hyphen)

### Issue: execution_configs module not found

**Problem**: Old code referenced deleted `backend/models/execution_configs.py`

**Fixed in**:
- `backend/models/task_template.py` - Removed imports and Union types
- Changed `execution_config` field to `Dict[str, Any]`

## Current Status ✅

### Working Imports
```python
✅ from backend.templates.addition_subtraction import AdditionSubtractionHandler
✅ from backend.templates.writing import WritingHandler
✅ from backend.templates.registry import create_handler, get_registry
✅ from backend.models.task_template import TaskTemplate, TaskCompletion
```

### Known Dependency Issues (Unrelated to Plugin Migration)

These are pre-existing missing dependencies that need to be installed:

1. **email_validator**
   ```bash
   pip install email-validator
   ```

2. **google-generativeai** (for AI writing service)
   ```bash
   pip install google-generativeai
   ```

These don't affect the plugin system - they're separate service dependencies.

## Folder Structure

### Backend (Python Modules - Use Underscores)
```
backend/templates/
├── _shared/
│   └── base_handler.py
├── addition_subtraction/     ← Underscore (Python import)
│   ├── manifest.json          (id: "addition-subtraction")
│   ├── config.py
│   ├── handler.py
│   └── __init__.py
├── writing/
│   ├── manifest.json          (id: "writing")
│   ├── config.py
│   ├── handler.py
│   └── __init__.py
└── registry.py
```

### Frontend (Not Python Modules - Can Use Hyphens)
```
frontend/src/templates/
├── _shared/
├── addition-subtraction/      ← Hyphen OK (not Python)
│   ├── manifest.json
│   ├── components/
│   └── index.ts
├── writing/
└── registry.ts
```

## Plugin ID vs Folder Name

| Aspect | Format | Example |
|--------|--------|---------|
| Plugin ID (user-facing) | Kebab-case (hyphens) | `"addition-subtraction"` |
| Backend folder name | Snake_case (underscores) | `addition_subtraction/` |
| Frontend folder name | Either (not imported) | `addition-subtraction/` |
| Database template_id | Same as plugin ID | `"addition-subtraction"` |

## Verification Commands

Test plugin imports:
```bash
cd backend
python -c "from backend.templates.addition_subtraction import AdditionSubtractionHandler; print('OK')"
python -c "from backend.templates.writing import WritingHandler; print('OK')"
python -c "from backend.templates.registry import create_handler; print('OK')"
```

Test registry:
```bash
python -c "
from backend.templates.registry import get_registry
r = get_registry()
print('Plugins:', list(r.get_all_plugins().keys()))
"
```

## Common Issues

### 1. "No module named 'backend.templates.addition-subtraction'"
**Cause**: Folder has hyphen, Python can't import it
**Fix**: Rename to `addition_subtraction`

### 2. "No module named 'backend.models.execution_configs'"
**Cause**: Old code references deleted file
**Fix**: Remove imports from task_template.py (already done)

### 3. "No module named 'email_validator'" or "'google'"
**Cause**: Missing Python packages
**Fix**: Install dependencies (unrelated to plugin system)

### 4. Plugin not found at runtime
**Cause**: Plugin ID mismatch
**Fix**: Ensure manifest.json `id` field matches template_id in database

## Database Template IDs

Ensure database templates use correct plugin IDs:

```python
# Run this to update database
python -m backend.scripts.seed_plugin_templates
```

Verify:
```python
from motor.motor_asyncio import AsyncIOMotorClient
client = AsyncIOMotorClient("mongodb://localhost:27016")
db = client["kidsprogress"]

# Should show: addition-subtraction, writing
async for t in db.task_templates.find({}):
    print(t["template_id"], "->", t["execution_handler"])
```

## All Fixed! ✅

The plugin system is working correctly. All import errors have been resolved:
- ✅ Backend folders use underscores
- ✅ Plugin IDs use hyphens (user-facing)
- ✅ Old execution_configs references removed
- ✅ Registry imports work
- ✅ Database templates updated

Only unrelated dependency issues remain (email_validator, google-generativeai).
