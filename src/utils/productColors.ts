// Product color and emoji mapping system to prevent confusion between similar products

// Large emoji palette for unique per-product assignment
const EMOJI_PALETTE = [
  // Food & Desserts
  '🍰', '🧁', '🍪', '🎂', '🍩', '🥐', '🥮', '🍮', '🥧', '🧇',
  '🍫', '🍬', '🍭', '🍡', '🥜', '🌰', '🍿', '🧈', '🥛', '☕',
  '🧀', '🥚', '🍳', '🥞', '🧇', '🥯', '🥨', '🥖', '🍞', '🥪',
  '🌮', '🌯', '🥙', '🧆', '🥘', '🍲', '🥗', '🍝', '🍜', '🍛',
  // Fruits
  '🍓', '🍒', '🍑', '🥭', '🍋', '🍊', '🍎', '🍏', '🍇', '🫐',
  '🍈', '🍉', '🍌', '🍍', '🥝', '🥥', '🍐', '🫒', '🥑', '🍆',
  // Flowers & Nature
  '🌺', '🌸', '🌹', '🌷', '🌻', '💐', '🪻', '🌼', '🪷', '🌿',
  '🍀', '🌱', '🌳', '🌴', '🌵', '🎋', '🎍', '🍃', '🍂', '🍁',
  // Animals
  '🦋', '🐝', '🐞', '🦄', '🐣', '🦊', '🐰', '🦢', '🕊️', '🦩',
  '🐶', '🐱', '🐭', '🐹', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮',
  '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🦆', '🦅', '🦉', '🦇',
  // Hearts & Symbols
  '💝', '💖', '💗', '💜', '💙', '💚', '🧡', '❤️', '🤍', '🖤',
  '💛', '🩷', '🩵', '🩶', '❤️‍🔥', '💕', '💞', '💓', '💘', '💟',
  // Stars & Celestial
  '🌟', '💫', '⭐', '✨', '🌙', '☀️', '🌈', '🔥', '💎', '🎀',
  '🌞', '🌝', '🌛', '🌜', '⚡', '💥', '🌊', '🌪️', '🌸', '🏵️',
  // Christmas & Holidays
  '🎄', '🎁', '🎅', '⛄', '❄️', '🦌', '🔔', '🕯️', '🌲', '🎿',
  '🤶', '🧝', '🎀', '🧦', '🎊', '🎉', '🎈', '🎆', '🎇', '🪅',
  // Objects & Fun
  '👑', '🏆', '🎯', '🎪', '🎨', '🎭', '🎬', '🎤', '🎧', '🎹',
  '🎸', '🥁', '🎺', '🎻', '🪘', '🪗', '🎰', '🧩', '🎲', '🃏',
  '🛒', '🧺', '🎒', '👜', '👠', '👟', '🧢', '👒', '🎩', '🪄',
  '💌', '📦', '🏷️', '🧧', '🪩', '🎮', '🕹️', '🧸', '🪆', '🪀',
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

// Preset colors for quick selection
export const PRESET_COLORS = [
  { name: 'Rose', value: '#ffe4e6', border: '#fb7185' },
  { name: 'Pink', value: '#fce7f3', border: '#f472b6' },
  { name: 'Fuchsia', value: '#fae8ff', border: '#e879f9' },
  { name: 'Purple', value: '#f3e8ff', border: '#c084fc' },
  { name: 'Violet', value: '#ede9fe', border: '#a78bfa' },
  { name: 'Indigo', value: '#e0e7ff', border: '#818cf8' },
  { name: 'Blue', value: '#dbeafe', border: '#60a5fa' },
  { name: 'Sky', value: '#e0f2fe', border: '#38bdf8' },
  { name: 'Cyan', value: '#cffafe', border: '#22d3ee' },
  { name: 'Teal', value: '#ccfbf1', border: '#2dd4bf' },
  { name: 'Emerald', value: '#d1fae5', border: '#34d399' },
  { name: 'Green', value: '#dcfce7', border: '#4ade80' },
  { name: 'Lime', value: '#ecfccb', border: '#a3e635' },
  { name: 'Yellow', value: '#fef9c3', border: '#facc15' },
  { name: 'Amber', value: '#fef3c7', border: '#fbbf24' },
  { name: 'Orange', value: '#ffedd5', border: '#fb923c' },
  { name: 'Red', value: '#fee2e2', border: '#f87171' },
  { name: 'Stone', value: '#f5f5f4', border: '#a8a29e' },
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
  customColor?: { bg: string; border: string };
  emoji: string;
  isConfusable: boolean;
}

export interface ProductCustomization {
  emoji?: string;
  color?: string; // JSON string of { bg, border }
}

// Get consistent color and emoji for a product
// Custom emojis and colors take priority, then fall back to hash-based assignment
export function getProductStyle(
  productName: string, 
  customEmojis?: Record<string, string>,
  customColors?: Record<string, string>
): ProductStyle {
  const hash = hashString(productName);
  
  // Check for custom color first
  let colorClass = '';
  let customColor: { bg: string; border: string } | undefined;
  
  if (customColors && customColors[productName]) {
    try {
      customColor = JSON.parse(customColors[productName]);
      colorClass = ''; // Will use inline styles instead
    } catch {
      const colorIndex = hash % COLOR_PALETTE.length;
      colorClass = COLOR_PALETTE[colorIndex];
    }
  } else {
    const colorIndex = hash % COLOR_PALETTE.length;
    colorClass = COLOR_PALETTE[colorIndex];
  }
  
  // Check for custom emoji first
  if (customEmojis && customEmojis[productName]) {
    return {
      colorClass,
      customColor,
      emoji: customEmojis[productName],
      isConfusable: false,
    };
  }
  
  // Fall back to hash-based emoji (unique per product)
  const emojiIndex = hash % EMOJI_PALETTE.length;
  const emoji = EMOJI_PALETTE[emojiIndex];
  
  return {
    colorClass,
    customColor,
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
