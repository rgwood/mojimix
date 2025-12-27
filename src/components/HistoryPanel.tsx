import { useState } from "react";
import type { HistoryItem } from "../types";

type ImageVariant = "raw" | "flood" | "colorKey";

interface Props {
  history: HistoryItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
  pendingCount: number;
}

export function HistoryPanel({
  history,
  selectedId,
  onSelect,
  isLoading,
  pendingCount,
}: Props) {
  const [gridVariant, setGridVariant] = useState<ImageVariant>("colorKey");

  const getImage = (item: HistoryItem) => {
    switch (gridVariant) {
      case "raw": return item.rawImage;
      case "flood": return item.floodFill;
      case "colorKey": return item.colorKey;
    }
  };

  const variants: { key: ImageVariant; label: string }[] = [
    { key: "raw", label: "RAW" },
    { key: "flood", label: "FLOOD" },
    { key: "colorKey", label: "COLOR KEY" },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Loading status - always reserve space */}
      <div className="mb-3 flex h-6 items-center justify-center gap-2">
        {isLoading ? (
          <>
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border-chunky)] border-t-[var(--cyber-yellow)]" />
            <span className="font-pixel text-sm text-[var(--cyber-yellow)]">
              {pendingCount} PENDING...
            </span>
          </>
        ) : null}
      </div>

      {/* Variant selector */}
      <div className="mb-3 flex items-center justify-center gap-4">
        {variants.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setGridVariant(key)}
            className="flex items-center gap-1.5"
          >
            <div
              className={`h-3 w-3 rounded-full border-2 transition-colors ${
                gridVariant === key
                  ? "border-[var(--electric-blue)] bg-[var(--electric-blue)]"
                  : "border-[var(--border-chunky)] bg-transparent"
              }`}
            />
            <span
              className={`font-pixel text-xs transition-colors ${
                gridVariant === key
                  ? "text-[var(--electric-blue)]"
                  : "text-[var(--text-muted)]"
              }`}
            >
              {label}
            </span>
          </button>
        ))}
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
          <div className="grid gap-2 grid-cols-[repeat(auto-fill,minmax(140px,1fr))]">
            {history.map((item) => {
              const image = getImage(item);
              const isSelected = item.id === selectedId;

              return (
                <button
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  className={`group relative aspect-square w-full overflow-hidden rounded-lg transition-all ${
                    isSelected
                      ? "border-retro-blue"
                      : item.status === "error"
                        ? "border-retro opacity-70 hover:opacity-100 hover:border-[var(--hot-pink)]"
                        : "border-retro hover:border-[var(--hot-pink)]"
                  }`}
                >
                  <div className="flex h-full items-center justify-center bg-[var(--surface-elevated)] p-1">
                    {image ? (
                      <div className="checkered-dark aspect-square h-full max-h-full overflow-hidden rounded">
                        <img
                          src={`data:image/png;base64,${image}`}
                          alt="Generated emoji"
                          className="h-full w-full object-contain transition-transform group-hover:scale-105"
                        />
                      </div>
                    ) : item.status === "error" ? (
                      <div className="flex h-full w-full flex-col items-center justify-center p-2 text-center">
                        <span className="font-pixel text-xs text-[var(--hot-pink)]">
                          FAILED
                        </span>
                      </div>
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center p-2 text-center">
                        <span className="font-pixel text-xs text-[var(--text-muted)]">
                          N/A
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
