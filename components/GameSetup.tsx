import React, { useState } from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../translations';
import { Users, User, Bot, Globe, QrCode, Key, Monitor, Wifi } from 'lucide-react';

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

  const handleTotalChange = (val: number) => {
    setTotalPlayers(val);
    if (humanPlayers > val) setHumanPlayers(val);
  };

  const generateRoomCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleConfirmRemote = () => {
    const code = roomCode || generateRoomCode();
    onConfirm(totalPlayers, humanPlayers, { code, isHost: remoteAction === 'host' });
  };

  return (
    <div className="fixed inset-0 z-50 bg-sky-100 flex flex-col items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Language Switcher */}
      <div className="absolute top-2 sm:top-4 right-2 sm:right-4 flex gap-1 sm:gap-2">
        {['de', 'en', 'zh', 'ja'].map((l) => (
          <button 
            key={l}
            onClick={() => setLanguage(l as Language)} 
            className={`px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold border-2 border-black transition-all ${language === l ? 'bg-indigo-600 text-white scale-110' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
          >
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-[2rem] sm:rounded-[3rem] p-4 sm:p-8 w-full max-w-2xl pop-shadow-lg border-4 sm:border-8 border-black flex flex-col items-center">
        <div className="mb-4 sm:mb-8 text-center">
          <h1 className="text-3xl sm:text-5xl font-black text-indigo-600 mb-1 drop-shadow-md">{t.appTitle}</h1>
          <p className="text-xs sm:text-sm font-bold text-gray-400 uppercase tracking-widest">Premium Richman Experience</p>
        </div>

        {/* Tab Switcher */}
        <div className="flex w-full mb-6 sm:mb-8 p-1 bg-gray-100 rounded-2xl border-2 border-black">
          <button 
            onClick={() => setActiveTab('local')}
            className={`flex-1 py-2 sm:py-3 rounded-xl font-black text-xs sm:text-base flex items-center justify-center gap-2 transition-all ${activeTab === 'local' ? 'bg-indigo-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-200'}`}
          >
            <Monitor size={18} /> LOCAL
          </button>
          <button 
            onClick={() => setActiveTab('remote')}
            className={`flex-1 py-2 sm:py-3 rounded-xl font-black text-xs sm:text-base flex items-center justify-center gap-2 transition-all ${activeTab === 'remote' ? 'bg-indigo-500 text-white shadow-md' : 'text-gray-500 hover:bg-gray-200'}`}
          >
            <Wifi size={18} /> MULTIPLAYER
          </button>
        </div>
        
        {activeTab === 'local' ? (
          <div className="w-full space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-2">
            {/* Total Players */}
            <div>
              <label className="flex items-center gap-2 text-base sm:text-lg font-bold text-gray-700 mb-3">
                <Users size={20} className="text-indigo-500" /> {t.totalPlayers}
              </label>
              <div className="flex gap-2 sm:gap-4">
                {[2, 3, 4].map(num => (
                  <button
                    key={num}
                    onClick={() => handleTotalChange(num)}
                    className={`flex-1 py-3 sm:py-4 rounded-2xl border-2 sm:border-4 border-black font-black text-lg sm:text-2xl transition-all ${totalPlayers === num ? 'bg-indigo-500 text-white translate-y-1 shadow-none' : 'bg-white text-gray-800 pop-shadow'}`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Human Players */}
            <div>
              <label className="flex items-center gap-2 text-base sm:text-lg font-bold text-gray-700 mb-3">
                <User size={20} className="text-green-500" /> {t.humanPlayers}
              </label>
              <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-2 no-scrollbar">
                {Array.from({ length: totalPlayers }).map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => setHumanPlayers(i + 1)}
                    className={`flex-shrink-0 w-12 h-12 sm:w-16 sm:h-16 rounded-2xl border-2 sm:border-4 border-black font-black text-lg sm:text-2xl transition-all ${humanPlayers === i + 1 ? 'bg-green-500 text-white translate-y-1 shadow-none' : 'bg-white text-gray-800 pop-shadow'}`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <div className="mt-2 text-[10px] sm:text-xs text-gray-500 font-bold flex items-center gap-1 uppercase tracking-wider">
                <Bot size={14} /> {totalPlayers - humanPlayers} CPU
              </div>
            </div>

            <button
              onClick={() => onConfirm(totalPlayers, humanPlayers)}
              className="w-full py-4 sm:py-6 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-black text-xl sm:text-3xl rounded-3xl border-2 sm:border-4 border-black pop-shadow active:translate-y-1 active:shadow-none transition-all uppercase tracking-wider mt-4"
            >
              {t.startGame}
            </button>
          </div>
        ) : (
          <div className="w-full space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex gap-2">
               <button 
                onClick={() => setRemoteAction('host')}
                className={`flex-1 py-3 rounded-2xl border-2 border-black font-bold text-sm sm:text-base ${remoteAction === 'host' ? 'bg-indigo-100 text-indigo-700 border-indigo-500' : 'bg-white'}`}
               >
                 {t.hostGame}
               </button>
               <button 
                onClick={() => setRemoteAction('join')}
                className={`flex-1 py-3 rounded-2xl border-2 border-black font-bold text-sm sm:text-base ${remoteAction === 'join' ? 'bg-indigo-100 text-indigo-700 border-indigo-500' : 'bg-white'}`}
               >
                 {t.joinGame}
               </button>
            </div>

            {remoteAction === 'host' ? (
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-3xl p-6 flex flex-col items-center text-center">
                 <div className="w-32 h-32 sm:w-48 sm:h-48 bg-white border-4 border-black rounded-2xl mb-4 flex items-center justify-center p-2">
                    <QrCode size={120} className="text-gray-900 sm:w-40 sm:h-40" />
                 </div>
                 <p className="text-xs sm:text-sm font-bold text-gray-500 mb-2 uppercase tracking-wide">{t.scanQR}</p>
                 <div className="flex flex-col items-center">
                    <span className="text-xs font-bold text-gray-400 uppercase">{t.roomCode}</span>
                    <span className="text-2xl sm:text-4xl font-black text-indigo-600 tracking-widest select-all">{generateRoomCode()}</span>
                 </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
                    <QrCode size={20} />
                  </div>
                  <input 
                    type="text" 
                    placeholder={t.roomCode}
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    className="w-full pl-12 pr-4 py-4 sm:py-5 bg-gray-100 border-2 border-black rounded-2xl font-black text-lg sm:text-xl placeholder:text-gray-400 focus:bg-white focus:ring-4 ring-indigo-200 transition-all outline-none"
                  />
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400">
                    <Key size={20} />
                  </div>
                  <input 
                    type="password" 
                    placeholder={t.password + " (Optional)"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 sm:py-5 bg-gray-100 border-2 border-black rounded-2xl font-black text-lg sm:text-xl placeholder:text-gray-400 focus:bg-white focus:ring-4 ring-indigo-200 transition-all outline-none"
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleConfirmRemote}
              className="w-full py-4 sm:py-6 bg-indigo-500 hover:bg-indigo-600 text-white font-black text-xl sm:text-3xl rounded-3xl border-2 sm:border-4 border-black pop-shadow active:translate-y-1 active:shadow-none transition-all uppercase tracking-wider"
            >
              {remoteAction === 'host' ? t.hostGame : t.joinGame}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameSetup;