import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException
} from "@aws-sdk/client-s3";
import { initTRPC } from "@trpc/server";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, or } from "drizzle-orm";
import superjson from "superjson";
import { z } from "zod";

import { db } from "@stitchharbor/db/client";
import { patterns } from "@stitchharbor/db/schema";
import { EMPTY_PATTERN_CONTENT, StitchType, type FrameConfig, type PatternContent } from "@stitchharbor/types";

const INLINE_CONTENT_MAX_BYTES = 1_000_000;
const CONTENT_TYPE_JSON = "application/json";

let cachedS3Client: S3Client | null = null;

type ApiSession = {
  user?: {
    id?: string | null;
  } | null;
} | null;

export type ApiContext = {
  session: ApiSession;
};

const t = initTRPC.context<ApiContext>().create({
  transformer: superjson
});

export const router = t.router;
export const publicProcedure = t.procedure;

const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  const userId = ctx.session?.user?.id;

  if (!userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: {
      ...ctx,
      userId
    }
  });
});

const hexColorSchema = z.custom<`#${string}`>(
  (value) => typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value),
  "Expected a 6-digit hex color"
);

const frameSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("none") }),
  z.object({
    type: z.literal("circle"),
    radius: z.number().int().positive(),
    centerX: z.number().optional(),
    centerY: z.number().optional()
  }),
  z.object({
    type: z.literal("oval"),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    centerX: z.number().optional(),
    centerY: z.number().optional()
  }),
  z.object({
    type: z.literal("rectangle"),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    x: z.number().optional(),
    y: z.number().optional()
  })
]) satisfies z.ZodType<FrameConfig>;

const paletteEntrySchema = z.object({
  id: z.number().int().nonnegative(),
  color: hexColorSchema,
  name: z.string().trim().min(1).max(80).optional(),
  symbol: z.string().min(1).max(4)
});

const patternContentSchema = z.object({
  version: z.literal(1),
  palette: z.array(paletteEntrySchema).max(256),
  stitches: z.array(
    z.object({
      x: z.number().int().nonnegative(),
      y: z.number().int().nonnegative(),
      p: z.number().int().nonnegative(),
      t: z.nativeEnum(StitchType)
    })
  ),
  backstitches: z.array(
    z.object({
      x1: z.number(),
      y1: z.number(),
      x2: z.number(),
      y2: z.number(),
      p: z.number().int().nonnegative()
    })
  ),
  knots: z.array(
    z.object({
      x: z.number(),
      y: z.number(),
      p: z.number().int().nonnegative()
    })
  )
}) satisfies z.ZodType<PatternContent>;

const defaultPatternContent: PatternContent = {
  version: EMPTY_PATTERN_CONTENT.version,
  palette: [
    { id: 0, color: "#0f766e", name: "Harbor Teal", symbol: "X" },
    { id: 1, color: "#e76f51", name: "Coral", symbol: "O" },
    { id: 2, color: "#f2cc8f", name: "Sand", symbol: "/" }
  ],
  stitches: [],
  backstitches: [],
  knots: []
};

