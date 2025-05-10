import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { FiCamera, FiCheckCircle, FiXCircle, FiLink, FiRotateCw } from 'react-icons/fi';
import './QRScanner.css';

export default function QRScanner() {
  const videoRef = useRef();
  const canvasRef = useRef();
  const [status, setStatus] = useState('loading'); // loading, ready, success, error
  const [scannedData, setScannedData] = useState(null);
  const [showRedirect, setShowRedirect] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState('environment');
  const animationFrameRef = useRef();

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const startCamera = async () => {
    stopCamera();
    setStatus('loading');
    setScannedData(null);
    setShowRedirect(false);

    try {
      const constraints = {
        video: { 
          facingMode: cameraFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setStatus('ready');

      const scanFrame = () => {
        if (!videoRef.current || status !== 'ready') return;

        const canvas = canvasRef.current;
        const video = videoRef.current;
        
        // Only scan when video is ready
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const context = canvas.getContext('2d');
          context.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Focus on center area (where the frame is)
          const centerSize = Math.min(canvas.width, canvas.height) * 0.7;
          const x = (canvas.width - centerSize) / 2;
          const y = (canvas.height - centerSize) / 2;
          
          const imageData = context.getImageData(x, y, centerSize, centerSize);
          const code = jsQR(imageData.data, centerSize, centerSize, {
            inversionAttempts: 'dontInvert',
          });

          if (code) {
            setStatus('success');
            setScannedData(code.data);
            if (isValidUrl(code.data)) {
              setShowRedirect(true);
              setTimeout(() => {
                window.location.href = code.data;
              }, 2000);
            }
            stopCamera();
          }
        }
        
        if (status === 'ready') {
          animationFrameRef.current = requestAnimationFrame(scanFrame);
        }
      };

      animationFrameRef.current = requestAnimationFrame(scanFrame);
    } catch (err) {
      console.error('Camera error:', err);
      setStatus('error');
    }
  };

  const toggleCamera = () => {
    setCameraFacingMode(prev => 
      prev === 'environment' ? 'user' : 'environment'
    );
  };

  useEffect(() => {
    startCamera();
    return stopCamera;
  }, [cameraFacingMode]);

  const rescan = () => {
    startCamera();
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
              <button className="retry-button" onClick={startCamera}>
                Retry
              </button>
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

      <div className="qr-scanner-controls">
        <button className="camera-toggle-button" onClick={toggleCamera}>
          <FiRotateCw /> Switch Camera
        </button>
        {status === 'success' && (
          <button className="rescan-button" onClick={rescan}>
            Scan Another QR
          </button>
        )}
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
              <FiLink /> Open URL
            </button>
          )}
        </div>
      )}
    </div>
  );
}