import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('reidViewer.viewImages', async (resourceUri?: vscode.Uri) => {
        let dirPath: string;

        if (resourceUri && resourceUri.scheme === 'file') {
            dirPath = resourceUri.fsPath;
        } else {
            const dirUri = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                openLabel: 'Select Directory'
            });

            if (!dirUri || dirUri.length === 0) {
                vscode.window.showErrorMessage('Directory not selected');
                return;
            }

            dirPath = dirUri[0].fsPath;
        }

        const imagesDir = path.join(dirPath, 'images');
        const csvPath = path.join(dirPath, 'cos_similarity.csv');
        
        if (!fs.existsSync(imagesDir)) {
            vscode.window.showErrorMessage('No "images" subdirectory found in the selected directory');
            return;
        }

        if (!fs.existsSync(csvPath)) {
            vscode.window.showErrorMessage('No "cos_similarity.csv" file found in the selected directory');
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'reidViewer',
            'ReID Viewer',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'];
        const imageFiles = getImageFiles(imagesDir, imageExtensions);

        if (imageFiles.length === 0) {
            vscode.window.showInformationMessage('No images found in images directory');
            return;
        }

        // Load cosine similarity data
        const similarityData = loadSimilarityData(csvPath);

        panel.webview.html = getWebviewContent(imageFiles, imagesDir, similarityData, panel.webview, context.extensionUri);

        panel.webview.onDidReceiveMessage(
            message => {
                switch (message.command) {
                    case 'alert':
                        vscode.window.showErrorMessage(message.text);
                        return;
                }
            },
            undefined,
            context.subscriptions
        );
    });

    context.subscriptions.push(disposable);
}

function getImageFiles(dirPath: string, extensions: string[]): string[] {
    try {
        const files = fs.readdirSync(dirPath);
        const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return extensions.includes(ext);
        });
        
        // Sort files numerically by extracting numbers from filenames
        return imageFiles.sort((a, b) => {
            const aMatch = a.match(/(\d+)/);
            const bMatch = b.match(/(\d+)/);
            
            if (aMatch && bMatch) {
                return parseInt(aMatch[1]) - parseInt(bMatch[1]);
            }
            
            // Fallback to alphabetical sort if no numbers found
            return a.localeCompare(b);
        });
    } catch (error) {
        return [];
    }
}

function loadSimilarityData(csvPath: string): Map<string, Map<string, number>> {
    try {
        const csvContent = fs.readFileSync(csvPath, 'utf-8');
        const lines = csvContent.split('\n');
        const headers = lines[0].split(',').slice(1); // Remove first empty column
        
        const similarityMap = new Map<string, Map<string, number>>();
        
        console.log('CSV Headers:', headers.slice(0, 10)); // Debug: show first 10 headers
        
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            
            const values = line.split(',');
            if (values.length < 2) continue;
            
            const rowImage = values[0];
            const similarities = new Map<string, number>();
            
            for (let j = 1; j < values.length && j <= headers.length; j++) {
                const colImage = headers[j - 1];
                const similarity = parseFloat(values[j]);
                if (!isNaN(similarity)) {
                    similarities.set(colImage, similarity);
                }
            }
            
            similarityMap.set(rowImage, similarities);
            
            // Debug: log first few entries
            if (i <= 3) {
                console.log(`Row ${rowImage}:`, Array.from(similarities.entries()).slice(0, 5));
            }
        }
        
        console.log('Loaded similarity data for', similarityMap.size, 'images');
        return similarityMap;
    } catch (error) {
        console.error('Error loading similarity data:', error);
        return new Map();
    }
}

