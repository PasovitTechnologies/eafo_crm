import React, { useState, useEffect } from 'react';
import { FiCamera, FiCheckCircle, FiXCircle, FiLink, FiRotateCw } from 'react-icons/fi';
import QrReader from 'react-qr-reader';
import './QRScanner.css';

export default function QRScanner() {
  const [status, setStatus] = useState('loading');
  const [scannedData, setScannedData] = useState(null);
  const [showRedirect, setShowRedirect] = useState(false);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [activeCameraId, setActiveCameraId] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  const enumerateCameras = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length === 0) {
        setPermissionDenied(true);
        setStatus('error');
        return;
      }

      setAvailableCameras(videoDevices);
      setActiveCameraId(videoDevices[0].deviceId);
      setStatus('loading');
    } catch (error) {
      console.error("Error accessing media devices:", error);
      setPermissionDenied(true);
      setStatus('error');
    }
  };

  const switchCamera = () => {
    if (availableCameras.length < 2) return;
    
    const currentIndex = availableCameras.findIndex(cam => cam.deviceId === activeCameraId);
    const nextIndex = (currentIndex + 1) % availableCameras.length;
    setActiveCameraId(availableCameras[nextIndex].deviceId);
    setStatus('loading');
  };

  const handleScan = (data) => {
    if (data) {
      setScannedData(data);
      setStatus('success');
      if (isValidUrl(data)) {
        setShowRedirect(true);
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

  const resetScanner = () => {
    setScannedData(null);
    setShowRedirect(false);
    setStatus('loading');
  };

  useEffect(() => {
    enumerateCameras();
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
            <button onClick={enumerateCameras}>Retry</button>
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
        ) : status === 'loading' && activeCameraId && (
          <QrReader
            delay={500}
            onError={handleError}
            onScan={handleScan}
            style={{ width: '100%' }}
            key={activeCameraId}
            constraints={{
              video: { deviceId: activeCameraId }
            }}
          />
        )}
      </div>

      <div className="qr-scanner-controls">
        {availableCameras.length > 1 && (
          <button 
            onClick={switchCamera} 
            aria-label="Switch camera"
            disabled={availableCameras.length < 2}
          >
            <FiRotateCw /> Switch Camera ({availableCameras.length} available)
          </button>
        )}
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