// QRScanner.jsx
import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

export default function QRScanner({ onScan }) {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    const startCamera = async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    };

    startCamera();

    const interval = setInterval(() => {
      if (!videoRef.current || scanned) return;

      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, canvas.width, canvas.height);

      if (code) {
        setScanned(true);
        onScan(code.data); // Send scanned data to parent
      }
    }, 500);

    return () => clearInterval(interval);
  }, [scanned, onScan]);

  return (
    <div>
      <video ref={videoRef} style={{ width: "100%" }} />
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}
