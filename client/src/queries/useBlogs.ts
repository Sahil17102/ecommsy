import { useQuery } from "@tanstack/react-query";
import { blogsApi } from "@/lib/blogsApi";

export const BLOGS_KEY = ["blogs"] as const;

export function useBlogs(category?: string) {
  return useQuery({
    queryKey: [...BLOGS_KEY, "list", category ?? "All"] as const,
    queryFn: () => blogsApi.list({ category }),
    staleTime: 5 * 60_000, // 5 min — blog content doesn't change often
  });
}

export function useBlog(slug: string | undefined) {
  return useQuery({
    queryKey: [...BLOGS_KEY, "detail", slug] as const,
    queryFn: () => blogsApi.get(slug!),
    enabled: !!slug,
    staleTime: 5 * 60_000,
  });
}
