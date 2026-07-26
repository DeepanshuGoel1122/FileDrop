import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ADJECTIVES = [
  "silent", "red", "blue", "green", "happy", "fast", "brave", "calm", "chill",
  "dark", "deep", "epic", "fair", "grand", "holy", "kind", "loud", "magic",
  "noble", "quick", "rare", "sweet", "tall", "vast", "wild", "wise", "bold",
  "swift", "lucky", "fuzzy", "cozy", "neon", "shiny", "crisp", "warm", "cool",
  "lazy", "busy", "pure", "bright", "soft", "quiet", "proud", "shy",
  "sharp", "dull", "fierce", "gentle", "rough", "smooth", "heavy", "light"
];

const NOUNS = [
  "moon", "tree", "river", "star", "sun", "wind", "cloud", "fire", "ice",
  "leaf", "rock", "wave", "bird", "bear", "cat", "dog", "fox", "lion",
  "wolf", "hawk", "owl", "fish", "frog", "snake", "ant", "bee", "bug",
  "tiger", "duck", "swan", "deer", "puma", "lynx", "mole", "toad", "moth",
  "plum", "pear", "peach", "grape", "mint", "pine", "fern", "moss", "sand",
  "hill", "lake", "pond", "rain", "snow", "mist", "fog", "storm", "gale"
];

export function generateRoomName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adj}-${noun}`;
}
