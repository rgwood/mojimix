import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { GenerationResult, GenerationState } from "../types";

export function useGeminiGeneration() {
  const [state, setState] = useState<GenerationState>({
    isLoading: false,
    error: null,
    result: null,
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

      setState({ isLoading: true, error: null, result: null });

      try {
        const result = await invoke<GenerationResult>("generate_emoji", {
          emojis,
          modifier: modifier || null,
          fastModel: fastModel ?? false,
        });

        setState({ isLoading: false, error: null, result });
      } catch (error) {
        setState({
          isLoading: false,
          error: error instanceof Error ? error.message : String(error),
          result: null,
        });
      }
    },
    []
  );

  const reset = useCallback(() => {
    setState({ isLoading: false, error: null, result: null });
  }, []);

  return { ...state, generate, reset };
}
