import React, { useState } from 'react';
import ReactQRScanner from 'react-qr-scanner';
import { FiCamera, FiCheckCircle, FiXCircle, FiLink, FiRotateCw } from 'react-icons/fi';

export default function QRScanner() {
  const [status, setStatus] = useState('loading');
  const [scannedData, setScannedData] = useState(null);
  const [showRedirect, setShowRedirect] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState('environment');
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Callback function when QR is successfully scanned
  const handleScan = (data) => {
    if (data) {
      setScannedData(data);
      setStatus('success');
      if (isValidUrl(data)) {
        setShowRedirect(true);
        setTimeout(() => {
          window.location.href = data; // Redirect to the URL after 2 seconds
        }, 2000);
      }
    }
  };

  // Callback function when QR scanning is unsuccessful or camera error occurs
  const handleError = (err) => {
    console.error('QR Scan Error:', err);
    setStatus('error');
    setPermissionDenied(true);
  };

  const isValidUrl = (string) => {
    try {
      new URL(string); // Try to create a URL object
      return true;
    } catch (_) {
      return false;
    }
  };

  const toggleCamera = () => {
    setCameraFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  return (
    <div className="qr-scanner-container">
      <div className="qr-scanner-header">
        <h2><FiCamera /> QR Code Scanner</h2>
        <p>Point your camera at a QR code</p>
      </div>

      <div className="qr-scanner-video-container">
        <div className="qr-scanner-overlay">
          {status === 'loading' && <p>Loading camera...</p>}
          {status === 'error' && (
            <div className="qr-scanner-error">
              <FiXCircle className="error-icon" />
              <p>{permissionDenied ? 'Camera permission denied' : 'Camera error'}</p>
              <button onClick={() => setStatus('loading')}>Retry</button>
            </div>
          )}
          {status === 'success' && (
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
          )}
        </div>

        <ReactQRScanner
          delay={300} // Delay in ms between scans (300ms is usually a good value)
          facingMode={cameraFacingMode} // Set the camera facing mode
          onScan={handleScan} // Callback for scanning
          onError={handleError} // Callback for errors
          style={{ width: '100%', height: 'auto' }} // Fullscreen video for the scanner
        />
      </div>

      <div className="qr-scanner-controls">
        <button onClick={toggleCamera}><FiRotateCw /> Switch Camera</button>
        {status === 'success' && <button onClick={() => setStatus('loading')}>Scan Another</button>}
      </div>

      {scannedData && !showRedirect && (
        <div className="qr-scanner-result">
          <h3>Raw QR Code Content</h3>
          <p>{scannedData}</p>
        </div>
      )}
    </div>
  );
}
