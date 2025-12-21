// Product color and emoji mapping system to prevent confusion between similar products

// Large emoji palette for unique per-product assignment
const EMOJI_PALETTE = [
  '🍰', '🧁', '🍪', '🎂', '🍩', '🥐', '🥮', '🍮', '🥧', '🧇',
  '🌟', '💫', '⭐', '✨', '🌙', '☀️', '🌈', '🔥', '💎', '🎀',
  '🍓', '🍒', '🍑', '🥭', '🍋', '🍊', '🍎', '🍏', '🍇', '🫐',
  '🌺', '🌸', '🌹', '🌷', '🌻', '💐', '🪻', '🌼', '🪷', '🌿',
  '🦋', '🐝', '🐞', '🦄', '🐣', '🦊', '🐰', '🦢', '🕊️', '🦩',
  '💝', '💖', '💗', '💜', '💙', '💚', '🧡', '❤️', '🤍', '🖤',
  '🎄', '🎁', '🎅', '⛄', '❄️', '🦌', '🔔', '🕯️', '🌲', '🎿',
  '🍫', '🍬', '🍭', '🍡', '🥜', '🌰', '🍿', '🧈', '🥛', '☕',
];

// Color palette for auto-assignment (distinct, high-contrast colors)
const COLOR_PALETTE = [
  'bg-rose-100 border-rose-400',
  'bg-sky-100 border-sky-400',
  'bg-emerald-100 border-emerald-400',
  'bg-violet-100 border-violet-400',
  'bg-orange-100 border-orange-400',
  'bg-teal-100 border-teal-400',
  'bg-pink-100 border-pink-400',
  'bg-lime-100 border-lime-400',
  'bg-cyan-100 border-cyan-400',
  'bg-fuchsia-100 border-fuchsia-400',
  'bg-yellow-100 border-yellow-400',
  'bg-indigo-100 border-indigo-400',
  'bg-red-100 border-red-400',
  'bg-green-100 border-green-400',
  'bg-blue-100 border-blue-400',
  'bg-amber-100 border-amber-400',
  'bg-stone-100 border-stone-400',
  'bg-purple-100 border-purple-400',
];

// Simple hash function for deterministic assignment
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export interface ProductStyle {
  colorClass: string;
  emoji: string;
  isConfusable: boolean;
}

// Get consistent color and emoji for a product
// Custom emojis take priority, then fall back to hash-based assignment
export function getProductStyle(productName: string, customEmojis?: Record<string, string>): ProductStyle {
  const hash = hashString(productName);
  
  // Get color from palette
  const colorIndex = hash % COLOR_PALETTE.length;
  const colorClass = COLOR_PALETTE[colorIndex];
  
  // Check for custom emoji first
  if (customEmojis && customEmojis[productName]) {
    return {
      colorClass,
      emoji: customEmojis[productName],
      isConfusable: false,
    };
  }
  
  // Fall back to hash-based emoji (unique per product)
  const emojiIndex = hash % EMOJI_PALETTE.length;
  const emoji = EMOJI_PALETTE[emojiIndex];
  
  return {
    colorClass,
    emoji,
    isConfusable: false,
  };
}

// Check if two products might be confusable based on similar names
export function areProductsConfusable(name1: string, name2: string): boolean {
  const n1 = name1.toLowerCase();
  const n2 = name2.toLowerCase();
  
  // Check for common confusable pairs
  const confusablePairs = [
    ['blondie', 'brownie'],
  ];
  
  for (const [a, b] of confusablePairs) {
    if ((n1.includes(a) && n2.includes(b)) || (n1.includes(b) && n2.includes(a))) {
      return true;
    }
  }
  
  return false;
}

// Get warning message for confusable products
export function getConfusableWarning(productName: string): string | null {
  const normalized = productName.toLowerCase();
  
  if (normalized.includes('blondie')) {
    return '⚠️ Similar to BROWNIE - check carefully!';
  }
  if (normalized.includes('brownie')) {
    return '⚠️ Similar to BLONDIE - check carefully!';
  }
  
  return null;
}

// Get list of common food/dessert emojis for the picker
export function getEmojiPickerOptions(): string[] {
  return EMOJI_PALETTE;
}
