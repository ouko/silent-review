interface GuessButtonsProps {
  selected: number | null;
  onSelect: (rating: number) => void;
  disabled?: boolean;
}

function ratingColor(rating: number, isSelected: boolean): string {
  let base = "";
  if (rating <= 5) base = "bg-red-500";
  else if (rating === 6) base = "bg-yellow-500";
  else base = "bg-green-500";

  if (isSelected) return `${base} ring-4 ring-white scale-110`;
  return `${base} opacity-80`;
}

export function GuessButtons({ selected, onSelect, disabled }: GuessButtonsProps) {
  return (
    <div className="grid grid-cols-5 gap-2 px-4">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((rating) => (
        <button
          key={rating}
          onClick={() => !disabled && onSelect(rating)}
          disabled={disabled}
          className={`flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white shadow-lg transition-transform active:scale-90 ${ratingColor(
            rating,
            selected === rating
          )} ${disabled ? "opacity-50" : ""}`}
        >
          {rating}
        </button>
      ))}
    </div>
  );
}
