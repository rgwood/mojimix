#!/usr/bin/env -S uv run --script --quiet
# /// script
# requires-python = ">=3.12"
# dependencies = [
#     "requests",
#     "pillow",
# ]
# ///
"""Generate app icon using Gemini image generation API."""

import base64
import json
import os
import subprocess
from pathlib import Path

import requests
from PIL import Image
from io import BytesIO


def get_api_key() -> str:
    """Get API key from env var or config file."""
    if key := os.environ.get("GEMINI_API_KEY"):
        return key

    config_path = Path.home() / ".config" / "mojimix" / "api_key"
    if config_path.exists():
        return config_path.read_text().strip()

    raise RuntimeError("No API key found. Set GEMINI_API_KEY or run the app first to configure it.")


def generate_image(prompt: str, api_key: str, max_retries: int = 3) -> bytes:
    """Generate an image using Gemini API with retry logic."""
    import time

    endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent"

    request_body = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "responseModalities": ["IMAGE"],
            "imageConfig": {"aspectRatio": "1:1"}
        }
    }

    for attempt in range(max_retries):
        response = requests.post(
            endpoint,
            headers={
                "x-goog-api-key": api_key,
                "Content-Type": "application/json"
            },
            json=request_body
        )

        if response.status_code == 429:
            wait_time = (attempt + 1) * 10
            print(f"  Rate limited, waiting {wait_time}s...")
            time.sleep(wait_time)
            continue

        response.raise_for_status()

        data = response.json()
        for candidate in data.get("candidates", []):
            for part in candidate.get("content", {}).get("parts", []):
                if inline_data := part.get("inlineData"):
                    if inline_data.get("mimeType", "").startswith("image/"):
                        return base64.b64decode(inline_data["data"])

        raise RuntimeError("No image in response")

    raise RuntimeError("Max retries exceeded")


def create_icon_sizes(source_image: Image.Image, output_dir: Path):
    """Create all required icon sizes for Tauri."""
    # Ensure RGBA
    if source_image.mode != "RGBA":
        source_image = source_image.convert("RGBA")

    # Required sizes for Tauri
    sizes = {
        "32x32.png": 32,
        "128x128.png": 128,
        "128x128@2x.png": 256,
    }

    for filename, size in sizes.items():
        resized = source_image.resize((size, size), Image.Resampling.LANCZOS)
        resized.save(output_dir / filename, "PNG")
        print(f"  Created {filename}")

    # Create .ico (Windows) - contains multiple sizes
    ico_sizes = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
    ico_images = [source_image.resize(s, Image.Resampling.LANCZOS) for s in ico_sizes]
    ico_images[0].save(
        output_dir / "icon.ico",
        format="ICO",
        sizes=ico_sizes
    )
    print("  Created icon.ico")

    # Create .icns (macOS) - just copy the 128x128 for now
    # (proper .icns would need icnsutil or similar, but this works for dev)
    source_image.resize((128, 128), Image.Resampling.LANCZOS).save(
        output_dir / "icon.icns", "PNG"
    )
    print("  Created icon.icns")


def main():
    api_key = get_api_key()
    icons_dir = Path(__file__).parent / "src-tauri" / "icons"

    print("Generating app icon with Gemini...")

    # Prompt for a simple emoji icon
    prompt = """A single happy smiling emoji face, classic yellow round smiley with big friendly smile and simple oval eyes.
    Google Noto emoji style - soft 3D, subtle gradients, clean and simple.
    Solid pure green (#00FF00) background, nothing else."""

    image_bytes = generate_image(prompt, api_key)
    print("  Generated base image")

    # Load and process the image
    img = Image.open(BytesIO(image_bytes)).convert("RGBA")

    # Remove green background (more tolerant matching)
    pixels = img.load()
    width, height = img.size
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            # Detect green-ish backgrounds (more tolerant)
            if g > 150 and g > r * 1.5 and g > b * 1.5:
                pixels[x, y] = (0, 0, 0, 0)

    print("  Removed green background")

    # Find bounding box and crop
    bbox = img.getbbox()
    if bbox:
        # Add padding
        padding = 10
        left = max(0, bbox[0] - padding)
        top = max(0, bbox[1] - padding)
        right = min(width, bbox[2] + padding)
        bottom = min(height, bbox[3] + padding)
        img = img.crop((left, top, right, bottom))

    # Make square by adding padding
    w, h = img.size
    max_dim = max(w, h)
    square = Image.new("RGBA", (max_dim, max_dim), (0, 0, 0, 0))
    offset = ((max_dim - w) // 2, (max_dim - h) // 2)
    square.paste(img, offset)

    # Resize to a good base size
    base_size = 512
    final = square.resize((base_size, base_size), Image.Resampling.LANCZOS)

    print("  Processed image")

    # Generate all icon sizes
    create_icon_sizes(final, icons_dir)

    print("\nDone! Icons saved to src-tauri/icons/")


if __name__ == "__main__":
    main()
