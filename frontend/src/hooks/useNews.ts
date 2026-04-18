import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { NewsArticle } from "@/lib/types";

export function useNews() {
  return useQuery<NewsArticle[]>({
    queryKey: ["news"],
    queryFn: async () => {
      const data = await api.getNews();
      return data.news ?? [];
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 4 * 60 * 1000,
    retry: 1,
  });
}
