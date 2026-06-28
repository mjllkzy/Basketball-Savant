import { z } from "zod";

const boolish = z
  .union([z.literal("true"), z.literal("false"), z.boolean()])
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    if (typeof value === "boolean") return value;
    return value === "true";
  });

const numberish = z
  .string()
  .optional()
  .transform((value) => (value === undefined || value === "" ? undefined : Number(value)))
  .refine((value) => value === undefined || Number.isFinite(value), "Must be a number");

export const listQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().trim().max(60).optional(),
  order: z.enum(["asc", "desc"]).optional(),
  teamId: z.string().trim().optional(),
  position: z.string().trim().optional(),
  season: z.string().trim().optional(),
  seasonType: z.enum(["Regular Season", "Playoffs"]).optional(),
  minGames: z.coerce.number().int().min(0).optional(),
  minMinutes: z.coerce.number().min(0).optional()
});

export const teamQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().trim().max(60).optional(),
  order: z.enum(["asc", "desc"]).optional(),
  conference: z.enum(["East", "West"]).optional(),
  division: z.string().trim().optional(),
  seasonType: z.enum(["Regular Season", "Playoffs"]).optional()
});

export const shotQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  sort: z.string().trim().max(60).optional(),
  order: z.enum(["asc", "desc"]).optional(),
  playerId: z.string().trim().optional(),
  teamId: z.string().trim().optional(),
  opponent: z.string().trim().optional(),
  season: z.string().trim().optional(),
  seasonType: z.enum(["Regular Season", "Playoffs"]).optional(),
  quarter: z.coerce.number().int().min(1).max(4).optional(),
  clutch: boolish,
  garbageTime: boolish,
  shotZone: z.string().trim().optional(),
  shotType: z.string().trim().optional(),
  playType: z.string().trim().optional(),
  result: z.enum(["made", "missed"]).optional(),
  defender: z.string().trim().optional(),
  assister: z.string().trim().optional(),
  transition: boolish,
  assisted: boolish,
  pullUp: boolish,
  catchAndShoot: boolish,
  minExpectedPoints: numberish,
  minActualMinusExpected: numberish,
  maxActualMinusExpected: numberish
});

export const leadersQuerySchema = listQuerySchema.extend({
  metric: z.string().trim().default("pts"),
  stat: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional()
});

export function parseSearchParams<T extends z.ZodTypeAny>(schema: T, request: Request): z.infer<T> {
  const params = Object.fromEntries(new URL(request.url).searchParams.entries());
  return schema.parse(params);
}
