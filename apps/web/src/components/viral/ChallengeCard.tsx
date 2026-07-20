import { useChallenges } from "../../hooks/useChallenges";
import { Button } from "../ui/Button";

export function ChallengeList() {
  const { challenges, isLoading, createChallenge, joinChallenge, isCreating } = useChallenges();

  async function handleCreate() {
    const name = prompt("Challenge name:");
    if (!name) return;
    await createChallenge({ name });
  }

  if (isLoading) {
    return <p className="p-4 text-white/50">Loading challenges...</p>;
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Active challenges</h2>
        <Button onClick={handleCreate} disabled={isCreating}>
          New
        </Button>
      </div>

      {challenges.length === 0 && (
        <p className="text-white/50">No active challenges. Create one to challenge friends!</p>
      )}

      {challenges.map((challenge) => (
        <div key={challenge.id} className="rounded-xl bg-white/5 p-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-bold">{challenge.name}</h3>
            <span className="text-xs text-white/50">
              Ends {new Date(challenge.expiresAt).toLocaleDateString()}
            </span>
          </div>
          {challenge.description && (
            <p className="mb-3 text-sm text-white/60">{challenge.description}</p>
          )}
          <div className="space-y-1">
            {challenge.participants.slice(0, 5).map((p, i) => (
              <div key={p.userId} className="flex items-center justify-between text-sm">
                <span>
                  {i + 1}. {p.user.displayName ?? p.user.username}
                </span>
                <span className="font-bold">{p.score}</span>
              </div>
            ))}
          </div>
          <Button
            onClick={() => joinChallenge(challenge.id)}
            className="mt-3 w-full"
            variant="secondary"
          >
            Join challenge
          </Button>
        </div>
      ))}
    </div>
  );
}
