---
name: state-management
description: State boundary for KidsProgress frontend: Redux for client state only (UI, auth tokens, preferences); TanStack Query owns all server data. Use when adding a new slice, query/mutation hook, or moving data between client and server state.
---

# State Management

## Core Principle
**Separation of client state and server state**

- **Redux**: Client state only
- **TanStack Query**: Server state only
- **Never mix** API data in Redux

## Redux (Client State Only)

### What Goes in Redux
```typescript
// 鉁?UI state
interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  activeTab: string;
}

// 鉁?User preferences
interface PreferencesState {
  language: string;
  notifications: boolean;
}

// 鉁?Auth tokens (not user data)
interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
}
```

### Redux Structure
```
frontend/src/store/
  index.ts              # Store configuration
  slices/
    uiSlice.ts
    authSlice.ts
    preferencesSlice.ts
```

### Slice Template
```typescript
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  sidebarOpen: boolean;
}

const initialState: UIState = {
  sidebarOpen: true,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action: PayloadAction<boolean>) => {
      state.sidebarOpen = action.payload;
    },
  },
});

export const { toggleSidebar, setSidebarOpen } = uiSlice.actions;
export default uiSlice.reducer;
```

## TanStack Query (Server State)

### What Goes in TanStack Query
```typescript
// 鉁?All API data fetching
// 鉁?All data mutations
// 鉁?Cache management
// 鉁?Background refetching
```

### Query Structure
```
frontend/src/api/
  client.ts             # Axios/fetch client
  queries/
    useUsers.ts
    usePosts.ts
  mutations/
    useCreateUser.ts
    useUpdatePost.ts
```

### Query Hook Template
```typescript
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../client';

interface User {
  id: string;
  name: string;
  email: string;
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await apiClient.get<User[]>('/api/users');
      return response.data;
    },
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: ['users', id],
    queryFn: async () => {
      const response = await apiClient.get<User>(`/api/users/${id}`);
      return response.data;
    },
    enabled: !!id, // Only run if id exists
  });
}
```

### Mutation Hook Template
```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../client';

interface CreateUserData {
  name: string;
  email: string;
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateUserData) => {
      const response = await apiClient.post('/api/users', data);
      return response.data;
    },
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateUserData> }) => {
      const response = await apiClient.patch(`/api/users/${id}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      // Invalidate specific user and list
      queryClient.invalidateQueries({ queryKey: ['users', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}
```

## Usage in Components

```typescript
import { useUsers, useCreateUser } from '@/api/queries/useUsers';
import { useAppSelector, useAppDispatch } from '@/store';
import { toggleSidebar } from '@/store/slices/uiSlice';

function UsersList() {
  // 鉁?Server state from TanStack Query
  const { data: users, isLoading, error } = useUsers();
  const createUser = useCreateUser();

  // 鉁?Client state from Redux
  const sidebarOpen = useAppSelector(state => state.ui.sidebarOpen);
  const dispatch = useAppDispatch();

  const handleCreate = async (userData: CreateUserData) => {
    await createUser.mutateAsync(userData);
  };

  if (isLoading) return <Loading />;
  if (error) return <ErrorMessage message={error.message} />;

  return (
    <div>
      <button onClick={() => dispatch(toggleSidebar())}>
        Toggle Sidebar
      </button>
      {users?.map(user => <UserCard key={user.id} user={user} />)}
    </div>
  );
}
```

## Common Patterns

### Optimistic Updates
```typescript
export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUserApi,
    onMutate: async (newUser) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['users', newUser.id] });

      // Snapshot previous value
      const previousUser = queryClient.getQueryData(['users', newUser.id]);

      // Optimistically update
      queryClient.setQueryData(['users', newUser.id], newUser);

      return { previousUser };
    },
    onError: (err, newUser, context) => {
      // Rollback on error
      queryClient.setQueryData(['users', newUser.id], context?.previousUser);
    },
    onSettled: (data, error, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users', variables.id] });
    },
  });
}
```

### Dependent Queries
```typescript
function UserPosts({ userId }: { userId: string }) {
  const { data: user } = useUser(userId);
  const { data: posts } = useQuery({
    queryKey: ['posts', userId],
    queryFn: () => fetchUserPosts(userId),
    enabled: !!user, // Only fetch when user is loaded
  });
}
```

## Anti-Patterns

```typescript
// 鉁?Don't store API data in Redux
const userSlice = createSlice({
  name: 'user',
  initialState: { users: [] }, // WRONG!
  reducers: {
    setUsers: (state, action) => {
      state.users = action.payload; // WRONG!
    },
  },
});

// 鉁?Don't store UI state in TanStack Query
useQuery({
  queryKey: ['sidebarOpen'], // WRONG!
  queryFn: () => ({ open: true }), // WRONG!
});
```
