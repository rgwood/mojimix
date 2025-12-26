import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { SlotState } from "../types";

interface Props {
  slots: SlotState[];
  mimeType: string;
  emojis: string[];
  modifier?: string;
}

export function ImagePreview({ slots, mimeType, emojis, modifier }: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [savedPath, setSavedPath] = useState<string | null>(null);
  const [useColorKey, setUseColorKey] = useState(false);

  // Get current image based on toggle
  const getImage = (slot: SlotState) =>
    useColorKey ? slot.colorKey : slot.floodFill;

  const selectedSlot = selectedIndex !== null ? slots[selectedIndex] : null;
  const selectedImage = selectedSlot ? getImage(selectedSlot) : null;
  const imageSrc = selectedImage
    ? `data:${mimeType};base64,${selectedImage}`
    : null;

  const handleSave = async () => {
    if (!selectedImage) return;
    try {
      const path = await invoke<string>("save_emoji_image", {
        imageBase64: selectedImage,
        emojis,
        modifier: modifier || null,
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

  const hasSelection =
    selectedIndex !== null && selectedSlot?.status === "success";

  // Check if any slots have results (to show toggle)
  const hasResults = slots.some((s) => s.status === "success");

  return (
    <div className="flex h-full flex-col">
      {/* BG Removal toggle - only show when we have results */}
      {hasResults && (
        <div className="mb-3 flex items-center justify-center gap-2">
          <span
            className={`font-pixel text-xs ${!useColorKey ? "text-[var(--lime)]" : "text-[var(--text-muted)]"}`}
          >
            FLOOD
          </span>
          <button
            onClick={() => setUseColorKey(!useColorKey)}
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

      {/* 2x2 Grid - takes all available space */}
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-3">
        {slots.map((slot, index) => {
          const image = getImage(slot);
          return (
            <button
              key={index}
              onClick={() =>
                slot.status === "success" && setSelectedIndex(index)
              }
              disabled={slot.status !== "success"}
              className={`group relative min-h-0 overflow-hidden rounded-lg transition-all ${
                slot.status === "loading"
                  ? "border-retro"
                  : slot.status === "error"
                    ? "border-retro cursor-not-allowed opacity-60"
                    : slot.status === "success" && selectedIndex === index
                      ? "border-retro-blue pulse-glow"
                      : slot.status === "success"
                        ? "border-retro hover:border-[var(--hot-pink)]"
                        : "border-retro"
              }`}
            >
              <div className="flex h-full items-center justify-center bg-[var(--surface-elevated)] p-2">
                {slot.status === "loading" && (
                  <div className="flex h-full w-full flex-col items-center justify-center">
                    <div className="mb-2 h-6 w-6 animate-spin rounded-full border-2 border-[var(--border-chunky)] border-t-[var(--cyber-yellow)]" />
                    <span className="font-pixel text-xs text-[var(--cyber-yellow)]">
                      GENERATING...
                    </span>
                  </div>
                )}

                {slot.status === "success" && image && (
                  <div className="checkered-dark aspect-square h-full max-h-full overflow-hidden rounded">
                    <img
                      src={`data:${mimeType};base64,${image}`}
                      alt={`Generated emoji ${index + 1}`}
                      className="h-full w-full object-contain transition-transform group-hover:scale-105"
                    />
                  </div>
                )}

                {slot.status === "error" && (
                  <div className="flex h-full w-full flex-col items-center justify-center p-3 text-center">
                    <span className="font-pixel mb-2 text-sm text-[var(--hot-pink)]">
                      FAILED
                    </span>
                    <span className="line-clamp-3 text-xs text-[var(--text-muted)]">
                      {slot.error || "Unknown error"}
                    </span>
                  </div>
                )}

                {slot.status === "pending" && (
                  <div className="flex h-full w-full items-center justify-center">
                    <span className="font-pixel text-sm text-[var(--text-muted)]">
                      ...
                    </span>
                  </div>
                )}
              </div>

              {/* Small size previews - bottom-left corner (only for successful) */}
              {slot.status === "success" && image && (
                <div className="absolute bottom-1 left-1 flex items-end gap-1 rounded bg-[var(--surface)]/90 px-1.5 py-1">
                  <img
                    src={`data:${mimeType};base64,${image}`}
                    alt="16px"
                    className="h-4 w-4 object-contain"
                  />
                  <img
                    src={`data:${mimeType};base64,${image}`}
                    alt="24px"
                    className="h-6 w-6 object-contain"
                  />
                  <img
                    src={`data:${mimeType};base64,${image}`}
                    alt="32px"
                    className="h-8 w-8 object-contain"
                  />
                </div>
              )}

              {slot.status === "success" && selectedIndex === index && (
                <div className="font-pixel absolute top-1 right-1 rounded bg-[var(--electric-blue)] px-2 py-0.5 text-xs text-[var(--bg-primary)]">
                  SELECTED
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Action buttons - always visible, disabled when nothing selected */}
      <div className="mt-3 flex items-center justify-center gap-3">
        <button
          onClick={handleSave}
          disabled={!hasSelection}
          className={`btn-bevel font-pixel rounded-lg px-4 py-2 text-sm font-bold transition-opacity ${
            hasSelection
              ? "bg-[var(--electric-blue)] text-[var(--bg-primary)]"
              : "cursor-not-allowed bg-[var(--border-chunky)] text-[var(--text-muted)] opacity-40"
          }`}
        >
          SAVE
        </button>
        <button
          onClick={handleCopyToClipboard}
          disabled={!hasSelection}
          className={`btn-bevel font-pixel rounded-lg px-4 py-2 text-sm font-bold transition-opacity ${
            hasSelection
              ? "bg-[var(--border-chunky)] text-white"
              : "cursor-not-allowed bg-[var(--border-chunky)] text-[var(--text-muted)] opacity-40"
          }`}
        >
          COPY
        </button>
        {/* Show saved path or reserve space */}
        <span
          className={`font-pixel text-xs text-[var(--lime)] ${savedPath ? "visible" : "invisible"}`}
        >
          {savedPath ? `* ${savedPath.split("/").pop()}` : "placeholder"}
        </span>
      </div>
    </div>
  );
}
