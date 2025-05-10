import React, { useState, useEffect } from 'react';
import { FiCamera, FiCheckCircle, FiXCircle, FiLink, FiRotateCw } from 'react-icons/fi';
import './QRScanner.css';

// Using react-qr-reader instead as it's more commonly used
import QrReader from 'react-qr-reader';

export default function QRScanner() {
  const [status, setStatus] = useState('loading');
  const [scannedData, setScannedData] = useState(null);
  const [showRedirect, setShowRedirect] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState('environment');
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Helper function moved outside component
  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const checkCameraPermission = async () => {
    try {
      // Modern browsers require explicit permission requests
      await navigator.mediaDevices.getUserMedia({ video: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length === 0) {
        setPermissionDenied(true);
        setStatus('error');
        return false;
      }
      return true;
    } catch (error) {
      console.error("Error accessing media devices:", error);
      setPermissionDenied(true);
      setStatus('error');
      return false;
    }
  };

  const handleScan = (data) => {
    if (data) {
      setScannedData(data);
      setStatus('success');
      if (isValidUrl(data)) {
        setShowRedirect(true);
        // Add confirmation before redirecting
        const shouldRedirect = window.confirm(`You're about to be redirected to:\n${data}\n\nContinue?`);
        if (shouldRedirect) {
          setTimeout(() => {
            window.location.href = data;
          }, 1000);
        } else {
          setShowRedirect(false);
        }
      }
    }
  };

  const handleError = (err) => {
    console.error('QR Scan Error:', err);
    setStatus('error');
    setPermissionDenied(err.name === 'NotAllowedError');
  };

  const toggleCamera = () => {
    setCameraFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
    setStatus('loading');
  };

  const resetScanner = () => {
    setScannedData(null);
    setShowRedirect(false);
    setStatus('loading');
  };

  useEffect(() => {
    const initializeCamera = async () => {
      const hasPermission = await checkCameraPermission();
      if (hasPermission) {
        setStatus('loading');
      }
    };
    initializeCamera();
  }, []);

  return (
    <div className="qr-scanner-container">
      <div className="qr-scanner-header">
        <h2><FiCamera /> QR Code Scanner</h2>
        <p>Point your camera at a QR code</p>
      </div>

      <div className="qr-scanner-video-container">
        {status === 'loading' && (
          <div className="qr-scanner-loading">
            <p>Loading camera...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="qr-scanner-error">
            <FiXCircle className="error-icon" />
            <p>{permissionDenied ? 'Camera permission denied or no camera found' : 'Camera error'}</p>
            <button onClick={resetScanner}>Retry</button>
          </div>
        )}

        {status === 'success' ? (
          <div className="qr-scanner-success">
            <FiCheckCircle className="success-icon" />
            <p>QR Code Scanned</p>
            {showRedirect && (
              <div className="qr-redirect-notice">
                <FiLink className="link-icon" />
                <p>Redirecting to URL...</p>
              </div>
            )}
          </div>
        ) : status === 'loading' && (
          <QrReader
            delay={500}
            facingMode={cameraFacingMode}
            onError={handleError}
            onScan={handleScan}
            style={{ width: '100%' }}
            key={cameraFacingMode}
          />
        )}
      </div>

      <div className="qr-scanner-controls">
        <button onClick={toggleCamera} aria-label="Switch camera">
          <FiRotateCw /> Switch Camera
        </button>
        {status === 'success' && (
          <button onClick={resetScanner}>Scan Another</button>
        )}
      </div>

      {scannedData && !showRedirect && (
        <div className="qr-scanner-result">
          <h3>Scanned Content</h3>
          <p>{scannedData}</p>
          {navigator.clipboard && (
            <button 
              onClick={() => navigator.clipboard.writeText(scannedData)}
              className="copy-button"
            >
              Copy to Clipboard
            </button>
          )}
        </div>
      )}
    </div>
  );
}