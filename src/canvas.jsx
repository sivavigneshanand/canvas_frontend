import React, { useRef, useState, useEffect, useCallback } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


const DrawingBoard = () => {
  const canvasRef = useRef(null);
  const wsRef = useRef(null); // WebSocket reference
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 });
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);
  const [userName, setUserName] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);


    useEffect(() => {
      if (!loggedIn) return;
      const canvas = canvasRef.current;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }, [loggedIn]);

  useEffect(() => {

    if (!loggedIn) return;

    const ws = new WebSocket('wss://canvasbackend-production.up.railway.app');
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'user_connected', message:  `${userName} has joined the drawing.` }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
    
      if (message.type === 'initial_drawing') {
        message.data.forEach(drawOnCanvas)
      } else if (message.type === 'drawing') {
        drawOnCanvas(message.drawing);
      } else if (message.type === 'reset_canvas') {
        resetCanvas();
      } else if (message.type === 'user_connected') {
        toast.info(message.message);
      } else if (message.type === 'user_disconnected') {
        toast.info(message.message);
      }
    };

    const handleBeforeUnload = () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'user_disconnected', message:  `${userName} has left the drawing.`  }));
      }
    };

    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      ws.close();
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedIn,userName]);

    // Helper to get mouse position on the canvas
    const getPosition = useCallback((e) => {
      const rect = canvasRef.current.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    },[canvasRef]);

   const handleLogin = useCallback(() => {
    setLoggedIn(true)
  },[]);

  // Start drawing on canvas
  const startDrawing = useCallback((e) => {
    setIsDrawing(true);
    const position = getPosition(e);
    setLastPosition(position);
  },[getPosition]);

  // Stop drawing on canvas
  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  },[]);

  // Draw on canvas
  const draw = useCallback((e) => {
    if (!isDrawing) return;

    const position = getPosition(e);
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.beginPath();
    context.moveTo(lastPosition.x, lastPosition.y);
    context.lineTo(position.x, position.y);
    context.lineWidth = brushSize;
    context.strokeStyle = brushColor;
    context.lineCap = 'round';
    context.stroke();

    // Send drawing data to the server
    const drawingEvent = {
      type: 'drawing',
      drawing: {
        x1: lastPosition.x,
        y1: lastPosition.y,
        x2: position.x,
        y2: position.y,
        color: brushColor,
        size: brushSize,
      },
    };
    wsRef.current.send(JSON.stringify(drawingEvent));

    setLastPosition(position);
  },[isDrawing,brushSize,brushColor,getPosition,lastPosition]);



  // Handle the reset canvas event
  const resetCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);
  },[canvasRef]);

  const drawOnCanvas = useCallback((drawing) => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    context.beginPath();
    context.moveTo(drawing.x1, drawing.y1);
    context.lineTo(drawing.x2, drawing.y2);
    context.lineWidth = drawing.size;
    context.strokeStyle = drawing.color;
    context.lineCap = 'round';
    context.stroke();
  },[canvasRef]);

  return (
    <>
    {!loggedIn ? (
        <div style={{ textAlign: 'center', marginTop: '100px' }}>
          <h2>Enter Your Name to Join the Drawing</h2>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Your Name"
          />
          <button onClick={handleLogin}>Join Drawing</button>
        </div>
      ) :
    (<div>
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseUp={stopDrawing}
        onMouseMove={draw}
        onBlur={stopDrawing}
        style={{ border: '1px solid black', display: 'block' }}
      ></canvas>

      <div style={{ textAlign: 'center' }}>
        <p>Brush Color:</p>
        <input
          type="color"
          value={brushColor}
          onChange={(e) => setBrushColor(e.target.value)}
        />
        <p>Brush Size:</p>
        <input
          type="number"
          value={brushSize}
          onChange={(e) => setBrushSize(Number(e.target.value))}
          min="1"
          max="50"
        />
      </div>

      <button onClick={() => {
        wsRef.current.send(JSON.stringify({ type: 'reset' }))
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        context.clearRect(0, 0, canvas.width, canvas.height);
        }}>
        Reset Canvas
      </button>
    </div>)
}

<ToastContainer 
position="top-right"
autoClose={3000}
hideProgressBar
newestOnTop
closeButton={false}
rtl={false}
pauseOnFocusLoss
draggable
pauseOnHover
/>
    </>
  );
};

export default DrawingBoard;

