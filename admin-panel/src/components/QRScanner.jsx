import React, { useState } from 'react';
import ReactQRScanner from 'react-qr-scanner';
import { FiCamera, FiCheckCircle, FiXCircle, FiLink, FiRotateCw } from 'react-icons/fi';
import './QRScanner.css';

export default function QRScanner() {
  const [status, setStatus] = useState('loading'); // States: loading, error, success
  const [scannedData, setScannedData] = useState(null);
  const [showRedirect, setShowRedirect] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState('environment'); // Default to back camera
  const [permissionDenied, setPermissionDenied] = useState(false);

  // Callback when a QR is scanned successfully
  const handleScan = (data) => {
    console.log('Scanned Data:', data); // Log the entire data object to the console
  
    if (data && data.text) { // Ensure there's text data in the object
      setScannedData(data.text); // Store only the text part of the QR scan result
      setStatus('success');
      if (isValidUrl(data.text)) {
        setShowRedirect(true);
        setTimeout(() => {
          window.location.href = data.text; // Redirect to the URL after 2 seconds
        }, 2000);
      }
    }
  };
  

  // Callback when an error occurs during scanning
  const handleError = (err) => {
    console.error('QR Scan Error:', err);
    setStatus('error');
    setPermissionDenied(true);
  };

  // Check if a string is a valid URL
  const isValidUrl = (string) => {
    try {
      new URL(string); // Try creating a URL object
      return true;
    } catch (_) {
      return false;
    }
  };

  // Toggle between front and back camera
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
        {/* QR Scanner Video Overlay */}
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

        {/* QR Scanner Component */}
        <ReactQRScanner
          delay={300} // Delay between scans
          facingMode={cameraFacingMode} // Camera facing mode (environment or user)
          onScan={handleScan} // Callback for scan success
          onError={handleError} // Callback for scan errors
          style={{ width: '100%', height: 'auto' }} // Fullscreen video for the scanner
          key={cameraFacingMode} // This forces a re-render when facingMode changes
        />
      </div>

      {/* Camera Controls */}
      <div className="qr-scanner-controls">
        <button onClick={toggleCamera}><FiRotateCw /> Switch Camera</button>
        {status === 'success' && <button onClick={() => setStatus('loading')}>Scan Another</button>}
      </div>

      {/* Display Raw QR Code Content */}
      {scannedData && !showRedirect && (
        <div className="qr-scanner-result">
          <h3>Raw QR Code Content</h3>
          <p>{scannedData}</p> {/* Display just the text */}
        </div>
      )}
    </div>
  );
}
