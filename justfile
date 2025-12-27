# Run Tauri dev server
dev:
    cargo tauri dev

# Production build (no bundles, fast)
build:
    cargo tauri build --no-bundle

# Production build with all bundles (deb, rpm, AppImage)
build-bundles:
    cargo tauri build

# Build with debug symbols for profiling
build-profiling:
    cargo tauri build --no-bundle -- --profile profiling

# Type check frontend + backend
check:
    npm run build
    cargo check -p mojimix

# Remove all build artifacts
clean:
    rm -rf dist node_modules/.vite src-tauri/target

# Install npm dependencies
install-deps:
    npm install

# Build and install to ~/.local with desktop integration
install: build
    #!/usr/bin/env bash
    set -euo pipefail
    mkdir -p ~/.local/bin ~/.local/share/applications ~/.local/share/icons/hicolor/128x128/apps
    rm -f ~/.local/bin/mojimix
    cp src-tauri/target/release/mojimix ~/.local/bin/
    install -m 644 src-tauri/MojiMix.desktop ~/.local/share/applications/
    install -m 644 src-tauri/icons/128x128.png ~/.local/share/icons/hicolor/128x128/apps/mojimix.png
    update-desktop-database ~/.local/share/applications 2>/dev/null || true
    gtk-update-icon-cache ~/.local/share/icons/hicolor 2>/dev/null || true
    echo "Installed MojiMix to ~/.local/bin/mojimix"
