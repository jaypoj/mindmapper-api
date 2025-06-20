export default async function handler(req, res) {
  // Enable CORS for Copilot Studio and other clients
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'This endpoint only accepts POST requests'
    });
  }

  try {
    // Get the user input from the request body
    const { data } = req.body;
    
    if (!data) {
      return res.status(400).json({ 
        error: 'Bad request',
        message: 'Please provide data in the request body'
      });
    }

    // Your system prompt
    const systemPrompt = `You are an expert front-end developer specializing in data visualization. Your task is to create a fully interactive mind map visualization as a single, self-contained HTML file.
The mind map must have the following features:
1. Core Structure & Data:
•	Data Input Flexibility: This prompt is designed to handle both structured and unstructured data.
o	If the user provides structured data (like a nested list or JSON), you will parse and render the hierarchy as given.
o	If the user provides unstructured data (like a simple list, steps, or a collection of items), your first step is to analyze the input and infer a logical hierarchy. Group related items into logical categories and sub-categories. Once you have determined this structure, proceed with generating the mind map.
•	Classic Mind Map Structure: The visualization must have a central "root" node. From the root, primary "phase" or "category" branches should extend outwards. These can further extend to "subsection" or "sub-category" branches, which then terminate in individual "document" or "item" nodes.
2. Visual & Styling Requirements (Aesthetics are critical):
•	Layout & Spacing: Use a clean, modern, and spacious layout. Crucially, the layout algorithm must ensure that no nodes or branches overlap. There must be sufficient padding and spacing between all elements to ensure readability.
•	Styling: Use Tailwind CSS for all styling. Load it from the CDN.
•	Typography: Use the 'Inter' font from Google Fonts.
•	Nodes: Each item in the map (root, phase, document, etc.) should be a visually distinct "card" or "node" with rounded corners, subtle shadows, and a clean border.
•	Color Coding: Use different background colors for each level of the hierarchy to create a clear visual distinction.
•	Icons: Use the Lucide icon library (loaded from a CDN) to add a relevant icon to each node to improve visual communication.
•	Connectors: Use SVG lines to draw smooth, curved connectors between parent and child nodes.
3. Interactivity & User Experience:
•	Controls Location: All on-screen controls (Zoom and Download) must be located together in the top-right corner of the viewport.
•	Initial View: The mind map's initial zoom level and position must be automatically calculated to ensure the entire map is visible on load without any elements being cut off.
•	Zooming: Implement zoom-in and zoom-out functionality using on-screen control buttons.
•	Panning: The user must be able to pan the entire mind map by clicking and dragging the background. The cursor should change to indicate "grab" and "grabbing" states.
•	Draggable Nodes:
o	All nodes (except the root) must be draggable by the user.
o	When a node is dragged, its connecting SVG lines must dynamically update in real-time, always staying correctly attached to the moving node and its parent/child nodes.
•	Download Functionality: Include a download button that triggers a browser download of the entire interactive mind map as a single HTML file.
•	Hover Effects: Add a subtle hover effect to nodes (e.g., a slight scale-up or a brighter shadow).
4. Technical Implementation & Robustness:
•	Single File: The entire application (HTML, CSS, and JavaScript) must be contained within a single .html file.
•	Rendering Guarantee: You must ensure that all data items provided are rendered as visible nodes on the map and that all nodes (except the root) have a visible connector line attaching them to their parent. The generated output must not be empty or have invisible elements.
•	Dependencies: Only use CDN links for external libraries (Tailwind CSS, Lucide).
•	JavaScript: Use modern, well-commented vanilla JavaScript. Do not use frameworks.
•	Code Quality: The code must be clean, well-organized, and extensively commented to explain the logic, especially for layout calculation, panning, zooming, downloading, node dragging, and dynamic SVG connector updates.`;

    // Generate the mind map HTML based on the user's data
    const generatedHtml = generateMindMapHtml(data, systemPrompt);
    
    return res.status(200).json({ 
      success: true, 
      html: generatedHtml,
      message: 'Mind map generated successfully'
    });

  } catch (error) {
    console.error('Error generating mind map:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to generate mind map'
    });
  }
}

