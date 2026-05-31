
import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

interface RoomQRCodeProps {
  roomId: string;
  playersCount: number;
}

const RoomQRCode: React.FC<RoomQRCodeProps> = ({ roomId, playersCount }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const joinUrl = `${window.location.origin}${window.location.pathname}?room=${roomId}`;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, joinUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#1e293b',
          light: '#f1f5f9',
        },
      });
    }
  }, [joinUrl]);

  const copyLink = () => {
    navigator.clipboard.writeText(joinUrl);
    alert('連結已複製到剪貼簿！');
  };

  return (
    <div className="flex flex-col items-center bg-white p-4 rounded-xl shadow-2xl border-4 border-indigo-500/30">
      <canvas ref={canvasRef} className="rounded-lg" />
      <div className="mt-3 text-center">
        <p className="text-slate-800 font-bold text-lg">房間代碼: <span className="text-indigo-600">{roomId}</span></p>
        <p className="text-slate-500 text-sm">{playersCount} 玩家已加入</p>
        <button 
          onClick={copyLink}
          className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          複製專屬連結
        </button>
      </div>
    </div>
  );
};

export default RoomQRCode;
