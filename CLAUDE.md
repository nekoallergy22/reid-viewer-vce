# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Visual Studio Code extension called "ReID Viewer" that provides a visual tool for analyzing Re-Identification (ReID) results with cosine similarity comparison. The extension creates a dual-panel interface for comparing images and displays their similarity scores based on CSV data.

## Core Architecture

The extension follows a typical VS Code extension structure with a single TypeScript source file that generates an HTML webview for the user interface:

- **Extension Entry Point** (`src/extension.ts`): Contains the main extension logic, command registration, and webview generation
- **Webview Interface**: Generated HTML with embedded JavaScript that provides the dual-image viewer with interactive controls
- **Data Processing**: CSV parsing for cosine similarity matrices and image file discovery with numeric sorting

### Key Components

1. **Command Registration**: `reidViewer.viewImages` command accessible via context menu and command palette
2. **File System Validation**: Checks for required `images/` directory and `cos_similarity.csv` file
3. **Image Processing**: Supports common formats (jpg, png, gif, bmp, webp) with numeric filename sorting
4. **Similarity Data Loading**: Parses CSV matrices with `Image_N` format headers
5. **Webview UI**: Interactive dual-panel viewer with sliders, navigation buttons, and similarity visualization

## Development Commands

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch for changes and recompile
npm run watch

# Launch extension in development (VS Code)
# Press F5 to run in Extension Development Host
```

## Data Format Requirements

The extension supports flexible directory structures and data formats (v0.0.4+):

**Directory Structure (Flexible):**
```
target-directory/
├── any-subdirectory/    # Single subdirectory with images (if no 'images/' exists)
│   ├── any_image_1.jpg
│   ├── any_image_2.jpg
│   └── ...
└── any_file.csv         # Single CSV file (if no 'cos_similarity.csv' exists)
```

**Preferred Structure:**
```
target-directory/
├── images/              # Preferred directory name
│   ├── Image_1.jpg
│   ├── Image_2.jpg
│   └── ...
└── cos_similarity.csv   # Preferred CSV filename
```

**Auto-Detection Rules:**
- **Images**: Prefers `images/` directory, falls back to single subdirectory containing image files
- **CSV**: Prefers `cos_similarity.csv`, falls back to single CSV file in directory
- **Name Matching**: CSV headers and image filenames don't need to match if matrix dimensions equal image count

**CSV Format:** 
- First row: headers starting with empty cell, then any column names
- Subsequent rows: any row names, followed by similarity values
- Similarity values should be floating-point numbers between 0 and 1
- Matrix must be square (NxN) and match image count for auto-mapping

## Key Implementation Details

- **Auto-Detection**: `findImagesDirectory()` and `findCsvFile()` functions handle flexible file discovery
- **Index-Based Mapping**: When CSV dimensions match image count, uses `image_0`, `image_1`, etc. for mapping
- **Image Filename Parsing**: Uses regex `/(\d+)/` to extract numbers for sorting
- **Similarity Lookup**: Bidirectional lookup supporting both `left->right` and `right->left` queries  
- **Color Coding**: Green (≥0.9), Orange (≥0.7), Red (<0.7) for similarity visualization
- **Keyboard Navigation**: Arrow keys (with Shift modifier for left panel)
- **Responsive Canvas**: Uses ResizeObserver for adaptive graph rendering

## Extension Packaging

The extension can be packaged using VS Code's built-in packaging system. Pre-built packages are stored in the `vsix/` directory with version-specific names.

## Sample Data

Two sample datasets are included:
- `sample_data/`: Large dataset with 187 images and full similarity matrix
- `sample_data_t/`: Smaller test dataset with 31 images

Both include the required `images/` subdirectory and `cos_similarity.csv` file for testing the extension functionality.