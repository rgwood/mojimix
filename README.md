# MojiMix

Desktop app for generating custom emoji mashups using Google Gemini's image generation API.

## Quick Start

```bash
export GEMINI_API_KEY="your-api-key"
npm install
npm run tauri dev
```

## How It Works

1. User selects 1+ emojis via visual picker
2. Optionally adds a text modifier (e.g., "pixel art", "angry")
3. App generates 4 variations using Gemini's `gemini-3-pro-image-preview` model
4. User picks the best one and saves to Downloads

## Tech Stack

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Rust + Tauri 2.0
- **API**: Google Gemini (image generation + filename generation)

## Project Structure

```
src/                    # React frontend
  App.tsx               # Main app component
  components/
    EmojiPicker.tsx     # Emoji selection UI
    ImagePreview.tsx    # Generated results grid
    GenerateButton.tsx
    TextModifier.tsx

src-tauri/src/          # Rust backend
  lib.rs                # Tauri commands (generate_emoji, save_emoji_image)
  gemini.rs             # Gemini API client + image processing
```

## Key Implementation Details

- **Green screen trick**: Prompts request bright green (#00FF00) background, then post-processing replaces green pixels with transparency
- **Auto-crop**: Trims transparent borders and scales emoji to fill 128x128 canvas
- **Parallel generation**: 4 images generated concurrently via `futures::join_all`
- **Smart filenames**: Uses Gemini Flash to generate descriptive snake_case names

## Build for Production

```bash
npm run tauri build
```
