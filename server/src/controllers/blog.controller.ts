import type { Request, Response } from "express";
import { and, count, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { db } from "../config/db.js";
import { blogs } from "../db/schema.js";
import { uploadDocument, downloadDocument } from "../services/storage.js";
import { MIME_TO_EXT } from "../config/constants.js";
import logger from "../config/logger.js";

const TAG = "[BlogController]";

export const BLOG_STATUSES = ["draft", "published"] as const;
export type BlogStatus = (typeof BLOG_STATUSES)[number];

export const BLOG_CATEGORIES = [
  "Shipping Tips",
  "E-commerce",
  "Industry News",
  "Product Updates",
  "Guides",
] as const;
export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

type BlogRow = typeof blogs.$inferSelect;
type BlogInsert = typeof blogs.$inferInsert;

// ── Helpers ──

function buildCoverKey(slug: string, ext: string) {
  return `blogs/${slug}/cover.${ext}`;
}

/** Slugify a title. Falls back to a random suffix if the result is empty. */
function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || `post-${Date.now()}`;
}

/** Estimate reading time at ~200 words/min. */
function estimateReadTime(content: string): string {
  const words = content.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
}

/** Resolve cover image key → public URL we serve via this controller. */
function buildCoverUrl(blog: { coverImageKey: string | null; slug: string }): string | undefined {
  if (!blog.coverImageKey) return undefined;
  const ext = blog.coverImageKey.split(".").pop() || "jpg";
  return `/blogs/cover/${blog.slug}.${ext}`;
}

/** Public-shape projection: replaces storageKey with a hosted URL. */
function shapeBlog(blog: BlogRow) {
  const { coverImageKey, ...rest } = blog;
  return {
    ...rest,
    coverImageUrl: buildCoverUrl({ coverImageKey, slug: blog.slug }),
  };
}

// ── Public read handlers ──────────────────────────────────────────

/**
 * GET /blogs — Public listing of published posts.
 * Query: ?category=Shipping%20Tips&page=1&limit=12
 */
export async function handlePublicListBlogs(req: Request, res: Response) {
  const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || "12", 10)));
  const category = req.query.category as string | undefined;

  const conditions = [eq(blogs.status, "published")];
  if (category && category !== "All" && (BLOG_CATEGORIES as readonly string[]).includes(category)) {
    conditions.push(eq(blogs.category, category));
  }
  const whereClause = and(...conditions);

  const [totalRow, posts, featuredDoc] = await Promise.all([
    db.select({ value: count() }).from(blogs).where(whereClause).then((rows) => rows[0]?.value ?? 0),
    db
      .select()
      .from(blogs)
      .where(whereClause)
      .orderBy(desc(blogs.publishedAt), desc(blogs.createdAt))
      .offset((page - 1) * limit)
      .limit(limit),
    db.query.blogs.findFirst({
      where: and(eq(blogs.status, "published"), eq(blogs.isFeatured, true)),
      orderBy: desc(blogs.publishedAt),
    }),
  ]);

  const total = totalRow;

  res.json({
    success: true,
    data: {
      posts: posts.map(shapeBlog),
      featured: featuredDoc ? shapeBlog(featuredDoc) : null,
      categories: ["All", ...BLOG_CATEGORIES],
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
}

/**
 * GET /blogs/:slug — Public single-post fetch.
 */
export async function handlePublicGetBlog(req: Request, res: Response) {
  const blog = await db.query.blogs.findFirst({
    where: and(eq(blogs.slug, req.params.slug), eq(blogs.status, "published")),
  });
  if (!blog) {
    res.status(404).json({ success: false, error: "Post not found" });
    return;
  }
  res.json({ success: true, blog: shapeBlog(blog) });
}

/**
 * GET /blogs/cover/:filename — Proxy-serve a blog cover image from storage.
 */
export async function handleServeBlogCover(req: Request, res: Response) {
  const filename = req.params.filename;
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) {
    res.status(400).json({ success: false, error: "Invalid filename" });
    return;
  }
  const slug = filename.slice(0, lastDot);
  const ext = filename.slice(lastDot + 1);

  try {
    const { buffer, contentType } = await downloadDocument(buildCoverKey(slug, ext));
    res.set({
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
      "Content-Length": String(buffer.length),
    });
    res.send(buffer);
  } catch {
    res.status(404).json({ success: false, error: "Cover image not found" });
  }
}

// ── Admin handlers ───────────────────────────────────────────────

/**
 * GET /admin/blogs — Admin listing (includes drafts).
 * Query: ?status=draft|published&search=keyword&page=1&limit=20
 */
export async function handleAdminListBlogs(req: Request, res: Response) {
  const page = Math.max(1, parseInt((req.query.page as string) || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || "20", 10)));
  const status = req.query.status as string | undefined;
  const search = req.query.search as string | undefined;

  const conditions = [] as Array<ReturnType<typeof eq>>;
  if (status === "draft" || status === "published") conditions.push(eq(blogs.status, status));
  if (search) {
    const like = `%${search}%`;
    const searchClause = or(ilike(blogs.title, like), ilike(blogs.slug, like), ilike(blogs.author, like));
    if (searchClause) conditions.push(searchClause as unknown as ReturnType<typeof eq>);
  }
  const whereClause = conditions.length ? and(...conditions) : undefined;

  const [totalRow, rows] = await Promise.all([
    db.select({ value: count() }).from(blogs).where(whereClause).then((r) => r[0]?.value ?? 0),
    db
      .select()
      .from(blogs)
      .where(whereClause)
      .orderBy(desc(blogs.createdAt))
      .offset((page - 1) * limit)
      .limit(limit),
  ]);

  res.json({
    success: true,
    data: {
      blogs: rows.map(shapeBlog),
      pagination: { page, limit, total: totalRow, totalPages: Math.ceil(totalRow / limit) },
    },
  });
}

