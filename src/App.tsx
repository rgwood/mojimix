import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { EmojiPicker } from "./components/EmojiPicker";
import { TextModifier } from "./components/TextModifier";
import { GenerateButton } from "./components/GenerateButton";
import { ImagePreview } from "./components/ImagePreview";
import { useGeminiGeneration } from "./hooks/useGeminiGeneration";

function App() {
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>([]);
  const [modifier, setModifier] = useState("");
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  const { isLoading, error, result, generate, reset } = useGeminiGeneration();

  useEffect(() => {
    invoke<boolean>("check_api_key").then(setHasApiKey);
  }, []);

  const handleEmojiSelect = (emoji: string) => {
    setSelectedEmojis((prev) => [...prev, emoji]);
    reset();
  };

  const handleEmojiRemove = (index: number) => {
    setSelectedEmojis((prev) => prev.filter((_, i) => i !== index));
    reset();
  };

  const handleGenerate = () => {
    generate(selectedEmojis, modifier);
  };

  const handleClear = () => {
    setSelectedEmojis([]);
    setModifier("");
    reset();
  };

  if (hasApiKey === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-6">
        <div className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-xl">
          <h1 className="mb-4 text-2xl font-bold text-red-600">
            API Key Required
          </h1>
          <p className="text-gray-600">
            Please set the{" "}
            <code className="rounded bg-gray-100 px-2 py-1">GEMINI_API_KEY</code>{" "}
            environment variable before running MojiMix.
          </p>
        </div>
      </div>
    );
  }

  const displayPrompt =
    selectedEmojis.length > 0
      ? modifier.trim()
        ? `${selectedEmojis.join(" ")} + "${modifier.trim()}"`
        : selectedEmojis.join(" ")
      : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-6">
      <div className="mx-auto max-w-md">
        <header className="mb-6 text-center">
          <h1 className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-3xl font-bold text-transparent">
            MojiMix
          </h1>
          <p className="mt-1 text-gray-600">
            Create custom emoji mashups with AI
          </p>
        </header>

        <div className="rounded-2xl bg-white p-6 shadow-xl">
          <EmojiPicker
            selectedEmojis={selectedEmojis}
            onEmojiSelect={handleEmojiSelect}
            onEmojiRemove={handleEmojiRemove}
          />

          <TextModifier value={modifier} onChange={setModifier} />

          {displayPrompt && (
            <div className="mt-4 rounded-lg bg-purple-50 p-3">
              <div className="mb-1 text-xs font-medium text-purple-600">
                Preview:
              </div>
              <div className="text-purple-800">{displayPrompt}</div>
            </div>
          )}

          <GenerateButton
            onClick={handleGenerate}
            disabled={selectedEmojis.length === 0}
            isLoading={isLoading}
          />

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
              <div className="text-sm text-red-600">{error}</div>
            </div>
          )}

          {result && (
            <ImagePreview
              images={result.images}
              mimeType={result.mime_type}
              emojis={selectedEmojis}
              modifier={modifier}
            />
          )}

          {(selectedEmojis.length > 0 || modifier || result) && (
            <button
              onClick={handleClear}
              className="mt-4 w-full py-2 text-sm text-gray-600 underline hover:text-gray-800"
            >
              Clear and start over
            </button>
          )}
        </div>

        <footer className="mt-6 text-center text-xs text-gray-400">
          Powered by Google Gemini
        </footer>
      </div>
    </div>
  );
}

export default App;
