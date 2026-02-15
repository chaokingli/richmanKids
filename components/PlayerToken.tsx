import React from 'react';
import { Player } from '../types';

interface PlayerTokenProps {
  player: Player;
  tileId: number;
}

const PlayerToken: React.FC<PlayerTokenProps> = ({ player, tileId }) => {
  if (player.position !== tileId) return null;

  const offsets = {
    p1: { x: '-6px', y: '-6px' },
    p2: { x: '6px', y: '-6px' },
    p3: { x: '-6px', y: '6px' },
    p4: { x: '6px', y: '6px' }
  };

  const offset = offsets[player.id as keyof typeof offsets] || { x: '0', y: '0' };

  return (
    <div 
      className={`absolute z-10 w-6 h-6 sm:w-9 sm:h-9 rounded-full border border-white shadow flex items-center justify-center text-sm sm:text-xl transition-all duration-300 ${player.color}`}
      style={{
        transform: `translate(${offset.x}, ${offset.y})` 
      }}
    >
      {player.avatar}
    </div>
  );
};

export default PlayerToken;