/**
 * GET /admin/blogs/:id — Single blog by id (admin view, includes drafts).
 */
export async function handleAdminGetBlog(req: Request, res: Response) {
  const blog = await db.query.blogs.findFirst({ where: eq(blogs.id, req.params.id) });
  if (!blog) {
    res.status(404).json({ success: false, error: "Blog not found" });
    return;
  }
  res.json({ success: true, blog: shapeBlog(blog) });
}

/**
 * POST /admin/blogs — Create a new blog post.
 */
export async function handleCreateBlog(req: Request, res: Response) {
  const {
    title,
    excerpt,
    content,
    category,
    author,
    readTime,
    accentColor,
    status,
    isFeatured,
    seoTitle,
    seoDescription,
    slug: customSlug,
  } = req.body as Partial<BlogInsert> & { content?: string };

  if (!title || !excerpt || !content || !category || !author) {
    res.status(400).json({
      success: false,
      error: "title, excerpt, content, category, and author are required",
    });
    return;
  }

  if (!(BLOG_CATEGORIES as readonly string[]).includes(category)) {
    res.status(400).json({ success: false, error: "Invalid category" });
    return;
  }

  // Resolve a unique slug. Walk numeric suffixes until we find one free.
  const baseSlug = customSlug ? slugify(customSlug) : slugify(title);
  let slug = baseSlug;
  let suffix = 2;
  while (await db.query.blogs.findFirst({ where: eq(blogs.slug, slug), columns: { id: true } })) {
    slug = `${baseSlug}-${suffix++}`;
    if (suffix > 100) {
      res.status(500).json({ success: false, error: "Could not generate a unique slug" });
      return;
    }
  }

  const resolvedStatus = (status as string) || "draft";
  if (!(BLOG_STATUSES as readonly string[]).includes(resolvedStatus)) {
    res.status(400).json({ success: false, error: "Invalid status" });
    return;
  }

  const [blog] = await db
    .insert(blogs)
    .values({
      slug,
      title,
      excerpt,
      content,
      category,
      author,
      readTime: readTime || estimateReadTime(content),
      accentColor: accentColor ?? null,
      status: resolvedStatus,
      isFeatured: !!isFeatured,
      publishedAt: resolvedStatus === "published" ? new Date() : null,
      seoTitle: seoTitle ?? null,
      seoDescription: seoDescription ?? null,
      createdBy: req.userId!,
    })
    .returning();

  logger.info(`${TAG} Created blog "${blog.title}" (slug=${blog.slug}, status=${blog.status})`);
  res.status(201).json({ success: true, blog: shapeBlog(blog) });
}

/**
 * PUT /admin/blogs/:id — Update an existing blog.
 */
