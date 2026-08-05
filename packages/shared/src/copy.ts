/**
 * Central copy source for notifications and share cards.
 *
 * Tone guidance for this app:
 * - Pattern-breaking: avoid generic "You have a new notification!" noise.
 * - Personality-driven: the app talks like a clever friend, not a brand.
 * - Urgency without panic: FOMO is fine; anxiety is not.
 * - Action-oriented: every string implies the next thing to do.
 */

export const notificationCopy = {
  dailyDrop: {
    title: "Your daily guess is live",
    body: "A new review is waiting. Don't let it age like milk.",
  },
  streakAtRisk: {
    title: (streakDays: number) =>
      streakDays >= 7 ? `${streakDays}-day streak at risk` : "Streak at risk",
    body: (streakDays: number) =>
      streakDays >= 7
        ? `Your ${streakDays}-day streak ends tonight. One tap saves it.`
        : "Your streak ends tonight unless you play today.",
  },
  challengeReceived: {
    title: (challengerName: string) => `${challengerName} challenged you`,
    body: "They think you can't beat their score. Prove them wrong.",
  },
  scoreBeaten: {
    title: (beaterName: string) => `${beaterName} beat your score`,
    body: (scoreDiff: number) =>
      scoreDiff > 0
        ? `They topped you by ${scoreDiff} point${scoreDiff === 1 ? "" : "s"}. Rematch?`
        : "They edged past you. Take them down in a rematch.",
  },
};

export const shareCopy = {
  resultCard: {
    prompt: "Can you beat me?",
    subtitle: "Guess the rating before the reveal.",
    dailyDropPrompt: "I guessed today's Daily Drop. Can you?",
    challengePrompt: (challengerName: string) =>
      `${challengerName} challenged you to beat this score.`,
  },
};

export const toastCopy = {
  streakSaved: "Streak saved. Tomorrow is a new day.",
  freezeEarned: "You earned a streak freeze. Miss one day, stay protected.",
  milestone: (days: number) =>
    `${days}-day streak! That's not luck, that's commitment.`,
};
