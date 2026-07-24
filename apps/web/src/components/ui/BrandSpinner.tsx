interface BrandSpinnerProps {
  size?: "sm" | "md" | "lg";
}

const SIZE_MAP = {
  sm: "h-6 w-6",
  md: "h-10 w-10",
  lg: "h-16 w-16",
};

export function BrandSpinner({ size = "md" }: BrandSpinnerProps) {
  return (
    <div className={`${SIZE_MAP[size]} relative animate-spin`}>
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-rose-500 via-pink-500 to-violet-500 opacity-30 blur-sm" />
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-rose-500 border-r-pink-500" />
    </div>
  );
}
