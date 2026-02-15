import React from 'react';
import { Player } from '../types';

interface PlayerTokenProps {
  player: Player;
  tileId: number;
}

const PlayerToken: React.FC<PlayerTokenProps> = ({ player, tileId }) => {
  if (player.position !== tileId) return null;

  // Offset logic for multiple players on the same tile
  const offsets = {
    p1: { x: '-20%', y: '-20%' },
    p2: { x: '20%', y: '-20%' },
    p3: { x: '-20%', y: '20%' },
    p4: { x: '20%', y: '20%' }
  };

  const offset = offsets[player.id as keyof typeof offsets] || { x: '0', y: '0' };

  return (
    <div 
      className={`absolute z-10 w-8 h-8 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-full border-2 sm:border-4 border-white shadow-xl flex items-center justify-center text-lg sm:text-2xl md:text-3xl transition-all duration-300 ${player.color} pop-shadow`}
      style={{
        transform: `translate(${offset.x}, ${offset.y})` 
      }}
    >
      {player.avatar}
    </div>
  );
};

export default PlayerToken;