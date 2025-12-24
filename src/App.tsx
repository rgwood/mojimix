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
      {/* Hot pink pixels */}
      <div
        className="floating-pixel absolute h-2 w-2 bg-[var(--hot-pink)]"
        style={{ left: "10%", top: "20%", animationDelay: "0s" }}
      />
      <div
        className="floating-pixel absolute h-3 w-3 bg-[var(--hot-pink)]"
        style={{ left: "85%", top: "15%", animationDelay: "1s" }}
      />
      <div
        className="floating-pixel absolute h-2 w-2 bg-[var(--hot-pink)]"
        style={{ left: "70%", top: "70%", animationDelay: "0.5s" }}
      />
      {/* Electric blue pixels */}
      <div
        className="floating-pixel absolute h-3 w-3 bg-[var(--electric-blue)]"
        style={{ left: "20%", top: "60%", animationDelay: "1.5s" }}
      />
      <div
        className="floating-pixel absolute h-2 w-2 bg-[var(--electric-blue)]"
        style={{ left: "90%", top: "50%", animationDelay: "2s" }}
      />
      {/* Cyber yellow pixels */}
      <div
        className="floating-pixel absolute h-2 w-2 bg-[var(--cyber-yellow)]"
        style={{ left: "5%", top: "80%", animationDelay: "0.7s" }}
      />
      <div
        className="floating-pixel absolute h-3 w-3 bg-[var(--cyber-yellow)]"
        style={{ left: "60%", top: "10%", animationDelay: "1.2s" }}
      />
    </div>
  );
}

// Decorative star component
function Star({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
    </svg>
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
      <div className="scanlines min-h-screen bg-[var(--bg-primary)] p-6">
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

  const displayPrompt =
    selectedEmojis.length > 0
      ? modifier.trim()
        ? `${selectedEmojis.join(" ")} + "${modifier.trim()}"`
        : selectedEmojis.join(" ")
      : null;

  return (
    <div className="scanlines min-h-screen bg-[var(--bg-primary)] p-4">
      <FloatingPixels />

      <div className="relative z-20 mx-auto max-w-md">
        {/* Header */}
        <header className="animate-in mb-6 text-center">
          <div className="relative inline-block">
            <Star className="absolute -top-2 -left-6 h-4 w-4 text-[var(--cyber-yellow)]" />
            <Star className="absolute -top-1 -right-5 h-3 w-3 text-[var(--hot-pink)]" />
            <h1 className="font-pixel glitch-text text-5xl font-bold text-white">
              MojiMix
            </h1>
          </div>
          <p className="cursor-blink mt-2 text-sm text-[var(--text-secondary)]">
            Create custom emoji mashups with AI
          </p>
        </header>

        {/* Main content panel */}
        <div
          className="animate-in border-retro rounded-lg bg-[var(--surface)] p-5"
          style={{ animationDelay: "0.1s" }}
        >
          <EmojiPicker
            selectedEmojis={selectedEmojis}
            onEmojiSelect={handleEmojiSelect}
            onEmojiRemove={handleEmojiRemove}
          />

          <TextModifier value={modifier} onChange={setModifier} />

          {/* Preview box */}
          {displayPrompt && (
            <div
              className="border-retro-pink mt-4 rounded-lg bg-[var(--bg-secondary)] p-3"
            >
              <div className="font-pixel mb-1 text-xs text-[var(--hot-pink)]">
                &gt; PREVIEW:
              </div>
              <div className="text-[var(--text-primary)]">{displayPrompt}</div>
            </div>
          )}

          <GenerateButton
            onClick={handleGenerate}
            disabled={selectedEmojis.length === 0}
            isLoading={isLoading}
          />

          {/* Error display */}
          {error && (
            <div className="border-retro mt-4 rounded-lg border-[var(--hot-pink)] bg-[var(--surface-elevated)] p-3">
              <div className="font-pixel text-sm text-[var(--hot-pink)]">
                ! ERROR: {error}
              </div>
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

          {/* Clear button */}
          {(selectedEmojis.length > 0 || modifier || result) && (
            <button
              onClick={handleClear}
              className="mt-4 w-full py-2 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--hot-pink)]"
            >
              [ CLEAR AND START OVER ]
            </button>
          )}
        </div>

        {/* Footer */}
        <footer
          className="animate-in mt-6 text-center"
          style={{ animationDelay: "0.2s" }}
        >
          <div className="inline-flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <Star className="h-3 w-3 text-[var(--electric-blue)]" />
            <span>Powered by Google Gemini</span>
            <Star className="h-3 w-3 text-[var(--electric-blue)]" />
          </div>
          {/* Retro visitor counter aesthetic */}
          <div className="border-retro mt-2 inline-block rounded bg-[var(--surface)] px-3 py-1 text-xs">
            <span className="text-[var(--lime)]">ONLINE</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
