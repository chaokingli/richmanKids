import React from 'react';
import { Player } from '../types';

interface PlayerTokenProps {
  player: Player;
  tileId: number;
}

const PlayerToken: React.FC<PlayerTokenProps> = ({ player, tileId }) => {
  if (player.position !== tileId) return null;

  return (
    <div 
      className={`absolute z-10 w-10 h-10 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-xl transition-all duration-300 ${player.color}`}
      style={{
        transform: `translate(${player.id === 'p1' ? '-5px' : '5px'}, ${player.id === 'p1' ? '-5px' : '5px'})` 
        // Offset tokens so they don't perfectly overlap
      }}
    >
      {player.avatar}
    </div>
  );
};

export default PlayerToken;