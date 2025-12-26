export interface ImageResult {
  flood_fill: string | null;
  color_key: string | null;
  error: string | null;
}

export interface GenerationResult {
  results: ImageResult[];
  mime_type: string;
}

export interface GenerationProgress {
  index: number;
  flood_fill: string | null;
  color_key: string | null;
  error: string | null;
}

export interface SlotState {
  status: "pending" | "loading" | "success" | "error";
  floodFill: string | null;
  colorKey: string | null;
  error: string | null;
}

export interface GenerationState {
  isLoading: boolean;
  error: string | null;
  result: GenerationResult | null;
  slots: SlotState[];
}
