interface Props {
  onClick: () => void;
  disabled: boolean;
  isLoading: boolean;
}

function LoadingSpinner() {
  return (
    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export function GenerateButton({ onClick, disabled, isLoading }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={`mt-6 flex w-full items-center justify-center gap-2 rounded-lg py-3 px-6 font-semibold text-white transition-all duration-200 ${
        disabled || isLoading
          ? "cursor-not-allowed bg-gray-400"
          : "bg-gradient-to-r from-purple-600 to-pink-600 shadow-lg hover:from-purple-700 hover:to-pink-700 hover:shadow-xl"
      }`}
    >
      {isLoading ? (
        <>
          <LoadingSpinner />
          Generating...
        </>
      ) : (
        <>
          <span className="text-xl">&#10024;</span>
          Generate Emoji
        </>
      )}
    </button>
  );
}
