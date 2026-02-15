import React from 'react';
import { Tile, TileType, Player } from '../types';
import PlayerToken from './PlayerToken';
import { Home, Zap, DollarSign, AlertCircle, Gift, MapPin } from 'lucide-react';

interface TileViewProps {
  tile: Tile;
  players: Player[];
}

const TileView: React.FC<TileViewProps> = ({ tile, players }) => {
  const getIcon = () => {
    const iconClass = "w-4 h-4 sm:w-6 sm:h-6 md:w-8 md:h-8";
    switch (tile.type) {
      case TileType.START: return <MapPin className={`${iconClass} text-white`} />;
      case TileType.PROPERTY: return <Home className={`${iconClass} ${tile.owner ? 'text-white' : 'text-gray-700 opacity-50'}`} />;
      case TileType.CHANCE: return <Gift className={`${iconClass} text-white`} />;
      case TileType.JAIL: return <AlertCircle className={`${iconClass} text-white`} />;
      case TileType.BANK: return <DollarSign className={`${iconClass} text-white`} />;
      case TileType.PARK: return <Zap className={`${iconClass} text-white`} />;
      default: return null;
    }
  };

  const renderHouses = () => {
    if (!tile.level || tile.level <= 0) return null;
    return (
      <div className="absolute top-1 right-1 flex flex-wrap max-w-[20px] sm:max-w-none space-x-1">
        {Array.from({ length: tile.level }).map((_, i) => (
          <div key={i} className="w-2 h-2 sm:w-3 sm:h-3 md:w-4 md:h-4 bg-yellow-400 rounded-full border-2 border-black shadow-sm" />
        ))}
      </div>
    );
  };

  const ownerPlayer = players.find(p => p.id === tile.owner);
  const borderClass = ownerPlayer 
    ? `border-2 sm:border-4 md:border-6 ${ownerPlayer.id === 'p1' ? 'border-blue-500' : ownerPlayer.id === 'p2' ? 'border-red-500' : ownerPlayer.id === 'p3' ? 'border-green-500' : 'border-yellow-500'}`
    : 'border border-gray-300 sm:border-2 md:border-4';

  return (
    <div className={`
      relative flex flex-col items-center justify-center p-1 sm:p-2 
      rounded-xl sm:rounded-2xl shadow-sm transition-all
      ${tile.color} 
      ${borderClass}
      h-full w-full overflow-hidden
    `}>
      <div className="flex flex-col items-center z-0 text-center w-full">
        <div className="mb-1">{getIcon()}</div>
        <span className="text-[8px] sm:text-[12px] md:text-sm lg:text-base font-black leading-tight text-gray-800 bg-white/60 px-1 rounded-md backdrop-blur-sm truncate w-full shadow-sm">
          {tile.name}
        </span>
        {tile.type === TileType.PROPERTY && (
          <span className="text-[7px] sm:text-[10px] md:text-xs lg:text-sm font-mono font-bold text-gray-700 mt-1">
            ${tile.price}
          </span>
        )}
      </div>

      {renderHouses()}

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
         {players.map(p => (
           <PlayerToken key={p.id} player={p} tileId={tile.id} />
         ))}
      </div>
    </div>
  );
};

export default TileView;