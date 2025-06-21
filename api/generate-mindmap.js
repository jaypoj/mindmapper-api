export default async function handler(req, res) {
  // Enhanced CORS headers for Copilot Studio
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'false');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Log the request for debugging
  console.log('Method:', req.method);
  console.log('Headers:', req.headers);
  console.log('Body:', req.body);
  
  // Allow both GET and POST for testing
  if (req.method === 'GET') {
    return res.status(200).json({ 
      message: 'Mind Map API is running',
      endpoint: '/api/generate-mindmap',
      method: 'POST',
      example: { data: 'your content here' }
    });
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'This endpoint accepts POST requests',
      received: req.method
    });
  }

  try {
    // Handle different content types
    let data;
    
    if (req.body && typeof req.body === 'object') {
      data = req.body.data;
    } else if (req.body && typeof req.body === 'string') {
      try {
        const parsed = JSON.parse(req.body);
        data = parsed.data;
      } catch (e) {
        data = req.body;
      }
    }
    
    if (!data) {
      return res.status(400).json({ 
        error: 'Bad request',
        message: 'Please provide data in the request body',
        received: req.body,
        expected: { data: 'your content here' }
      });
    }

    // Generate the mind map HTML
    const html = generateMindMapHtml(data);
    
    return res.status(200).json({ 
      success: true, 
      html: html,
      message: 'Mind map generated successfully',
      input: data
    });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to generate mind map',
      details: error.message
    });
  }
}

