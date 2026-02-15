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
    const iconClass = "w-3 h-3 sm:w-5 sm:h-5";
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
      <div className="absolute top-0.5 right-0.5 flex flex-wrap max-w-[15px] sm:max-w-none space-x-0.5">
        {Array.from({ length: tile.level }).map((_, i) => (
          <div key={i} className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-yellow-400 rounded-full border border-black" />
        ))}
      </div>
    );
  };

  const ownerPlayer = players.find(p => p.id === tile.owner);
  const borderClass = ownerPlayer 
    ? `border-2 sm:border-4 ${ownerPlayer.id === 'p1' ? 'border-blue-500' : ownerPlayer.id === 'p2' ? 'border-red-500' : ownerPlayer.id === 'p3' ? 'border-green-500' : 'border-yellow-500'}`
    : 'border border-gray-300 sm:border-2';

  return (
    <div className={`
      relative flex flex-col items-center justify-center p-0.5 sm:p-1 
      rounded-md sm:rounded-lg shadow-sm transition-all
      ${tile.color} 
      ${borderClass}
      h-full w-full overflow-hidden
    `}>
      <div className="flex flex-col items-center z-0 text-center w-full">
        <div className="mb-0.5">{getIcon()}</div>
        <span className="text-[7px] sm:text-[10px] md:text-xs font-bold leading-none text-gray-800 bg-white/50 px-0.5 rounded backdrop-blur-sm truncate w-full">
          {tile.name}
        </span>
        {tile.type === TileType.PROPERTY && (
          <span className="text-[6px] sm:text-[9px] font-mono text-gray-700 mt-0.5">
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