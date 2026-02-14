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
        relative w-24 h-24 bg-white rounded-2xl border-4 border-black pop-shadow-lg
        flex flex-col items-center justify-center
        transition-all duration-200
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:translate-y-1 active:shadow-none cursor-pointer'}
        ${isRolling ? 'animate-bounce' : ''}
      `}
    >
      <div className="text-4xl font-bold text-gray-800">
        {isRolling ? '...' : displayValue}
      </div>
      <div className="text-xs font-bold text-gray-500 mt-1 uppercase text-center leading-none px-1">
        {isRolling ? rollingLabel : label}
      </div>
      
      {!disabled && !isRolling && (
         <div className="absolute -top-2 -right-2 bg-yellow-400 rounded-full p-1 border-2 border-black">
            <Dices size={16} />
         </div>
      )}
    </button>
  );
};

export default Dice;