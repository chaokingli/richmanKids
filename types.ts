export enum TileType {
  START = 'START',
  PROPERTY = 'PROPERTY',
  CHANCE = 'CHANCE',
  JAIL = 'JAIL',
  PARK = 'PARK',
  BANK = 'BANK' // Gives bonus
}

export enum PlayerId {
  P1 = 'p1',
  P2 = 'p2', // AI
  P3 = 'p3', // Optional AI
  P4 = 'p4'  // Optional AI
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
  maxCharges: number; // -1 for passive/infinite
}

export interface Tile {
  id: number;
  type: TileType;
  name: string;
  price?: number;     // For properties
  rent?: number;      // For properties
  owner?: PlayerId | null;
  level?: number;     // 0 = land, 1-3 = houses
  color: string;      // Visual grouping
  icon?: string;
}

export interface Player {
  id: PlayerId;
  name: string;
  characterId: string; // Link to Character
  avatar: string;
  color: string;
  money: number;
  position: number;
  isAi: boolean;
  isJailed: boolean;
  properties: number[]; // IDs of owned tiles
  facing?: 'left' | 'right';
  abilityCharges: number;
}

export interface LogEntry {
  id: string;
  text: string;
  type: 'info' | 'success' | 'danger' | 'event';
}

export enum GamePhase {
  CHARACTER_SELECTION = 'CHARACTER_SELECTION',
  WAITING_FOR_ROLL = 'WAITING_FOR_ROLL',
  ROLLING = 'ROLLING',
  ROLL_RESULT = 'ROLL_RESULT', // New phase to decide on abilities (Panda/Rabbit)
  MOVING = 'MOVING',
  TILE_ACTION = 'TILE_ACTION', 
  EVENT_PROCESSING = 'EVENT_PROCESSING',
  GAME_OVER = 'GAME_OVER'
}