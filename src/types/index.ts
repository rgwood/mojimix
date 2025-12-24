export interface GenerationResult {
  images: string[];
  mime_type: string;
}

export interface GenerationState {
  isLoading: boolean;
  error: string | null;
  result: GenerationResult | null;
}
