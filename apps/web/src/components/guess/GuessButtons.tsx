import { RatingBar } from "./RatingBar";

interface GuessButtonsProps {
  selected: number | null;
  onSelect: (rating: number) => void;
  disabled?: boolean;
}

export function GuessButtons({ selected, onSelect, disabled }: GuessButtonsProps) {
  return <RatingBar selected={selected} onSelect={onSelect} disabled={disabled} />;
}
