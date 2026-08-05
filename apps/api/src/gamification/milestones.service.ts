export interface MilestoneAward {
  id: string;
  name: string;
  description?: string;
}

export async function checkStreakMilestones(
  _userId: string,
  _streakDays: number
): Promise<MilestoneAward[]> {
  return [];
}
