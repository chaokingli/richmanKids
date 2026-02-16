
import React, { useState, useEffect, useRef } from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../translations';
import { Users, User, Bot, Globe, QrCode, Key, Monitor, Wifi, Camera, X } from 'lucide-react';

declare const QRCode: any;
declare const Html5Qrcode: any;

interface GameSetupProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  onConfirm: (total: number, humans: number, roomData?: { code: string; isHost: boolean }) => void;
}

const GameSetup: React.FC<GameSetupProps> = ({ language, setLanguage, onConfirm }) => {
  const t = TRANSLATIONS[language];
  const [activeTab, setActiveTab] = useState<'local' | 'remote'>('local');
  const [totalPlayers, setTotalPlayers] = useState(2);
  const [humanPlayers, setHumanPlayers] = useState(1);
  
  // Remote state
  const [remoteAction, setRemoteAction] = useState<'host' | 'join'>('host');
  const [roomCode, setRoomCode] = useState('');
  const [password, setPassword] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [hostRoomCode] = useState(() => Math.random().toString(36).substring(2, 8).toUpperCase());

  const qrRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    if (activeTab === 'remote' && remoteAction === 'host' && qrRef.current) {
      qrRef.current.innerHTML = '';
      new QRCode(qrRef.current, {
        text: `richman_room:${hostRoomCode}`,
        width: 160,
        height: 160,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
      });
    }
  }, [activeTab, remoteAction, hostRoomCode]);

  const startScanner = async () => {
    setIsScanning(true);
    setTimeout(() => {
      const html5QrCode = new Html5Qrcode("reader");
      scannerRef.current = html5QrCode;
      html5QrCode.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText: string) => {
          if (decodedText.startsWith("richman_room:")) {
            const code = decodedText.split(":")[1];
            setRoomCode(code);
            stopScanner();
          }
        },
        () => {}
      ).catch((err: any) => console.error("Camera error", err));
    }, 100);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => {
        setIsScanning(false);
      });
    } else {
      setIsScanning(false);
    }
  };

  const handleConfirmRemote = () => {
    const code = remoteAction === 'host' ? hostRoomCode : roomCode;
    onConfirm(totalPlayers, humanPlayers, { code, isHost: remoteAction === 'host' });
  };

  return (
    <div className="fixed inset-0 z-50 bg-sky-100 flex flex-col items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {isScanning && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center">
          <div className="relative w-full max-w-sm aspect-square overflow-hidden border-4 border-white/20 rounded-3xl">
            <div id="reader" className="w-full h-full"></div>
            <div className="scan-line"></div>
          </div>
          <p className="text-white font-bold mt-8">{t.scanQR}</p>
          <button onClick={stopScanner} className="mt-8 bg-red-500 text-white p-4 rounded-full border-2 border-white shadow-lg">
            <X size={24} />
          </button>
        </div>
      )}

      <div className="absolute top-2 sm:top-4 right-2 sm:right-4 flex gap-1 sm:gap-2">
        {['de', 'en', 'zh', 'ja'].map((l) => (
          <button key={l} onClick={() => setLanguage(l as Language)} className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold border-2 border-black transition-all ${language === l ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'}`}>
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[2rem] sm:rounded-[3rem] p-4 sm:p-8 w-full max-w-2xl pop-shadow-lg border-4 sm:border-8 border-black flex flex-col items-center">
        <h1 className="text-3xl sm:text-5xl font-black text-indigo-600 mb-4 text-center">{t.appTitle}</h1>

        <div className="flex w-full mb-6 p-1 bg-gray-100 rounded-2xl border-2 border-black">
          <button onClick={() => setActiveTab('local')} className={`flex-1 py-2 rounded-xl font-black text-xs sm:text-base flex items-center justify-center gap-2 ${activeTab === 'local' ? 'bg-indigo-500 text-white shadow-md' : 'text-gray-500'}`}>
            <Monitor size={18} /> LOCAL
          </button>
          <button onClick={() => setActiveTab('remote')} className={`flex-1 py-2 rounded-xl font-black text-xs sm:text-base flex items-center justify-center gap-2 ${activeTab === 'remote' ? 'bg-indigo-500 text-white shadow-md' : 'text-gray-500'}`}>
            <Wifi size={18} /> MULTI
          </button>
        </div>
        
        {activeTab === 'local' ? (
          <div className="w-full space-y-6">
            <div>
              <label className="flex items-center gap-2 font-bold mb-3"><Users size={20} /> {t.totalPlayers}</label>
              <div className="flex gap-2">
                {[2, 3, 4].map(num => (
                  <button key={num} onClick={() => { setTotalPlayers(num); if(humanPlayers > num) setHumanPlayers(num); }} className={`flex-1 py-3 rounded-2xl border-2 border-black font-black ${totalPlayers === num ? 'bg-indigo-500 text-white' : 'bg-white'}`}>
                    {num}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="flex items-center gap-2 font-bold mb-3"><User size={20} /> {t.humanPlayers}</label>
              <div className="flex gap-2 overflow-x-auto">
                {Array.from({ length: totalPlayers }).map((_, i) => (
                  <button key={i + 1} onClick={() => setHumanPlayers(i + 1)} className={`w-12 h-12 rounded-2xl border-2 border-black font-black ${humanPlayers === i + 1 ? 'bg-green-500 text-white' : 'bg-white'}`}>
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => onConfirm(totalPlayers, humanPlayers)} className="w-full py-4 bg-yellow-400 text-gray-900 font-black text-xl rounded-3xl border-4 border-black pop-shadow uppercase">
              {t.startGame}
            </button>
          </div>
        ) : (
          <div className="w-full space-y-4">
            <div className="flex gap-2">
               <button onClick={() => setRemoteAction('host')} className={`flex-1 py-3 rounded-2xl border-2 border-black font-bold ${remoteAction === 'host' ? 'bg-indigo-100' : 'bg-white'}`}>{t.hostGame}</button>
               <button onClick={() => setRemoteAction('join')} className={`flex-1 py-3 rounded-2xl border-2 border-black font-bold ${remoteAction === 'join' ? 'bg-indigo-100' : 'bg-white'}`}>{t.joinGame}</button>
            </div>

            {remoteAction === 'host' ? (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-3xl p-6 flex flex-col items-center">
                 <div ref={qrRef} className="bg-white p-2 border-4 border-black rounded-2xl mb-4"></div>
                 <p className="text-xs font-bold text-gray-500 mb-2">{t.scanQR}</p>
                 <span className="text-3xl font-black text-indigo-600 tracking-widest">{hostRoomCode}</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input type="text" placeholder={t.roomCode} value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} className="flex-grow pl-4 py-4 bg-gray-100 border-2 border-black rounded-2xl font-black text-lg outline-none" />
                  <button onClick={startScanner} className="bg-indigo-500 text-white p-4 rounded-2xl border-2 border-black pop-shadow"><Camera size={24} /></button>
                </div>
                <input type="password" placeholder={t.password} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-4 py-4 bg-gray-100 border-2 border-black rounded-2xl font-black text-lg outline-none" />
              </div>
            )}

            <button onClick={handleConfirmRemote} className="w-full py-4 bg-indigo-500 text-white font-black text-xl rounded-3xl border-4 border-black pop-shadow uppercase">
              {remoteAction === 'host' ? t.hostGame : t.joinGame}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameSetup;
