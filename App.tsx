import React, { useState, useEffect, useRef } from 'react';
import { INITIAL_BOARD, BOARD_SIZE, PASS_START_BONUS, CHARACTERS, INITIAL_MONEY } from './constants';
import { Player, Tile, GamePhase, PlayerId, TileType, LogEntry, Character, Language, RoomConfig } from './types';
import { TRANSLATIONS } from './translations';
import TileView from './components/TileView';
import Dice from './components/Dice';
import ActionModal from './components/ActionModal';
import CharacterSelection from './components/CharacterSelection';
import GameSetup from './components/GameSetup';
import { generateChanceEvent, generateCommentary, generateSpeech, decodeAudioData } from './services/geminiService';
import { audioService } from './services/audioService';
import { Zap, Repeat, FastForward, Play, Globe, ScrollText, Volume2, VolumeX, Users, QrCode } from 'lucide-react';

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>('zh');
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [board, setBoard] = useState<Tile[]>(INITIAL_BOARD);
  const [players, setPlayers] = useState<Player[]>([]); 
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [phase, setPhase] = useState<GamePhase>(GamePhase.SETUP);
  const [diceValue, setDiceValue] = useState(1);
  const [isRolling, setIsRolling] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [roomConfig, setRoomConfig] = useState<RoomConfig | null>(null);
  
  const [setupConfig, setSetupConfig] = useState({ total: 2, humans: 1 });
  const [currentPickingPlayer, setCurrentPickingPlayer] = useState(0);

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
  }, [language]); 

  const currentPlayer = players[currentPlayerIndex];
  const currentCharacter = currentPlayer ? CHARACTERS.find(c => c.id === currentPlayer.characterId) : null;

  const playSfx = (type: 'dice' | 'land' | 'buy' | 'error' | 'success') => {
    if (isSoundEnabled) audioService.playSfx(type);
  };

  /**
   * Speak logic with synchronization:
   * Returns a promise that resolves ONLY after voice is loaded (or falls back).
   */
  const speak = async (text: string): Promise<void> => {
    if (!isSoundEnabled) return Promise.resolve();
    
    return new Promise(async (resolve) => {
      if (process.env.API_KEY) {
        try {
          const audioData = await generateSpeech(text);
          if (audioData) {
            const ctx = audioService.getAudioContext();
            const buffer = await decodeAudioData(audioData, ctx);
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(ctx.destination);
            source.onended = () => resolve(); // Sync point: voice finished
            source.start();
            return;
          }
        } catch (e) {
          console.warn("Gemini TTS failed, fallback used.");
        }
      }

      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        const langMap: Record<Language, string> = { zh: 'zh-CN', en: 'en-US', de: 'de-DE', ja: 'ja-JP' };
        utterance.lang = langMap[language] || 'zh-CN';
        utterance.onend = () => resolve();
        window.speechSynthesis.speak(utterance);
      } else {
        resolve();
      }
    });
  };

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

  const handleSetupConfirm = (total: number, humans: number, roomData?: { code: string; isHost: boolean }) => {
    setSetupConfig({ total, humans });
    if (roomData) {
      setRoomConfig(roomData);
      setPhase(GamePhase.WAITING_FOR_ROOM);
      // Simulate player joining after delay for local testing
      setTimeout(() => {
        setPhase(GamePhase.CHARACTER_SELECTION);
        playSfx('success');
      }, 3000);
    } else {
      setPhase(GamePhase.CHARACTER_SELECTION);
      playSfx('success');
    }
  };

  const handleCharacterSelect = (selectedChar: Character) => {
    const playerColors = ["bg-blue-500", "bg-red-500", "bg-green-500", "bg-yellow-400"];
    const newPlayer: Player = {
      id: `p${currentPickingPlayer + 1}` as PlayerId,
      name: `${t.you} ${currentPickingPlayer + 1}`,
      characterId: selectedChar.id,
      avatar: selectedChar.avatar,
      color: playerColors[currentPickingPlayer % playerColors.length],
      money: selectedChar.abilityType === 'START_BONUS' ? INITIAL_MONEY + 500 : INITIAL_MONEY,
      position: 0,
      isAi: false,
      isJailed: false,
      properties: [],
      abilityCharges: selectedChar.maxCharges
    };

    const updatedPlayers = [...players, newPlayer];
    setPlayers(updatedPlayers);
    playSfx('land');

    if (currentPickingPlayer + 1 < setupConfig.humans) {
      setCurrentPickingPlayer(prev => prev + 1);
    } else {
      finalizePlayers(updatedPlayers);
    }
  };

  const finalizePlayers = async (currentPlayers: Player[]) => {
    let finalPlayers = [...currentPlayers];
    const totalNeeded = setupConfig.total;
    const playerColors = ["bg-blue-500", "bg-red-500", "bg-green-500", "bg-yellow-400"];
    
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
        color: playerColors[idx % playerColors.length],
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

    const startMsg = language === 'zh' ? "游戏开始！祝你好运！" : "Game start! Good luck!";
    // Perfect Sync: Voice finishes loading/playing then text appears
    await speak(startMsg); 
    addLog(startMsg, 'success'); 
  };

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
        } else if (aiChar?.abilityType === 'EXTRA_STEPS' && currentPlayer.abilityCharges > 0 && diceValue < 4 && Math.random() > 0.7) {
             addLog(`${currentPlayer.name}: ${t.extraSteps}!`, 'event');
             useAbility('EXTRA_STEPS');
             usedAbility = true;
        }
        if (!usedAbility) confirmMove();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [phase, currentPlayerIndex, diceValue]); 

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const handleRollDice = () => {
    if (phase !== GamePhase.WAITING_FOR_ROLL && phase !== GamePhase.ROLL_RESULT) return;
    setPhase(GamePhase.ROLLING);
    setIsRolling(true);
    playSfx('dice');
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
    playSfx('success');
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
      playSfx('dice'); 
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
    playSfx('land');
    
    if (player.position === 0) {
      updatePlayer(player.id, { money: player.money + PASS_START_BONUS });
      const bonusMsg = t.startBonus;
      await speak(bonusMsg);
      addLog(bonusMsg, "success");
      playSfx('success');
      setTimeout(nextTurn, 1000);
      return;
    }
    switch (tile.type) {
      case TileType.PROPERTY: await handlePropertyTile(player, tile); break;
      case TileType.CHANCE: await handleChanceTile(player); break;
      case TileType.JAIL:
        addLog(t.jail, "danger");
        updatePlayer(player.id, { money: player.money - 200 });
        addLog(t.jailPaid, "danger");
        playSfx('error');
        setTimeout(nextTurn, 1500);
        break;
      case TileType.BANK:
        updatePlayer(player.id, { money: player.money + 300 });
        addLog(t.bankBonus, "success");
        playSfx('success');
        setTimeout(nextTurn, 1500);
        break;
      case TileType.PARK:
        addLog(t.park, "info");
        setTimeout(nextTurn, 1500);
        break;
      default: setTimeout(nextTurn, 1000);
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
        playSfx('error');
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
                    playSfx('success');
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
                        playSfx('success');
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
    playSfx('buy');
    
    const comment = await generateCommentary(player.name, "bought " + tile.name, language, price);
    // Perfect Sync: Voice first
    await speak(comment);
    addLog(`🎙️ ${comment}`, "event");
    
    setTimeout(nextTurn, 1500);
  };

  const upgradeProperty = (player: Player, tile: Tile, cost: number) => {
    updatePlayer(player.id, { money: player.money - cost });
    setBoard(prev => prev.map(t => t.id === tile.id ? { ...t, level: (t.level || 0) + 1 } : t));
    addLog(`${player.name} ${t.upgraded} ${tile.name}!`, "success");
    playSfx('buy');
    setTimeout(nextTurn, 1500);
  };

  const payRent = async (payer: Player, owner: Player, amount: number) => {
    addLog(`${payer.name} ${t.rentPaid} $${amount} -> ${owner.name}.`, "danger");
    updatePlayer(payer.id, { money: payer.money - amount });
    updatePlayer(owner.id, { money: owner.money + amount });
    playSfx('error');
    
    setTimeout(async () => {
        const freshPayer = players.find(p => p.id === payer.id);
        if (freshPayer && freshPayer.money < 0) {
            await speak(t.gameover);
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
    // Wait for voice before showing modal to avoid desync
    await speak(event.description);
    
    setModalConfig({
      isOpen: true,
      title: event.title,
      description: event.description,
      type: 'info',
      confirmText: t.modals.cool,
      onConfirm: () => {
        updatePlayer(player.id, { money: player.money + event.moneyChange });
        addLog(`${event.moneyChange > 0 ? '+' : ''}$${event.moneyChange}`, event.moneyChange > 0 ? 'success' : 'danger');
        playSfx(event.moneyChange > 0 ? 'success' : 'error');
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

  if (phase === GamePhase.WAITING_FOR_ROOM) {
    return (
      <div className="fixed inset-0 z-50 bg-sky-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-[3rem] p-8 max-w-lg w-full pop-shadow-lg border-8 border-black flex flex-col items-center text-center">
          <h2 className="text-3xl font-black text-indigo-600 mb-6">{t.waitingPlayers}</h2>
          <div className="w-48 h-48 sm:w-64 sm:h-64 bg-gray-50 border-4 border-black rounded-3xl mb-6 flex items-center justify-center relative overflow-hidden group">
            <QrCode size={200} className="text-gray-900 opacity-80 group-hover:scale-110 transition-transform" />
            <div className="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
               <p className="font-bold text-indigo-600">SCAN TO JOIN</p>
            </div>
          </div>
          <div className="bg-indigo-50 px-8 py-4 rounded-2xl border-4 border-indigo-200 mb-8">
            <span className="text-xs font-bold text-gray-400 block uppercase tracking-widest">{t.roomCode}</span>
            <span className="text-4xl font-black text-indigo-600 tracking-widest">{roomConfig?.code}</span>
          </div>
          <div className="flex items-center gap-4 text-gray-500 font-bold">
            <Users size={20} />
            <span>1 / {setupConfig.total} {t.playersJoined}</span>
          </div>
          <p className="mt-8 text-xs text-gray-400 font-bold uppercase animate-pulse italic">(Simulating player discovery...)</p>
        </div>
      </div>
    );
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
    <div className="min-h-screen bg-sky-100 flex flex-col items-center font-sans overflow-y-auto overflow-x-hidden">
      <div className="w-full bg-white/80 backdrop-blur-sm border-b-4 border-black/10 py-2 px-4 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar app-header z-50 sticky top-0">
        <div className="flex gap-2">
           {players.map((p) => (
             <div key={p.id} className={`flex items-center gap-1 sm:gap-2 px-2 py-1 rounded-full border-2 border-black/20 transition-all ${p.id === currentPlayer?.id ? 'bg-white ring-4 ring-indigo-400 shadow-md scale-105' : 'bg-gray-100 opacity-80'} flex-shrink-0`}>
                <span className="text-sm sm:text-lg">{p.avatar}</span>
                <div className="flex flex-col leading-none">
                  <span className="text-[10px] sm:text-[12px] font-bold max-w-[70px] truncate">{p.name}</span>
                  <span className="text-[11px] sm:text-[14px] font-mono text-green-600 font-bold">${p.money}</span>
                </div>
                {p.abilityCharges > -1 && (
                  <div className="flex items-center ml-0.5">
                    <Zap size={12} className={p.abilityCharges > 0 ? "text-yellow-500 fill-yellow-500" : "text-gray-400"} />
                    <span className="text-[10px] font-bold text-gray-600">{p.abilityCharges}</span>
                  </div>
                )}
             </div>
           ))}
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsSoundEnabled(!isSoundEnabled)} 
            className={`p-2 sm:p-3 rounded-full border-2 transition-all ${isSoundEnabled ? 'bg-green-100 text-green-700 border-green-300' : 'bg-red-100 text-red-700 border-red-300'}`}
          >
            {isSoundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <button onClick={() => setLanguage(l => l === 'de' ? 'en' : l === 'en' ? 'zh' : l === 'zh' ? 'ja' : 'de')} className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-xs sm:text-sm font-black border-2 border-indigo-200">
             {language.toUpperCase()}
          </button>
        </div>
      </div>

      <main className="w-full max-w-[min(95vw,85vh)] flex-grow flex flex-col items-center justify-center p-2 sm:p-6 mb-8">
        <div className="relative w-full board-container bg-white rounded-[2rem] sm:rounded-[4rem] border-4 sm:border-[10px] border-black p-1.5 sm:p-4 pop-shadow-lg overflow-hidden transition-all duration-500 hover:shadow-2xl">
          <div className="w-full h-full grid grid-cols-6 grid-rows-6 gap-1 sm:gap-3 md:gap-4">
             {board.map((tile) => (
               <div key={tile.id} style={getGridStyle(tile.id)} className="w-full h-full">
                 <TileView tile={tile} players={players} />
               </div>
             ))}
             
             <div className="col-start-2 col-end-6 row-start-2 row-end-6 bg-sky-50 rounded-[1.5rem] sm:rounded-[3rem] border-4 border-dashed border-sky-200 flex flex-col items-center justify-center relative p-3 sm:p-8">
                
                <div className={`absolute inset-0 z-40 transition-all duration-500 bg-sky-50/95 p-4 sm:p-8 flex flex-col rounded-[1.5rem] sm:rounded-[3rem] ${showLogs ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                   <div className="flex justify-between items-center mb-4">
                     <span className="text-lg font-black text-indigo-600 flex items-center gap-2"><ScrollText size={24}/> 日志</span>
                     <button onClick={() => setShowLogs(false)} className="text-sm font-bold bg-indigo-500 text-white px-5 py-2 rounded-2xl pop-shadow">关闭</button>
                   </div>
                   <div className="flex-grow overflow-y-auto pr-2 no-scrollbar" ref={scrollRef}>
                      {logs.map((log) => (
                        <div key={log.id} className={`text-xs sm:text-base p-3 mb-3 rounded-2xl border-l-8 transition-all animate-in slide-in-from-right-4 ${log.type === 'danger' ? 'bg-red-50 border-red-500 text-red-700' : log.type === 'success' ? 'bg-green-50 border-green-500 text-green-700' : log.type === 'event' ? 'bg-purple-50 border-purple-500 text-purple-700 font-bold italic' : 'bg-white border-gray-300 text-gray-600 shadow-sm'}`}>
                          {log.text}
                        </div>
                      ))}
                   </div>
                </div>

                {!showLogs && (
                  <div className="flex flex-col items-center w-full h-full">
                    <div onClick={() => setShowLogs(true)} className="w-full text-center bg-white/60 hover:bg-white/90 cursor-pointer rounded-2xl p-3 mb-auto border-2 border-black/5 overflow-hidden transition-all shadow-sm">
                       <p className="text-xs sm:text-lg text-gray-500 truncate font-bold">{logs.length > 0 ? logs[logs.length-1].text : '等待开始...'}</p>
                    </div>

                    <div className="mt-auto mb-auto flex flex-col items-center gap-4 sm:gap-10 w-full">
                      <div className={`text-2xl sm:text-5xl font-black ${currentPlayer?.color.replace('bg-', 'text-')} leading-tight text-center truncate w-full drop-shadow-md`}>
                        {currentPlayer?.name}
                      </div>
                      
                      <div className="flex items-center justify-center gap-6 sm:gap-16">
                         {phase === GamePhase.ROLL_RESULT && !currentPlayer.isAi && currentCharacter?.abilityType === 'REROLL' && currentPlayer.abilityCharges > 0 && (
                            <button onClick={() => useAbility('REROLL')} className="flex flex-col items-center group">
                               <div className="w-14 h-14 sm:w-24 sm:h-24 bg-blue-500 rounded-full flex items-center justify-center text-white border-4 border-black pop-shadow active:scale-95 transition-all group-hover:bg-blue-600">
                                  <Repeat size={28} className="sm:w-12 sm:h-12" />
                               </div>
                               <span className="text-[10px] sm:text-sm font-black text-gray-500 mt-2 uppercase tracking-tighter">{t.reroll}</span>
                            </button>
                         )}
                         
                         <div className="scale-100 sm:scale-150">
                            {phase === GamePhase.ROLL_RESULT ? (
                              <div className="w-24 h-24 sm:w-32 sm:h-32 bg-white rounded-[2rem] border-[6px] border-black flex items-center justify-center text-5xl sm:text-7xl font-black text-indigo-600 shadow-inner pop-shadow">
                                {diceValue}
                              </div>
                            ) : (
                              <Dice isRolling={isRolling} value={diceValue} onRoll={handleRollDice} disabled={currentPlayer?.isAi || phase !== GamePhase.WAITING_FOR_ROLL} label={t.rollDice} rollingLabel={t.rolling} />
                            )}
                         </div>

                         {phase === GamePhase.ROLL_RESULT && !currentPlayer.isAi && currentCharacter?.abilityType === 'EXTRA_STEPS' && currentPlayer.abilityCharges > 0 && (
                            <button onClick={() => useAbility('EXTRA_STEPS')} className="flex flex-col items-center group">
                               <div className="w-14 h-14 sm:w-24 sm:h-24 bg-pink-500 rounded-full flex items-center justify-center text-white border-4 border-black pop-shadow active:scale-95 transition-all group-hover:bg-pink-600">
                                  <FastForward size={28} className="sm:w-12 sm:h-12" />
                               </div>
                               <span className="text-[10px] sm:text-sm font-black text-gray-500 mt-2 uppercase tracking-tighter">{t.extraSteps}</span>
                            </button>
                         )}
                      </div>

                      {phase === GamePhase.ROLL_RESULT && !currentPlayer.isAi && (
                         <button onClick={confirmMove} className="px-10 py-4 sm:px-20 sm:py-6 bg-green-400 text-white font-black rounded-3xl border-b-8 sm:border-b-[12px] border-green-600 active:border-b-0 active:translate-y-2 transition-all flex items-center gap-4 text-xl sm:text-4xl pop-shadow-lg group">
                           <Play size={24} fill="currentColor" className="sm:w-10 sm:h-10 group-hover:scale-125 transition-transform" /> {t.move}
                         </button>
                      )}
                    </div>
                  </div>
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