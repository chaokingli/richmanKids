import React, { useState, useEffect } from 'react';
import { Dices } from 'lucide-react';

interface DiceProps {
  isRolling: boolean;
  value: number;
  onRoll: () => void;
  disabled: boolean;
  label: string;
  rollingLabel: string;
}

const Dice: React.FC<DiceProps> = ({ isRolling, value, onRoll, disabled, label, rollingLabel }) => {
  const [displayValue, setDisplayValue] = useState(1);

  useEffect(() => {
    let interval: number;
    if (isRolling) {
      interval = window.setInterval(() => {
        setDisplayValue(Math.floor(Math.random() * 6) + 1);
      }, 100);
    } else {
      setDisplayValue(value);
    }
    return () => clearInterval(interval);
  }, [isRolling, value]);

  return (
    <button
      onClick={onRoll}
      disabled={disabled}
      className={`
        relative w-24 h-24 sm:w-36 sm:h-36 md:w-44 md:h-44 bg-white rounded-[2rem] sm:rounded-[3rem] border-4 sm:border-[8px] border-black pop-shadow-lg
        flex flex-col items-center justify-center
        transition-all duration-300
        ${disabled ? 'opacity-40 cursor-not-allowed scale-90' : 'hover:scale-110 active:scale-95 active:shadow-none cursor-pointer group'}
        ${isRolling ? 'animate-pulse' : ''}
      `}
    >
      <div className="text-4xl sm:text-7xl font-black text-gray-800 transition-all group-hover:rotate-12">
        {isRolling ? '?' : displayValue}
      </div>
      <div className="text-[8px] sm:text-xs font-black text-gray-400 mt-1 uppercase text-center leading-none px-2 tracking-widest">
        {isRolling ? rollingLabel : label}
      </div>
      
      {!disabled && !isRolling && (
         <div className="absolute -top-2 -right-2 sm:-top-4 sm:-right-4 bg-yellow-400 rounded-full p-2 sm:p-4 border-4 border-black group-hover:animate-bounce shadow-md">
            <Dices size={24} className="sm:w-8 sm:h-8" />
         </div>
      )}
      
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/5 rounded-[inherit] pointer-events-none"></div>
    </button>
  );
};

export default Dice;