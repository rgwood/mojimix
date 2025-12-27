import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { HistoryItem } from "../types";

interface Props {
  selectedItem: HistoryItem | null;
  useColorKey: boolean;
  onToggleColorKey: () => void;
}

export function SelectionPanel({
  selectedItem,
  useColorKey,
  onToggleColorKey,
}: Props) {
  const [savedPath, setSavedPath] = useState<string | null>(null);

  // Reset saved path when selecting a different item
  useEffect(() => {
    setSavedPath(null);
  }, [selectedItem?.id]);

  // Try to get image even for errors (might have partial data)
  // For errors, fall back to rawImage if processed versions aren't available
  const selectedImage = selectedItem
    ? useColorKey
      ? selectedItem.colorKey
      : selectedItem.floodFill
    : null;

  // Use raw image as fallback for failed items
  const displayImage = selectedImage || selectedItem?.rawImage;

  const imageSrc = displayImage
    ? `data:image/png;base64,${displayImage}`
    : null;

  const hasImage = !!displayImage;
  const isShowingRaw = !selectedImage && !!selectedItem?.rawImage;

  const handleSave = async () => {
    if (!displayImage || !selectedItem) return;
    try {
      const path = await invoke<string>("save_emoji_image", {
        imageBase64: displayImage,
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

  const hasSelection = !!selectedItem;
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

      {/* Raw image indicator */}
      {isShowingRaw && (
        <div className="mb-2 text-center">
          <span className="font-pixel text-xs text-[var(--cyber-yellow)]">
            SHOWING RAW IMAGE
          </span>
        </div>
      )}

      {/* Large preview */}
      <div className="mb-3 flex flex-1 items-center justify-center">
        {imageSrc ? (
          <div className="aspect-square w-full max-w-[200px] overflow-hidden rounded-lg bg-[var(--surface-elevated)]">
            <img
              src={imageSrc}
              alt="Selected emoji"
              className="h-full w-full object-contain"
            />
          </div>
        ) : isError ? (
          <div className="flex aspect-square w-full max-w-[200px] items-center justify-center rounded-lg bg-[var(--surface-elevated)]">
            <span className="font-pixel text-sm text-[var(--hot-pink)]">
              NO IMAGE
            </span>
          </div>
        ) : null}
      </div>

      {/* Size previews */}
      {hasSelection && imageSrc && (
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

      {/* FLOOD/COLOR KEY toggle */}
      {hasImage && (
        <div className="mb-3 flex items-center justify-center gap-2">
          <span
            className={`font-pixel text-xs ${!useColorKey ? "text-[var(--lime)]" : "text-[var(--text-muted)]"}`}
          >
            FLOOD
          </span>
          <button
            onClick={onToggleColorKey}
            className={`relative h-5 w-9 rounded-full border-2 transition-colors ${
              useColorKey
                ? "border-[var(--cyber-yellow)] bg-[var(--cyber-yellow)]"
                : "border-[var(--lime)] bg-[var(--lime)]"
            }`}
          >
            <div
              className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${
                useColorKey ? "translate-x-4" : "translate-x-0.5"
              }`}
            />
          </button>
          <span
            className={`font-pixel text-xs ${useColorKey ? "text-[var(--cyber-yellow)]" : "text-[var(--text-muted)]"}`}
          >
            COLOR KEY
          </span>
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
