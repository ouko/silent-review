# Silent Review — Copy Source of Truth

This file owns every user-facing string that needs to ship quickly or be
pattern-tested: push notifications, in-app notifications, share cards, and
toasts. Keep the voice consistent with the product pitch:

> Watch a video where people secretly review stuff, guess what rating they gave
> it, and beat your friends to prove you know what's actually good.

## Voice

- **Pattern-breaking:** Avoid generic "You have a new notification!" noise. The
  first few words must earn the tap.
- **Personality-driven:** The app talks like a clever friend, not a brand.
- **Urgency without panic:** FOMO is fine; anxiety is not.
- **Action-oriented:** Every string implies the next thing to do.
- **Spoiler-free:** Share cards and result cards never reveal the answer before
  the viewer plays.

---

## Push / In-App Notifications

### Daily Drop live

- **Title:** Your daily guess is live
- **Body:** A new review is waiting. Don't let it age like milk.
- **When:** New Daily Drop published at each user's historical active hour.

### Streak at risk

- **Title (streak < 7):** Streak at risk
- **Body (streak < 7):** Your streak ends tonight unless you play today.
- **Title (streak ≥ 7):** `{N}-day streak at risk`
- **Body (streak ≥ 7):** Your `{N}`-day streak ends tonight. One tap saves it.
- **When:** Evening of any day the user has not completed the Daily Drop.

### Challenge received

- **Title:** `{challengerName}` challenged you
- **Body:** They think you can't beat their score. Prove them wrong.
- **When:** A friend sends a head-to-head challenge.

### Score beaten

- **Title:** `{beaterName}` beat your score
- **Body (diff > 0):** They topped you by `{N}` point(s). Rematch?
- **Body (diff = 0):** They edged past you. Take them down in a rematch.
- **When:** The second player in a challenge beats the first player's score.

### Streak freeze earned

- **Toast:** You earned a streak freeze. Miss one day, stay protected.

### Streak saved by freeze

- **Toast:** Streak saved. Tomorrow is a new day.

### Streak milestone

- **Toast:** `{N}-day streak! That's not luck, that's commitment.`

---

## Share Cards

- **Result card prompt:** Can you beat me?
- **Result card subtitle:** Guess the rating before the reveal.
- **Daily Drop prompt:** I guessed today's Daily Drop. Can you?
- **Challenge prompt:** `{challengerName}` challenged you to beat this score.
- **Watermark / brand line:** Silent Review

Rules for any new share card variant:

1. No frame may show the actual rating for an unplayed viewer.
2. Encode performance, not answers (green/yellow/gray grid, accuracy %, streak).
3. Include a deep link (`/play/:shareId`) and a QR code.
4. Keep the file under 5 MB.

---

## Empty / Placeholder States

- **No challenges:** No open challenges. Send one and make someone sweat.
- **No Daily Drop archive:** Check back tomorrow for your first result.
- **No notifications:** You're all caught up.

---

## Tone Checks for Iteration

Before changing any string above, ask:

- Does it sound like something a friend would text?
- Does it make the next action obvious?
- Would it still work if read out of context in a notification shade?
- Does it preserve the spoiler-free rule for share cards?
