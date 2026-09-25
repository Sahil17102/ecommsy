import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { blogsApi, type BlogListFilters } from "./api";
import type { CreateBlogPayload, UpdateBlogPayload } from "./types";

export const BLOGS_KEY = ["blogs"] as const;
const blogsListKey = (filters: BlogListFilters) => [...BLOGS_KEY, "list", filters] as const;
const blogKey = (id: string) => [...BLOGS_KEY, "detail", id] as const;

function useInvalidateBlogs() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: BLOGS_KEY });
}

export function useBlogs(filters: BlogListFilters = {}) {
  return useQuery({
    queryKey: blogsListKey(filters),
    queryFn: () => blogsApi.list(filters),
  });
}

export function useBlog(id: string | undefined) {
  return useQuery({
    queryKey: blogKey(id ?? ""),
    queryFn: () => blogsApi.get(id!),
    enabled: !!id,
  });
}

export function useCreateBlog() {
  const onSuccess = useInvalidateBlogs();
  return useMutation({
    mutationFn: (payload: CreateBlogPayload) => blogsApi.create(payload),
    onSuccess,
  });
}

export function useUpdateBlog() {
  const onSuccess = useInvalidateBlogs();
  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateBlogPayload & { id: string }) =>
      blogsApi.update(id, payload),
    onSuccess,
  });
}

export function useDeleteBlog() {
  const onSuccess = useInvalidateBlogs();
  return useMutation({
    mutationFn: (id: string) => blogsApi.delete(id),
    onSuccess,
  });
}

export function useUploadBlogCover() {
  const onSuccess = useInvalidateBlogs();
  return useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => blogsApi.uploadCover(id, file),
    onSuccess,
  });
}
