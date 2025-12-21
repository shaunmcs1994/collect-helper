import { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { getEmojiPickerOptions } from '@/utils/productColors';
import { Edit2 } from 'lucide-react';

interface EmojiPickerProps {
  currentEmoji: string;
  onSelect: (emoji: string) => void;
  productName: string;
}

export function EmojiPicker({ currentEmoji, onSelect, productName }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const emojis = getEmojiPickerOptions();

  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-10 p-0 text-2xl hover:bg-primary/10"
          title={`Change emoji for ${productName}`}
        >
          {currentEmoji}
          <span className="sr-only">Change emoji</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3 bg-popover" align="start">
        <div className="space-y-2">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Edit2 className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-medium truncate">
              Pick emoji for <span className="text-primary">{productName}</span>
            </p>
          </div>
          <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
            {emojis.map((emoji, index) => (
              <button
                key={index}
                onClick={() => handleSelect(emoji)}
                className={`p-2 text-xl rounded hover:bg-accent transition-colors ${
                  emoji === currentEmoji ? 'bg-primary/20 ring-2 ring-primary' : ''
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
