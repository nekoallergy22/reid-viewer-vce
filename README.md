# ReID Viewer

A Visual Studio Code extension for visualizing Re-Identification (ReID) results with cosine similarity comparison.

## Features

- **Dual Image Viewer**: Side-by-side comparison of images
- **Cosine Similarity Display**: Real-time similarity score between selected images
- **Color-coded Similarity**: Visual feedback based on similarity scores
  - 🟢 Green: High similarity (≥0.9)
  - 🟠 Orange: Medium similarity (≥0.7)
  - 🔴 Red: Low similarity (<0.7)
- **Interactive Navigation**: Multiple ways to browse images
- **Sorted Display**: Images displayed in numerical order

## Requirements

Your directory must contain:
- `images/` subdirectory with image files
- `cos_similarity.csv` file with similarity data

### Directory Structure
```
your-project/
├── images/
│   ├── Image_1.jpg
│   ├── Image_2.jpg
│   └── ...
└── cos_similarity.csv
```

### CSV Format
The `cos_similarity.csv` should have the following format:
```csv
,Image_1,Image_2,Image_3,...
Image_1,1.000000,0.801724,0.471922,...
Image_2,0.801724,1.000000,0.470931,...
Image_3,0.471922,0.470931,1.000000,...
...
```

## Usage

1. **Open ReID Viewer**:
   - Right-click on a directory in VSCode Explorer
   - Select "ReID Viewer" from the context menu
   - Or use Command Palette: `ReID Viewer: Open`

2. **Navigate Images**:
   - Click thumbnails to select images
   - Use arrow buttons or sliders for navigation
   - Keyboard shortcuts:
     - `Arrow Left/Right`: Navigate right panel
     - `Shift + Arrow Left/Right`: Navigate left panel

3. **View Similarity**:
   - Select images in both left and right panels
   - Cosine similarity score appears at the top
   - Score is color-coded for quick assessment

## Installation

### From Source

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Compile the extension:
   ```bash
   npm run compile
   ```
4. Press `F5` to run the extension in a new Extension Development Host window

### Development

- `npm run compile`: Compile TypeScript
- `npm run watch`: Watch for changes and compile automatically
- `F5`: Launch extension in development mode

## Supported Image Formats

- `.jpg`, `.jpeg`
- `.png`
- `.gif`
- `.bmp`
- `.webp`

## Image Naming Convention

Images should be named with numbers for proper sorting:
- `Image_1.jpg`, `Image_2.jpg`, `Image_3.jpg`, etc.
- Or any format containing numbers: `img1.png`, `photo_001.jpg`, etc.

## Troubleshooting

### "No images subdirectory found"
- Ensure your selected directory contains an `images/` folder
- Check that the folder name is exactly "images" (lowercase)

### "No cos_similarity.csv file found"
- Ensure the CSV file is in the root of the selected directory
- Check that the filename is exactly "cos_similarity.csv"

### "Cosine Similarity shows N/A"
- Verify CSV format matches the expected structure
- Check that image filenames match the CSV headers
- Open browser developer tools (F12) for detailed debug information

### Images not displaying in correct order
- Ensure image filenames contain numbers
- The extension sorts by extracting numbers from filenames

## Technical Details

- Built with TypeScript and VS Code Extension API
- Uses webview for rich UI rendering
- Supports CSV parsing for similarity data
- Real-time similarity lookup and display

## License

This project is available under the MIT License.

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## Changelog

### v0.0.1
- Initial release
- Dual image viewer
- Cosine similarity display
- CSV data loading
- Keyboard navigation
- Color-coded similarity scores