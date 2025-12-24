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

  return (
    <div className="border-retro mt-6 rounded-lg bg-[var(--bg-secondary)] p-4">
      <div className="font-pixel mb-3 text-sm text-[var(--electric-blue)]">
        &gt; GENERATED EMOJIS_
      </div>

      {/* 2x2 Grid with polaroid-style frames */}
      <div className="grid grid-cols-2 gap-4">
        {images.map((img, index) => (
          <button
            key={index}
            onClick={() => setSelectedIndex(index)}
            className={`animate-pop group relative overflow-hidden rounded-lg transition-all ${
              selectedIndex === index
                ? "border-retro-blue pulse-glow"
                : "border-retro hover:border-[var(--hot-pink)]"
            }`}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            {/* Polaroid frame */}
            <div className="bg-[var(--surface-elevated)] p-2 pb-4">
              {/* Checkered background for transparency */}
              <div className="checkered-dark aspect-square overflow-hidden rounded">
                <img
                  src={`data:${mimeType};base64,${img}`}
                  alt={`Generated emoji ${index + 1}`}
                  className="h-full w-full object-contain transition-transform group-hover:scale-105"
                />
              </div>
              {/* Polaroid label */}
              <div className="font-pixel mt-2 text-center text-xs text-[var(--text-muted)]">
                #{String(index + 1).padStart(2, "0")}
              </div>
            </div>

            {/* Selection indicator */}
            {selectedIndex === index && (
              <div className="font-pixel absolute top-1 right-1 rounded bg-[var(--electric-blue)] px-2 py-0.5 text-xs text-[var(--bg-primary)]">
                SELECTED
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Action buttons */}
      {selectedIndex !== null && (
        <div className="mt-4 flex flex-col items-center gap-3">
          <div className="flex justify-center gap-3">
            <button
              onClick={handleSave}
              className="btn-bevel font-pixel rounded-lg bg-[var(--electric-blue)] px-4 py-2 text-sm font-bold text-[var(--bg-primary)]"
            >
              SAVE TO DOWNLOADS
            </button>
            <button
              onClick={handleCopyToClipboard}
              className="btn-bevel font-pixel rounded-lg bg-[var(--border-chunky)] px-4 py-2 text-sm font-bold text-white"
            >
              COPY TO CLIPBOARD
            </button>
          </div>
          {savedPath && (
            <div className="font-pixel text-sm text-[var(--lime)]">
              * SAVED: {savedPath.split("/").pop()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