function generateMindMapHtml(input) {
  const title = input.substring(0, 50);
  const items = parseInputToItems(input);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mind Map: ${title}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
        body { 
            font-family: 'Inter', sans-serif; 
            overflow: hidden;
            margin: 0;
            padding: 0;
        }
        
        #mind-map-container {
            width: 100vw;
            height: 100vh;
            position: relative;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            cursor: grab;
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
            transform-origin: center center;
            transition: transform 0.3s ease;
        }
        
        .node {
            position: absolute;
            background: white;
            border-radius: 15px;
            padding: 16px 20px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
            cursor: pointer;
            user-select: none;
            transition: all 0.3s ease;
            border: 2px solid #e2e8f0;
            min-width: 120px;
            text-align: center;
        }
        
        .node:hover {
            transform: scale(1.05);
            box-shadow: 0 12px 35px rgba(0,0,0,0.2);
        }
        
        .node.center {
            background: linear-gradient(135deg, #4f46e5, #7c3aed);
            color: white;
            font-size: 18px;
            font-weight: bold;
            border: none;
        }
        
        .node.branch {
            background: linear-gradient(135deg, #06b6d4, #3b82f6);
            color: white;
            font-weight: 600;
        }
        
        .connector {
            position: absolute;
            height: 3px;
            background: linear-gradient(90deg, #4f46e5, #06b6d4);
            border-radius: 2px;
            transform-origin: left center;
        }
        
        .controls {
            position: fixed;
            top: 20px;
            right: 20px;
            display: flex;
            gap: 10px;
            z-index: 1000;
        }
        
        .control-btn {
            background: white;
            border: none;
            border-radius: 8px;
            padding: 12px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            cursor: pointer;
            transition: all 0.2s ease;
        }
        
        .control-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.15);
        }
    </style>
</head>
<body>
    <div id="mind-map-container">
        <div id="mind-map-canvas">
            <!-- Mind map content will be generated here -->
        </div>
    </div>
    
    <div class="controls">
        <button class="control-btn" onclick="zoomIn()" title="Zoom In">
            <i data-lucide="zoom-in" class="w-5 h-5"></i>
        </button>
        <button class="control-btn" onclick="zoomOut()" title="Zoom Out">
            <i data-lucide="zoom-out" class="w-5 h-5"></i>
        </button>
        <button class="control-btn" onclick="resetView()" title="Reset View">
            <i data-lucide="home" class="w-5 h-5"></i>
        </button>
        <button class="control-btn" onclick="downloadHtml()" title="Download">
            <i data-lucide="download" class="w-5 h-5"></i>
        </button>
    </div>

    <script>
        let scale = 1;
        let panX = 0;
        let panY = 0;
        let isPanning = false;
        let lastX = 0;
        let lastY = 0;
        
        const container = document.getElementById('mind-map-container');
        const canvas = document.getElementById('mind-map-canvas');
        
        // Generate mind map from data
        const mindMapData = {
            center: "${title}",
            branches: ${JSON.stringify(items)}
        };
        
        function createMindMap() {
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            
            // Create center node
            const centerNode = document.createElement('div');
            centerNode.className = 'node center';
            centerNode.textContent = mindMapData.center;
            centerNode.style.left = (centerX - 75) + 'px';
            centerNode.style.top = (centerY - 25) + 'px';
            canvas.appendChild(centerNode);
            
            // Create branch nodes
            const branches = mindMapData.branches;
            const angleStep = (2 * Math.PI) / branches.length;
            const radius = 200;
            
            branches.forEach((branch, index) => {
                const angle = index * angleStep;
                const x = centerX + radius * Math.cos(angle) - 60;
                const y = centerY + radius * Math.sin(angle) - 25;
                
                // Create branch node
                const branchNode = document.createElement('div');
                branchNode.className = 'node branch';
                branchNode.textContent = branch;
                branchNode.style.left = x + 'px';
                branchNode.style.top = y + 'px';
                canvas.appendChild(branchNode);
                
                // Create connector
                const connector = document.createElement('div');
                connector.className = 'connector';
                const distance = Math.sqrt(Math.pow(x + 60 - centerX, 2) + Math.pow(y + 25 - centerY, 2));
                const connectorAngle = Math.atan2(y + 25 - centerY, x + 60 - centerX);
                
                connector.style.left = centerX + 'px';
                connector.style.top = (centerY - 1) + 'px';
                connector.style.width = distance + 'px';
                connector.style.transform = 'rotate(' + connectorAngle + 'rad)';
                canvas.appendChild(connector);
            });
        }
        
        // Pan and zoom functionality
        container.addEventListener('mousedown', startPan);
        container.addEventListener('mousemove', pan);
        container.addEventListener('mouseup', endPan);
        container.addEventListener('wheel', zoom);
        
        function startPan(e) {
            if (e.target === container || e.target === canvas) {
                isPanning = true;
                container.classList.add('grabbing');
                lastX = e.clientX;
                lastY = e.clientY;
            }
        }
        
        function pan(e) {
            if (isPanning) {
                const deltaX = e.clientX - lastX;
                const deltaY = e.clientY - lastY;
                panX += deltaX;
                panY += deltaY;
                updateTransform();
                lastX = e.clientX;
                lastY = e.clientY;
            }
        }
        
        function endPan() {
            isPanning = false;
            container.classList.remove('grabbing');
        }
        
        function zoom(e) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? 0.9 : 1.1;
            scale = Math.max(0.1, Math.min(3, scale * delta));
            updateTransform();
        }
        
        function zoomIn() {
            scale = Math.min(3, scale * 1.2);
            updateTransform();
        }
        
        function zoomOut() {
            scale = Math.max(0.1, scale / 1.2);
            updateTransform();
        }
        
        function resetView() {
            scale = 1;
            panX = 0;
            panY = 0;
            updateTransform();
        }
        
        function updateTransform() {
            canvas.style.transform = \`translate(\${panX}px, \${panY}px) scale(\${scale})\`;
        }
        
        function downloadHtml() {
            const blob = new Blob([document.documentElement.outerHTML], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'mindmap.html';
            a.click();
            URL.revokeObjectURL(url);
        }
        
        // Initialize
        createMindMap();
        lucide.createIcons();
    </script>
</body>
</html>`;
}

function parseInputToItems(input) {
  // Parse input into mind map items
  const items = [];
  
  if (input.includes(':')) {
    const parts = input.split(':');
    if (parts.length > 1) {
      const itemsStr = parts[1];
      items.push(...itemsStr.split(/[,;]/).map(item => item.trim()).filter(item => item));
    }
  } else if (input.includes(',')) {
    items.push(...input.split(',').map(item => item.trim()).filter(item => item));
  } else if (input.includes('\n')) {
    items.push(...input.split('\n').map(item => item.trim()).filter(item => item));
  } else {
    // Split by common words
    const words = input.split(' ');
    for (let i = 0; i < words.length; i += 2) {
      if (words[i]) {
        items.push(words.slice(i, i + 2).join(' '));
      }
    }
  }
  
  return items.length > 0 ? items : ['Idea 1', 'Idea 2', 'Idea 3'];
}
