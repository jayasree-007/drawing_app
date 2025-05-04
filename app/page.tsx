'use client';

import React, { useRef, useEffect, useState } from 'react';

const DrawingApp = () => {
  const [showLandingPage, setShowLandingPage] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokeColor, setStrokeColor] = useState('#000000');
  const [fillColor, setFillColor] = useState('#FFFFFF');
  const [brushSize, setBrushSize] = useState(5);
  const [tool, setTool] = useState<'pencil' | 'rectangle' | 'circle' | 'line' | 'triangle' | 'polygon' | 'curve' | 'eraser'>('pencil');
  const [curvePoints, setCurvePoints] = useState<{x: number; y: number}[]>([]);
  const [polygonSides, setPolygonSides] = useState(5);
  const [fillMode, setFillMode] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [redoHistory, setRedoHistory] = useState<ImageData[]>([]);
  const [canvasSnapshot, setCanvasSnapshot] = useState<ImageData | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [fileName, setFileName] = useState('my-drawing');

  // Canvas setup
  useEffect(() => {
    if (showLandingPage) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const context = canvas.getContext('2d');
    if (!context) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = (window.innerHeight - 100) * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight - 100}px`;

    context.scale(dpr, dpr);
    context.lineCap = 'round';
    context.strokeStyle = strokeColor;
    context.fillStyle = fillColor;
    context.lineWidth = brushSize;
    
    context.fillStyle = '#FFFFFF';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    contextRef.current = context;
    
    const handleResize = () => {
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      
      canvas.width = window.innerWidth * dpr;
      canvas.height = (window.innerHeight - 100) * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight - 100}px`;
      
      context.scale(dpr, dpr);
      context.putImageData(imageData, 0, 0);
      
      context.lineCap = 'round';
      context.strokeStyle = tool === 'eraser' ? '#FFFFFF' : strokeColor;
      context.fillStyle = fillColor;
      context.lineWidth = brushSize;
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [showLandingPage]);

  useEffect(() => {
    if (contextRef.current) {
      contextRef.current.strokeStyle = tool === 'eraser' ? '#FFFFFF' : strokeColor;
      contextRef.current.fillStyle = fillColor;
      contextRef.current.lineWidth = brushSize;
    }
  }, [strokeColor, fillColor, brushSize, tool]);

  const saveState = () => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (canvas && ctx) {
      const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setHistory(prevHistory => [...prevHistory, currentState]);
      setRedoHistory([]);
    }
  };

  const drawRegularPolygon = (
    ctx: CanvasRenderingContext2D, 
    centerX: number, 
    centerY: number, 
    radius: number, 
    sides: number
  ) => {
    ctx.beginPath();
    const angleStep = (Math.PI * 2) / sides;
    let startAngle = -Math.PI / 2;
    if (sides % 2 === 0) {
      startAngle -= angleStep / 2;
    }
    
    const firstX = centerX + radius * Math.cos(startAngle);
    const firstY = centerY + radius * Math.sin(startAngle);
    ctx.moveTo(firstX, firstY);
    
    for (let i = 1; i <= sides; i++) {
      const angle = startAngle + i * angleStep;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      ctx.lineTo(x, y);
    }
    
    ctx.closePath();
    if (fillMode) {
      ctx.fill();
    }
    ctx.stroke();
  };

  const startDrawing = (e: React.MouseEvent) => {
    const { offsetX, offsetY } = e.nativeEvent;
    const canvas = canvasRef.current;
    if (!canvas || !contextRef.current) return;

    const ctx = contextRef.current;
    
    if (tool === 'curve') {
      setCurvePoints([{ x: offsetX, y: offsetY }]);
      const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setCanvasSnapshot(snapshot);
    }

    setIsDrawing(true);
    setStartPos({ x: offsetX, y: offsetY });

    if (tool === 'pencil' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY);
    }

    if ((tool === 'rectangle' || tool === 'circle' || tool === 'line' || tool === 'triangle' || tool === 'polygon' || tool === 'curve') && canvas) {
      const snapshot = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setCanvasSnapshot(snapshot);
    }
  };

  const draw = (e: React.MouseEvent) => {
    if (!contextRef.current) return;
    const { offsetX, offsetY } = e.nativeEvent;
    const ctx = contextRef.current;

    if (!isDrawing) return;

    if (tool === 'pencil' || tool === 'eraser') {
      ctx.lineTo(offsetX, offsetY);
      ctx.stroke();
    } else if (tool === 'curve') {
      setCurvePoints(prev => [...prev, { x: offsetX, y: offsetY }]);
      
      if (canvasSnapshot && curvePoints.length > 0) {
        ctx.putImageData(canvasSnapshot, 0, 0);
        
        ctx.beginPath();
        ctx.moveTo(curvePoints[0].x, curvePoints[0].y);
        
        curvePoints.forEach((point, i) => {
          ctx.fillRect(point.x - 2, point.y - 2, 4, 4);
        });
        
        if (curvePoints.length > 1) {
          for (let i = 0; i < curvePoints.length - 1; i++) {
            if (i === 0) {
              ctx.lineTo(curvePoints[i + 1].x, curvePoints[i + 1].y);
            } else {
              const xc = (curvePoints[i].x + curvePoints[i + 1].x) / 2;
              const yc = (curvePoints[i].y + curvePoints[i + 1].y) / 2;
              ctx.quadraticCurveTo(curvePoints[i].x, curvePoints[i].y, xc, yc);
            }
          }
        }
        
        ctx.stroke();
      }
    } else if ((tool === 'rectangle' || tool === 'circle' || tool === 'line' || tool === 'triangle' || tool === 'polygon') && startPos && canvasSnapshot) {
      ctx.putImageData(canvasSnapshot, 0, 0);

      const width = offsetX - startPos.x;
      const height = offsetY - startPos.y;

      if (tool === 'rectangle') {
        if (fillMode) {
          ctx.fillRect(startPos.x, startPos.y, width, height);
        }
        ctx.strokeRect(startPos.x, startPos.y, width, height);
      } else if (tool === 'circle') {
        const radius = Math.sqrt(width * width + height * height);
        ctx.beginPath();
        ctx.arc(startPos.x, startPos.y, radius, 0, Math.PI * 2);
        if (fillMode) {
          ctx.fill();
        }
        ctx.stroke();
      } else if (tool === 'line') {
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(offsetX, offsetY);
        ctx.stroke();
      } else if (tool === 'triangle') {
        ctx.beginPath();
        ctx.moveTo(startPos.x, startPos.y);
        ctx.lineTo(startPos.x - width/2, startPos.y + height);
        ctx.lineTo(startPos.x + width/2, startPos.y + height);
        ctx.closePath();
        if (fillMode) {
          ctx.fill();
        }
        ctx.stroke();
      } else if (tool === 'polygon') {
        const radius = Math.sqrt(width * width + height * height);
        drawRegularPolygon(ctx, startPos.x, startPos.y, radius, polygonSides);
      }
    }
  };

  const stopDrawing = () => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    
    if (!canvas || !ctx) return;
    
    if (tool === 'curve' && isDrawing && curvePoints.length > 1) {
      ctx.putImageData(canvasSnapshot!, 0, 0);
      
      ctx.beginPath();
      ctx.moveTo(curvePoints[0].x, curvePoints[0].y);
      
      if (curvePoints.length > 2) {
        for (let i = 0; i < curvePoints.length - 2; i++) {
          const xc = (curvePoints[i].x + curvePoints[i + 1].x) / 2;
          const yc = (curvePoints[i].y + curvePoints[i + 1].y) / 2;
          ctx.quadraticCurveTo(curvePoints[i].x, curvePoints[i].y, xc, yc);
        }
        
        const lastPoint = curvePoints[curvePoints.length - 1];
        const secondLastPoint = curvePoints[curvePoints.length - 2];
        ctx.quadraticCurveTo(
          secondLastPoint.x, 
          secondLastPoint.y,
          lastPoint.x,
          lastPoint.y
        );
      } else {
        ctx.lineTo(curvePoints[1].x, curvePoints[1].y);
      }
      
      ctx.stroke();
      setCurvePoints([]);
    }
    
    if (!isDrawing) return;
    setIsDrawing(false);
    saveState();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas && contextRef.current) {
      saveState();
      contextRef.current.clearRect(0, 0, canvas.width, canvas.height);
      contextRef.current.fillStyle = '#FFFFFF';
      contextRef.current.fillRect(0, 0, canvas.width, canvas.height);
      contextRef.current.fillStyle = fillColor;
      setCurvePoints([]);
    }
  };

  const undo = () => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    
    if (!canvas || !ctx || history.length === 0) return;
    
    if (history.length > 0) {
      const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setRedoHistory(prev => [...prev, currentState]);
      
      const newHistory = [...history];
      const lastState = newHistory.pop();
      setHistory(newHistory);
      
      if (newHistory.length > 0) {
        ctx.putImageData(newHistory[newHistory.length - 1], 0, 0);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = fillColor;
      }
    }
  };

  const redo = () => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (redoHistory.length > 0 && canvas && ctx) {
      const redoState = redoHistory[redoHistory.length - 1];
      setHistory((prevHistory) => [...prevHistory, ctx.getImageData(0, 0, canvas.width, canvas.height)]);
      ctx.putImageData(redoState, 0, 0);
      setRedoHistory(redoHistory.slice(0, -1));
    }
  };

  const exportDrawing = (format: string) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let downloadLink: HTMLAnchorElement | null = null;
    let dataUrl: string | null = null;

    switch (format) {
      case 'png':
        dataUrl = canvas.toDataURL('image/png');
        downloadLink = document.createElement('a');
        downloadLink.href = dataUrl;
        downloadLink.download = `${fileName}.png`;
        break;
      case 'jpg':
        dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        downloadLink = document.createElement('a');
        downloadLink.href = dataUrl;
        downloadLink.download = `${fileName}.jpg`;
        break;
      case 'svg':
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const svgContent = `
          <svg width="${canvas.width}" height="${canvas.height}" 
            xmlns="http://www.w3.org/2000/svg">
            <image width="${canvas.width}" height="${canvas.height}" 
              href="${canvas.toDataURL('image/png')}" />
          </svg>
        `;
        
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        
        downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = `${fileName}.svg`;
        break;
    }

    if (downloadLink) {
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }

    setShowExportMenu(false);
  };

  const getButtonClass = (btnTool: string) =>
    `px-4 py-1 rounded transition-colors duration-200 ${
      tool === btnTool 
        ? 'bg-blue-500 text-white hover:bg-blue-600' 
        : 'bg-white text-black border hover:bg-gray-100'
    }`;

  if (showLandingPage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
        <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
          <div className="p-8 text-center">
            <h1 className="text-4xl font-bold text-blue-600 mb-6">🎨 Drawing App</h1>
            <p className="text-lg text-gray-700 mb-8">
              Create beautiful drawings with our easy-to-use drawing tools. 
              Choose from pencils, shapes, and more to bring your ideas to life!
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h3 className="font-semibold text-blue-700 mb-2">✨ Features</h3>
                <ul className="text-left text-gray-700 space-y-2">
                  <li>• Multiple drawing tools (Pencil, Shapes, etc.)</li>
                  <li>• Customizable colors and brush sizes</li>
                  <li>• Undo/Redo functionality</li>
                  <li>• Save your artwork in multiple formats</li>
                  <li>• Responsive design works on any device</li>
                </ul>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                <h3 className="font-semibold text-green-700 mb-2">🖌️ Quick Start</h3>
                <ul className="text-left text-gray-700 space-y-2">
                  <li>1. Select a tool from the toolbar</li>
                  <li>2. Choose your colors and brush size</li>
                  <li>3. Start drawing on the canvas</li>
                  <li>4. Use Undo/Redo if needed</li>
                  <li>5. Save your masterpiece!</li>
                </ul>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={() => {
                  setShowLandingPage(false);
                  setShowTutorial(false);
                }}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-300 text-lg font-medium shadow-md hover:shadow-lg"
              >
                Start Drawing Now
              </button>
              
              <button
                onClick={() => setShowTutorial(!showTutorial)}
                className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-300 text-lg font-medium shadow-md hover:shadow-lg"
              >
                {showTutorial ? 'Hide Tutorial' : 'Show Tutorial'}
              </button>
            </div>
          </div>
          
          {showTutorial && (
            <div className="bg-gray-50 border-t border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">📚 Drawing Tutorial</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                  <h3 className="font-semibold text-gray-800 mb-2">Basic Drawing</h3>
                  <p className="text-gray-700 mb-3">
                    Select the pencil tool and draw freely on the canvas. Adjust the brush size and color to your liking.
                  </p>
                  <div className="bg-gray-100 p-2 rounded text-sm text-gray-600">
                    Tip: Hold Shift while drawing to create straight lines.
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                  <h3 className="font-semibold text-gray-800 mb-2">Shapes</h3>
                  <p className="text-gray-700 mb-3">
                    Use the shape tools (rectangle, circle, etc.) to create perfect geometric forms. Click and drag to draw.
                  </p>
                  <div className="bg-gray-100 p-2 rounded text-sm text-gray-600">
                    Tip: Toggle fill mode to create filled shapes.
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                  <h3 className="font-semibold text-gray-800 mb-2">Editing</h3>
                  <p className="text-gray-700 mb-3">
                    Made a mistake? Use the Undo button (or Ctrl+Z) to go back. Redo (Ctrl+Y) to restore changes.
                  </p>
                  <div className="bg-gray-100 p-2 rounded text-sm text-gray-600">
                    Tip: Clear the canvas anytime with the Clear button.
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                  <h3 className="font-semibold text-gray-800 mb-2">Saving</h3>
                  <p className="text-gray-700 mb-3">
                    Save your artwork as PNG, JPG, or SVG. Name your file before exporting for easy organization.
                  </p>
                  <div className="bg-gray-100 p-2 rounded text-sm text-gray-600">
                    Tip: SVG format preserves quality when scaling.
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="bg-gray-100 p-4 text-center text-sm text-gray-600 border-t border-gray-200">
            <p>Created with React and Canvas • Enjoy your creative journey!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 p-2 bg-blue-200 flex-wrap">
        {/* Color and size controls */}
        <div className="flex items-center flex-wrap gap-2 mr-2 border-r pr-2 border-gray-400">
          <div className="flex items-center">
            <span className="mr-1 text-black">Stroke:</span>
            <input 
              type="color" 
              value={strokeColor} 
              onChange={(e) => setStrokeColor(e.target.value)} 
              className="mr-1 cursor-pointer hover:scale-105 transition-transform"
              title="Stroke color"
            />
          </div>
          
          <div className="flex items-center">
            <span className="mr-1 text-black">Fill:</span>
            <input 
              type="color" 
              value={fillColor} 
              onChange={(e) => setFillColor(e.target.value)} 
              className="mr-1 cursor-pointer hover:scale-105 transition-transform"
              title="Fill color"
            />
            <button 
              className={`px-2 py-1 rounded transition-colors duration-200 ${
                fillMode 
                  ? 'bg-green-500 text-white hover:bg-green-600' 
                  : 'bg-white text-black border hover:bg-gray-100'
              }`}
              onClick={() => setFillMode(!fillMode)}
              title="Toggle fill mode"
            >
              {fillMode ? 'Fill: ON' : 'Fill: OFF'}
            </button>
          </div>
          
          <div className="flex items-center">
            <span className="mr-1 text-black">Size:</span>
            <input
              type="range"
              min={1}
              max={20}
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-24 cursor-pointer hover:opacity-80 transition-opacity"
              title="Brush size"
            />
          </div>
          
          {tool === 'polygon' && (
            <div className="flex items-center">
              <span className="mr-1 text-black">Sides:</span>
              <input
                type="number"
                min={3}
                max={12}
                value={polygonSides}
                onChange={(e) => setPolygonSides(Number(e.target.value))}
                className="w-16 px-2 py-1 text-black border rounded hover:border-blue-300 focus:border-blue-500 transition-colors"
                title="Number of polygon sides"
              />
            </div>
          )}
        </div>
        
        {/* Tool selection */}
        <div className="flex items-center flex-wrap gap-1 border-r pr-2 border-gray-400">
          <button 
            className={getButtonClass('pencil')} 
            onClick={() => setTool('pencil')}
            title="Pencil tool"
          >
            ✏️ Pencil
          </button>
          <button 
            className={getButtonClass('eraser')} 
            onClick={() => setTool('eraser')}
            title="Eraser tool"
          >
            🧽 Eraser
          </button>
          <button 
            className={getButtonClass('line')} 
            onClick={() => setTool('line')}
            title="Line tool"
          >
            ➖ Line
          </button>
          <button 
            className={getButtonClass('curve')} 
            onClick={() => setTool('curve')}
            title="Curve tool"
          >
            〰️ Curve
          </button>
        </div>
        
        {/* Shapes */}
        <div className="flex items-center flex-wrap gap-1 border-r pr-2 border-gray-400">
          <button 
            className={getButtonClass('rectangle')} 
            onClick={() => setTool('rectangle')}
            title="Rectangle tool"
          >
            ▭ Rectangle
          </button>
          <button 
            className={getButtonClass('circle')} 
            onClick={() => setTool('circle')}
            title="Circle tool"
          >
            🔵 Circle
          </button>
          <button 
            className={getButtonClass('triangle')} 
            onClick={() => setTool('triangle')}
            title="Triangle tool"
          >
            ▲ Triangle
          </button>
          <button 
            className={getButtonClass('polygon')} 
            onClick={() => setTool('polygon')}
            title="Polygon tool"
          >
            ⬡ Polygon
          </button>
        </div>
        
        {/* Canvas operations */}
        <div className="flex items-center flex-wrap gap-1">
          <button 
            onClick={clearCanvas} 
            className="px-4 py-1 rounded bg-red-500 text-white hover:bg-red-600 transition-colors duration-200"
            title="Clear canvas"
          >
            🗑️ Clear
          </button>
          <button 
            onClick={undo} 
            className="px-4 py-1 rounded bg-gray-500 text-white hover:bg-gray-600 transition-colors duration-200"
            title="Undo last action"
          >
            ↩️ Undo
          </button>
          <button 
            onClick={redo} 
            className="px-4 py-1 rounded bg-gray-500 text-white hover:bg-gray-600 transition-colors duration-200"
            title="Redo last action"
          >
            ↪️ Redo
          </button>
          <button 
            onClick={() => setShowExportMenu(!showExportMenu)} 
            className="px-4 py-1 rounded bg-green-500 text-white hover:bg-green-600 transition-colors duration-200"
            title="Save/export options"
          >
            💾 Save
          </button>
          <button 
            onClick={() => setShowLandingPage(true)} 
            className="px-4 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 transition-colors duration-200"
            title="Back to home"
          >
            🏠 Home
          </button>
        </div>
        
        {tool === 'polygon' && (
          <div className="w-full mt-1 text-sm text-gray-600 hover:text-gray-800 transition-colors">
            Set the number of sides, then click and drag to create a polygon.
          </div>
        )}
      </div>
      
      {showExportMenu && (
        <div className="absolute right-0 mt-1 bg-white border border-gray-300 rounded shadow-lg p-4 z-10">
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1 hover:text-gray-900 transition-colors">
              File Name:
            </label>
            <input 
              type="text" 
              value={fileName} 
              onChange={(e) => setFileName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 hover:border-gray-400 transition-colors"
            />
          </div>
          <div className="grid grid-cols-1 gap-2">
            <button 
              onClick={() => exportDrawing('png')} 
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors duration-200"
            >
              Export as PNG
            </button>
            <button 
              onClick={() => exportDrawing('jpg')} 
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded transition-colors duration-200"
            >
              Export as JPG
            </button>
            <button 
              onClick={() => exportDrawing('svg')} 
              className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded transition-colors duration-200"
            >
              Export as SVG
            </button>
            <button 
              onClick={() => setShowExportMenu(false)} 
              className="bg-gray-300 hover:bg-gray-400 text-black px-4 py-2 rounded mt-2 transition-colors duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      <canvas
        ref={canvasRef}
        className="border border-black cursor-crosshair hover:border-gray-500 transition-colors"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />
    </div>
  );
};

export default DrawingApp;