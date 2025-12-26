# Run Tauri dev server
dev:
    cargo tauri dev

# Production build
build:
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

# Install dependencies
install:
    npm install
