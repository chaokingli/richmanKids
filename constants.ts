import { Tile, TileType, Player, PlayerId, Character } from './types';

export const BOARD_SIZE = 20;
export const INITIAL_MONEY = 2000;
export const PASS_START_BONUS = 500;

// Colors
export const COLORS = {
  primary: 'bg-blue-500',
  secondary: 'bg-yellow-400',
  danger: 'bg-red-500',
  success: 'bg-green-500',
  neutral: 'bg-gray-200',
  boardBg: 'bg-green-100'
};

export const CHARACTERS: Character[] = [
  {
    id: 'panda',
    name: 'Panpan',
    avatar: '🐼',
    color: 'bg-black/80 border-white text-white',
    description: 'A relaxed panda who loves bamboo.',
    abilityName: 'Lucky Dice',
    abilityDescription: 'Reroll the dice if you don\'t like the number!',
    abilityType: 'REROLL',
    maxCharges: 3
  },
  {
    id: 'rabbit',
    name: 'Bunbun',
    avatar: '🐰',
    color: 'bg-pink-400 border-pink-600 text-white',
    description: 'A bouncy rabbit with cool sneakers.',
    abilityName: 'Turbo Shoes',
    abilityDescription: 'Add +3 steps to your roll!',
    abilityType: 'EXTRA_STEPS',
    maxCharges: 3
  },
  {
    id: 'dino',
    name: 'Rex',
    avatar: '🦖',
    color: 'bg-green-500 border-green-700 text-white',
    description: 'A friendly T-Rex with a loud roar.',
    abilityName: 'Roar Shield',
    abilityDescription: 'Scare away the landlord! Block rent once.',
    abilityType: 'RENT_SHIELD',
    maxCharges: 3
  },
  {
    id: 'cat',
    name: 'Mimi',
    avatar: '🐱',
    color: 'bg-yellow-400 border-orange-500 text-white',
    description: 'A lucky cat with a golden bell.',
    abilityName: 'Rich Meow',
    abilityDescription: 'Starts the game with $500 extra cash.',
    abilityType: 'START_BONUS',
    maxCharges: -1 // Passive
  }
];

// Initial Board Layout (20 tiles loop)
export const INITIAL_BOARD: Tile[] = [
  { id: 0, type: TileType.START, name: "Start", color: "bg-red-500" },
  { id: 1, type: TileType.PROPERTY, name: "Candy Lane", price: 100, rent: 20, color: "bg-pink-300" },
  { id: 2, type: TileType.CHANCE, name: "Mystery Box", color: "bg-purple-400" },
  { id: 3, type: TileType.PROPERTY, name: "Toy Town", price: 150, rent: 30, color: "bg-pink-300" },
  { id: 4, type: TileType.PROPERTY, name: "Lego Land", price: 200, rent: 40, color: "bg-pink-300" },
  { id: 5, type: TileType.JAIL, name: "Time Out", color: "bg-gray-500" },
  { id: 6, type: TileType.PROPERTY, name: "Skate Park", price: 250, rent: 50, color: "bg-orange-300" },
  { id: 7, type: TileType.CHANCE, name: "Fortune Cookie", color: "bg-purple-400" },
  { id: 8, type: TileType.PROPERTY, name: "Pizza Hut", price: 300, rent: 60, color: "bg-orange-300" },
  { id: 9, type: TileType.BANK, name: "Bonus Piggy", color: "bg-yellow-300" }, 
  { id: 10, type: TileType.PARK, name: "Central Park", color: "bg-green-400" }, 
  { id: 11, type: TileType.PROPERTY, name: "Zoo Zone", price: 350, rent: 70, color: "bg-blue-300" },
  { id: 12, type: TileType.CHANCE, name: "Magic Hat", color: "bg-purple-400" },
  { id: 13, type: TileType.PROPERTY, name: "Aqua Park", price: 400, rent: 80, color: "bg-blue-300" },
  { id: 14, type: TileType.PROPERTY, name: "Dino World", price: 450, rent: 90, color: "bg-blue-300" },
  { id: 15, type: TileType.JAIL, name: "Bad Luck", color: "bg-gray-500" }, 
  { id: 16, type: TileType.PROPERTY, name: "Space Station", price: 500, rent: 100, color: "bg-indigo-300" },
  { id: 17, type: TileType.CHANCE, name: "Alien Signal", color: "bg-purple-400" },
  { id: 18, type: TileType.PROPERTY, name: "Robot City", price: 550, rent: 110, color: "bg-indigo-300" },
  { id: 19, type: TileType.PROPERTY, name: "Cyber Cafe", price: 600, rent: 120, color: "bg-indigo-300" },
];

// Placeholder, will be replaced by Selection Screen logic
export const INITIAL_PLAYERS: Player[] = [
  {
    id: PlayerId.P1,
    name: "Player 1",
    characterId: 'panda',
    avatar: "🐼",
    color: "bg-blue-500",
    money: INITIAL_MONEY,
    position: 0,
    isAi: false,
    isJailed: false,
    properties: [],
    abilityCharges: 3
  },
  {
    id: PlayerId.P2,
    name: "CPU",
    characterId: 'rabbit',
    avatar: "🐰",
    color: "bg-red-500",
    money: INITIAL_MONEY,
    position: 0,
    isAi: true,
    isJailed: false,
    properties: [],
    abilityCharges: 3
  }
];