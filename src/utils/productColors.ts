// Product color and emoji mapping system to prevent confusion between similar products

// Manual overrides for confusable products - use highly contrasting colors
const CONFUSABLE_OVERRIDES: Record<string, { color: string; emoji: string }> = {
  // Blondie vs Brownie - very different colors
  'blondie': { color: 'bg-amber-100 border-amber-400', emoji: '🍯' },
  'brownie': { color: 'bg-stone-200 border-stone-500', emoji: '🍫' },
};

// Color palette for auto-assignment (distinct, high-contrast colors)
const COLOR_PALETTE = [
  { color: 'bg-rose-100 border-rose-400', emoji: '🌹' },
  { color: 'bg-sky-100 border-sky-400', emoji: '💎' },
  { color: 'bg-emerald-100 border-emerald-400', emoji: '🌿' },
  { color: 'bg-violet-100 border-violet-400', emoji: '💜' },
  { color: 'bg-orange-100 border-orange-400', emoji: '🍊' },
  { color: 'bg-teal-100 border-teal-400', emoji: '🌊' },
  { color: 'bg-pink-100 border-pink-400', emoji: '🌸' },
  { color: 'bg-lime-100 border-lime-400', emoji: '🍃' },
  { color: 'bg-cyan-100 border-cyan-400', emoji: '❄️' },
  { color: 'bg-fuchsia-100 border-fuchsia-400', emoji: '🌺' },
  { color: 'bg-yellow-100 border-yellow-400', emoji: '⭐' },
  { color: 'bg-indigo-100 border-indigo-400', emoji: '🔮' },
  { color: 'bg-red-100 border-red-400', emoji: '❤️' },
  { color: 'bg-green-100 border-green-400', emoji: '🍀' },
  { color: 'bg-blue-100 border-blue-400', emoji: '💙' },
];

// Simple hash function for deterministic color assignment
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

// Check if a product name matches any confusable override
function getOverrideKey(productName: string): string | null {
  const normalized = productName.toLowerCase().trim();
  for (const key of Object.keys(CONFUSABLE_OVERRIDES)) {
    if (normalized.includes(key)) {
      return key;
    }
  }
  return null;
}

export interface ProductStyle {
  colorClass: string;
  emoji: string;
  isConfusable: boolean;
}

// Get consistent color and emoji for a product
export function getProductStyle(productName: string): ProductStyle {
  const overrideKey = getOverrideKey(productName);
  
  if (overrideKey) {
    const override = CONFUSABLE_OVERRIDES[overrideKey];
    return {
      colorClass: override.color,
      emoji: override.emoji,
      isConfusable: true,
    };
  }
  
  // Use hash to deterministically pick from palette
  const index = hashString(productName) % COLOR_PALETTE.length;
  const palette = COLOR_PALETTE[index];
  
  return {
    colorClass: palette.color,
    emoji: palette.emoji,
    isConfusable: false,
  };
}

// Check if two products are confusable with each other
export function areProductsConfusable(name1: string, name2: string): boolean {
  const key1 = getOverrideKey(name1);
  const key2 = getOverrideKey(name2);
  
  // If both are in the confusable list, they're potentially confusable
  if (key1 && key2 && key1 !== key2) {
    return true;
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
