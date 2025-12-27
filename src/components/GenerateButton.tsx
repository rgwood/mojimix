interface Props {
  onClick: () => void;
  disabled: boolean;
  isLoading: boolean;
}

function PixelSparkle() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className="h-5 w-5">
      <rect x="7" y="0" width="2" height="4" />
      <rect x="7" y="12" width="2" height="4" />
      <rect x="0" y="7" width="4" height="2" />
      <rect x="12" y="7" width="4" height="2" />
      <rect x="3" y="3" width="2" height="2" />
      <rect x="11" y="3" width="2" height="2" />
      <rect x="3" y="11" width="2" height="2" />
      <rect x="11" y="11" width="2" height="2" />
    </svg>
  );
}

export function GenerateButton({ onClick, disabled, isLoading }: Props) {
  // Allow clicking while loading to enqueue more generations
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`btn-bevel font-pixel mt-6 flex w-full items-center justify-center gap-3 rounded-lg py-4 px-6 text-lg font-bold text-white ${
        disabled
          ? "cursor-not-allowed bg-[var(--border-chunky)] opacity-50"
          : "bg-gradient-to-r from-[var(--hot-pink)] to-[var(--orange-pop)] hover:from-[var(--orange-pop)] hover:to-[var(--cyber-yellow)]"
      }`}
    >
      <PixelSparkle />
      <span>{isLoading ? "GENERATE MORE" : "GENERATE EMOJI"}</span>
      <PixelSparkle />
    </button>
  );
}
