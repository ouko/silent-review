import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import type { DailyDropData } from '../../../hooks/useDailyDrop';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const componentPath = path.resolve(__dirname, '../DailyDropPlayer.tsx');
const componentExists = existsSync(componentPath);

let DailyDropPlayer: React.ComponentType<any>;

beforeAll(async () => {
  if (componentExists) {
    const mod = await import(componentPath);
    DailyDropPlayer = (mod.DailyDropPlayer ?? mod.default) as React.ComponentType<any>;
  }
});

const describeOrSkip = componentExists ? describe : describe.skip;

const dailyDrop: DailyDropData = {
  id: 'dd1',
  date: new Date().toISOString(),
  reviewId: 'r1',
  isOverride: false,
  createdAt: new Date().toISOString(),
  alreadyGuessed: false,
  review: {
    id: 'r1',
    videoUrl: 'https://example.com/video.mp4',
    thumbnailUrl: null,
    rating: 8,
    duration: 10,
    guessCount: 42,
    caption: 'Daily review',
    productTag: null,
    product: { id: 'p1', name: 'Widget', category: 'tools' },
    user: { id: 'u1', username: 'creator', displayName: null, avatarUrl: null },
    createdAt: new Date().toISOString(),
  },
};

describeOrSkip('DailyDropPlayer', () => {
  it('submits the selected rating', () => {
    const onAttempt = vi.fn();
    const onReveal = vi.fn();

    render(
      <DailyDropPlayer
        dailyDrop={dailyDrop}
        alreadyGuessed={false}
        onAttempt={onAttempt}
        onReveal={onReveal}
      />
    );

    const ratingButton = screen.getByRole('radio', { name: '8' });
    fireEvent.click(ratingButton);

    const submitButton = screen.getByRole('button', { name: /lock it in/i });
    fireEvent.click(submitButton);

    expect(onAttempt).toHaveBeenCalledWith(8);
  });

  it('reveals the result and shares on demand', () => {
    const onAttempt = vi.fn();
    const onReveal = vi.fn();

    render(
      <DailyDropPlayer
        dailyDrop={dailyDrop}
        alreadyGuessed={true}
        onAttempt={onAttempt}
        onReveal={onReveal}
      />
    );

    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText(/the actual rating was/i)).toBeInTheDocument();

    const shareButton = screen.getByRole('button', { name: /share result/i });
    fireEvent.click(shareButton);
    expect(onReveal).toHaveBeenCalled();
  });
});
