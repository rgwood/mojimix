import { useState, useCallback } from "react";
import { invoke, Channel } from "@tauri-apps/api/core";
import type { GenerationResult, GenerationProgress, HistoryItem } from "../types";

export function useGeminiGeneration() {
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(
    async (
      emojis: string[],
      modifier: string,
      fastModel: boolean,
      count: number,
      onItemComplete: (item: HistoryItem) => void
    ) => {
      if (emojis.length === 0) {
        setError("Please select at least one emoji");
        return;
      }

      // Add to pending count (allows concurrent batches)
      setPendingCount((prev) => prev + count);
      setError(null);

      // Create channel for streaming progress
      const onProgress = new Channel<GenerationProgress>();

      onProgress.onmessage = (progress: GenerationProgress) => {
        // Create history item for this completed generation
        const item: HistoryItem = {
          id: crypto.randomUUID(),
          sourceEmojis: [...emojis],
          modifier: modifier || "",
          model: fastModel ? "gemini-2.5-flash-image" : "gemini-3-pro-image-preview",
          status: progress.flood_fill ? "success" : "error",
          floodFill: progress.flood_fill,
          colorKey: progress.color_key,
          rawImage: progress.raw_image,
          error: progress.error,
        };

        // Call the completion callback
        onItemComplete(item);

        // Decrement pending count
        setPendingCount((prev) => Math.max(0, prev - 1));
      };

      try {
        await invoke<GenerationResult>("generate_emoji", {
          emojis,
          modifier: modifier || null,
          fastModel,
          count,
          onProgress,
        });
      } catch (err) {
        // Decrement all pending from this batch on error
        setPendingCount((prev) => Math.max(0, prev - count));
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    []
  );

  return {
    isLoading: pendingCount > 0,
    pendingCount,
    error,
    generate,
  };
}
