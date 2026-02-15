import React, { useState } from 'react';
import { Language } from '../types';
import { TRANSLATIONS } from '../translations';
import { Users, User, Bot, Globe } from 'lucide-react';

interface GameSetupProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  onConfirm: (total: number, humans: number) => void;
}

const GameSetup: React.FC<GameSetupProps> = ({ language, setLanguage, onConfirm }) => {
  const t = TRANSLATIONS[language];
  const [totalPlayers, setTotalPlayers] = useState(2);
  const [humanPlayers, setHumanPlayers] = useState(1);

  const handleTotalChange = (val: number) => {
    setTotalPlayers(val);
    if (humanPlayers > val) setHumanPlayers(val);
  };

  return (
    <div className="fixed inset-0 z-50 bg-sky-100 flex flex-col items-center justify-center p-4">
      {/* Language Switcher */}
      <div className="absolute top-4 right-4 flex gap-2">
        <button onClick={() => setLanguage('de')} className={`px-3 py-1 rounded-full font-bold border-2 border-black ${language === 'de' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'}`}>DE</button>
        <button onClick={() => setLanguage('en')} className={`px-3 py-1 rounded-full font-bold border-2 border-black ${language === 'en' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'}`}>EN</button>
        <button onClick={() => setLanguage('zh')} className={`px-3 py-1 rounded-full font-bold border-2 border-black ${language === 'zh' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'}`}>中文</button>
        <button onClick={() => setLanguage('ja')} className={`px-3 py-1 rounded-full font-bold border-2 border-black ${language === 'ja' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'}`}>JP</button>
      </div>

      <div className="bg-white rounded-3xl p-8 max-w-lg w-full pop-shadow-lg border-4 border-black flex flex-col items-center">
        <h1 className="text-4xl font-black text-indigo-600 mb-6 drop-shadow-md text-center">{t.appTitle}</h1>
        
        <div className="w-full space-y-8">
          {/* Total Players */}
          <div>
            <label className="flex items-center gap-2 text-lg font-bold text-gray-700 mb-3">
              <Users size={20} className="text-indigo-500" /> {t.totalPlayers}
            </label>
            <div className="flex gap-4">
              {[2, 3, 4].map(num => (
                <button
                  key={num}
                  onClick={() => handleTotalChange(num)}
                  className={`flex-1 py-3 rounded-2xl border-4 border-black font-black text-xl transition-all ${totalPlayers === num ? 'bg-indigo-500 text-white translate-y-1 shadow-none' : 'bg-white text-gray-800 pop-shadow'}`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          {/* Human Players */}
          <div>
            <label className="flex items-center gap-2 text-lg font-bold text-gray-700 mb-3">
              <User size={20} className="text-green-500" /> {t.humanPlayers}
            </label>
            <div className="flex gap-4">
              {Array.from({ length: totalPlayers }).map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setHumanPlayers(i + 1)}
                  className={`flex-1 py-3 rounded-2xl border-4 border-black font-black text-xl transition-all ${humanPlayers === i + 1 ? 'bg-green-500 text-white translate-y-1 shadow-none' : 'bg-white text-gray-800 pop-shadow'}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="mt-2 text-sm text-gray-500 font-bold flex items-center gap-1">
              <Bot size={14} /> {totalPlayers - humanPlayers} CPU
            </div>
          </div>
        </div>

        <button
          onClick={() => onConfirm(totalPlayers, humanPlayers)}
          className="mt-10 w-full py-4 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-black text-2xl rounded-2xl border-4 border-black pop-shadow active:translate-y-1 active:shadow-none transition-all uppercase tracking-wider"
        >
          {t.startGame}
        </button>
      </div>
    </div>
  );
};

export default GameSetup;