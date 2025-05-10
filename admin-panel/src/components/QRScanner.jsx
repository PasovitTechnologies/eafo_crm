import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import {
  FiCamera, FiCheckCircle, FiXCircle, FiLink, FiRotateCw,
} from 'react-icons/fi';
import './QRScanner.css';

export default function QRScanner() {
  const videoRef = useRef();
  const canvasRef = useRef();
  const animationFrameRef = useRef();

  const [status, setStatus] = useState('loading');
  const [scannedData, setScannedData] = useState(null);
  const [cameraFacingMode, setCameraFacingMode] = useState('environment');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [fetchedResult, setFetchedResult] = useState(null);

  const checkCameraPermission = async () => {
    try {
      const permissionStatus = await navigator.permissions.query({ name: 'camera' });
      if (permissionStatus.state === 'denied') {
        setPermissionDenied(true);
        setStatus('error');
        return false;
      }
      return true;
    } catch {
      return true; // fallback for unsupported browsers
    }
  };

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const startCamera = async () => {
    setStatus('loading');
    setScannedData(null);
    setFetchedResult(null);
    setPermissionDenied(false);

    const hasPermission = await checkCameraPermission();
    if (!hasPermission) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacingMode },
      });

      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setStatus('ready');

      const scanFrame = async () => {
        if (!videoRef.current || status !== 'ready') return;

        const canvas = canvasRef.current;
        const video = videoRef.current;

        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          const context = canvas.getContext('2d');
          context.drawImage(video, 0, 0, canvas.width, canvas.height);

          const size = Math.min(canvas.width, canvas.height) * 0.7;
          const x = (canvas.width - size) / 2;
          const y = (canvas.height - size) / 2;

          const imageData = context.getImageData(x, y, size, size);
          const code = jsQR(imageData.data, size, size);

          if (code) {
            stopCamera();
            setStatus('success');
            setScannedData(code.data);

            try {
              const targetUrl = isValidUrl(code.data)
                ? code.data
                : `${process.env.REACT_APP_API_BASE}/api/qr/${code.data}`;

              const response = await fetch(targetUrl);
              if (!response.ok) throw new Error('Fetch failed');
              const result = await response.json();
              setFetchedResult(result);
            } catch (err) {
              setFetchedResult({ error: 'Failed to fetch data from QR' });
              console.error(err);
            }
          }
        }

        if (status === 'ready') {
          animationFrameRef.current = requestAnimationFrame(scanFrame);
        }
      };

      animationFrameRef.current = requestAnimationFrame(scanFrame);
    } catch (err) {
      console.error('Camera error:', err);
      if (!permissionDenied) setStatus('error');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const toggleCamera = () => {
    setCameraFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const rescan = () => {
    startCamera();
  };

  useEffect(() => {
    startCamera();
    return stopCamera;
  }, [cameraFacingMode]);

  return (
    <div className="qr-scanner-container">
      <div className="qr-scanner-header">
        <h2><FiCamera /> QR Code Scanner</h2>
        <p>Point your camera at a QR code</p>
      </div>

      <div className="qr-scanner-video-container">
        <video ref={videoRef} className="qr-scanner-video" muted playsInline />
        <div className="qr-scanner-overlay">
          {status === 'loading' && <p>Loading camera...</p>}
          {status === 'error' && (
            <div className="qr-scanner-error">
              <FiXCircle className="error-icon" />
              <p>{permissionDenied ? 'Camera permission denied' : 'Camera error'}</p>
              <button onClick={startCamera}>Retry</button>
            </div>
          )}
          {status === 'success' && (
            <div className="qr-scanner-success">
              <FiCheckCircle className="success-icon" />
              <p>QR Code Scanned</p>
            </div>
          )}
        </div>
        <canvas ref={canvasRef} style={{ display: 'none' }} />
      </div>

      <div className="qr-scanner-controls">
        <button onClick={toggleCamera}><FiRotateCw /> Switch Camera</button>
        {status === 'success' && <button onClick={rescan}>Scan Another</button>}
      </div>

      {scannedData && (
        <div className="qr-scanner-result">
          <h3>Raw QR Code Content</h3>
          <p>{scannedData}</p>
        </div>
      )}

      {fetchedResult && (
        <div className="qr-fetched-result">
          <h3>Fetched Data</h3>
          <pre>{JSON.stringify(fetchedResult, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
