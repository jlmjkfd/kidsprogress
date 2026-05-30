---
name: typescript-std
description: TypeScript standards for KidsProgress: strict mode, no implicit any, prefer interfaces for object shapes, discriminated unions for variants, no non-null assertions on values that may be null. Use when defining types/interfaces or fixing type errors.
---

# TypeScript Standards

## Type Definitions
```typescript
// 鉁?Use interface for objects
interface User {
  id: string;
  name: string;
}

// 鉁?Use type for unions/intersections
type Status = 'active' | 'inactive';
type UserWithStatus = User & { status: Status };

// 鉁?Explicit return types for functions
function getUser(id: string): User | null {
  // ...
}
```

## Avoid Any
```typescript
// 鉁?Avoid
const data: any = fetchData();

// 鉁?Use proper types
interface ApiResponse {
  data: User[];
  status: number;
}
const response: ApiResponse = fetchData();

// 鉁?Use unknown if type is truly unknown
const data: unknown = fetchData();
if (isUser(data)) {
  // Type guard
}
```

## Enums
```typescript
// 鉁?Use const enums when possible (better tree-shaking)
const enum Role {
  Admin = 'ADMIN',
  User = 'USER',
}

// 鉁?Use string literals for small sets
type Role = 'ADMIN' | 'USER';
```

## Generics
```typescript
// 鉁?Use descriptive names
function parseResponse<TData>(response: Response): Promise<TData> {
  return response.json();
}

// 鉁?Constrain generics when needed
function findById<T extends { id: string }>(items: T[], id: string): T | undefined {
  return items.find(item => item.id === id);
}
```

## Null Handling
```typescript
// 鉁?Use strict null checks (tsconfig: strictNullChecks: true)
function getUser(id: string): User | null {
  // Explicitly handle null
}

// 鉁?Use optional chaining
const name = user?.profile?.name;

// 鉁?Use nullish coalescing
const displayName = name ?? 'Anonymous';
```

## Type Location
- Page-specific: `pages/[page]/types/index.ts`
- Component-specific: `components/[component]/types.ts`
- Shared: `src/types/index.ts`
- API: `src/types/api.ts`
- Domain models: `src/types/models.ts`
