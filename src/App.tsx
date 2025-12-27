import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { EmojiPicker } from "./components/EmojiPicker";
import { TextModifier } from "./components/TextModifier";
import { GenerateButton } from "./components/GenerateButton";
import { HistoryPanel } from "./components/HistoryPanel";
import { SelectionPanel } from "./components/SelectionPanel";
import { useGeminiGeneration } from "./hooks/useGeminiGeneration";
import type { HistoryItem } from "./types";

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

const COUNT_OPTIONS = [1, 2, 4, 8] as const;

function App() {
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>([]);
  const [modifier, setModifier] = useState("");
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);
  const [fastModel, setFastModel] = useState(true);
  const [generationCount, setGenerationCount] = useState(4);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { isLoading, pendingCount, error, generate } =
    useGeminiGeneration();

  const selectedItem = history.find((h) => h.id === selectedId) ?? null;

  const checkApiKey = () => {
    invoke<boolean>("check_api_key").then(setHasApiKey);
  };

  useEffect(() => {
    checkApiKey();
  }, []);

  const handleEmojiSelect = (emoji: string) => {
    setSelectedEmojis((prev) => [...prev, emoji]);
  };

  const handleEmojiRemove = (index: number) => {
    setSelectedEmojis((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemComplete = useCallback((item: HistoryItem) => {
    setHistory((prev) => [...prev, item]);
    // Auto-select first successful item if nothing selected
    if (item.status === "success") {
      setSelectedId((current) => current ?? item.id);
    }
  }, []);

  const handleGenerate = () => {
    generate(
      selectedEmojis,
      modifier,
      fastModel,
      generationCount,
      handleItemComplete
    );
  };

  const handleClear = () => {
    setSelectedEmojis([]);
    setModifier("");
  };

  const handleClearHistory = () => {
    setHistory([]);
    setSelectedId(null);
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
      {/* Main 3-column layout */}
      <div className="relative z-20 flex min-h-0 flex-1 gap-3">
        {/* Left column: Controls */}
        <div className="border-retro flex w-[340px] shrink-0 flex-col rounded-lg bg-[var(--surface)] p-4">
          <EmojiPicker
            selectedEmojis={selectedEmojis}
            onEmojiSelect={handleEmojiSelect}
            onEmojiRemove={handleEmojiRemove}
          />

          <TextModifier value={modifier} onChange={setModifier} />

          {/* Model toggle */}
          <div className="mt-4">
            <div className="font-pixel mb-2 flex items-center justify-between text-sm text-[var(--cyber-yellow)]">
              <span>&gt; MODEL:</span>
              <button
                onClick={() => setFastModel(!fastModel)}
                className="flex items-center gap-2"
              >
                <span
                  className={
                    fastModel ? "text-[var(--lime)]" : "text-[var(--text-muted)]"
                  }
                >
                  FAST
                </span>
                <div
                  className={`relative h-5 w-9 rounded-full border-2 transition-colors ${
                    fastModel
                      ? "border-[var(--lime)] bg-[var(--lime)]"
                      : "border-[var(--electric-blue)] bg-[var(--electric-blue)]"
                  }`}
                >
                  <div
                    className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${
                      fastModel ? "translate-x-0.5" : "translate-x-4"
                    }`}
                  />
                </div>
                <span
                  className={
                    fastModel
                      ? "text-[var(--text-muted)]"
                      : "text-[var(--electric-blue)]"
                  }
                >
                  PRO
                </span>
              </button>
            </div>
          </div>

          {/* Count selector */}
          <div className="mt-4">
            <div className="font-pixel mb-2 text-sm text-[var(--cyber-yellow)]">
              &gt; COUNT:
            </div>
            <div className="flex gap-2">
              {COUNT_OPTIONS.map((count) => (
                <button
                  key={count}
                  onClick={() => setGenerationCount(count)}
                  className={`font-pixel flex-1 rounded-lg py-2 text-sm font-bold transition-all ${
                    generationCount === count
                      ? "bg-[var(--electric-blue)] text-[var(--bg-primary)]"
                      : "bg-[var(--surface-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          <GenerateButton
            onClick={handleGenerate}
            disabled={selectedEmojis.length === 0}
            isLoading={isLoading}
          />

          {/* Clear buttons */}
          <div className="mt-3 flex items-center justify-center gap-4">
            {(selectedEmojis.length > 0 || modifier) && (
              <button
                onClick={handleClear}
                className="text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--hot-pink)]"
              >
                [ CLEAR INPUT ]
              </button>
            )}
            {history.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--hot-pink)]"
              >
                [ CLEAR ALL ]
              </button>
            )}
          </div>
        </div>

        {/* Middle column: History grid */}
        <div className="border-retro flex min-h-0 flex-1 flex-col rounded-lg bg-[var(--surface)] p-4">
          {error && (
            <div className="border-retro mb-3 rounded-lg border-[var(--hot-pink)] bg-[var(--surface-elevated)] p-3">
              <div className="font-pixel text-sm text-[var(--hot-pink)]">
                ! ERROR: {error}
              </div>
            </div>
          )}

          <HistoryPanel
            history={history}
            selectedId={selectedId}
            onSelect={setSelectedId}
            isLoading={isLoading}
            pendingCount={pendingCount}
          />
        </div>

        {/* Right column: Selection details */}
        <div className="border-retro flex w-[280px] shrink-0 flex-col rounded-lg bg-[var(--surface)] p-4">
          <SelectionPanel
            selectedItem={selectedItem}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
