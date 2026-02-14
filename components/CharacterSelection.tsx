import React from 'react';
import { CHARACTERS } from '../constants';
import { Character, Language } from '../types';
import { TRANSLATIONS } from '../translations';
import { Globe } from 'lucide-react';

interface CharacterSelectionProps {
  onSelect: (character: Character) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
}

const CharacterSelection: React.FC<CharacterSelectionProps> = ({ onSelect, language, setLanguage }) => {
  const t = TRANSLATIONS[language];

  return (
    <div className="fixed inset-0 z-50 bg-sky-100 flex flex-col items-center justify-center p-4 overflow-y-auto">
      {/* Language Switcher */}
      <div className="absolute top-4 right-4 flex gap-2">
        <button onClick={() => setLanguage('de')} className={`px-3 py-1 rounded-full font-bold ${language === 'de' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'}`}>DE</button>
        <button onClick={() => setLanguage('en')} className={`px-3 py-1 rounded-full font-bold ${language === 'en' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'}`}>EN</button>
        <button onClick={() => setLanguage('zh')} className={`px-3 py-1 rounded-full font-bold ${language === 'zh' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'}`}>中文</button>
        <button onClick={() => setLanguage('ja')} className={`px-3 py-1 rounded-full font-bold ${language === 'ja' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700'}`}>JP</button>
      </div>

      <h1 className="text-4xl font-black text-indigo-600 mb-2 drop-shadow-md text-center">{t.appTitle}</h1>
      <h2 className="text-2xl font-bold text-gray-700 mb-2">{t.chooseHero}</h2>
      <p className="text-gray-600 mb-8 font-bold text-center">{t.pickHero}</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-5xl">
        {CHARACTERS.map((char) => {
           // Get Translated info
           const trChar = t.characters[char.id];
           
           return (
            <button
              key={char.id}
              onClick={() => onSelect(char)}
              className="group relative bg-white rounded-3xl p-6 pop-shadow-lg border-4 border-black hover:scale-105 transition-all flex flex-col items-center text-center overflow-hidden"
            >
              {/* Background Accent */}
              <div className={`absolute top-0 left-0 w-full h-24 opacity-20 ${char.color.split(' ')[0]}`}></div>
              
              <div className="text-7xl mb-4 group-hover:scale-110 transition-transform duration-300 drop-shadow-sm z-10">
                {char.avatar}
              </div>
              
              <h2 className="text-2xl font-bold text-gray-800 mb-1 z-10">{trChar.name}</h2>
              <p className="text-sm text-gray-500 mb-4 h-10 leading-tight z-10 flex items-center justify-center">{trChar.desc}</p>
              
              <div className="bg-gray-100 rounded-xl p-3 w-full border-2 border-dashed border-gray-300 group-hover:border-indigo-400 group-hover:bg-indigo-50 transition-colors z-10">
                <div className="text-xs font-bold text-indigo-500 uppercase mb-1">{t.ability}</div>
                <div className="font-bold text-gray-800 text-sm mb-1">{trChar.ability}</div>
                <p className="text-xs text-gray-600 leading-snug">{trChar.abilityDesc}</p>
                {char.maxCharges > 0 && (
                  <div className="mt-2 text-xs font-mono bg-white inline-block px-2 py-0.5 rounded border border-gray-300">
                    ⚡ {char.maxCharges} {t.uses}
                  </div>
                )}
                {char.maxCharges === -1 && (
                  <div className="mt-2 text-xs font-mono bg-yellow-100 inline-block px-2 py-0.5 rounded border border-yellow-300 text-yellow-700">
                    ∞ {t.passive}
                  </div>
                )}
              </div>
              
              <div className="mt-4 px-6 py-2 bg-green-400 text-white font-bold rounded-full pop-shadow group-hover:bg-green-500 transition-colors z-10">
                {t.select}
              </div>
            </button>
           );
        })}
      </div>
    </div>
  );
};

export default CharacterSelection;