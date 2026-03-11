import { z } from 'zod';

export const PaginationSchema = z.object({
  search: z.string().optional().default(''),
  limit: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().optional(),
});

export type PaginationDto = z.infer<typeof PaginationSchema>;
