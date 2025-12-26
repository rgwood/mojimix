export interface ImageResult {
  image: string | null;
  error: string | null;
}

export interface GenerationResult {
  results: ImageResult[];
  mime_type: string;
}

export interface GenerationState {
  isLoading: boolean;
  error: string | null;
  result: GenerationResult | null;
}
