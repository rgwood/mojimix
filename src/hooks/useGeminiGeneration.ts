import { useState, useCallback } from "react";
import { invoke, Channel } from "@tauri-apps/api/core";
import type {
  GenerationResult,
  GenerationState,
  GenerationProgress,
  SlotState,
} from "../types";

const INITIAL_SLOTS: SlotState[] = [
  { status: "pending", floodFill: null, colorKey: null, error: null },
  { status: "pending", floodFill: null, colorKey: null, error: null },
  { status: "pending", floodFill: null, colorKey: null, error: null },
  { status: "pending", floodFill: null, colorKey: null, error: null },
];

const LOADING_SLOTS: SlotState[] = [
  { status: "loading", floodFill: null, colorKey: null, error: null },
  { status: "loading", floodFill: null, colorKey: null, error: null },
  { status: "loading", floodFill: null, colorKey: null, error: null },
  { status: "loading", floodFill: null, colorKey: null, error: null },
];

export function useGeminiGeneration() {
  const [state, setState] = useState<GenerationState>({
    isLoading: false,
    error: null,
    result: null,
    slots: INITIAL_SLOTS,
  });

  const generate = useCallback(
    async (emojis: string[], modifier?: string, fastModel?: boolean) => {
      if (emojis.length === 0) {
        setState((prev) => ({
          ...prev,
          error: "Please select at least one emoji",
        }));
        return;
      }

      // Initialize loading state with all slots as "loading"
      setState({
        isLoading: true,
        error: null,
        result: null,
        slots: [...LOADING_SLOTS],
      });

      // Create channel for streaming progress
      const onProgress = new Channel<GenerationProgress>();

      onProgress.onmessage = (progress: GenerationProgress) => {
        setState((prev) => {
          const newSlots = [...prev.slots];
          newSlots[progress.index] = {
            status: progress.flood_fill ? "success" : "error",
            floodFill: progress.flood_fill,
            colorKey: progress.color_key,
            error: progress.error,
          };
          return { ...prev, slots: newSlots };
        });
      };

      try {
        const result = await invoke<GenerationResult>("generate_emoji", {
          emojis,
          modifier: modifier || null,
          fastModel: fastModel ?? false,
          onProgress,
        });

        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: null,
          result,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : String(error),
          result: null,
        }));
      }
    },
    []
  );

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      result: null,
      slots: INITIAL_SLOTS,
    });
  }, []);

  return { ...state, generate, reset };
}
