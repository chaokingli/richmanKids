import React from 'react';
import { Tile, TileType, Player } from '../types';
import PlayerToken from './PlayerToken';
import { Home, Zap, DollarSign, AlertCircle, Gift, MapPin } from 'lucide-react';

interface TileViewProps {
  tile: Tile;
  players: Player[];
}

const TileView: React.FC<TileViewProps> = ({ tile, players }) => {
  // Determine icon based on type
  const getIcon = () => {
    switch (tile.type) {
      case TileType.START: return <MapPin className="text-white" />;
      case TileType.PROPERTY: return <Home className={tile.owner ? 'text-white' : 'text-gray-700 opacity-50'} />;
      case TileType.CHANCE: return <Gift className="text-white" />;
      case TileType.JAIL: return <AlertCircle className="text-white" />;
      case TileType.BANK: return <DollarSign className="text-white" />;
      case TileType.PARK: return <Zap className="text-white" />;
      default: return null;
    }
  };

  // House markers for level
  const renderHouses = () => {
    if (!tile.level || tile.level <= 0) return null;
    return (
      <div className="absolute top-1 right-1 flex space-x-0.5">
        {Array.from({ length: tile.level }).map((_, i) => (
          <div key={i} className="w-2 h-2 bg-yellow-400 rounded-full border border-black" />
        ))}
      </div>
    );
  };

  // Ownership Border
  const ownerPlayer = players.find(p => p.id === tile.owner);
  const borderClass = ownerPlayer 
    ? `border-4 ${ownerPlayer.id === 'p1' ? 'border-blue-500' : 'border-red-500'}`
    : 'border-2 border-gray-300';

  return (
    <div className={`
      relative flex flex-col items-center justify-center p-1 
      rounded-lg shadow-sm transition-all
      ${tile.color} 
      ${borderClass}
      h-full w-full
    `}>
      {/* Tile Content */}
      <div className="flex flex-col items-center z-0 text-center">
        <div className="mb-1">{getIcon()}</div>
        <span className="text-[10px] md:text-xs font-bold leading-tight text-gray-800 bg-white/50 px-1 rounded backdrop-blur-sm">
          {tile.name}
        </span>
        {tile.type === TileType.PROPERTY && (
          <span className="text-[9px] font-mono text-gray-600 mt-1">
            ${tile.price}
          </span>
        )}
      </div>

      {/* House Level Indicators */}
      {renderHouses()}

      {/* Player Tokens Layer */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
         {players.map(p => (
           <PlayerToken key={p.id} player={p} tileId={tile.id} />
         ))}
      </div>
    </div>
  );
};

export default TileView;