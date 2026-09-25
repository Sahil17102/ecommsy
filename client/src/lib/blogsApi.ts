import { api } from "./api";

export const BLOG_CATEGORIES = [
  "Shipping Tips",
  "E-commerce",
  "Industry News",
  "Product Updates",
  "Guides",
] as const;
export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

export interface PublicBlog {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: BlogCategory;
  author: string;
  readTime: string;
  /** Server returns a relative URL (/blogs/cover/<slug>.<ext>) — we render it via /api prefix. */
  coverImageUrl?: string;
  accentColor?: string;
  isFeatured: boolean;
  publishedAt?: string;
  seoTitle?: string;
  seoDescription?: string;
  createdAt: string;
}

export interface BlogListResponse {
  posts: PublicBlog[];
  featured: PublicBlog | null;
  categories: string[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Resolve a server-relative cover URL to a fetchable client URL.
 * Returns null when no image is set so callers can render a fallback.
 */
export function resolveCoverUrl(post: Pick<PublicBlog, "coverImageUrl">): string | null {
  if (!post.coverImageUrl) return null;
  // Server returns /blogs/cover/<slug>.<ext>; client api baseURL is /api.
  return `/api${post.coverImageUrl}`;
}

export const blogsApi = {
  list: async (params: { category?: string; page?: number; limit?: number } = {}): Promise<BlogListResponse> => {
    const { data } = await api.get("/blogs", { params });
    return data.data;
  },

  get: async (slug: string): Promise<PublicBlog> => {
    const { data } = await api.get(`/blogs/${slug}`);
    return data.blog;
  },
};
