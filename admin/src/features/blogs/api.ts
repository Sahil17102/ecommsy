import { api } from "@/lib/api";
import type {
  Blog,
  BlogListResponse,
  BlogResponse,
  CreateBlogPayload,
  UpdateBlogPayload,
} from "./types";

export interface BlogListFilters {
  status?: "draft" | "published";
  search?: string;
  page?: number;
  limit?: number;
}

export const blogsApi = {
  list: async (filters: BlogListFilters = {}): Promise<BlogListResponse["data"]> => {
    const { data } = await api.get<BlogListResponse>("/blogs", { params: filters });
    return data.data;
  },

  get: async (id: string): Promise<Blog> => {
    const { data } = await api.get<BlogResponse>(`/blogs/${id}`);
    return data.blog;
  },

  create: async (payload: CreateBlogPayload): Promise<Blog> => {
    const { data } = await api.post<BlogResponse>("/blogs", payload);
    return data.blog;
  },

  update: async (id: string, payload: UpdateBlogPayload): Promise<Blog> => {
    const { data } = await api.put<BlogResponse>(`/blogs/${id}`, payload);
    return data.blog;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/blogs/${id}`);
  },

  uploadCover: async (id: string, file: File): Promise<Blog> => {
    const formData = new FormData();
    formData.append("cover", file);
    const { data } = await api.post<BlogResponse>(`/blogs/${id}/cover`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.blog;
  },

  /**
   * Upload an inline image used inside the post body. Returns the public URL
   * the editor inserts as `<img src="...">`. Different from cover upload —
   * doesn't mutate the blog record itself.
   */
  uploadInlineImage: async (id: string, file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append("image", file);
    const { data } = await api.post<{ success: boolean; url: string }>(
      `/blogs/${id}/inline-image`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    // Server returns a /api-relative URL — TipTap will insert it as-is, and
    // the public route serves it without auth.
    return { url: `/api${data.url}` };
  },
};
