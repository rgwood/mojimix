import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { EmojiPicker } from "./components/EmojiPicker";
import { TextModifier } from "./components/TextModifier";
import { GenerateButton } from "./components/GenerateButton";
import { ImagePreview } from "./components/ImagePreview";
import { useGeminiGeneration } from "./hooks/useGeminiGeneration";

// Floating pixel decoration component
function FloatingPixels() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div
        className="floating-pixel absolute h-2 w-2 bg-[var(--hot-pink)]"
        style={{ left: "5%", top: "15%", animationDelay: "0s" }}
      />
      <div
        className="floating-pixel absolute h-3 w-3 bg-[var(--hot-pink)]"
        style={{ left: "95%", top: "10%", animationDelay: "1s" }}
      />
      <div
        className="floating-pixel absolute h-3 w-3 bg-[var(--electric-blue)]"
        style={{ left: "8%", top: "85%", animationDelay: "1.5s" }}
      />
      <div
        className="floating-pixel absolute h-2 w-2 bg-[var(--electric-blue)]"
        style={{ left: "92%", top: "75%", animationDelay: "2s" }}
      />
      <div
        className="floating-pixel absolute h-2 w-2 bg-[var(--cyber-yellow)]"
        style={{ left: "50%", top: "5%", animationDelay: "0.7s" }}
      />
    </div>
  );
}

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
      <div className="scanlines flex h-screen items-center justify-center bg-[var(--bg-primary)] p-6">
        <FloatingPixels />
        <div className="border-retro-pink mx-auto max-w-md rounded-lg bg-[var(--surface)] p-6">
          <h1 className="font-pixel mb-4 text-2xl text-[var(--hot-pink)]">
            ! API KEY REQUIRED !
          </h1>
          <p className="text-[var(--text-secondary)]">
            Please set the{" "}
            <code className="border-retro rounded bg-[var(--bg-secondary)] px-2 py-1 text-[var(--cyber-yellow)]">
              GEMINI_API_KEY
            </code>{" "}
            environment variable before running MojiMix.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="scanlines flex h-screen flex-col overflow-hidden bg-[var(--bg-primary)] p-3">
      <FloatingPixels />

      {/* Main 2-column layout - fills entire screen */}
      <div className="relative z-20 flex min-h-0 flex-1 gap-3">
        {/* Left column: Controls */}
        <div className="border-retro flex w-[340px] shrink-0 flex-col rounded-lg bg-[var(--surface)] p-4">
          <EmojiPicker
            selectedEmojis={selectedEmojis}
            onEmojiSelect={handleEmojiSelect}
            onEmojiRemove={handleEmojiRemove}
          />

          <TextModifier value={modifier} onChange={setModifier} />

          <GenerateButton
            onClick={handleGenerate}
            disabled={selectedEmojis.length === 0}
            isLoading={isLoading}
          />

          {/* Clear button */}
          {(selectedEmojis.length > 0 || modifier || result) && (
            <button
              onClick={handleClear}
              className="mt-3 py-1 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--hot-pink)]"
            >
              [ CLEAR ]
            </button>
          )}
        </div>

        {/* Right column: Results */}
        <div className="border-retro flex min-h-0 flex-1 flex-col rounded-lg bg-[var(--surface)] p-4">
          {error && (
            <div className="border-retro mb-3 rounded-lg border-[var(--hot-pink)] bg-[var(--surface-elevated)] p-3">
              <div className="font-pixel text-sm text-[var(--hot-pink)]">
                ! ERROR: {error}
              </div>
            </div>
          )}

          {result ? (
            <ImagePreview
              images={result.images}
              mimeType={result.mime_type}
              emojis={selectedEmojis}
              modifier={modifier}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center text-center">
              <div className="font-pixel text-lg text-[var(--text-muted)]">
                {isLoading ? (
                  <>
                    <span className="text-[var(--cyber-yellow)]">
                      GENERATING...
                    </span>
                    <div className="loading-bar mx-auto mt-4 w-48 rounded">
                      <div className="loading-bar-fill" />
                    </div>
                  </>
                ) : (
                  <>
                    SELECT EMOJIS
                    <br />
                    <span className="text-sm">& HIT GENERATE</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