export const appRouter = router({
  health: publicProcedure.query(() => ({ ok: true })),
  patterns: router({
    create: protectedProcedure
      .input(
        z.object({
          title: z.string().trim().min(1).max(120).default("Untitled Pattern"),
          description: z.string().trim().max(2000).nullable().optional(),
          gridWidth: z.number().int().min(1).max(1000),
          gridHeight: z.number().int().min(1).max(1000),
          fabricCount: z.number().int().min(6).max(40),
          frame: frameSchema.default({ type: "none" })
        })
      )
      .mutation(async ({ ctx, input }) => {
        const [created] = await db
          .insert(patterns)
          .values({
            userId: ctx.userId,
            title: input.title,
            description: input.description ?? null,
            gridWidth: input.gridWidth,
            gridHeight: input.gridHeight,
            fabricCount: input.fabricCount,
            frameType: input.frame.type,
            frameParams: input.frame,
            content: defaultPatternContent,
            stitchCount: 0,
            colorCount: defaultPatternContent.palette.length
          })
          .returning();

        if (!created) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create pattern." });
        }

        return toPatternPayload(created);
      }),
    save: protectedProcedure
      .input(
        z.object({
          id: z.string().uuid(),
          title: z.string().trim().min(1).max(120).optional(),
          description: z.string().trim().max(2000).nullable().optional(),
          isPublic: z.boolean().optional(),
          gridWidth: z.number().int().min(1).max(1000).optional(),
          gridHeight: z.number().int().min(1).max(1000).optional(),
          fabricCount: z.number().int().min(6).max(40).optional(),
          frame: frameSchema.optional(),
          content: patternContentSchema
        })
      )
      .mutation(async ({ ctx, input }) => {
        const existing = await db.query.patterns.findFirst({
          where: and(eq(patterns.id, input.id), eq(patterns.userId, ctx.userId))
        });

        if (!existing) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Pattern not found." });
        }

        const serializedContent = JSON.stringify(input.content);
        const byteLength = new TextEncoder().encode(serializedContent).byteLength;
        const shouldStoreInline = byteLength <= INLINE_CONTENT_MAX_BYTES;
        const s3Key = shouldStoreInline ? null : getPatternContentS3Key(ctx.userId, input.id);

        if (s3Key) {
          await uploadPatternContentToS3(s3Key, serializedContent);
        }

        const patch = {
          ...(input.title === undefined ? {} : { title: input.title }),
          ...(input.description === undefined ? {} : { description: input.description }),
          ...(input.isPublic === undefined ? {} : { isPublic: input.isPublic }),
          ...(input.gridWidth === undefined ? {} : { gridWidth: input.gridWidth }),
          ...(input.gridHeight === undefined ? {} : { gridHeight: input.gridHeight }),
          ...(input.fabricCount === undefined ? {} : { fabricCount: input.fabricCount }),
          ...(input.frame === undefined ? {} : { frameType: input.frame.type, frameParams: input.frame }),
          contentStorage: shouldStoreInline ? ("inline" as const) : ("s3" as const),
          contentS3Key: s3Key,
          content: shouldStoreInline ? input.content : null,
          stitchCount: countPatternElements(input.content),
          colorCount: input.content.palette.length,
          updatedAt: new Date()
        };

        const [updated] = await db
          .update(patterns)
          .set(patch)
          .where(and(eq(patterns.id, input.id), eq(patterns.userId, ctx.userId)))
          .returning();

        if (!updated) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Pattern not found." });
        }

        if (shouldStoreInline && existing.contentStorage === "s3" && existing.contentS3Key) {
          await deletePatternContentFromS3(existing.contentS3Key);
        }

        return toPatternPayload(updated);
      }),
    load: publicProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
      const visibility = ctx.session?.user?.id
        ? or(eq(patterns.isPublic, true), eq(patterns.userId, ctx.session.user.id))
        : eq(patterns.isPublic, true);

      const row = await db.query.patterns.findFirst({
        where: and(eq(patterns.id, input.id), visibility)
      });

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pattern not found." });
      }

      return toPatternPayload(row);
    }),
    loadOwned: protectedProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
      const row = await db.query.patterns.findFirst({
        where: and(eq(patterns.id, input.id), eq(patterns.userId, ctx.userId))
      });

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pattern not found." });
      }

      return toPatternPayload(row);
    }),
    list: protectedProcedure
      .input(
        z
          .object({
            limit: z.number().int().min(1).max(100).default(50)
          })
          .default({ limit: 50 })
      )
      .query(async ({ ctx, input }) => {
        const rows = await db.query.patterns.findMany({
          where: eq(patterns.userId, ctx.userId),
          orderBy: desc(patterns.updatedAt),
          limit: input.limit
        });

        return rows.map(toPatternMetadata);
      }),
    delete: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
      const [deleted] = await db
        .delete(patterns)
        .where(and(eq(patterns.id, input.id), eq(patterns.userId, ctx.userId)))
        .returning({ id: patterns.id });

      if (!deleted) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Pattern not found." });
      }

      return deleted;
    })
  })
});

