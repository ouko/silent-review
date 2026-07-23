import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

interface FeatureFlagsResponse {
  features: Record<string, boolean>;
}

export function useFeatureFlag(key: string) {
  const { data, isLoading, error } = useQuery<FeatureFlagsResponse>({
    queryKey: ["features"],
    queryFn: async () => {
      const { data } = await api.get("/api/features");
      return data as FeatureFlagsResponse;
    },
    staleTime: 1000 * 60 * 2,
  });

  return {
    enabled: data?.features[key] ?? false,
    features: data?.features ?? {},
    isLoading,
    error,
  };
}
