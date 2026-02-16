import React from 'react';
import { Player } from '../types';

interface PlayerTokenProps {
  player: Player;
  tileId: number;
}

const PlayerToken: React.FC<PlayerTokenProps> = ({ player, tileId }) => {
  if (player.position !== tileId) return null;

  const offsets = {
    p1: { x: '-22%', y: '-22%' },
    p2: { x: '22%', y: '-22%' },
    p3: { x: '-22%', y: '22%' },
    p4: { x: '22%', y: '22%' }
  };

  const offset = offsets[player.id as keyof typeof offsets] || { x: '0', y: '0' };

  return (
    <div 
      className={`absolute z-10 w-[4.5vmin] h-[4.5vmin] sm:w-[6vmin] sm:h-[6vmin] rounded-full border-[0.3vmin] border-white shadow-xl flex items-center justify-center text-[2.5vmin] sm:text-[3.5vmin] transition-all duration-300 ${player.color} pop-shadow`}
      style={{
        transform: `translate(${offset.x}, ${offset.y})` 
      }}
    >
      <span className="drop-shadow-sm">{player.avatar}</span>
    </div>
  );
};

export default PlayerToken;