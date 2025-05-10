// QRScanner.jsx
import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { FiCamera, FiCheckCircle, FiXCircle, FiLink } from 'react-icons/fi';
import './QRScanner.css';

export default function QRScanner() {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [status, setStatus] = useState('loading'); // loading, ready, success, error
  const [scannedData, setScannedData] = useState(null);
  const [showRedirect, setShowRedirect] = useState(false);

  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          } 
        });
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStatus('ready');
        
        const scanFrame = () => {
          if (!videoRef.current || status !== 'ready') return;

          const canvas = canvasRef.current;
          const context = canvas.getContext('2d');
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

          const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, canvas.width, canvas.height);

          if (code) {
            setStatus('success');
            setScannedData(code.data);
            if (isValidUrl(code.data)) {
              setShowRedirect(true);
              setTimeout(() => {
                window.location.href = code.data;
              }, 2000);
            }
          } else {
            requestAnimationFrame(scanFrame);
          }
        };

        requestAnimationFrame(scanFrame);
      } catch (err) {
        console.error('Camera access denied:', err);
        setStatus('error');
      }
    };

    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, [status]);

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  return (
    <div className="qr-scanner-container">
      <div className="qr-scanner-header">
        <h2 className="qr-scanner-title">
          <FiCamera className="qr-icon" /> QR Code Scanner
        </h2>
        <p className="qr-scanner-subtitle">Point your camera at a QR code</p>
      </div>

      <div className="qr-scanner-video-container">
        <video 
          ref={videoRef} 
          className={`qr-scanner-video ${status === 'success' ? 'scanned' : ''}`} 
          muted 
          playsInline
        />
        <div className="qr-scanner-overlay">
          <div className="qr-scanner-frame"></div>
          {status === 'loading' && (
            <div className="qr-scanner-loading">
              <div className="spinner"></div>
              <p>Initializing camera...</p>
            </div>
          )}
          {status === 'error' && (
            <div className="qr-scanner-error">
              <FiXCircle className="error-icon" />
              <p>Camera access denied</p>
              <p className="small">Please allow camera permissions to scan QR codes</p>
            </div>
          )}
          {status === 'success' && (
            <div className="qr-scanner-success">
              <FiCheckCircle className="success-icon" />
              <p>QR Code Scanned!</p>
              {showRedirect && (
                <div className="qr-redirect-notice">
                  <FiLink className="link-icon" />
                  <p>Redirecting to URL...</p>
                </div>
              )}
            </div>
          )}
        </div>
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      {scannedData && (
        <div className="qr-scanner-result">
          <h3>Scanned Content:</h3>
          <p className="qr-scanner-data">{scannedData}</p>
          {isValidUrl(scannedData) && !showRedirect && (
            <button 
              className="qr-open-button"
              onClick={() => window.open(scannedData, '_blank')}
            >
              Open URL
            </button>
          )}
        </div>
      )}
    </div>
  );
}