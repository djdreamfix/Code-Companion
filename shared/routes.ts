import { z } from 'zod';
import { createMarkSchema, subscribeSchema, marks } from './schema';

export const api = {
  marks: {
    list: {
      method: 'GET' as const,
      path: '/api/marks',
      responses: {
        200: z.array(z.custom<typeof marks.$inferSelect>()),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/marks',
      input: createMarkSchema,
      responses: {
        201: z.custom<typeof marks.$inferSelect>(),
        400: z.object({ error: z.string() }),
      },
    },
  },
  push: {
    subscribe: {
      method: 'POST' as const,
      path: '/api/push/subscribe',
      input: subscribeSchema,
      responses: {
        201: z.object({ ok: z.boolean() }),
        400: z.object({ error: z.string() }),
      },
    },
  },
};
