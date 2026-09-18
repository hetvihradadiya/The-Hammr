import { z } from 'zod';

export const createAuctionSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Title is required')
      .max(200, 'Title must be at most 200 characters'),

    description: z
      .string()
      .trim()
      .min(1, 'Description is required')
      .max(5000, 'Description must be at most 5000 characters'),

    categoryId: z
      .number({
        message: 'Category ID must be a number',
      })
      .int('Category ID must be an integer')
      .positive('Category ID must be positive'),

    startingPrice: z
      .number({
        message: 'Starting price must be a number',
      })
      .positive('Starting price must be greater than 0'),

    reservePrice: z
      .number({
        message: 'Reserve price must be a number',
      })
      .positive('Reserve price must be greater than 0')
      .optional(),

    scheduledStart: z.iso.datetime({
      message: 'Scheduled start must be a valid ISO date',
    }),

    scheduledEnd: z.iso.datetime({
      message: 'Scheduled end must be a valid ISO date',
    }),
  })
  .superRefine((data, ctx) => {
    const start = new Date(data.scheduledStart);
    const end = new Date(data.scheduledEnd);

    if (end <= start) {
      ctx.addIssue({
        code: 'custom',
        path: ['scheduledEnd'],
        message: 'Scheduled end must be after scheduled start',
      });
    }

    if (data.reservePrice !== undefined && data.reservePrice < data.startingPrice) {
      ctx.addIssue({
        code: 'custom',
        path: ['reservePrice'],
        message: 'Reserve price must be greater than or equal to starting price',
      });
    }
  });

export type CreateAuctionInput = z.infer<typeof createAuctionSchema>;