export type AppRouter = typeof appRouter;

export const createCaller = t.createCallerFactory(appRouter);

async function toPatternPayload(row: typeof patterns.$inferSelect) {
  if (row.contentStorage === "s3") {
    if (!row.contentS3Key) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Pattern content is stored in S3 but has no object key."
      });
    }

    return {
      metadata: toPatternMetadata(row),
      content: await loadPatternContentFromS3(row.contentS3Key)
    };
  }

  return {
    metadata: toPatternMetadata(row),
    content: row.content ?? EMPTY_PATTERN_CONTENT
  };
}

function toPatternMetadata(row: typeof patterns.$inferSelect) {
  return {
    id: row.id,
    userId: row.userId,
    title: row.title,
    description: row.description,
    isPublic: row.isPublic,
    gridWidth: row.gridWidth,
    gridHeight: row.gridHeight,
    fabricCount: row.fabricCount,
    frame: row.frameParams,
    stitchCount: row.stitchCount,
    colorCount: row.colorCount,
    thumbnailUrl: row.thumbnailUrl,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function countPatternElements(content: PatternContent) {
  return content.stitches.length + content.backstitches.length + content.knots.length;
}

function getPatternContentS3Key(userId: string, patternId: string) {
  return `patterns/${userId}/${patternId}/content.json`;
}

function getS3Client() {
  if (cachedS3Client) return cachedS3Client;

  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

  if ((accessKeyId && !secretAccessKey) || (!accessKeyId && secretAccessKey)) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "S3 access key and secret key must be configured together."
    });
  }

  cachedS3Client = new S3Client({
    region: process.env.S3_REGION ?? "us-east-1",
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true" || Boolean(process.env.S3_ENDPOINT),
    credentials:
      accessKeyId && secretAccessKey
        ? {
            accessKeyId,
            secretAccessKey
          }
        : undefined
  });

  return cachedS3Client;
}

function getS3Bucket() {
  const bucket = process.env.S3_BUCKET;

  if (!bucket) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "S3_BUCKET is required for large pattern content storage."
    });
  }

  return bucket;
}

async function uploadPatternContentToS3(key: string, serializedContent: string) {
  try {
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: getS3Bucket(),
        Key: key,
        Body: serializedContent,
        ContentType: CONTENT_TYPE_JSON
      })
    );
  } catch (error) {
    throwS3StorageError("Failed to upload large pattern content.", error);
  }
}

async function loadPatternContentFromS3(key: string) {
  try {
    const response = await getS3Client().send(
      new GetObjectCommand({
        Bucket: getS3Bucket(),
        Key: key
      })
    );

    const serializedContent = await response.Body?.transformToString("utf-8");

    if (!serializedContent) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Stored pattern content is empty."
      });
    }

    const parseResult = patternContentSchema.safeParse(JSON.parse(serializedContent));

    if (!parseResult.success) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Stored pattern content is invalid."
      });
    }

    return parseResult.data;
  } catch (error) {
    if (error instanceof TRPCError) throw error;

    if (error instanceof SyntaxError) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Stored pattern content is not valid JSON."
      });
    }

    throwS3StorageError("Failed to load large pattern content.", error);
  }
}

async function deletePatternContentFromS3(key: string) {
  try {
    await getS3Client().send(
      new DeleteObjectCommand({
        Bucket: getS3Bucket(),
        Key: key
      })
    );
  } catch {
    // Old large-content objects should not make a successful inline save fail.
  }
}

function throwS3StorageError(message: string, error: unknown): never {
  if (error instanceof S3ServiceException && error.$metadata.httpStatusCode === 404) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message
    });
  }

  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message
  });
}
