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
  const imageSrc = selectedImage ? `data:${mimeType};base64,${selectedImage}` : null;

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
    <div className="mt-6 rounded-xl bg-gray-50 p-4">
      <div className="mb-3 text-sm font-medium text-gray-700">
        Generated Emojis (click to select):
      </div>

      <div className="grid grid-cols-2 gap-3">
        {images.map((img, index) => (
          <button
            key={index}
            onClick={() => setSelectedIndex(index)}
            className={`aspect-square overflow-hidden rounded-lg shadow transition-all ${
              selectedIndex === index
                ? "ring-4 ring-purple-500 ring-offset-2"
                : "hover:shadow-lg"
            }`}
            style={{
              backgroundImage: `
                linear-gradient(45deg, #ccc 25%, transparent 25%),
                linear-gradient(-45deg, #ccc 25%, transparent 25%),
                linear-gradient(45deg, transparent 75%, #ccc 75%),
                linear-gradient(-45deg, transparent 75%, #ccc 75%)
              `,
              backgroundSize: "16px 16px",
              backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
            }}
          >
            <img
              src={`data:${mimeType};base64,${img}`}
              alt={`Generated emoji ${index + 1}`}
              className="h-full w-full object-contain"
            />
          </button>
        ))}
      </div>

      {selectedIndex !== null && (
        <div className="mt-4 flex flex-col items-center gap-2">
          <div className="flex justify-center gap-3">
            <button
              onClick={handleSave}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Save to Downloads
            </button>
            <button
              onClick={handleCopyToClipboard}
              className="rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
            >
              Copy to Clipboard
            </button>
          </div>
          {savedPath && (
            <div className="text-sm text-green-600">
              Saved: {savedPath.split("/").pop()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