export async function handleUpdateBlog(req: Request, res: Response) {
  const existing = await db.query.blogs.findFirst({ where: eq(blogs.id, req.params.id) });
  if (!existing) {
    res.status(404).json({ success: false, error: "Blog not found" });
    return;
  }

  const {
    title,
    slug,
    excerpt,
    content,
    category,
    author,
    readTime,
    accentColor,
    status,
    isFeatured,
    seoTitle,
    seoDescription,
  } = req.body as Partial<BlogInsert> & { content?: string };

  const patch: Partial<BlogInsert> = {};

  if (slug && slug !== existing.slug) {
    const normalized = slugify(slug);
    const conflict = await db.query.blogs.findFirst({
      where: and(eq(blogs.slug, normalized), ne(blogs.id, existing.id)),
      columns: { id: true },
    });
    if (conflict) {
      res.status(409).json({ success: false, error: "Another post already uses that slug" });
      return;
    }
    patch.slug = normalized;
  }

  if (title !== undefined) patch.title = title;
  if (excerpt !== undefined) patch.excerpt = excerpt;
  if (content !== undefined) {
    patch.content = content;
    // Re-estimate read time if the editor didn't override it explicitly.
    if (readTime === undefined) patch.readTime = estimateReadTime(content);
  }
  if (category !== undefined) {
    if (!(BLOG_CATEGORIES as readonly string[]).includes(category)) {
      res.status(400).json({ success: false, error: "Invalid category" });
      return;
    }
    patch.category = category as BlogCategory;
  }
  if (author !== undefined) patch.author = author;
  if (readTime !== undefined) patch.readTime = readTime;
  if (accentColor !== undefined) patch.accentColor = accentColor;
  if (isFeatured !== undefined) patch.isFeatured = !!isFeatured;
  if (seoTitle !== undefined) patch.seoTitle = seoTitle;
  if (seoDescription !== undefined) patch.seoDescription = seoDescription;

  // Track first-time publication so publishedAt reflects when it actually went live.
  if (status !== undefined && status !== existing.status) {
    if (!(BLOG_STATUSES as readonly string[]).includes(status as string)) {
      res.status(400).json({ success: false, error: "Invalid status" });
      return;
    }
    patch.status = status;
    if (status === "published" && !existing.publishedAt) {
      patch.publishedAt = new Date();
    }
  }

  patch.updatedAt = new Date();

  const [blog] = await db.update(blogs).set(patch).where(eq(blogs.id, existing.id)).returning();
  logger.info(`${TAG} Updated blog "${blog.title}" (slug=${blog.slug})`);
  res.json({ success: true, blog: shapeBlog(blog) });
}

/**
 * DELETE /admin/blogs/:id — Hard delete.
 */
export async function handleDeleteBlog(req: Request, res: Response) {
  const [blog] = await db.delete(blogs).where(eq(blogs.id, req.params.id)).returning();
  if (!blog) {
    res.status(404).json({ success: false, error: "Blog not found" });
    return;
  }
  logger.info(`${TAG} Deleted blog "${blog.title}" (slug=${blog.slug})`);
  res.json({ success: true });
}

/**
 * POST /admin/blogs/:id/inline-image — Upload an image to be embedded inside the post body.
 */
export async function handleUploadInlineImage(req: Request, res: Response) {
  const file = req.file;
  if (!file) {
    res.status(400).json({ success: false, error: "No file uploaded" });
    return;
  }

  const blog = await db.query.blogs.findFirst({ where: eq(blogs.id, req.params.id) });
  if (!blog) {
    res.status(404).json({ success: false, error: "Blog not found" });
    return;
  }

  const ext = MIME_TO_EXT[file.mimetype] || "jpg";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const storageKey = `blogs/${blog.slug}/inline/${filename}`;

  await uploadDocument(storageKey, file.buffer, file.mimetype);

  const url = `/blogs/${blog.slug}/inline/${filename}`;

  logger.info(`${TAG} Uploaded inline image for blog "${blog.title}" → ${storageKey}`);
  res.json({ success: true, url });
}

/**
 * GET /blogs/:slug/inline/:filename — Public proxy-serve for inline images.
 */
export async function handleServeInlineImage(req: Request, res: Response) {
  const { slug, filename } = req.params;
  const storageKey = `blogs/${slug}/inline/${filename}`;

  try {
    const { buffer, contentType } = await downloadDocument(storageKey);
    res.set({
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
      "Content-Length": String(buffer.length),
    });
    res.send(buffer);
  } catch {
    res.status(404).json({ success: false, error: "Image not found" });
  }
}

/**
 * POST /admin/blogs/:id/cover — Upload or replace a blog cover image.
 */
export async function handleUploadCover(req: Request, res: Response) {
  const file = req.file;
  if (!file) {
    res.status(400).json({ success: false, error: "No file uploaded" });
    return;
  }

  const existing = await db.query.blogs.findFirst({ where: eq(blogs.id, req.params.id) });
  if (!existing) {
    res.status(404).json({ success: false, error: "Blog not found" });
    return;
  }

  const ext = MIME_TO_EXT[file.mimetype] || "jpg";
  const storageKey = buildCoverKey(existing.slug, ext);

  await uploadDocument(storageKey, file.buffer, file.mimetype);

  const [blog] = await db
    .update(blogs)
    .set({ coverImageKey: storageKey, updatedAt: new Date() })
    .where(eq(blogs.id, existing.id))
    .returning();

  logger.info(`${TAG} Uploaded cover for blog "${blog.title}" → ${storageKey}`);
  res.json({ success: true, blog: shapeBlog(blog) });
}
