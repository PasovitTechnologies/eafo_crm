import React, { useState, useEffect } from 'react';
import { BrowserMultiFormatReader } from '@zxing/library';

const QRScanner = () => {
  const [scannedUrl, setScannedUrl] = useState(null);

  useEffect(() => {
    const codeReader = new BrowserMultiFormatReader();
    codeReader.decodeFromInputVideoDevice(null, 'video')
      .then(result => {
        setScannedUrl(result.text);
        window.location.href = result.text; // Redirect to the URL in the QR code
      })
      .catch(err => {
        console.error(err);
      });

    return () => {
      codeReader.reset(); // Cleanup the scanner when component unmounts
    };
  }, []);

  return (
    <div>
      <h2>Scan QR Code</h2>
      <video id="video" width="100%" height="auto" />
      {scannedUrl && <p>Redirecting to: {scannedUrl}</p>}
    </div>
  );
};

export default QRScanner;
