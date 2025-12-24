export interface GenerationResult {
  image_base64: string;
  mime_type: string;
}

export interface GenerationState {
  isLoading: boolean;
  error: string | null;
  result: GenerationResult | null;
}
