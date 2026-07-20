export function ErrorFallback({ error, reset }: { error?: Error; reset?: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6 text-center">
      <h2 className="mb-2 text-xl font-bold">Something went wrong</h2>
      <p className="mb-6 text-white/60">
        {error?.message ?? "An unexpected error occurred."}
      </p>
      {reset && (
        <button
          onClick={reset}
          className="rounded-full bg-white px-6 py-2 font-bold text-black active:scale-95"
        >
          Try again
        </button>
      )}
    </div>
  );
}
