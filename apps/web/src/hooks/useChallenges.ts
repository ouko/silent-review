import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface Challenge {
  id: string;
  name: string;
  description: string | null;
  expiresAt: string;
  creator: { id: string; username: string; displayName: string | null; avatarUrl: string | null };
  participants: Array<{
    userId: string;
    score: number;
    user: { id: string; username: string; displayName: string | null; avatarUrl: string | null };
  }>;
}

export function useChallenges() {
  const queryClient = useQueryClient();

  const { data: myData, isLoading: isLoadingMy } = useQuery<{ challenges: Challenge[] }>({
    queryKey: ["challenges", "me"],
    queryFn: async () => {
      const { data } = await api.get("/api/challenges/me");
      return data;
    },
  });

  const { data: allData, isLoading: isLoadingAll } = useQuery<{ challenges: Challenge[] }>({
    queryKey: ["challenges", "discover"],
    queryFn: async () => {
      const { data } = await api.get("/api/challenges");
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: { name: string; description?: string }) => {
      const { data } = await api.post("/api/challenges", input);
      return data.challenge as Challenge;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
    },
  });

  const joinMutation = useMutation({
    mutationFn: async (challengeId: string) => {
      const { data } = await api.post(`/api/challenges/${challengeId}/join`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
    },
  });

  const myChallenges = myData?.challenges ?? [];
  const joinedChallengeIds = new Set(myChallenges.map((c) => c.id));
  const discoverChallenges = (allData?.challenges ?? []).filter((c) => !joinedChallengeIds.has(c.id));

  return {
    myChallenges,
    discoverChallenges,
    isLoading: isLoadingMy || isLoadingAll,
    createChallenge: createMutation.mutateAsync,
    joinChallenge: joinMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isJoining: joinMutation.isPending,
  };
}
