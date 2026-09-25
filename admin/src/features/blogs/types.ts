export const BLOG_CATEGORIES = [
  "Shipping Tips",
  "E-commerce",
  "Industry News",
  "Product Updates",
  "Guides",
] as const;
export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

export const BLOG_STATUSES = ["draft", "published"] as const;
export type BlogStatus = (typeof BLOG_STATUSES)[number];

export interface Blog {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: BlogCategory;
  author: string;
  readTime: string;
  /** Server returns a relative URL like /blogs/cover/<slug>.jpg — concat with API base when rendering. */
  coverImageUrl?: string;
  accentColor?: string;
  status: BlogStatus;
  isFeatured: boolean;
  publishedAt?: string;
  seoTitle?: string;
  seoDescription?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface BlogListResponse {
  success: boolean;
  data: {
    blogs: Blog[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export interface BlogResponse {
  success: boolean;
  blog: Blog;
}

export interface CreateBlogPayload {
  title: string;
  slug?: string;
  excerpt: string;
  content: string;
  category: BlogCategory;
  author: string;
  readTime?: string;
  accentColor?: string;
  status: BlogStatus;
  isFeatured?: boolean;
  seoTitle?: string;
  seoDescription?: string;
}

export type UpdateBlogPayload = Partial<CreateBlogPayload>;
