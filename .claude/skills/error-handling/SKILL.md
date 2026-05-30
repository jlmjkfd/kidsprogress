---
name: error-handling
description: Error-handling strategy for the KidsProgress stack: custom exception classes, try/except scoping, FastAPI HTTPException mapping, frontend error boundaries and toast surfaces. Use when adding error handling, validation, or recovery logic on either side.
---

# Error Handling

## Custom Error Classes
```typescript
// src/types/errors.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(404, 'NOT_FOUND', message);
  }
}

export class ValidationError extends AppError {
  constructor(details: any) {
    super(400, 'VALIDATION_ERROR', 'Validation failed', details);
  }
}
```

## Backend Error Handling
```typescript
// Throw specific errors
if (!user) {
  throw new NotFoundError('User not found');
}

// Centralized error middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
  }

  // Unexpected errors
  console.error(err);
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    },
  });
});
```

## Frontend Error Handling
```typescript
// API client with error handling
async function apiCall<T>(url: string): Promise<T> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      const error = await response.json();
      throw new ApiError(error.error.message, error.error.code);
    }
    return response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new NetworkError('Network request failed');
  }
}

// Component error handling
function UserProfile({ userId }: Props) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUser(userId)
      .catch(err => {
        setError(err.message);
        // Log to error tracking service
        logError(err);
      });
  }, [userId]);

  if (error) return <ErrorMessage message={error} />;
  // ...
}
```

## Async Error Handling
```typescript
// 鉁?Always catch async errors
async function processData() {
  try {
    await riskyOperation();
  } catch (error) {
    // Handle or rethrow
    throw new ProcessingError('Failed to process data', error);
  }
}

// 鉁?Use error boundaries for React (class component)
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    logError(error, errorInfo);
  }
}
```

## Validation Errors
```typescript
// Backend
const result = schema.safeParse(data);
if (!result.success) {
  throw new ValidationError(result.error.flatten());
}

// Frontend
const [errors, setErrors] = useState<Record<string, string>>({});

function handleSubmit(data: FormData) {
  const result = schema.safeParse(data);
  if (!result.success) {
    setErrors(formatZodErrors(result.error));
    return;
  }
  // Submit...
}
```
