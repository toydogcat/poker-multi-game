
import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface CameraQRScannerProps {
  onScan: (roomId: string) => void;
  onClose: () => void;
}

const CameraQRScanner: React.FC<CameraQRScannerProps> = ({ onScan, onClose }) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    scannerRef.current = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    scannerRef.current.render(
      (decodedText) => {
        // Try to extract room ID from URL or use text directly
        const url = new URL(decodedText);
        const roomId = url.searchParams.get('room') || decodedText;
        if (roomId && roomId.length >= 5) {
          onScan(roomId.toUpperCase());
          scannerRef.current?.clear();
        }
      },
      (error) => {
        // console.error(error);
      }
    );

    return () => {
      scannerRef.current?.clear().catch(e => console.error("Failed to clear scanner", e));
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl w-full max-w-md relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white"
        >
          ✕
        </button>
        <h3 className="text-xl font-bold mb-4 text-center">掃描二維碼加入房間</h3>
        <div id="qr-reader" className="overflow-hidden rounded-xl border border-slate-700"></div>
        <p className="mt-4 text-slate-400 text-center text-sm">請將相機對準房主的 QR Code</p>
      </div>
    </div>
  );
};

export default CameraQRScanner;
