---
name: i18n
description: Internationalization rules for the frontend: every user-facing string must go through t('ns:key'), translations live under frontend/src/i18n/locales/{en,zh}/*.json, support English + Chinese. Use whenever adding or editing UI strings, error messages, toasts, placeholders, aria-labels.
---

# Internationalization (i18n)

## Requirements
- **All user-facing text must use i18n**
- Support English and Chinese (zh-CN)
- No hard-coded strings in components
- Error messages, warnings, notifications all use i18n

## Library
Use **react-i18next** for frontend i18n

## Structure
```
frontend/src/
  locales/
    en/
      common.json       # Common strings (buttons, nav)
      auth.json         # Authentication strings
      errors.json       # Error messages
      child.json        # Child portal strings
      parent.json       # Parent portal strings
    zh/
      common.json
      auth.json
      errors.json
      child.json
      parent.json
  i18n/
    config.ts          # i18next configuration
```

## Setup

### 1. Install Dependencies
```bash
npm install react-i18next i18next i18next-browser-languagedetector
```

### 2. Configuration
```typescript
// src/i18n/config.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enCommon from '../locales/en/common.json';
import enAuth from '../locales/en/auth.json';
import enErrors from '../locales/en/errors.json';
import zhCommon from '../locales/zh/common.json';
import zhAuth from '../locales/zh/auth.json';
import zhErrors from '../locales/zh/errors.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        auth: enAuth,
        errors: enErrors,
      },
      zh: {
        common: zhCommon,
        auth: zhAuth,
        errors: zhErrors,
      },
    },
    fallbackLng: 'en',
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
```

### 3. Initialize in App
```typescript
// App.tsx
import './i18n/config';
import { useTranslation } from 'react-i18next';

function App() {
  const { i18n } = useTranslation();

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        {/* Your app */}
      </QueryClientProvider>
    </Provider>
  );
}
```

## Usage Patterns

### Basic Translation
```typescript
import { useTranslation } from 'react-i18next';

function LoginPage() {
  const { t } = useTranslation('auth');

  return (
    <div>
      <h1>{t('login.title')}</h1>
      <p>{t('login.subtitle')}</p>
      <button>{t('login.submit')}</button>
    </div>
  );
}
```

### With Interpolation
```typescript
// JSON
{
  "welcome": "Welcome back, {{name}}!",
  "points": "You have {{count}} points"
}

// Component
<h1>{t('welcome', { name: user.name })}</h1>
<p>{t('points', { count: 150 })}</p>
```

### Pluralization
```typescript
// JSON
{
  "tasks": "{{count}} task",
  "tasks_plural": "{{count}} tasks"
}

// Component
<p>{t('tasks', { count: taskCount })}</p>
// count=1 鈫?"1 task"
// count=5 鈫?"5 tasks"
```

### Multiple Namespaces
```typescript
function MyComponent() {
  const { t } = useTranslation(['common', 'auth', 'errors']);

  return (
    <div>
      <button>{t('common:buttons.save')}</button>
      <h1>{t('auth:login.title')}</h1>
      <p>{t('errors:invalid_email')}</p>
    </div>
  );
}
```

### Error Messages
```typescript
// errors.json
{
  "network_error": "Network error. Please check your connection.",
  "invalid_credentials": "Invalid email or password",
  "server_error": "Server error. Please try again later.",
  "validation": {
    "required": "This field is required",
    "email_invalid": "Please enter a valid email",
    "password_min": "Password must be at least 6 characters"
  }
}

// Component
if (error.type === 'network') {
  toast.error(t('errors:network_error'));
}
```

### Language Switcher
```typescript
function LanguageSwitcher() {
  const { i18n } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div>
      <button onClick={() => changeLanguage('en')}>English</button>
      <button onClick={() => changeLanguage('zh')}>涓枃</button>
    </div>
  );
}
```

## Translation File Structure

### Good Structure
```json
// auth.json
{
  "login": {
    "title": "Welcome Back",
    "subtitle": "Sign in to your account",
    "email_label": "Email",
    "email_placeholder": "you@example.com",
    "password_label": "Password",
    "password_placeholder": "Enter your password",
    "submit": "Sign In",
    "forgot_password": "Forgot password?",
    "no_account": "Don't have an account?",
    "signup_link": "Sign up"
  },
  "register": {
    "title": "Create Account",
    "submit": "Sign Up"
  }
}
```

### Bad Structure (Don't Do This)
```json
// 鉁?Flat structure, hard to maintain
{
  "login_title": "Welcome Back",
  "login_subtitle": "Sign in",
  "login_email": "Email",
  // ... mixed with other features
}
```

## Best Practices

### 1. Always Use Namespaces
```typescript
// 鉁?Good - organized by feature
t('auth:login.title')
t('child:dashboard.tasks')
t('errors:network_error')

