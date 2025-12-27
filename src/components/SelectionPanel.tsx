import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { HistoryItem } from "../types";

type ImageVariant = "raw" | "flood" | "colorKey";

interface Props {
  selectedItem: HistoryItem | null;
}

export function SelectionPanel({ selectedItem }: Props) {
  const [savedPath, setSavedPath] = useState<string | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<ImageVariant>("colorKey");

  // Reset saved path when selecting a different item
  useEffect(() => {
    setSavedPath(null);
  }, [selectedItem?.id]);

  // Get image for a specific variant
  const getVariantImage = (variant: ImageVariant): string | null => {
    if (!selectedItem) return null;
    switch (variant) {
      case "raw": return selectedItem.rawImage;
      case "flood": return selectedItem.floodFill;
      case "colorKey": return selectedItem.colorKey;
    }
  };

  const selectedImage = getVariantImage(selectedVariant);
  const imageSrc = selectedImage ? `data:image/png;base64,${selectedImage}` : null;
  const hasImage = !!selectedImage;

  const handleSave = async () => {
    if (!selectedImage || !selectedItem) return;
    try {
      const path = await invoke<string>("save_emoji_image", {
        imageBase64: selectedImage,
        emojis: selectedItem.sourceEmojis,
        modifier: selectedItem.modifier || null,
      });
      setSavedPath(path);
    } catch (error) {
      console.error("Failed to save:", error);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!imageSrc) return;
    try {
      const response = await fetch(imageSrc);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob }),
      ]);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const isError = selectedItem?.status === "error";

  if (!selectedItem) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="font-pixel text-sm text-[var(--text-muted)]">
          SELECT AN EMOJI
          <br />
          <span className="text-xs">FROM THE GRID</span>
        </div>
      </div>
    );
  }

  const variants: { key: ImageVariant; label: string }[] = [
    { key: "raw", label: "RAW" },
    { key: "flood", label: "FLOOD" },
    { key: "colorKey", label: "COLOUR KEY" },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Emoji combo */}
      <div className="mb-2 text-center">
        <div className="text-2xl">
          {selectedItem.sourceEmojis.join(" + ")}
        </div>
        {selectedItem.modifier && (
          <div className="font-pixel mt-1 text-xs text-[var(--text-secondary)]">
            "{selectedItem.modifier}"
          </div>
        )}
        <div className="font-pixel mt-1 text-[10px] text-[var(--text-muted)]">
          {selectedItem.model}
        </div>
      </div>

      {/* Error message */}
      {isError && selectedItem.error && (
        <div className="mb-3 rounded-lg bg-[var(--surface-elevated)] p-2">
          <div className="font-pixel mb-1 text-xs text-[var(--hot-pink)]">
            ERROR:
          </div>
          <div className="text-xs text-[var(--text-secondary)] break-words">
            {selectedItem.error}
          </div>
        </div>
      )}

      {/* Warning message */}
      {selectedItem.warning && (
        <div className="mb-3 rounded-lg bg-[var(--surface-elevated)] p-2">
          <div className="font-pixel mb-1 text-xs text-[var(--cyber-yellow)]">
            WARNING:
          </div>
          <div className="text-xs text-[var(--text-secondary)] break-words">
            {selectedItem.warning}
          </div>
        </div>
      )}

      {/* Variant thumbnails - vertical stack */}
      <div className="mb-3 flex flex-1 flex-col gap-2 overflow-y-auto">
        {variants.map(({ key, label }) => {
          const variantImage = getVariantImage(key);
          const variantSrc = variantImage ? `data:image/png;base64,${variantImage}` : null;
          const isSelected = selectedVariant === key;

          return (
            <button
              key={key}
              onClick={() => setSelectedVariant(key)}
              className={`flex flex-col items-center rounded-lg p-2 transition-all ${
                isSelected
                  ? "border-2 border-[var(--electric-blue)] bg-[var(--surface-elevated)]"
                  : "border-2 border-transparent hover:border-[var(--border-chunky)]"
              }`}
            >
              <div className="font-pixel mb-1 text-[10px] text-[var(--text-muted)]">
                {label}
              </div>
              <div className="aspect-square w-full max-w-[200px] overflow-hidden bg-[var(--surface-elevated)]">
                {variantSrc ? (
                  <img
                    src={variantSrc}
                    alt={label}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
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

      {/* Size previews */}
      {imageSrc && (
        <div className="mb-3 flex items-end justify-center gap-2">
          <div className="flex flex-col items-center">
            <img src={imageSrc} alt="16px" className="h-4 w-4 object-contain" />
            <span className="font-pixel mt-1 text-[10px] text-[var(--text-muted)]">16</span>
          </div>
          <div className="flex flex-col items-center">
            <img src={imageSrc} alt="24px" className="h-6 w-6 object-contain" />
            <span className="font-pixel mt-1 text-[10px] text-[var(--text-muted)]">24</span>
          </div>
          <div className="flex flex-col items-center">
            <img src={imageSrc} alt="32px" className="h-8 w-8 object-contain" />
            <span className="font-pixel mt-1 text-[10px] text-[var(--text-muted)]">32</span>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-2">
        <button
          onClick={handleSave}
          disabled={!hasImage}
          className={`btn-bevel font-pixel w-full rounded-lg py-2 text-sm font-bold transition-opacity ${
            hasImage
              ? "bg-[var(--electric-blue)] text-[var(--bg-primary)]"
              : "cursor-not-allowed bg-[var(--border-chunky)] text-[var(--text-muted)] opacity-40"
          }`}
        >
          SAVE
        </button>
        <button
          onClick={handleCopyToClipboard}
          disabled={!hasImage}
          className={`btn-bevel font-pixel w-full rounded-lg py-2 text-sm font-bold transition-opacity ${
            hasImage
              ? "bg-[var(--border-chunky)] text-white"
              : "cursor-not-allowed bg-[var(--border-chunky)] text-[var(--text-muted)] opacity-40"
          }`}
        >
          COPY
        </button>
      </div>

      {/* Saved path */}
      {savedPath && (
        <div className="font-pixel mt-2 text-center text-xs text-[var(--lime)]">
          * {savedPath.split("/").pop()}
        </div>
      )}
    </div>
  );
}
