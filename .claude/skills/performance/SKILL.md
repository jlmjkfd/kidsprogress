---
name: performance
description: Performance optimization patterns: React memoization (useMemo/useCallback/React.memo), TanStack Query cache tuning, MongoDB query/index optimization. Use when investigating slow renders, slow queries, or proactively optimizing hot paths.
---

# Performance Optimization

## React Optimization

### Memoization
```typescript
// 鉁?Memoize expensive calculations
const sortedItems = useMemo(() => {
  return items.sort((a, b) => a.value - b.value);
}, [items]);

// 鉁?Memoize callbacks passed as props
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);

// 鉁?Memoize components that re-render often
const ExpensiveComponent = memo(function ExpensiveComponent({ data }: Props) {
  return <div>{/* Complex rendering */}</div>;
});
```

### Code Splitting
```typescript
// 鉁?Lazy load routes/pages
const Dashboard = lazy(() => import('./pages/dashboard'));

// 鉁?Use Suspense
<Suspense fallback={<Loading />}>
  <Dashboard />
</Suspense>
```

### List Rendering
```typescript
// 鉁?Use keys properly
{items.map(item => (
  <Item key={item.id} data={item} />
))}

// 鉁?Virtualize long lists
import { VirtualList } from 'react-virtual';
```

## Backend Optimization

### Database
```typescript
// 鉁?Use select to limit fields
const users = await db.user.findMany({
  select: { id: true, name: true },
});

// 鉁?Use indexes for filtered/sorted queries
// 鉁?Batch queries when possible
const [users, posts] = await Promise.all([
  db.user.findMany(),
  db.post.findMany(),
]);
```

### Caching
```typescript
// 鉁?Cache expensive operations
const getCachedData = memoize(async (key: string) => {
  return await expensiveOperation(key);
}, { ttl: 60000 });

// 鉁?Use HTTP caching headers
res.set('Cache-Control', 'public, max-age=3600');
```

### Response Size
```typescript
// 鉁?Paginate large datasets
const { page = 1, limit = 20 } = req.query;
const users = await db.user.findMany({
  take: limit,
  skip: (page - 1) * limit,
});

// 鉁?Compress responses (use compression middleware)
app.use(compression());
```

## Bundle Size
```typescript
// 鉁?Import only what you need
import { map, filter } from 'lodash-es';

// 鉁?Avoid importing entire library
import _ from 'lodash';
```

## Image Optimization
```typescript
// 鉁?Use appropriate formats (WebP, AVIF)
// 鉁?Lazy load images
<img loading="lazy" src="..." alt="..." />

// 鉁?Use responsive images
<img
  srcSet="small.jpg 480w, medium.jpg 800w, large.jpg 1200w"
  sizes="(max-width: 600px) 480px, 800px"
/>
```

## Monitoring
- Track Core Web Vitals (LCP, FID, CLS)
- Monitor API response times
- Profile components with React DevTools
- Use Lighthouse for audits