// 鉁?Bad - flat structure
t('login_title')
t('dashboard_tasks')
```

### 2. Never Hard-Code Strings
```typescript
// 鉁?Bad
<button>Submit</button>
<p>Welcome back, {user.name}!</p>

// 鉁?Good
<button>{t('common:buttons.submit')}</button>
<p>{t('common:welcome', { name: user.name })}</p>
```

### 3. Extract Error Messages
```typescript
// 鉁?Bad
throw new Error('Invalid email or password');

// 鉁?Good
throw new Error(t('errors:invalid_credentials'));

// Better - use error codes
throw new ApiError('INVALID_CREDENTIALS');
// Then in component:
if (error.code === 'INVALID_CREDENTIALS') {
  toast.error(t('errors:invalid_credentials'));
}
```

### 4. Use Context for Forms
```typescript
// Form labels and errors together
{
  "form": {
    "email": {
      "label": "Email Address",
      "placeholder": "Enter your email",
      "errors": {
        "required": "Email is required",
        "invalid": "Invalid email format"
      }
    },
    "password": {
      "label": "Password",
      "placeholder": "At least 6 characters",
      "errors": {
        "required": "Password is required",
        "min_length": "Password must be at least 6 characters"
      }
    }
  }
}

// Usage
<input placeholder={t('auth:form.email.placeholder')} />
{error && <span>{t(`auth:form.email.errors.${error.type}`)}</span>}
```

### 5. Date/Time Formatting
```typescript
// Use i18next with date formatting
import { useTranslation } from 'react-i18next';

function TaskCard({ dueDate }: Props) {
  const { t, i18n } = useTranslation();

  const formattedDate = new Intl.DateTimeFormat(i18n.language, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(dueDate);

  return <p>{t('common:due_date', { date: formattedDate })}</p>;
}
```

## Backend i18n (Optional for MVP)

For API error messages in multiple languages:

```python
# backend/i18n/messages.py
MESSAGES = {
    'en': {
        'invalid_credentials': 'Invalid email or password',
        'email_exists': 'Email already registered',
        'server_error': 'Internal server error'
    },
    'zh': {
        'invalid_credentials': '閭鎴栧瘑鐮佹棤鏁?,
        'email_exists': '閭宸茶娉ㄥ唽',
        'server_error': '鏈嶅姟鍣ㄥ唴閮ㄩ敊璇?
    }
}

# Usage in routes
from fastapi import Request

@router.post("/login")
async def login(request: Request):
    lang = request.headers.get('Accept-Language', 'en')
    # ...
    raise HTTPException(
        status_code=401,
        detail=MESSAGES[lang]['invalid_credentials']
    )
```

## Testing i18n

```typescript
// Test with different languages
describe('LoginPage', () => {
  it('renders in English', () => {
    i18n.changeLanguage('en');
    render(<LoginPage />);
    expect(screen.getByText('Welcome Back')).toBeInTheDocument();
  });

  it('renders in Chinese', () => {
    i18n.changeLanguage('zh');
    render(<LoginPage />);
    expect(screen.getByText('娆㈣繋鍥炴潵')).toBeInTheDocument();
  });
});
```

## Language Persistence

```typescript
// Store user language preference
const { i18n } = useTranslation();

useEffect(() => {
  const savedLang = localStorage.getItem('user_language');
  if (savedLang) {
    i18n.changeLanguage(savedLang);
  }
}, []);

const changeLanguage = (lng: string) => {
  i18n.changeLanguage(lng);
  localStorage.setItem('user_language', lng);
};
```

## Common Translations

All features must include translations for:
- 鉁?Button labels
- 鉁?Form labels and placeholders
- 鉁?Error messages
- 鉁?Success messages
- 鉁?Validation messages
- 鉁?Navigation items
- 鉁?Page titles and headings
- 鉁?Tooltips and help text
- 鉁?Loading states
- 鉁?Empty states
