import { z } from 'zod';

const schema = z.object({
  VITE_API_BASE_URL: z.string().url().default('http://localhost:8000'),
});

export const env = schema.parse(import.meta.env);
