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
    <div className={`${SIZE_MAP[size]} relative animate-spin`} aria-label="Loading">
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary-500 via-accent-pink to-accent-cyan opacity-30 blur-sm" />
      <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary-500 border-r-accent-pink" />
    </div>
  );
}
