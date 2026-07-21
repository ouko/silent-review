export interface ExportCaption {
  caption: string;
  hashtags: string;
  mentions: string;
}

export function generateCaption(productName: string, platform: string, rating?: number): ExportCaption {
  const ratingText = rating ? `Can you guess the rating? It was ${rating}/10.` : "Can you guess the rating?";
  const base = `${productName} — ${ratingText}`;
  const hashtags = "#SilentReview #GuessTheRating #ProductReview #Viral";
  const mentions = platform === "twitter" ? "@silentreview" : "@silentreview.app";
  return { caption: base, hashtags, mentions };
}
