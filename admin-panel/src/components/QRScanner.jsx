// QRScanner.jsx
import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import './QRScanner.css';

export default function QRScanner({ onScan }) {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setLoading(false);
      } catch (err) {
        console.error('Camera access denied:', err);
        setLoading(false);
      }
    };

    startCamera();

    const interval = setInterval(() => {
      if (!videoRef.current || scanned) return;

      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, canvas.width, canvas.height);

      if (code) {
        setScanned(true);
        onScan(code.data);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [scanned, onScan]);

  return (
    <div className="qr-container">
      <h2 className="qr-heading">Scan QR Code</h2>

      {loading && <p className="qr-loading">Loading camera...</p>}

      <div className="qr-video-container">
        <video ref={videoRef} className="qr-video" />
        <div className="qr-overlay"></div>
      </div>

      {scanned && <p className="qr-success">QR Code Scanned!</p>}

      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
}
