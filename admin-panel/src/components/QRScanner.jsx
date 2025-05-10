import React, { useState } from 'react';
import { QrScanner } from '@yudiel/react-qr-scanner';
import { FiCamera, FiCheckCircle, FiXCircle, FiLink, FiRotateCw } from 'react-icons/fi';
import './QRScanner.css';

const QRScanner = () => {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [showRedirect, setShowRedirect] = useState(false);

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleScan = (data) => {
    if (data) {
      setResult(data);
      if (isValidUrl(data)) {
        setShowRedirect(true);
        setTimeout(() => {
          window.location.href = data;
        }, 2000);
      }
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const resetScanner = () => {
    setResult(null);
    setShowRedirect(false);
  };

  return (
    <div className="qr-scanner-container">
      <div className="qr-scanner-header">
        <h2><FiCamera /> QR Code Scanner</h2>
        <p>Point your camera at a QR code</p>
      </div>

      <div className="qr-scanner-video-container">
        {error ? (
          <div className="qr-scanner-error">
            <FiXCircle className="error-icon" />
            <p>{error}</p>
            <button onClick={() => setError(null)}>Retry</button>
          </div>
        ) : result ? (
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
        ) : (
          <QrScanner
            onDecode={handleScan}
            onError={(err) => setError(err?.message || 'Failed to access camera')}
            constraints={{
              facingMode: facingMode,
              width: { ideal: 1280 },
              height: { ideal: 720 }
            }}
            containerStyle={{ width: '100%', height: '100%' }}
            videoStyle={{ width: '100%' }}
          />
        )}
      </div>

      <div className="qr-scanner-controls">
        <button onClick={toggleCamera}>
          <FiRotateCw /> Switch Camera
        </button>
        {result && <button onClick={resetScanner}>Scan Another</button>}
      </div>

      {result && !showRedirect && (
        <div className="qr-scanner-result">
          <h3>Scanned Content</h3>
          <p>{result}</p>
        </div>
      )}
    </div>
  );
};

export default QRScanner;