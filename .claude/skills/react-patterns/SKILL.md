---
name: react-patterns
description: React + TypeScript conventions for KidsProgress: SOLID applied to components, hook composition, controlled inputs, prop types, file-per-component. Use when writing components under frontend/src/components or pages under frontend/src/pages.
---

# React Patterns

## SOLID Principles (CRITICAL)

Apply SOLID principles to frontend code:

### Single Responsibility Principle (SRP)
- **Components**: One component, one purpose
- **Hooks**: One hook, one specific behavior
- **Utils**: One utility, one function

```typescript
// 鉁?Component only handles login form UI
function LoginForm({ onSubmit }: Props) {
  return <form onSubmit={onSubmit}>...</form>;
}

// 鉁?Hook only handles login mutation
function useLogin() {
  return useMutation({ mutationFn: loginAPI });
}

// 鉁?Component does too much (UI + API + state)
function LoginForm() {
  const [user, setUser] = useState();
  const handleLogin = async () => { /* API call */ };
  return <form>...</form>;
}
```

### Open/Closed Principle (OCP)
- Use composition over inheritance
- Props for customization

```typescript
// 鉁?Open for extension via props
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  icon?: React.ReactNode;
  onClick: () => void;
}

function Button({ variant = 'primary', icon, onClick, children }: ButtonProps) {
  return (
    <button className={styles[variant]} onClick={onClick}>
      {icon} {children}
    </button>
  );
}
```

### Liskov Substitution Principle (LSP)
- Component variants must honor base interface
- Maintain consistent prop contracts

### Interface Segregation Principle (ISP)
- Small, focused prop interfaces
- Don't require unused props

```typescript
// 鉁?Focused interfaces
interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
}

interface FormInputProps extends TextInputProps {
  label: string;
  error?: string;
}

// 鉁?Bloated interface
interface InputProps {
  value: string;
  onChange: () => void;
  label?: string;
  error?: string;
  icon?: ReactNode;
  tooltip?: string;
  // ... too many optional props
}
```

### Dependency Inversion Principle (DIP)
- Components depend on abstractions (props, hooks)
- Not on concrete implementations

```typescript
// 鉁?Depends on hook abstraction
function UserProfile() {
  const { data: user } = useCurrentUser(); // Abstraction
  return <div>{user?.name}</div>;
}

// 鉁?Depends on concrete implementation
function UserProfile() {
  const [user, setUser] = useState();
  useEffect(() => {
    fetch('/api/user').then(res => res.json()).then(setUser);
  }, []); // Concrete implementation
  return <div>{user?.name}</div>;
}
```

## Component Definition
```typescript
// 鉁?Use function declaration
function MyComponent({ prop1, prop2 }: Props) {
  return <div>{prop1}</div>;
}

// 鉁?Don't use React.FC
const MyComponent: React.FC<Props> = ({ prop1, prop2 }) => {
  return <div>{prop1}</div>;
};
```

## File Structure

### Page Components
```
pages/
  my-page/
    index.tsx           # Main page component
    components/         # Page-specific components
    hooks/             # Page-specific hooks
    types/             # Page-specific types
    __tests__/         # Page tests
```

### Common Components
```
src/
  components/         # Reusable components
  hooks/             # Reusable hooks
  types/             # Shared types
```

## Hooks Rules
- Custom hooks must start with `use`
- Extract complex logic into hooks
- Page-specific hooks 鈫?`pages/[page]/hooks/`
- Reusable hooks 鈫?`src/hooks/`

## Props & Types
- Define Props interface above component
- Page-specific types 鈫?`pages/[page]/types/`
- Shared types 鈫?`src/types/`

## Icons
```typescript
// 鉁?Use icones package
import { IconCheckCircle } from '@tabler/icons-react';
<IconCheckCircle />

// 鉁?Don't use emoji or hard-coded SVG
<span>鉁?/span>
<svg>...</svg>
```

## State Management
- Local state: `useState`
- Complex state: `useReducer`
- Global state: Context or store (check project setup)

## Performance
- Wrap expensive computations in `useMemo`
- Wrap callbacks in `useCallback` when passed as props
- Use React.memo for pure components with frequent re-renders

## Responsive Design (CRITICAL)

### Requirements
- **All components must work on PC and mobile**
- Design mobile-first, enhance for desktop
- Test on multiple screen sizes

### Breakpoints (Tailwind CSS Standard)
```typescript
// sm: 640px   - Mobile landscape
// md: 768px   - Tablet
// lg: 1024px  - Desktop
// xl: 1280px  - Large desktop

// Usage
<div className="w-full md:w-1/2 lg:w-1/3">
```

### Responsive Patterns

#### Layout Stacking
```typescript
// 鉁?Stack on mobile, side-by-side on desktop
function Layout() {
  return (
    <div className="flex flex-col lg:flex-row">
      <aside className="w-full lg:w-64">Sidebar</aside>
      <main className="flex-1">Content</main>
    </div>
  );
}
```

#### Conditional Rendering
```typescript
// 鉁?Use media query hook
import { useMediaQuery } from '@/hooks/useMediaQuery';

function MyComponent() {
  const isMobile = useMediaQuery('(max-width: 768px)');

  return isMobile ? <MobileView /> : <DesktopView />;
}
```

#### Touch Targets
```typescript
// 鉁?Minimum 44px for touch targets
<button className="min-h-[44px] min-w-[44px] p-3">
  <IconMenu />
</button>

// 鉁?Too small for mobile
<button className="p-1">
  <IconMenu />
</button>
```

#### Font Sizes
```typescript
// 鉁?Responsive text sizes
<h1 className="text-2xl md:text-3xl lg:text-4xl">Title</h1>
<p className="text-base md:text-lg">Body text (min 16px on mobile)</p>

// 鉁?Fixed small text
<p className="text-xs">Too small on mobile</p>
```

#### Navigation
```typescript
// 鉁?Hamburger menu on mobile, full nav on desktop
function Navigation() {
  return (
    <>
      {/* Mobile */}
      <nav className="lg:hidden">
        <MobileMenu />
      </nav>

      {/* Desktop */}
      <nav className="hidden lg:flex">
        <DesktopMenu />
      </nav>
    </>
  );
}
```

#### Images & Media
```typescript
// 鉁?Responsive images
<img
  src="/image.jpg"
  className="w-full h-auto"
  loading="lazy"
/>

// 鉁?Prevent horizontal scroll
<div className="max-w-full overflow-x-hidden">
  <WideContent />
</div>
```

### Testing
- Test on Chrome DevTools device emulation
- Test actual mobile devices when possible
- Check landscape and portrait orientations
- Verify touch interactions work
