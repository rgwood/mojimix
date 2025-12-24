import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";

interface Props {
  imageBase64: string;
  mimeType: string;
}

export function ImagePreview({ imageBase64, mimeType }: Props) {
  const imageSrc = `data:${mimeType};base64,${imageBase64}`;

  const handleSave = async () => {
    try {
      const filePath = await save({
        defaultPath: "emoji.png",
        filters: [{ name: "PNG Image", extensions: ["png"] }],
      });

      if (filePath) {
        await invoke("save_emoji_image", {
          imageBase64,
          filePath,
        });
      }
    } catch (error) {
      console.error("Failed to save:", error);
    }
  };

  const handleCopyToClipboard = async () => {
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
        Generated Emoji:
      </div>

      <div
        className="mx-auto h-32 w-32 overflow-hidden rounded-lg shadow-lg"
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
          src={imageSrc}
          alt="Generated emoji"
          className="h-full w-full object-contain"
        />
      </div>

      <div className="mt-4 flex justify-center gap-3">
        <button
          onClick={handleSave}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          Save PNG
        </button>
        <button
          onClick={handleCopyToClipboard}
          className="rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
        >
          Copy to Clipboard
        </button>
      </div>
    </div>
  );
}
