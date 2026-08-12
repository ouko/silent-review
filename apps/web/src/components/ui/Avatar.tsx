interface AvatarProps {
  src?: string | null;
  alt?: string;
  name?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  online?: boolean;
  className?: string;
}

const SIZE_MAP = {
  xs: "h-8 w-8 text-xs",
  sm: "h-10 w-10 text-sm",
  md: "h-14 w-14 text-base",
  lg: "h-20 w-20 text-2xl",
  xl: "h-28 w-28 text-4xl",
};

export function Avatar({ src, alt = "", name = "", size = "md", online, className = "" }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      <div className="absolute -inset-0.5 rounded-full bg-gradient-to-tr from-primary-500 via-accent-pink to-accent-cyan opacity-70 blur-[2px]" />
      {src ? (
        <img
          src={src}
          alt={alt}
          className={`relative rounded-full object-cover ring-2 ring-void ${SIZE_MAP[size]}`}
        />
      ) : (
        <div
          className={`relative flex items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-accent-pink font-bold text-white ring-2 ring-void ${SIZE_MAP[size]}`}
        >
          {initials || "?"}
        </div>
      )}
      {online !== undefined && (
        <span
          className={[
            "absolute bottom-0 right-0 rounded-full ring-2 ring-void",
            online ? "bg-accent-lime" : "bg-white/30",
            size === "xs" || size === "sm" ? "h-2.5 w-2.5" : "h-3.5 w-3.5",
          ].join(" ")}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
