import React, { useState, useEffect, useRef } from 'react';
import { INITIAL_BOARD, BOARD_SIZE, PASS_START_BONUS, CHARACTERS, INITIAL_MONEY } from './constants';
import { Player, Tile, GamePhase, PlayerId, TileType, LogEntry, Character, Language } from './types';
import { TRANSLATIONS } from './translations';
import TileView from './components/TileView';
import Dice from './components/Dice';
import ActionModal from './components/ActionModal';
import CharacterSelection from './components/CharacterSelection';
import { generateChanceEvent, generateCommentary } from './services/geminiService';
import { Zap, Repeat, FastForward, Play, Globe } from 'lucide-react';

const App: React.FC = () => {
  // --- State ---
  const [language, setLanguage] = useState<Language>('de');
  const [board, setBoard] = useState<Tile[]>(INITIAL_BOARD);
  const [players, setPlayers] = useState<Player[]>([]); 
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [phase, setPhase] = useState<GamePhase>(GamePhase.CHARACTER_SELECTION);
  const [diceValue, setDiceValue] = useState(1);
  const [isRolling, setIsRolling] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  // Modal State
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    type: 'info' | 'decision';
    onConfirm: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
  }>({
    isOpen: false,
    title: "",
    description: "",
    type: 'info',
    onConfirm: () => {},
  });

  const scrollRef = useRef<HTMLDivElement>(null);
  const t = TRANSLATIONS[language];

  // --- Localization Effect ---
  // When language changes, update board names and player names to match
  useEffect(() => {
    // Update Board Tiles
    setBoard(prevBoard => prevBoard.map(tile => ({
      ...tile,
      name: t.tiles[tile.id] || tile.name
    })));

    // Update Player Names (if they are generic or CPU)
    setPlayers(prevPlayers => prevPlayers.map(p => {
       const charName = t.characters[p.characterId]?.name || p.name;
       // Heuristic: If it was "You" or "CPU", update it. 
       // Simpler: Just reconstruct display name based on ID?
       // We keep simple: p1 is "You", p2 is "CPU" (with character name)
       let newName = p.name;
       if (p.id === PlayerId.P1) newName = t.you; // `${t.you} (${charName})`;
       else if (p.id === PlayerId.P2) newName = t.cpu; // `${t.cpu} (${charName})`;
       
       return { ...p, name: newName };
    }));
    
    // Also update modal texts if open? 
    // It's tricky to update modal content dynamically if it's custom text.
    // For now we assume modals are transient.
  }, [language]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Helpers ---
  const currentPlayer = players[currentPlayerIndex];
  const currentCharacter = currentPlayer ? CHARACTERS.find(c => c.id === currentPlayer.characterId) : null;
  const trCurrentChar = currentCharacter ? t.characters[currentCharacter.id] : null;

  const addLog = (text: string, type: LogEntry['type'] = 'info') => {
    setLogs(prev => [...prev, { id: Date.now().toString(), text, type }]);
  };

  const nextTurn = () => {
    setPhase(GamePhase.WAITING_FOR_ROLL);
    setCurrentPlayerIndex(prev => (prev + 1) % players.length);
  };

  const updatePlayer = (id: PlayerId, changes: Partial<Player>) => {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, ...changes } : p));
  };

  // --- Initialization ---
  const handleCharacterSelect = (selectedChar: Character) => {
    // 1. Create Human Player
    const p1: Player = {
      id: PlayerId.P1,
      name: t.you,
      characterId: selectedChar.id,
      avatar: selectedChar.avatar,
      color: "bg-blue-500",
      money: selectedChar.abilityType === 'START_BONUS' ? INITIAL_MONEY + 500 : INITIAL_MONEY,
      position: 0,
      isAi: false,
      isJailed: false,
      properties: [],
      abilityCharges: selectedChar.maxCharges
    };

    // 2. Create AI Player (Random different char)
    const availableChars = CHARACTERS.filter(c => c.id !== selectedChar.id);
    const aiChar = availableChars[Math.floor(Math.random() * availableChars.length)];
    const p2: Player = {
      id: PlayerId.P2,
      name: t.cpu,
      characterId: aiChar.id,
      avatar: aiChar.avatar,
      color: "bg-red-500",
      money: aiChar.abilityType === 'START_BONUS' ? INITIAL_MONEY + 500 : INITIAL_MONEY,
      position: 0,
      isAi: true,
      isJailed: false,
      properties: [],
      abilityCharges: aiChar.maxCharges
    };

    setPlayers([p1, p2]);
    // Immediately update board names for current language
    setBoard(prev => prev.map(tile => ({ ...tile, name: t.tiles[tile.id] })));
    setPhase(GamePhase.WAITING_FOR_ROLL);
    
    const trChar = t.characters[selectedChar.id];
    addLog(`${t.pickHero} ${trChar.name}!`, 'success');
  };

  // --- AI Logic Hook ---
  useEffect(() => {
    if (!currentPlayer || !currentPlayer.isAi) return;

    if (phase === GamePhase.WAITING_FOR_ROLL) {
      const timer = setTimeout(() => handleRollDice(), 1500);
      return () => clearTimeout(timer);
    }

    if (phase === GamePhase.ROLL_RESULT) {
      const aiChar = CHARACTERS.find(c => c.id === currentPlayer.characterId);
      let usedAbility = false;

      const timer = setTimeout(() => {
        // Panda AI
        if (aiChar?.abilityType === 'REROLL' && currentPlayer.abilityCharges > 0 && diceValue <= 2) {
            addLog(`${t.cpu} ${t.reroll}!`, 'event');
            useAbility('REROLL');
            usedAbility = true;
        }
        // Rabbit AI
        else if (aiChar?.abilityType === 'EXTRA_STEPS' && currentPlayer.abilityCharges > 0 && diceValue < 4 && Math.random() > 0.7) {
             addLog(`${t.cpu} ${t.extraSteps}!`, 'event');
             useAbility('EXTRA_STEPS');
             usedAbility = true;
        }

        if (!usedAbility) {
           confirmMove();
        }
      }, 1500);

      return () => clearTimeout(timer);
    }

  }, [phase, currentPlayerIndex, diceValue, language]); // Added language to deps to ensure logs use current lang? No, logs are static history.

  // Auto-scroll logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  // --- Game Actions ---

  const handleRollDice = () => {
    if (phase !== GamePhase.WAITING_FOR_ROLL && phase !== GamePhase.ROLL_RESULT) return;
    setPhase(GamePhase.ROLLING);
    setIsRolling(true);
    
    setTimeout(() => {
      const roll = Math.floor(Math.random() * 6) + 1;
      setDiceValue(roll);
      setIsRolling(false);
      setPhase(GamePhase.ROLL_RESULT);
    }, 1000);
  };

  const useAbility = (type: string) => {
    if (currentPlayer.abilityCharges <= 0) return;
    updatePlayer(currentPlayer.id, { abilityCharges: currentPlayer.abilityCharges - 1 });

    if (type === 'REROLL') {
      handleRollDice(); 
    } else if (type === 'EXTRA_STEPS') {
      setDiceValue(prev => prev + 3);
      addLog(`${currentPlayer.name} ${t.extraSteps}!`, 'event');
      setTimeout(() => confirmMove(), 1000);
    }
  };

  const confirmMove = () => {
    setPhase(GamePhase.MOVING);
    startMovement(diceValue);
  };

  const startMovement = (steps: number) => {
    let stepsLeft = steps;
    const moveInterval = setInterval(() => {
      setPlayers(prev => {
        const newPlayers = [...prev];
        const p = newPlayers[currentPlayerIndex];
        const nextPos = (p.position + 1) % BOARD_SIZE;
        p.position = nextPos;
        return newPlayers;
      });

      stepsLeft--;
      if (stepsLeft <= 0) {
        clearInterval(moveInterval);
        setTimeout(() => {
           setPlayers(currentPlayers => {
              const p = currentPlayers[currentPlayerIndex];
              handleLandOnTile(p);
              return currentPlayers;
           });
        }, 500);
      }
    }, 300);
  };

  const handleLandOnTile = async (player: Player) => {
    setPhase(GamePhase.TILE_ACTION);
    const tile = board[player.position];
    addLog(`${player.name} ${t.landed} ${tile.name}.`, 'info');

    if (player.position === 0) {
      updatePlayer(player.id, { money: player.money + PASS_START_BONUS });
      addLog(t.startBonus, "success");
      setTimeout(nextTurn, 1000);
      return;
    }

    switch (tile.type) {
      case TileType.PROPERTY:
        await handlePropertyTile(player, tile);
        break;
      case TileType.CHANCE:
        await handleChanceTile(player);
        break;
      case TileType.JAIL:
        addLog(t.jail, "danger");
        updatePlayer(player.id, { money: player.money - 200 });
        addLog(t.jailPaid, "danger");
        setTimeout(nextTurn, 1500);
        break;
      case TileType.BANK:
        updatePlayer(player.id, { money: player.money + 300 });
        addLog(t.bankBonus, "success");
        setTimeout(nextTurn, 1500);
        break;
      case TileType.PARK:
        addLog(t.park, "info");
        setTimeout(nextTurn, 1500);
        break;
      default:
        setTimeout(nextTurn, 1000);
    }
  };

  const handlePropertyTile = async (player: Player, tile: Tile) => {
    if (!tile.owner) {
      if (player.money >= (tile.price || 0)) {
        if (player.isAi) {
          buyProperty(player, tile);
        } else {
          setModalConfig({
            isOpen: true,
            title: `${t.modals.buyTitle} ${tile.name}`,
            description: `${t.price}: $${tile.price}. ${t.you}: $${player.money}.`,
            type: 'decision',
            confirmText: t.buy,
            cancelText: t.pass,
            onConfirm: () => {
              buyProperty(player, tile);
              setModalConfig(prev => ({ ...prev, isOpen: false }));
            },
            onCancel: () => {
              setModalConfig(prev => ({ ...prev, isOpen: false }));
              nextTurn();
            }
          });
        }
      } else {
        addLog(t.cantAfford, 'danger');
        setTimeout(nextTurn, 1500);
      }
    } else if (tile.owner === player.id) {
       const upgradeCost = (tile.price || 100) / 2;
       if (player.money >= upgradeCost && (tile.level || 0) < 3) {
         if (player.isAi) {
           upgradeProperty(player, tile, upgradeCost);
         } else {
            setModalConfig({
              isOpen: true,
              title: `${t.modals.upgradeTitle} ${tile.name}`,
              description: `${t.cost}: $${upgradeCost}.`,
              type: 'decision',
              confirmText: t.upgrade,
              cancelText: t.pass,
              onConfirm: () => {
                upgradeProperty(player, tile, upgradeCost);
                setModalConfig(prev => ({ ...prev, isOpen: false }));
              },
              onCancel: () => {
                setModalConfig(prev => ({ ...prev, isOpen: false }));
                nextTurn();
              }
            });
         }
       } else {
         setTimeout(nextTurn, 1000);
       }
    } else {
      // Pay Rent
      const owner = players.find(p => p.id === tile.owner);
      if (owner) {
        const rent = (tile.rent || 0) * ((tile.level || 0) + 1);
        
        // Dino Shield Logic
        const char = CHARACTERS.find(c => c.id === player.characterId);
        if (char?.abilityType === 'RENT_SHIELD' && player.abilityCharges > 0) {
            if (player.isAi) {
                if (rent >= 100) { 
                    addLog(`${player.name}: ${t.shieldUsed}`, 'event');
                    updatePlayer(player.id, { abilityCharges: player.abilityCharges - 1 });
                    setTimeout(nextTurn, 1500);
                    return;
                }
            } else {
                setModalConfig({
                    isOpen: true,
                    title: t.modals.rentTitle,
                    description: `${t.payRent} $${rent}?`,
                    type: 'decision',
                    confirmText: t.useShield,
                    cancelText: `${t.payRent} $${rent}`,
                    onConfirm: () => {
                        addLog(t.shieldUsed, 'event');
                        updatePlayer(player.id, { abilityCharges: player.abilityCharges - 1 });
                        setModalConfig(prev => ({ ...prev, isOpen: false }));
                        setTimeout(nextTurn, 1500);
                    },
                    onCancel: () => {
                        payRent(player, owner, rent);
                        setModalConfig(prev => ({ ...prev, isOpen: false }));
                    }
                });
                return;
            }
        }
        payRent(player, owner, rent);
      }
    }
  };

  const buyProperty = async (player: Player, tile: Tile) => {
    const price = tile.price || 0;
    updatePlayer(player.id, { 
      money: player.money - price, 
      properties: [...player.properties, tile.id] 
    });
    setBoard(prev => prev.map(t => t.id === tile.id ? { ...t, owner: player.id, level: 0 } : t));
    
    addLog(`${player.name} ${t.bought} ${tile.name}!`, "success");
    const comment = await generateCommentary(player.name, "bought " + tile.name, language, price);
    addLog(`🎙️ ${comment}`, "event");
    setTimeout(nextTurn, 1500);
  };

  const upgradeProperty = (player: Player, tile: Tile, cost: number) => {
    updatePlayer(player.id, { money: player.money - cost });
    setBoard(prev => prev.map(t => t.id === tile.id ? { ...t, level: (t.level || 0) + 1 } : t));
    addLog(`${player.name} ${t.upgraded} ${tile.name}!`, "success");
    setTimeout(nextTurn, 1500);
  };

  const payRent = (payer: Player, owner: Player, amount: number) => {
    addLog(`${payer.name} ${t.rentPaid} $${amount} -> ${owner.name}.`, "danger");
    updatePlayer(payer.id, { money: payer.money - amount });
    updatePlayer(owner.id, { money: owner.money + amount });
    
    setTimeout(() => {
        if (players.find(p => p.id === payer.id)?.money! < 0) {
            setModalConfig({
              isOpen: true,
              title: t.gameover,
              description: `${payer.name} ${t.bankrupt} ${owner.name} ${t.win}`,
              type: 'info',
              onConfirm: () => window.location.reload(),
              confirmText: "Restart"
            });
            setPhase(GamePhase.GAME_OVER);
        } else {
            nextTurn();
        }
    }, 1500);
  };

  const handleChanceTile = async (player: Player) => {
    setPhase(GamePhase.EVENT_PROCESSING);
    addLog(t.modals.chanceTitle, "event");
    const event = await generateChanceEvent(language);
    
    setModalConfig({
      isOpen: true,
      title: event.title,
      description: event.description,
      type: 'info',
      confirmText: t.modals.cool,
      onConfirm: () => {
        updatePlayer(player.id, { money: player.money + event.moneyChange });
        addLog(`${event.moneyChange > 0 ? '+' : ''}$${event.moneyChange}`, event.moneyChange > 0 ? 'success' : 'danger');
        setModalConfig(prev => ({ ...prev, isOpen: false }));
        nextTurn();
      }
    });
  };

  const getGridStyle = (index: number) => {
    let row = 1, col = 1;
    if (index >= 0 && index <= 5) { // Bottom row (Rev)
      row = 6; col = 6 - index;
    } else if (index >= 6 && index <= 9) { // Left col (Up)
      col = 1; row = 6 - (index - 5);
    } else if (index >= 10 && index <= 15) { // Top row (Right)
      row = 1; col = index - 9;
    } else if (index >= 16 && index <= 19) { // Right col (Down)
      col = 6; row = index - 14;
    }
    return { gridRow: row, gridColumn: col };
  };

  if (phase === GamePhase.CHARACTER_SELECTION) {
    return <CharacterSelection onSelect={handleCharacterSelect} language={language} setLanguage={setLanguage} />;
  }

  return (
    <div className="min-h-screen bg-sky-100 flex flex-col items-center justify-center p-2 sm:p-4 font-sans">
      
      {/* Header */}
      <header className="w-full max-w-4xl flex justify-between items-center mb-4">
        <h1 className="text-xl sm:text-3xl font-black text-indigo-600 tracking-tight drop-shadow-sm truncate">
          {t.appTitle}
        </h1>
        <div className="flex gap-2">
           {players.map(p => (
             <div key={p.id} className={`flex items-center gap-1 sm:gap-2 px-2 py-1 rounded-full border-2 border-black ${p.id === currentPlayer?.id ? 'bg-white shadow-lg scale-105' : 'bg-gray-200 opacity-70'} transition-all`}>
                <span className="text-lg sm:text-xl">{p.avatar}</span>
                <div className="flex flex-col leading-none">
                  <span className="text-[10px] sm:text-xs font-bold max-w-[60px] truncate">{p.name}</span>
                  <span className="text-xs sm:text-sm font-mono text-green-600 font-bold">${p.money}</span>
                </div>
                {p.abilityCharges > -1 && (
                  <div className="flex items-center ml-1">
                    <Zap size={10} className={p.abilityCharges > 0 ? "text-yellow-500 fill-yellow-500" : "text-gray-400"} />
                    <span className="text-[10px] font-bold text-gray-600 ml-0.5">{p.abilityCharges}</span>
                  </div>
                )}
             </div>
           ))}
        </div>
        <div className="flex items-center justify-center bg-white p-1 rounded-full border border-gray-300 ml-2">
             <button onClick={() => setLanguage(language === 'de' ? 'en' : language === 'en' ? 'zh' : language === 'zh' ? 'ja' : 'de')} className="font-bold text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full flex gap-1 items-center">
                <Globe size={12}/> {language.toUpperCase()}
             </button>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="relative w-full max-w-4xl aspect-square sm:aspect-auto sm:h-[600px] bg-white rounded-3xl border-4 border-black p-4 pop-shadow-lg overflow-hidden">
        
        {/* The Grid Board */}
        <div className="w-full h-full grid grid-cols-6 grid-rows-6 gap-1 sm:gap-2">
           {board.map((tile) => (
             <div key={tile.id} style={getGridStyle(tile.id)} className="w-full h-full">
               <TileView tile={tile} players={players} />
             </div>
           ))}

           {/* Center Area (Hub) */}
           <div className="col-start-2 col-end-6 row-start-2 row-end-6 bg-sky-50 rounded-2xl border-2 border-dashed border-sky-200 flex flex-col items-center justify-center relative p-4">
              
              {/* Event/Log Display */}
              <div className="absolute top-4 w-full px-4 h-32 overflow-y-auto" ref={scrollRef}>
                <div className="flex flex-col gap-2">
                  {logs.map((log) => (
                    <div key={log.id} className={`text-xs sm:text-sm p-2 rounded-lg border-l-4 ${
                      log.type === 'danger' ? 'bg-red-50 border-red-500' : 
                      log.type === 'success' ? 'bg-green-50 border-green-500' :
                      log.type === 'event' ? 'bg-purple-50 border-purple-500' :
                      'bg-gray-50 border-gray-400'
                    }`}>
                      {log.text}
                    </div>
                  ))}
                </div>
              </div>

              {/* Controls */}
              <div className="mt-auto flex flex-col items-center gap-4 pb-4 w-full">
                
                {/* Player Turn Info */}
                <div className="text-center">
                  <div className={`text-2xl font-black ${currentPlayer?.color.replace('bg-', 'text-')} mb-2`}>
                    {currentPlayer?.name}
                  </div>
                </div>

                {/* Dice and Actions Area */}
                <div className="flex items-center justify-center gap-6">
                  
                   {/* Left Ability Button (Panda Reroll) */}
                   {phase === GamePhase.ROLL_RESULT && !currentPlayer.isAi && currentCharacter?.abilityType === 'REROLL' && currentPlayer.abilityCharges > 0 && (
                      <button 
                        onClick={() => useAbility('REROLL')}
                        className="flex flex-col items-center animate-in zoom-in duration-300"
                      >
                         <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white border-4 border-black pop-shadow hover:scale-105 active:scale-95 transition-all">
                            <Repeat size={24} />
                         </div>
                         <span className="text-xs font-bold text-gray-600 mt-1">{t.reroll} ({currentPlayer.abilityCharges})</span>
                      </button>
                   )}

                   {/* The Dice / Result Display */}
                   <div className="relative">
                      {phase === GamePhase.ROLL_RESULT ? (
                        <div className="w-24 h-24 bg-white rounded-2xl border-4 border-black flex items-center justify-center text-5xl font-bold text-indigo-600 shadow-inner">
                          {diceValue}
                        </div>
                      ) : (
                        <Dice 
                          isRolling={isRolling} 
                          value={diceValue} 
                          onRoll={handleRollDice} 
                          disabled={currentPlayer?.isAi || phase !== GamePhase.WAITING_FOR_ROLL}
                          label={t.rollDice}
                          rollingLabel={t.rolling}
                        />
                      )}
                   </div>

                   {/* Right Ability Button (Rabbit Boost) */}
                   {phase === GamePhase.ROLL_RESULT && !currentPlayer.isAi && currentCharacter?.abilityType === 'EXTRA_STEPS' && currentPlayer.abilityCharges > 0 && (
                      <button 
                        onClick={() => useAbility('EXTRA_STEPS')}
                        className="flex flex-col items-center animate-in zoom-in duration-300"
                      >
                         <div className="w-16 h-16 bg-pink-500 rounded-full flex items-center justify-center text-white border-4 border-black pop-shadow hover:scale-105 active:scale-95 transition-all">
                            <FastForward size={24} />
                         </div>
                         <span className="text-xs font-bold text-gray-600 mt-1">{t.extraSteps} ({currentPlayer.abilityCharges})</span>
                      </button>
                   )}
                </div>

                {/* Confirm Move Button (Only visible during Result Phase for Human) */}
                {phase === GamePhase.ROLL_RESULT && !currentPlayer.isAi && (
                   <button 
                    onClick={confirmMove}
                    className="mt-2 px-8 py-2 bg-green-400 hover:bg-green-500 text-white font-bold rounded-xl border-b-4 border-green-600 active:border-b-0 active:translate-y-1 transition-all flex items-center gap-2"
                   >
                     <Play size={16} fill="currentColor" /> {t.move}
                   </button>
                )}

              </div>

           </div>
        </div>
      </main>

      {/* Modals */}
      <ActionModal 
        isOpen={modalConfig.isOpen}
        title={modalConfig.title}
        description={modalConfig.description}
        type={modalConfig.type}
        onConfirm={modalConfig.onConfirm}
        onCancel={modalConfig.onCancel}
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText || t.modals.cancel}
      />

    </div>
  );
};

export default App;