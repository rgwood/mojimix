import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { EmojiPicker } from "./components/EmojiPicker";
import { TextModifier } from "./components/TextModifier";
import { GenerateButton } from "./components/GenerateButton";
import { ImagePreview } from "./components/ImagePreview";
import { useGeminiGeneration } from "./hooks/useGeminiGeneration";

function ApiKeySetup({ onSaved }: { onSaved: () => void }) {
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      await invoke("save_api_key", { key: apiKey });
      onSaved();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-[var(--bg-primary)] p-6">
      <div className="border-retro relative z-10 w-full max-w-md rounded-lg bg-[var(--surface)] p-6">
        <h1 className="font-pixel mb-2 text-2xl text-[var(--electric-blue)]">
          SETUP
        </h1>
        <p className="mb-4 text-sm text-[var(--text-secondary)]">
          Enter your Google Gemini API key to get started.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIza..."
            className="border-retro mb-3 w-full rounded-lg bg-[var(--bg-secondary)] px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--electric-blue)] focus:shadow-[0_0_15px_var(--electric-blue-glow)] focus:outline-none"
            autoFocus
          />

          {error && (
            <div className="font-pixel mb-3 text-sm text-[var(--hot-pink)]">
              ! {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!apiKey.trim() || saving}
            className={`btn-bevel font-pixel w-full rounded-lg py-3 text-sm font-bold text-white ${
              !apiKey.trim() || saving
                ? "cursor-not-allowed bg-[var(--border-chunky)] opacity-50"
                : "bg-[var(--electric-blue)]"
            }`}
          >
            {saving ? "SAVING..." : "SAVE API KEY"}
          </button>
        </form>

        <p className="mt-4 text-xs text-[var(--text-muted)]">
          Get your API key from{" "}
          <span className="text-[var(--electric-blue)]">
            aistudio.google.com
          </span>
        </p>
      </div>
    </div>
  );
}

function App() {
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>([]);
  const [modifier, setModifier] = useState("");
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  const { isLoading, error, result, generate, reset } = useGeminiGeneration();

  const checkApiKey = () => {
    invoke<boolean>("check_api_key").then(setHasApiKey);
  };

  useEffect(() => {
    checkApiKey();
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

  // Still loading
  if (hasApiKey === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg-primary)]" />
    );
  }

  // No API key - show setup
  if (hasApiKey === false) {
    return <ApiKeySetup onSaved={checkApiKey} />;
  }

  return (
    <div className="scanlines flex h-screen flex-col overflow-hidden bg-[var(--bg-primary)] p-3">
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
