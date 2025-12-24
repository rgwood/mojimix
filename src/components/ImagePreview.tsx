import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface Props {
  images: string[];
  mimeType: string;
  emojis: string[];
  modifier?: string;
}

export function ImagePreview({ images, mimeType, emojis, modifier }: Props) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [savedPath, setSavedPath] = useState<string | null>(null);

  const selectedImage = selectedIndex !== null ? images[selectedIndex] : null;
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

  const hasSelection = selectedIndex !== null;

  return (
    <div className="flex h-full flex-col">
      {/* 2x2 Grid - takes all available space */}
      <div className="grid min-h-0 flex-1 grid-cols-2 gap-3">
        {images.map((img, index) => (
          <button
            key={index}
            onClick={() => setSelectedIndex(index)}
            className={`animate-pop group relative min-h-0 overflow-hidden rounded-lg transition-all ${
              selectedIndex === index
                ? "border-retro-blue pulse-glow"
                : "border-retro hover:border-[var(--hot-pink)]"
            }`}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex h-full items-center justify-center bg-[var(--surface-elevated)] p-2">
              <div className="checkered-dark aspect-square h-full max-h-full overflow-hidden rounded">
                <img
                  src={`data:${mimeType};base64,${img}`}
                  alt={`Generated emoji ${index + 1}`}
                  className="h-full w-full object-contain transition-transform group-hover:scale-105"
                />
              </div>
            </div>

            {selectedIndex === index && (
              <div className="font-pixel absolute top-1 right-1 rounded bg-[var(--electric-blue)] px-2 py-0.5 text-xs text-[var(--bg-primary)]">
                SELECTED
              </div>
            )}
          </button>
        ))}
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
