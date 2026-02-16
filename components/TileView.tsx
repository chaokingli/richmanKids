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
    const iconClass = "w-4 h-4 sm:w-7 sm:h-7 md:w-10 md:h-10 transition-transform group-hover:scale-110";
    switch (tile.type) {
      case TileType.START: return <MapPin className={`${iconClass} text-white drop-shadow-sm`} />;
      case TileType.PROPERTY: return <Home className={`${iconClass} ${tile.owner ? 'text-white' : 'text-gray-700 opacity-30'}`} />;
      case TileType.CHANCE: return <Gift className={`${iconClass} text-white drop-shadow-sm`} />;
      case TileType.JAIL: return <AlertCircle className={`${iconClass} text-white drop-shadow-sm`} />;
      case TileType.BANK: return <DollarSign className={`${iconClass} text-white drop-shadow-sm`} />;
      case TileType.PARK: return <Zap className={`${iconClass} text-white drop-shadow-sm`} />;
      default: return null;
    }
  };

  const renderHouses = () => {
    if (!tile.level || tile.level <= 0) return null;
    return (
      <div className="absolute top-1 sm:top-2 right-1 sm:right-2 flex flex-wrap max-w-[30px] sm:max-w-none space-x-1 sm:space-x-1.5">
        {Array.from({ length: tile.level }).map((_, i) => (
          <div key={i} className="w-2.5 h-2.5 sm:w-4 sm:h-4 md:w-5 md:h-5 bg-yellow-400 rounded-full border-2 border-black shadow-sm ring-2 ring-white/20" />
        ))}
      </div>
    );
  };

  const ownerPlayer = players.find(p => p.id === tile.owner);
  const borderClass = ownerPlayer 
    ? `border-[3px] sm:border-[6px] md:border-[8px] ${ownerPlayer.color.replace('bg-', 'border-')} shadow-inner`
    : 'border-2 sm:border-4 md:border-[6px] border-black/10';

  return (
    <div className={`
      relative flex flex-col items-center justify-center p-1 sm:p-2 group
      rounded-[1rem] sm:rounded-[2rem] shadow-sm transition-all duration-300
      ${tile.color} 
      ${borderClass}
      h-full w-full overflow-hidden hover:scale-[1.02] active:scale-100 cursor-default
    `}>
      <div className="flex flex-col items-center z-0 text-center w-full transition-all group-hover:translate-y-[-2px]">
        <div className="mb-0.5 sm:mb-2">{getIcon()}</div>
        <span className="text-[7px] sm:text-[14px] md:text-lg lg:text-xl font-black leading-tight text-gray-900 bg-white/40 px-1.5 sm:px-3 py-0.5 rounded-full backdrop-blur-sm truncate w-[90%] shadow-sm">
          {tile.name}
        </span>
        {tile.type === TileType.PROPERTY && (
          <div className="mt-0.5 sm:mt-2 bg-black/10 rounded-lg px-2 py-0.5">
            <span className="text-[7px] sm:text-[12px] md:text-sm lg:text-base font-mono font-black text-gray-800">
              ${tile.price}
            </span>
          </div>
        )}
      </div>

      {renderHouses()}

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
         {players.map(p => (
           <PlayerToken key={p.id} player={p} tileId={tile.id} />
         ))}
      </div>
      
      {/* Decorative texture */}
      <div className="absolute inset-0 bg-white opacity-5 pointer-events-none mix-blend-overlay"></div>
    </div>
  );
};

export default TileView;