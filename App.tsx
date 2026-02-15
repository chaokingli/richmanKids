import React, { useState, useEffect, useRef } from 'react';
import { INITIAL_BOARD, BOARD_SIZE, PASS_START_BONUS, CHARACTERS, INITIAL_MONEY } from './constants';
import { Player, Tile, GamePhase, PlayerId, TileType, LogEntry, Character, Language } from './types';
import { TRANSLATIONS } from './translations';
import TileView from './components/TileView';
import Dice from './components/Dice';
import ActionModal from './components/ActionModal';
import CharacterSelection from './components/CharacterSelection';
import GameSetup from './components/GameSetup';
import { generateChanceEvent, generateCommentary } from './services/geminiService';
import { Zap, Repeat, FastForward, Play, Globe } from 'lucide-react';

const App: React.FC = () => {
  // --- State ---
  const [language, setLanguage] = useState<Language>('de');
  const [board, setBoard] = useState<Tile[]>(INITIAL_BOARD);
  const [players, setPlayers] = useState<Player[]>([]); 
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [phase, setPhase] = useState<GamePhase>(GamePhase.SETUP);
  const [diceValue, setDiceValue] = useState(1);
  const [isRolling, setIsRolling] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  // Setup config
  const [setupConfig, setSetupConfig] = useState({ total: 2, humans: 1 });
  const [currentPickingPlayer, setCurrentPickingPlayer] = useState(0);

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
  useEffect(() => {
    setBoard(prevBoard => prevBoard.map(tile => ({
      ...tile,
      name: t.tiles[tile.id] || tile.name
    })));

    setPlayers(prevPlayers => prevPlayers.map((p, idx) => {
       let newName = p.name;
       if (!p.isAi) newName = `${t.you} ${idx + 1}`;
       else newName = `${t.cpu} ${idx + 1}`;
       return { ...p, name: newName };
    }));
  }, [language]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Helpers ---
  const currentPlayer = players[currentPlayerIndex];
  const currentCharacter = currentPlayer ? CHARACTERS.find(c => c.id === currentPlayer.characterId) : null;

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

  // --- Initialization Flow ---
  const handleSetupConfirm = (total: number, humans: number) => {
    setSetupConfig({ total, humans });
    setPhase(GamePhase.CHARACTER_SELECTION);
    setCurrentPickingPlayer(0);
  };

  const handleCharacterSelect = (selectedChar: Character) => {
    const newPlayer: Player = {
      id: `p${currentPickingPlayer + 1}` as PlayerId,
      name: `${t.you} ${currentPickingPlayer + 1}`,
      characterId: selectedChar.id,
      avatar: selectedChar.avatar,
      color: currentPickingPlayer === 0 ? "bg-blue-500" : currentPickingPlayer === 1 ? "bg-red-500" : currentPickingPlayer === 2 ? "bg-green-500" : "bg-yellow-400",
      money: selectedChar.abilityType === 'START_BONUS' ? INITIAL_MONEY + 500 : INITIAL_MONEY,
      position: 0,
      isAi: false,
      isJailed: false,
      properties: [],
      abilityCharges: selectedChar.maxCharges
    };

    const updatedPlayers = [...players, newPlayer];
    setPlayers(updatedPlayers);

    if (currentPickingPlayer + 1 < setupConfig.humans) {
      setCurrentPickingPlayer(prev => prev + 1);
    } else {
      // All humans picked. Fill remaining with AI.
      finalizePlayers(updatedPlayers);
    }
  };

  const finalizePlayers = (currentPlayers: Player[]) => {
    let finalPlayers = [...currentPlayers];
    const totalNeeded = setupConfig.total;
    
    // Pick AI characters from remaining
    let pickedIds = finalPlayers.map(p => p.characterId);
    let availableChars = CHARACTERS.filter(c => !pickedIds.includes(c.id));

    while (finalPlayers.length < totalNeeded) {
      const idx = finalPlayers.length;
      const aiChar = availableChars.splice(Math.floor(Math.random() * availableChars.length), 1)[0];
      finalPlayers.push({
        id: `p${idx + 1}` as PlayerId,
        name: `${t.cpu} ${idx + 1}`,
        characterId: aiChar.id,
        avatar: aiChar.avatar,
        color: idx === 0 ? "bg-blue-500" : idx === 1 ? "bg-red-500" : idx === 2 ? "bg-green-500" : "bg-yellow-400",
        money: aiChar.abilityType === 'START_BONUS' ? INITIAL_MONEY + 500 : INITIAL_MONEY,
        position: 0,
        isAi: true,
        isJailed: false,
        properties: [],
        abilityCharges: aiChar.maxCharges
      });
    }

    setPlayers(finalPlayers);
    setBoard(prev => prev.map(tile => ({ ...tile, name: t.tiles[tile.id] })));
    setPhase(GamePhase.WAITING_FOR_ROLL);
    addLog(`Let the game begin!`, 'success');
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
        if (aiChar?.abilityType === 'REROLL' && currentPlayer.abilityCharges > 0 && diceValue <= 2) {
            addLog(`${currentPlayer.name}: ${t.reroll}!`, 'event');
            useAbility('REROLL');
            usedAbility = true;
        }
        else if (aiChar?.abilityType === 'EXTRA_STEPS' && currentPlayer.abilityCharges > 0 && diceValue < 4 && Math.random() > 0.7) {
             addLog(`${currentPlayer.name}: ${t.extraSteps}!`, 'event');
             useAbility('EXTRA_STEPS');
             usedAbility = true;
        }

        if (!usedAbility) {
           confirmMove();
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [phase, currentPlayerIndex, diceValue]); 

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
      addLog(`${currentPlayer.name}: ${t.extraSteps}!`, 'event');
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
        if (player.isAi) buyProperty(player, tile);
        else {
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
         if (player.isAi) upgradeProperty(player, tile, upgradeCost);
         else {
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
      const owner = players.find(p => p.id === tile.owner);
      if (owner) {
        const rent = (tile.rent || 0) * ((tile.level || 0) + 1);
        const char = CHARACTERS.find(c => c.id === player.characterId);
        if (char?.abilityType === 'RENT_SHIELD' && player.abilityCharges > 0) {
            if (player.isAi) {
                if (rent >= 150) { 
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
                        addLog(`${player.name}: ${t.shieldUsed}`, 'event');
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
    if (index >= 0 && index <= 5) { row = 6; col = 6 - index; }
    else if (index >= 6 && index <= 9) { col = 1; row = 6 - (index - 5); }
    else if (index >= 10 && index <= 15) { row = 1; col = index - 9; }
    else if (index >= 16 && index <= 19) { col = 6; row = index - 14; }
    return { gridRow: row, gridColumn: col };
  };

  if (phase === GamePhase.SETUP) {
    return <GameSetup language={language} setLanguage={setLanguage} onConfirm={handleSetupConfirm} />;
  }

  if (phase === GamePhase.CHARACTER_SELECTION) {
    return (
      <CharacterSelection 
        onSelect={handleCharacterSelect} 
        language={language} 
        playerIndex={currentPickingPlayer}
        totalHumans={setupConfig.humans}
        pickedIds={players.map(p => p.characterId)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-sky-100 flex flex-col items-center justify-center p-2 sm:p-4 font-sans">
      <header className="w-full max-w-4xl flex justify-between items-center mb-4 gap-2">
        <h1 className="text-xl sm:text-2xl font-black text-indigo-600 tracking-tight drop-shadow-sm truncate flex-shrink-0">
          {t.appTitle}
        </h1>
        <div className="flex flex-wrap justify-end gap-2 overflow-x-auto no-scrollbar py-1">
           {players.map((p, idx) => (
             <div key={p.id} className={`flex items-center gap-1 sm:gap-2 px-2 py-1 rounded-full border-2 border-black transition-all ${p.id === currentPlayer?.id ? 'bg-white shadow-lg scale-105 z-10' : 'bg-gray-200 opacity-70'} flex-shrink-0`}>
                <span className="text-lg sm:text-xl">{p.avatar}</span>
                <div className="flex flex-col leading-none">
                  <span className="text-[10px] font-bold max-w-[50px] truncate">{p.name}</span>
                  <span className="text-xs font-mono text-green-600 font-bold">${p.money}</span>
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
        <div className="flex items-center justify-center bg-white p-1 rounded-full border border-gray-300 ml-auto flex-shrink-0">
             <button onClick={() => setLanguage(language === 'de' ? 'en' : language === 'en' ? 'zh' : language === 'zh' ? 'ja' : 'de')} className="font-bold text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full flex gap-1 items-center">
                <Globe size={12}/> {language.toUpperCase()}
             </button>
        </div>
      </header>

      <main className="relative w-full max-w-4xl aspect-square sm:aspect-auto sm:h-[600px] bg-white rounded-3xl border-4 border-black p-4 pop-shadow-lg overflow-hidden">
        <div className="w-full h-full grid grid-cols-6 grid-rows-6 gap-1 sm:gap-2">
           {board.map((tile) => (
             <div key={tile.id} style={getGridStyle(tile.id)} className="w-full h-full">
               <TileView tile={tile} players={players} />
             </div>
           ))}
           <div className="col-start-2 col-end-6 row-start-2 row-end-6 bg-sky-50 rounded-2xl border-2 border-dashed border-sky-200 flex flex-col items-center justify-center relative p-4">
              <div className="absolute top-4 w-full px-4 h-32 overflow-y-auto" ref={scrollRef}>
                <div className="flex flex-col gap-2">
                  {logs.map((log) => (
                    <div key={log.id} className={`text-xs sm:text-sm p-2 rounded-lg border-l-4 ${log.type === 'danger' ? 'bg-red-50 border-red-500' : log.type === 'success' ? 'bg-green-50 border-green-500' : log.type === 'event' ? 'bg-purple-50 border-purple-500' : 'bg-gray-50 border-gray-400'}`}>
                      {log.text}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-auto flex flex-col items-center gap-4 pb-4 w-full">
                <div className="text-center">
                  <div className={`text-2xl font-black ${currentPlayer?.color.replace('bg-', 'text-')} mb-2`}>
                    {currentPlayer?.name}
                  </div>
                </div>
                <div className="flex items-center justify-center gap-6">
                   {phase === GamePhase.ROLL_RESULT && !currentPlayer.isAi && currentCharacter?.abilityType === 'REROLL' && currentPlayer.abilityCharges > 0 && (
                      <button onClick={() => useAbility('REROLL')} className="flex flex-col items-center animate-in zoom-in duration-300">
                         <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white border-4 border-black pop-shadow hover:scale-105 active:scale-95 transition-all">
                            <Repeat size={24} />
                         </div>
                         <span className="text-xs font-bold text-gray-600 mt-1">{t.reroll}</span>
                      </button>
                   )}
                   <div className="relative">
                      {phase === GamePhase.ROLL_RESULT ? (
                        <div className="w-24 h-24 bg-white rounded-2xl border-4 border-black flex items-center justify-center text-5xl font-bold text-indigo-600 shadow-inner">
                          {diceValue}
                        </div>
                      ) : (
                        <Dice isRolling={isRolling} value={diceValue} onRoll={handleRollDice} disabled={currentPlayer?.isAi || phase !== GamePhase.WAITING_FOR_ROLL} label={t.rollDice} rollingLabel={t.rolling} />
                      )}
                   </div>
                   {phase === GamePhase.ROLL_RESULT && !currentPlayer.isAi && currentCharacter?.abilityType === 'EXTRA_STEPS' && currentPlayer.abilityCharges > 0 && (
                      <button onClick={() => useAbility('EXTRA_STEPS')} className="flex flex-col items-center animate-in zoom-in duration-300">
                         <div className="w-16 h-16 bg-pink-500 rounded-full flex items-center justify-center text-white border-4 border-black pop-shadow hover:scale-105 active:scale-95 transition-all">
                            <FastForward size={24} />
                         </div>
                         <span className="text-xs font-bold text-gray-600 mt-1">{t.extraSteps}</span>
                      </button>
                   )}
                </div>
                {phase === GamePhase.ROLL_RESULT && !currentPlayer.isAi && (
                   <button onClick={confirmMove} className="mt-2 px-8 py-2 bg-green-400 hover:bg-green-500 text-white font-bold rounded-xl border-b-4 border-green-600 active:border-b-0 active:translate-y-1 transition-all flex items-center gap-2">
                     <Play size={16} fill="currentColor" /> {t.move}
                   </button>
                )}
              </div>
           </div>
        </div>
      </main>
      <ActionModal isOpen={modalConfig.isOpen} title={modalConfig.title} description={modalConfig.description} type={modalConfig.type} onConfirm={modalConfig.onConfirm} onCancel={modalConfig.onCancel} confirmText={modalConfig.confirmText} cancelText={modalConfig.cancelText || t.modals.cancel} />
    </div>
  );
};

export default App;