function generateMindMapHtml(userInput, systemPrompt) {
  // Parse the user input and create a hierarchical structure
  const mindMapData = parseInputToMindMap(userInput);
  
  // Your base HTML template with dynamic data
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Interactive Mind Map: ${mindMapData.title}</title>
    
    <!-- Tailwind CSS from CDN -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- Google Fonts: Inter -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- Lucide Icons from CDN -->
    <script src="https://unpkg.com/lucide@latest"></script>

    <style>
        body {
            font-family: 'Inter', sans-serif;
            overflow: hidden;
        }

        #mind-map-container {
            width: 100vw;
            height: 100vh;
            position: relative;
            background-color: #f8fafc;
            cursor: grab;
            transition: background-color 0.3s ease;
        }

        #mind-map-container.grabbing {
            cursor: grabbing;
        }

        #mind-map-canvas {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            transform-origin: 0 0;
            transition: transform 0.3s ease-out;
        }

        #svg-canvas {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            overflow: visible;
        }

        .connector {
            stroke-width: 2px;
            stroke: #cbd5e1;
            fill: none;
        }

        .node {
            position: absolute;
            display: flex;
            align-items: center;
            padding: 0.75rem 1.25rem;
            border-radius: 0.75rem;
            border: 1px solid #e2e8f0;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
            cursor: pointer;
            user-select: none;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            white-space: nowrap;
        }

        .node:hover {
            transform: scale(1.05);
            box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.1);
        }

        .node-level-0 { background-color: #ffffff; }
        .node-level-1 { background-color: #e0f2fe; }
        .node-level-2 { background-color: #dcfce7; }
        .node-level-3 { background-color: #fef9c3; }

        .node .icon {
            margin-right: 0.75rem;
        }
    </style>
</head>
<body class="bg-slate-50">

    <div id="mind-map-container">
        <div id="mind-map-canvas">
            <svg id="svg-canvas"></svg>
            <div id="nodes-container"></div>
        </div>
    </div>
    
    <div id="ui-controls" class="absolute top-4 right-4 flex items-center space-x-2 bg-white p-2 rounded-lg shadow-md border border-slate-200">
        <button id="zoom-in-btn" title="Zoom In" class="p-2 rounded-md hover:bg-slate-100 text-slate-600">
            <i data-lucide="zoom-in" class="w-5 h-5"></i>
        </button>
        <button id="zoom-out-btn" title="Zoom Out" class="p-2 rounded-md hover:bg-slate-100 text-slate-600">
            <i data-lucide="zoom-out" class="w-5 h-5"></i>
        </button>
        <button id="download-btn" title="Download HTML" class="p-2 rounded-md hover:bg-slate-100 text-slate-600">
            <i data-lucide="download" class="w-5 h-5"></i>
        </button>
    </div>

<script>
document.addEventListener('DOMContentLoaded', () => {
    const mindMapData = ${JSON.stringify(mindMapData.structure)};

    const container = document.getElementById('mind-map-container');
    const canvas = document.getElementById('mind-map-canvas');
    const nodesContainer = document.getElementById('nodes-container');
    const svgCanvas = document.getElementById('svg-canvas');
    const zoomInBtn = document.getElementById('zoom-in-btn');
    const zoomOutBtn = document.getElementById('zoom-out-btn');
    const downloadBtn = document.getElementById('download-btn');

    let scale = 1;
    let panX = 0;
    let panY = 0;
    let isPanning = false;
    let startPanX = 0;
    let startPanY = 0;
    
    let activeNode = null;
    let nodeStartX = 0;
    let nodeStartY = 0;

    const nodePositions = new Map();
    const nodeElements = new Map();

    function init() {
        nodesContainer.innerHTML = '';
        svgCanvas.innerHTML = '';
        nodePositions.clear();
        nodeElements.clear();

        createNodes(mindMapData, 0, null);
        positionNodes();
        drawAllConnectors();
        fitToScreen();
        lucide.createIcons();
    }
    
    function createNodes(nodeData, level, parentId) {
        const nodeEl = document.createElement('div');
        nodeEl.id = nodeData.id;
        nodeEl.className = \`node node-level-\${level}\`;
        nodeEl.dataset.parentId = parentId;
        
        nodeEl.innerHTML = \`
            <i data-lucide="\${nodeData.icon || 'circle'}" class="icon w-5 h-5"></i>
            <span>\${nodeData.label}</span>
        \`;
        
        nodesContainer.appendChild(nodeEl);
        nodeElements.set(nodeData.id, nodeEl);

        if (level > 0) {
            nodeEl.addEventListener('mousedown', onNodeMouseDown);
        }

        if (nodeData.children) {
            nodeData.children.forEach(child => createNodes(child, level + 1, nodeData.id));
        }
    }

    function positionNodes() {
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        const rootX = containerWidth / 2;
        const rootY = containerHeight / 2;
        
        positionNodeAndChildren(mindMapData, rootX, rootY, 0, 360);

        for (const [id, pos] of nodePositions.entries()) {
            const el = nodeElements.get(id);
            if(el) {
                el.style.left = \`\${pos.x}px\`;
                el.style.top = \`\${pos.y}px\`;
            }
        }
    }

    function positionNodeAndChildren(nodeData, x, y, startAngle, sweepAngle) {
        const nodeEl = nodeElements.get(nodeData.id);
        const nodeWidth = nodeEl.offsetWidth;
        const nodeHeight = nodeEl.offsetHeight;

        const finalX = x - nodeWidth / 2;
        const finalY = y - nodeHeight / 2;
        nodePositions.set(nodeData.id, { x: finalX, y: finalY });

        if (!nodeData.children || nodeData.children.length === 0) {
            return;
        }

        const children = nodeData.children;
        const numChildren = children.length;
        const angleStep = numChildren > 1 ? sweepAngle / (numChildren - 1) : 0;
        
        const radius = numChildren < 5 ? 250 : 300 + (numChildren * 10);
        
        children.forEach((child, i) => {
            const angleDeg = startAngle + (i * angleStep) - (sweepAngle / 2);
            const angleRad = angleDeg * (Math.PI / 180);

            const childX = x + radius * Math.cos(angleRad);
            const childY = y + radius * Math.sin(angleRad);

            positionNodeAndChildren(child, childX, childY, angleDeg, 90);
        });
    }

    function drawConnector(childId) {
        const childEl = nodeElements.get(childId);
        const parentId = childEl.dataset.parentId;
        if (!parentId) return;

        const parentEl = nodeElements.get(parentId);
        const parentPos = nodePositions.get(parentId);
        const childPos = nodePositions.get(childId);
        
        if (!parentPos || !childPos) return;

        const startX = parentPos.x + parentEl.offsetWidth / 2;
        const startY = parentPos.y + parentEl.offsetHeight / 2;
        const endX = childPos.x + childEl.offsetWidth / 2;
        const endY = childPos.y + childEl.offsetHeight / 2;

        const c1X = startX;
        const c1Y = endY;
        const pathData = \`M \${startX} \${startY} Q \${c1X} \${c1Y}, \${endX} \${endY}\`;
        
        let path = svgCanvas.querySelector(\`#conn-\${childId}\`);
        if (!path) {
            path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.id = \`conn-\${childId}\`;
            path.setAttribute('class', 'connector');
            svgCanvas.appendChild(path);
        }
        
        path.setAttribute('d', pathData);
    }
    
    function drawAllConnectors() {
        nodeElements.forEach((el, id) => {
            if (el.dataset.parentId) {
                drawConnector(id);
            }
        });
    }
    
    function applyTransform() {
        canvas.style.transform = \`translate(\${panX}px, \${panY}px) scale(\${scale})\`;
    }

    function onZoomIn() {
        scale = Math.min(3, scale * 1.2);
        applyTransform();
    }

    function onZoomOut() {
        scale = Math.max(0.1, scale / 1.2);
        applyTransform();
    }

    function onPanStart(e) {
        if (e.target.closest('.node')) return;
        
        e.preventDefault();
        isPanning = true;
        container.classList.add('grabbing');
        startPanX = e.clientX - panX;
        startPanY = e.clientY - panY;
    }

    function onPanMove(e) {
        if (!isPanning) return;
        
        e.preventDefault();
        panX = e.clientX - startPanX;
        panY = e.clientY - startPanY;
        applyTransform();
    }

    function onPanEnd() {
        isPanning = false;
        container.classList.remove('grabbing');
    }

    function onNodeMouseDown(e) {
        e.stopPropagation(); 
        
        activeNode = e.currentTarget;
        const nodePos = nodePositions.get(activeNode.id);
        
        nodeStartX = e.clientX - (nodePos.x * scale + panX);
        nodeStartY = e.clientY - (nodePos.y * scale + panY);
        
        document.addEventListener('mousemove', onNodeMouseMove);
        document.addEventListener('mouseup', onNodeMouseUp, { once: true });
    }

    function onNodeMouseMove(e) {
        if (!activeNode) return;
        
        const newX = (e.clientX - nodeStartX - panX) / scale;
        const newY = (e.clientY - nodeStartY - panY) / scale;
        
        nodePositions.set(activeNode.id, { x: newX, y: newY });
        
        activeNode.style.left = \`\${newX}px\`;
        activeNode.style.top = \`\${newY}px\`;
        
        drawConnector(activeNode.id);

        const children = findChildrenOfNode(activeNode.id);
        children.forEach(childId => drawConnector(childId));
    }
    
    function findChildrenOfNode(parentId) {
        const children = [];
        nodeElements.forEach((el, id) => {
            if (el.dataset.parentId === parentId) {
                children.push(id);
            }
        });
        return children;
    }

    function onNodeMouseUp() {
        activeNode = null;
        document.removeEventListener('mousemove', onNodeMouseMove);
    }
    
    function fitToScreen() {
        if (nodePositions.size === 0) return;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        for (const [id, pos] of nodePositions.entries()) {
            const el = nodeElements.get(id);
            minX = Math.min(minX, pos.x);
            minY = Math.min(minY, pos.y);
            maxX = Math.max(maxX, pos.x + el.offsetWidth);
            maxY = Math.max(maxY, pos.y + el.offsetHeight);
        }

        const mapWidth = maxX - minX;
        const mapHeight = maxY - minY;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        const scaleX = containerWidth / mapWidth;
        const scaleY = containerHeight / mapHeight;
        
        scale = Math.min(scaleX, scaleY) * 0.9; 

        panX = (containerWidth - (mapWidth * scale)) / 2 - (minX * scale);
        panY = (containerHeight - (mapHeight * scale)) / 2 - (minY * scale);

        applyTransform();
    }
    
    function downloadHtml() {
        const blob = new Blob([document.documentElement.outerHTML], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'interactive-mind-map.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    zoomInBtn.addEventListener('click', onZoomIn);
    zoomOutBtn.addEventListener('click', onZoomOut);
    downloadBtn.addEventListener('click', downloadHtml);
    container.addEventListener('mousedown', onPanStart);
    container.addEventListener('mousemove', onPanMove);
    window.addEventListener('mouseup', onPanEnd);
    window.addEventListener('resize', fitToScreen);

    init();
});
</script>

</body>
</html>`;
}

function parseInputToMindMap(input) {
  // Simple parser that creates a mind map structure from user input
  // This is a basic implementation - you can enhance this with AI integration
  
  const inputStr = typeof input === 'string' ? input : JSON.stringify(input);
  const title = extractTitle(inputStr);
  
  // Create a basic structure based on common patterns
  if (inputStr.toLowerCase().includes('steps') || inputStr.toLowerCase().includes('process')) {
    return createProcessMindMap(inputStr, title);
  } else if (inputStr.includes('\n') || inputStr.includes(',')) {
    return createListMindMap(inputStr, title);
  } else {
    return createSimpleMindMap(inputStr, title);
  }
}

function extractTitle(input) {
  const lines = input.split('\n').filter(line => line.trim());
  if (lines.length > 0) {
    return lines[0].substring(0, 50) + (lines[0].length > 50 ? '...' : '');
  }
  return 'Mind Map';
}

function createProcessMindMap(input, title) {
  const lines = input.split('\n').filter(line => line.trim());
  const children = [];
  
  lines.slice(1).forEach((line, index) => {
    if (line.trim()) {
      children.push({
        id: `step-${index}`,
        label: line.trim(),
        icon: 'arrow-right',
        children: []
      });
    }
  });
  
  return {
    title,
    structure: {
      id: 'root',
      label: title,
      icon: 'target',
      children
    }
  };
}

function createListMindMap(input, title) {
  const items = input.split(/[,\n]/).filter(item => item.trim());
  const children = [];
  
  // Group items into categories if there are many
  if (items.length > 6) {
    const midpoint = Math.ceil(items.length / 2);
    children.push({
      id: 'category-1',
      label: 'Group 1',
      icon: 'folder',
      children: items.slice(0, midpoint).map((item, i) => ({
        id: `item-1-${i}`,
        label: item.trim(),
        icon: 'circle',
        children: []
      }))
    });
    children.push({
      id: 'category-2',
      label: 'Group 2',
      icon: 'folder',
      children: items.slice(midpoint).map((item, i) => ({
        id: `item-2-${i}`,
        label: item.trim(),
        icon: 'circle',
        children: []
      }))
    });
  } else {
    items.forEach((item, index) => {
      if (item.trim()) {
        children.push({
          id: `item-${index}`,
          label: item.trim(),
          icon: 'circle',
          children: []
        });
      }
    });
  }
  
  return {
    title,
    structure: {
      id: 'root',
      label: title,
      icon: 'brain',
      children
    }
  };
}

function createSimpleMindMap(input, title) {
  return {
    title,
    structure: {
      id: 'root',
      label: title,
      icon: 'lightbulb',
      children: [
        {
          id: 'main-idea',
          label: input.substring(0, 100),
          icon: 'star',
          children: []
        }
      ]
    }
  };
}