function getWebviewContent(imageFiles: string[], dirPath: string, similarityData: Map<string, Map<string, number>>, webview: vscode.Webview, extensionUri: vscode.Uri): string {
    const imageData = imageFiles.map((filename, index) => {
        const imgPath = path.join(dirPath, filename);
        const imgUri = webview.asWebviewUri(vscode.Uri.file(imgPath));
        
        // Convert filename to match similarity data format (Image_1, Image_2, etc.)
        const baseName = path.parse(filename).name;
        console.log(`Image file: ${filename}, baseName: ${baseName}`);
        
        return {
            index,
            filename,
            baseName,
            uri: imgUri.toString()
        };
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ReID Viewer</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 10px;
            background-color: #1e1e1e;
            color: #cccccc;
        }
        .container {
            max-width: 100%;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 10px;
        }
        .directory-path {
            font-size: 12px;
            color: #888;
            margin-bottom: 10px;
            word-wrap: break-word;
            font-family: monospace;
        }
        .similarity-display {
            text-align: center;
            margin: 20px 0;
            padding: 15px;
            background-color: #2d2d2d;
            border-radius: 8px;
        }
        .similarity-score {
            font-size: 24px;
            font-weight: bold;
            color: #4CAF50;
            margin-bottom: 10px;
        }
        .similarity-label {
            font-size: 14px;
            color: #ccc;
        }
        .dual-viewer {
            display: flex;
            gap: 20px;
            min-height: 500px;
        }
        .viewer-panel {
            flex: 1;
            background-color: #2d2d2d;
            border-radius: 8px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            height: 450px;
        }
        .viewer-header {
            padding: 8px 10px;
            background-color: #3a3a3a;
            border-bottom: 1px solid #444;
            flex-shrink: 0;
        }
        .viewer-title {
            font-size: 16px;
            font-weight: bold;
            color: #fff;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .image-counter {
            font-size: 12px;
            color: #ccc;
            font-weight: normal;
        }
        .viewer-content {
            display: flex;
            flex-direction: column;
            height: 100%;
        }
        .controls {
            padding: 8px 10px;
            background-color: #3a3a3a;
            display: flex;
            align-items: center;
            gap: 10px;
            flex-shrink: 0;
        }
        .image-display {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 350px;
            background-color: #1e1e1e;
            position: relative;
        }
        .main-image {
            max-width: 90%;
            max-height: 90%;
            object-fit: contain;
            border-radius: 4px;
        }
        .no-image {
            color: #888;
            font-size: 14px;
        }
        .image-info {
            padding: 8px 10px;
            background-color: #3a3a3a;
            font-size: 12px;
            color: #ccc;
            flex-shrink: 0;
        }
        .similarity-graph {
            margin: 6px 0;
            padding: 8px;
            background-color: #2d2d2d;
            border-radius: 6px;
        }
        .graph-title {
            margin-bottom: 8px;
            text-align: center;
        }
        .similarity-score {
            font-size: 24px;
            font-weight: bold;
            color: #4CAF50;
            line-height: 1;
        }
        .similarity-label {
            font-size: 12px;
            color: #ccc;
            margin-bottom: 5px;
        }
        .graph-container {
            position: relative;
            height: 120px;
            background-color: #1e1e1e;
            border: 1px solid #444;
            border-radius: 4px;
            overflow: hidden;
        }
        .graph-canvas {
            width: 100%;
            height: 100%;
            display: block;
        }
        .nav-button {
            background-color: #28a745;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        .nav-button:hover {
            background-color: #34ce57;
        }
        .nav-button:disabled {
            background-color: #555;
            cursor: not-allowed;
        }
        .counter {
            color: #ffffff;
            font-size: 14px;
            min-width: 60px;
        }
        .slider-container {
            flex: 1;
            margin: 0 10px;
        }
        .slider {
            width: 100%;
            height: 4px;
            border-radius: 2px;
            background: #444;
            outline: none;
            -webkit-appearance: none;
        }
        .slider::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #0e639c;
            cursor: pointer;
        }
        .slider::-moz-range-thumb {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #0e639c;
            cursor: pointer;
            border: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>ReID Viewer</h1>
            <div class="directory-path">Path: ${dirPath}</div>
            <div class="directory-path">Images: ${imageData.length}</div>
        </div>
        
        <div class="similarity-graph" id="similarityGraph">
            <div class="graph-title">
                <div class="similarity-label">Similarity</div>
                <div class="similarity-score" id="similarityScore">-</div>
            </div>
            <div class="graph-container">
                <canvas class="graph-canvas" id="graphCanvas"></canvas>
            </div>
        </div>
        
        <div class="dual-viewer">
            <div class="viewer-panel">
                <div class="viewer-header">
                    <div class="viewer-title">
                        <span>Reference Image</span>
                        <span class="image-counter" id="leftImageCounter">- / ${imageData.length}</span>
                    </div>
                </div>
                <div class="viewer-content">
                    <div class="image-display">
                        <img class="main-image" id="leftImage" src="" alt="" style="display: none;">
                        <div class="no-image" id="leftNoImage">Use controls to select image</div>
                    </div>
                    <div class="image-info" id="leftImageInfo">No image selected</div>
                    <div class="controls">
                        <button class="nav-button" id="leftPrev">←</button>
                        <span class="counter" id="leftCounter">- / ${imageData.length}</span>
                        <div class="slider-container">
                            <input type="range" min="1" max="${imageData.length}" value="1" class="slider" id="leftSlider">
                        </div>
                        <button class="nav-button" id="leftNext">→</button>
                    </div>
                </div>
            </div>
            
            <div class="viewer-panel">
                <div class="viewer-header">
                    <div class="viewer-title">
                        <span>Target Image</span>
                        <span class="image-counter" id="rightImageCounter">- / ${imageData.length}</span>
                    </div>
                </div>
                <div class="viewer-content">
                    <div class="image-display">
                        <img class="main-image" id="rightImage" src="" alt="" style="display: none;">
                        <div class="no-image" id="rightNoImage">Use controls to select image</div>
                    </div>
                    <div class="image-info" id="rightImageInfo">No image selected</div>
                    <div class="controls">
                        <button class="nav-button" id="rightPrev">←</button>
                        <span class="counter" id="rightCounter">- / ${imageData.length}</span>
                        <div class="slider-container">
                            <input type="range" min="1" max="${imageData.length}" value="1" class="slider" id="rightSlider">
                        </div>
                        <button class="nav-button" id="rightNext">→</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const imageData = ${JSON.stringify(imageData)};
        
        // Convert Map to plain object properly
        const similarityDataObj = {};
        ${Array.from(similarityData.entries()).map(([key, valueMap]) => 
            `similarityDataObj["${key}"] = ${JSON.stringify(Object.fromEntries(valueMap))};`
        ).join('\n        ')}
        
        const similarityData = similarityDataObj;
        console.log('Similarity data keys:', Object.keys(similarityData).slice(0, 10));
        console.log('Sample similarity data for Image_1:', similarityData['Image_1'] ? Object.keys(similarityData['Image_1']).slice(0, 10) : 'Not found');
        
        let leftIndex = -1;
        let rightIndex = -1;
        let graphData = [];
        
        // DOM elements
        const leftImage = document.getElementById('leftImage');
        const rightImage = document.getElementById('rightImage');
        const leftNoImage = document.getElementById('leftNoImage');
        const rightNoImage = document.getElementById('rightNoImage');
        const leftImageInfo = document.getElementById('leftImageInfo');
        const rightImageInfo = document.getElementById('rightImageInfo');
        const leftCounter = document.getElementById('leftCounter');
        const rightCounter = document.getElementById('rightCounter');
        const leftImageCounter = document.getElementById('leftImageCounter');
        const rightImageCounter = document.getElementById('rightImageCounter');
        const leftSlider = document.getElementById('leftSlider');
        const rightSlider = document.getElementById('rightSlider');
        const leftPrev = document.getElementById('leftPrev');
        const leftNext = document.getElementById('leftNext');
        const rightPrev = document.getElementById('rightPrev');
        const rightNext = document.getElementById('rightNext');
        const graphCanvas = document.getElementById('graphCanvas');
        
        // Graph context
        const ctx = graphCanvas.getContext('2d');
        
        // Setup graph canvas
        function setupGraph() {
            const rect = graphCanvas.getBoundingClientRect();
            graphCanvas.width = rect.width * devicePixelRatio;
            graphCanvas.height = rect.height * devicePixelRatio;
            ctx.scale(devicePixelRatio, devicePixelRatio);
            graphCanvas.style.width = rect.width + 'px';
            graphCanvas.style.height = rect.height + 'px';
        }
        
        // Resize observer for canvas
        const resizeObserver = new ResizeObserver(() => {
            setupGraph();
            drawGraph();
        });
        resizeObserver.observe(graphCanvas);
        
        // Add window resize listener for responsive graph
        window.addEventListener('resize', () => {
            setupGraph();
            drawGraph();
        });
        
        // Initial setup
        setupGraph();
        
        
        // Navigation button handlers
        leftPrev.addEventListener('click', () => navigateImage('left', -1));
        leftNext.addEventListener('click', () => navigateImage('left', 1));
        rightPrev.addEventListener('click', () => navigateImage('right', -1));
        rightNext.addEventListener('click', () => navigateImage('right', 1));
        
        // Slider handlers
        leftSlider.addEventListener('input', (e) => {
            const index = parseInt(e.target.value) - 1;
            selectImage('left', index);
        });
        
        rightSlider.addEventListener('input', (e) => {
            const index = parseInt(e.target.value) - 1;
            selectImage('right', index);
        });
        
        function selectImage(side, index) {
            if (index < 0 || index >= imageData.length) return;
            
            const img = imageData[index];
            
            if (side === 'left') {
                leftIndex = index;
                leftImage.src = img.uri;
                leftImage.style.display = 'block';
                leftNoImage.style.display = 'none';
                leftImageInfo.textContent = img.filename;
                leftCounter.textContent = \`\${index + 1} / \${imageData.length}\`;
                leftImageCounter.textContent = \`\${index + 1} / \${imageData.length}\`;
                leftSlider.value = index + 1;
                
                // Update graph when left image changes
                updateGraphData();
                
                // Update navigation buttons
                leftPrev.disabled = index === 0;
                leftNext.disabled = index === imageData.length - 1;
                
            } else {
                rightIndex = index;
                rightImage.src = img.uri;
                rightImage.style.display = 'block';
                rightNoImage.style.display = 'none';
                rightImageInfo.textContent = img.filename;
                rightCounter.textContent = \`\${index + 1} / \${imageData.length}\`;
                rightImageCounter.textContent = \`\${index + 1} / \${imageData.length}\`;
                rightSlider.value = index + 1;
                
                // Update graph highlight when right image changes
                drawGraph();
                
                // Update navigation buttons
                rightPrev.disabled = index === 0;
                rightNext.disabled = index === imageData.length - 1;
            }
            
            updateSimilarity();
        }
        
        function updateGraphData() {
            if (leftIndex === -1) {
                graphData = [];
                drawGraph();
                return;
            }
            
            const leftImage = imageData[leftIndex];
            const leftKey = getImageKey(leftImage.baseName);
            
            graphData = [];
            let minVal = 1;
            let maxVal = 0;
            
            // Generate graph data for all images
            for (let i = 0; i < imageData.length; i++) {
                const rightImage = imageData[i];
                const rightKey = getImageKey(rightImage.baseName);
                
                let similarity = null;
                if (similarityData[leftKey] && similarityData[leftKey][rightKey] !== undefined) {
                    similarity = similarityData[leftKey][rightKey];
                } else if (similarityData[rightKey] && similarityData[rightKey][leftKey] !== undefined) {
                    similarity = similarityData[rightKey][leftKey];
                }
                
                if (similarity !== null) {
                    graphData.push({ index: i, similarity: similarity });
                    minVal = Math.min(minVal, similarity);
                    maxVal = Math.max(maxVal, similarity);
                } else {
                    graphData.push({ index: i, similarity: 0 });
                }
            }
            
            // Graph info removed in v0.0.2
            
            drawGraph();
        }
        
        function drawGraph() {
            if (!ctx || graphData.length === 0) return;
            
            const canvas = graphCanvas;
            const width = canvas.width / devicePixelRatio;
            const height = canvas.height / devicePixelRatio;
            
            // Clear canvas
            ctx.clearRect(0, 0, width, height);
            
            // Draw background
            ctx.fillStyle = '#1e1e1e';
            ctx.fillRect(0, 0, width, height);
            
            // Calculate dimensions - ensure bars fill full width responsively
            const padding = 20;
            const graphWidth = width - padding * 2;
            const graphHeight = height - padding * 2;
            const barWidth = graphWidth / graphData.length;
            const barGap = Math.max(0, barWidth * 0.1); // 10% gap between bars
            const actualBarWidth = Math.max(1, barWidth - barGap);
            
            // Find min/max for scaling
            let minVal = Math.min(...graphData.map(d => d.similarity));
            let maxVal = Math.max(...graphData.map(d => d.similarity));
            const range = maxVal - minVal;
            
            if (range === 0) {
                minVal -= 0.1;
                maxVal += 0.1;
            }
            
            // Draw bars
            graphData.forEach((data, i) => {
                const x = padding + i * barWidth + barGap / 2;
                const normalizedHeight = ((data.similarity - minVal) / (maxVal - minVal)) * graphHeight;
                const y = padding + graphHeight - normalizedHeight;
                
                // Color based on similarity
                let color;
                if (data.similarity >= 0.9) {
                    color = '#4CAF50';
                } else if (data.similarity >= 0.7) {
                    color = '#FF9800';
                } else {
                    color = '#F44336';
                }
                
                // Highlight current right image
                if (rightIndex !== -1 && i === rightIndex) {
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(x - 1, padding, actualBarWidth + 2, graphHeight);
                    ctx.fillStyle = color;
                    ctx.fillRect(x, y, actualBarWidth, normalizedHeight);
                    
                    // Draw highlight outline
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(x, y, actualBarWidth, normalizedHeight);
                } else {
                    ctx.fillStyle = color;
                    ctx.fillRect(x, y, actualBarWidth, normalizedHeight);
                }
            });
            
            // Draw grid lines
            ctx.strokeStyle = '#444';
            ctx.lineWidth = 1;
            for (let i = 0; i <= 10; i++) {
                const y = padding + (graphHeight / 10) * i;
                ctx.beginPath();
                ctx.moveTo(padding, y);
                ctx.lineTo(padding + graphWidth, y);
                ctx.stroke();
            }
            
            // Current display removed in v0.0.2
        }
        
        function navigateImage(side, direction) {
            const currentIndex = side === 'left' ? leftIndex : rightIndex;
            const newIndex = currentIndex + direction;
            
            if (newIndex >= 0 && newIndex < imageData.length) {
                selectImage(side, newIndex);
            }
        }
        
        function updateSimilarity() {
            if (leftIndex === -1 || rightIndex === -1) {
                document.getElementById('similarityScore').textContent = '-';
                return;
            }
            
            const leftImage = imageData[leftIndex];
            const rightImage = imageData[rightIndex];
            
            console.log('Updating similarity for:', leftImage.filename, 'vs', rightImage.filename);
            console.log('Left baseName:', leftImage.baseName, 'Right baseName:', rightImage.baseName);
            
            // Try to find similarity in the data
            // Convert filename to match CSV format (e.g., "image1.jpg" -> "Image_1")
            const leftKey = getImageKey(leftImage.baseName);
            const rightKey = getImageKey(rightImage.baseName);
            
            console.log('Looking up similarity:', leftKey, 'vs', rightKey);
            
            let similarity = null;
            
            // Look up similarity in both directions
            if (similarityData[leftKey] && similarityData[leftKey][rightKey] !== undefined) {
                similarity = similarityData[leftKey][rightKey];
                console.log('Found similarity (left->right):', similarity);
            } else if (similarityData[rightKey] && similarityData[rightKey][leftKey] !== undefined) {
                similarity = similarityData[rightKey][leftKey];
                console.log('Found similarity (right->left):', similarity);
            } else {
                console.log('No similarity found for keys:', leftKey, rightKey);
                console.log('Left key exists:', !!similarityData[leftKey]);
                console.log('Right key exists:', !!similarityData[rightKey]);
                if (similarityData[leftKey]) {
                    console.log('Left key available targets:', Object.keys(similarityData[leftKey]).slice(0, 10));
                }
                if (similarityData[rightKey]) {
                    console.log('Right key available targets:', Object.keys(similarityData[rightKey]).slice(0, 10));
                }
            }
            
            const scoreElement = document.getElementById('similarityScore');
            if (similarity !== null) {
                scoreElement.textContent = similarity.toFixed(4);
                
                // Color based on similarity (same as graph colors)
                if (similarity >= 0.9) {
                    scoreElement.style.color = '#4CAF50'; // Green
                } else if (similarity >= 0.7) {
                    scoreElement.style.color = '#FF9800'; // Orange
                } else {
                    scoreElement.style.color = '#F44336'; // Red
                }
            } else {
                scoreElement.textContent = 'N/A';
                scoreElement.style.color = '#4CAF50'; // Default green
            }
        }
        
        function getImageKey(baseName) {
            // Debug: log the baseName being processed
            console.log('Processing baseName:', baseName);
            
            // Try to extract number from filename and convert to Image_X format
            const match = baseName.match(/(\d+)/);
            if (match) {
                const key = \`Image_\${match[1]}\`;
                console.log('Generated key:', key);
                return key;
            }
            
            // If no number found, try direct match first
            if (similarityData[baseName]) {
                console.log('Direct match found for:', baseName);
                return baseName;
            }
            
            // Try variations
            const variations = [
                baseName,
                \`Image_\${baseName}\`,
                baseName.replace(/^image_?/i, 'Image_'),
                baseName.replace(/\..*$/, '') // Remove extension
            ];
            
            for (const variation of variations) {
                if (similarityData[variation]) {
                    console.log('Found variation match:', variation, 'for', baseName);
                    return variation;
                }
            }
            
            console.log('No match found for baseName:', baseName);
            console.log('Available keys:', Object.keys(similarityData).slice(0, 10));
            return baseName;
        }
        
        // Keyboard navigation
        document.addEventListener('keydown', (event) => {
            switch(event.key) {
                case 'ArrowLeft':
                    if (event.shiftKey) {
                        navigateImage('left', -1);
                    } else {
                        navigateImage('right', -1);
                    }
                    break;
                case 'ArrowRight':
                    if (event.shiftKey) {
                        navigateImage('left', 1);
                    } else {
                        navigateImage('right', 1);
                    }
                    break;
            }
        });
        
        // Initialize with first image selected on both sides
        if (imageData.length > 0) {
            selectImage('left', 0);
            if (imageData.length > 1) {
                selectImage('right', 1);
            }
        }
    </script>
</body>
</html>`;
}

export function deactivate() {}