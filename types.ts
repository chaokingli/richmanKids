export enum TileType {
  START = 'START',
  PROPERTY = 'PROPERTY',
  CHANCE = 'CHANCE',
  JAIL = 'JAIL',
  PARK = 'PARK',
  BANK = 'BANK'
}

export enum PlayerId {
  P1 = 'p1',
  P2 = 'p2', 
  P3 = 'p3', 
  P4 = 'p4'  
}

export type Language = 'de' | 'en' | 'zh' | 'ja';

export type AbilityType = 'REROLL' | 'EXTRA_STEPS' | 'RENT_SHIELD' | 'START_BONUS';

export interface Character {
  id: string;
  name: string;
  avatar: string;
  color: string;
  description: string;
  abilityName: string;
  abilityDescription: string;
  abilityType: AbilityType;
  maxCharges: number;
}

export interface Tile {
  id: number;
  type: TileType;
  name: string;
  price?: number;
  rent?: number;
  owner?: PlayerId | null;
  level?: number;
  color: string;
  icon?: string;
}

export interface Player {
  id: PlayerId;
  name: string;
  characterId: string;
  avatar: string;
  color: string;
  money: number;
  position: number;
  isAi: boolean;
  isJailed: boolean;
  properties: number[];
  abilityCharges: number;
}

export interface LogEntry {
  id: string;
  text: string;
  type: 'info' | 'success' | 'danger' | 'event';
}

export enum GamePhase {
  SETUP = 'SETUP',
  CHARACTER_SELECTION = 'CHARACTER_SELECTION',
  WAITING_FOR_ROOM = 'WAITING_FOR_ROOM', // New state for multiplayer lobby
  WAITING_FOR_ROLL = 'WAITING_FOR_ROLL',
  ROLLING = 'ROLLING',
  ROLL_RESULT = 'ROLL_RESULT',
  MOVING = 'MOVING',
  TILE_ACTION = 'TILE_ACTION', 
  EVENT_PROCESSING = 'EVENT_PROCESSING',
  GAME_OVER = 'GAME_OVER'
}

export interface RoomConfig {
  code: string;
  password?: string;
  isHost: boolean;
}