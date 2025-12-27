import type { HistoryItem } from "../types";

interface Props {
  history: HistoryItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  useColorKey: boolean;
  isLoading: boolean;
  pendingCount: number;
}

export function HistoryPanel({
  history,
  selectedId,
  onSelect,
  useColorKey,
  isLoading,
  pendingCount,
}: Props) {
  const getImage = (item: HistoryItem) =>
    useColorKey ? item.colorKey : item.floodFill;

  return (
    <div className="flex h-full flex-col">
      {/* Loading status - always reserve space */}
      <div className={`mb-3 flex h-6 items-center justify-center gap-2 ${isLoading ? "" : "invisible"}`}>
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border-chunky)] border-t-[var(--cyber-yellow)]" />
        <span className="font-pixel text-sm text-[var(--cyber-yellow)]">
          {pendingCount} PENDING...
        </span>
      </div>

      {/* Scrollable grid */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {history.length === 0 && !isLoading ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="font-pixel text-lg text-[var(--text-muted)]">
              SELECT EMOJIS
              <br />
              <span className="text-sm">& HIT GENERATE</span>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {history.map((item) => {
              const image = getImage(item);
              const isSelected = item.id === selectedId;

              return (
                <button
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  className={`group relative aspect-square overflow-hidden rounded-lg transition-all ${
                    isSelected
                      ? "border-retro-blue pulse-glow"
                      : item.status === "error"
                        ? "border-retro opacity-70 hover:opacity-100 hover:border-[var(--hot-pink)]"
                        : "border-retro hover:border-[var(--hot-pink)]"
                  }`}
                >
                  <div className="flex h-full items-center justify-center bg-[var(--surface-elevated)] p-1">
                    {item.status === "success" && image && (
                      <div className="checkered-dark aspect-square h-full max-h-full overflow-hidden rounded">
                        <img
                          src={`data:image/png;base64,${image}`}
                          alt="Generated emoji"
                          className="h-full w-full object-contain transition-transform group-hover:scale-105"
                        />
                      </div>
                    )}

                    {item.status === "error" && (
                      <div className="flex h-full w-full flex-col items-center justify-center p-2 text-center">
                        <span className="font-pixel text-xs text-[var(--hot-pink)]">
                          FAILED
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
