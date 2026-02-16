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
    // 统一图标尺寸，并针对横竖屏使用流体比例
    const iconClass = "w-[3.5vmin] h-[3.5vmin] sm:w-[5vmin] sm:h-[5vmin] landscape:w-[2.5vmin] landscape:h-[2.5vmin] transition-transform group-hover:scale-110";
    switch (tile.type) {
      case TileType.START: return <MapPin className={`${iconClass} text-white drop-shadow-sm`} />;
      case TileType.PROPERTY: return <Home className={`${iconClass} ${tile.owner ? 'text-white' : 'text-gray-700 opacity-20'}`} />;
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
      <div className="absolute top-0.5 right-0.5 flex flex-wrap max-w-[15vmin] gap-0.5">
        {Array.from({ length: tile.level }).map((_, i) => (
          <div key={i} className="w-[1.2vmin] h-[1.2vmin] bg-yellow-400 rounded-full border border-black shadow-sm" />
        ))}
      </div>
    );
  };

  const ownerPlayer = players.find(p => p.id === tile.owner);
  const borderClass = ownerPlayer 
    ? `border-[0.8vmin] ${ownerPlayer.color.replace('bg-', 'border-')} shadow-inner`
    : 'border-[0.5vmin] border-black/10';

  return (
    <div className={`
      relative flex flex-col items-center justify-center p-[0.5vmin] group
      rounded-[1.5vmin] shadow-sm transition-all duration-300
      ${tile.color} 
      ${borderClass}
      h-full w-full overflow-hidden hover:scale-[1.02] active:scale-100 cursor-default
    `}>
      <div className="flex flex-col items-center z-0 text-center w-full transition-all group-hover:translate-y-[-0.2vmin]">
        <div className="mb-[0.5vmin] landscape:mb-0.5">{getIcon()}</div>
        <span className="
          text-[1.8vmin] sm:text-[2vmin] landscape:text-[clamp(6px,1.2vmin,14px)]
          font-black leading-tight text-gray-900 
          bg-white/40 px-[0.8vmin] py-[0.2vmin] 
          rounded-full backdrop-blur-sm 
          w-[96%] shadow-sm
          flex items-center justify-center
          overflow-hidden text-nowrap
        ">
          {tile.name}
        </span>
        {tile.type === TileType.PROPERTY && (
          <div className="mt-[0.5vmin] landscape:mt-0.5 bg-black/10 rounded-full px-[0.8vmin] py-0">
            <span className="text-[1.4vmin] landscape:text-[1vmin] font-mono font-black text-gray-800">
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
      
      <div className="absolute inset-0 bg-white opacity-5 pointer-events-none mix-blend-overlay"></div>
    </div>
  );
};

export default TileView;