import { useState } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getEmojiPickerOptions, PRESET_COLORS } from '@/utils/productColors';
import { Edit2, Palette, Smile } from 'lucide-react';

interface EmojiPickerProps {
  currentEmoji: string;
  currentColor?: { bg: string; border: string };
  onSelectEmoji: (emoji: string) => void;
  onSelectColor: (color: { bg: string; border: string }) => void;
  productName: string;
}

export function EmojiPicker({ 
  currentEmoji, 
  currentColor,
  onSelectEmoji, 
  onSelectColor,
  productName 
}: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [customColor, setCustomColor] = useState(currentColor?.bg || '#fce7f3');
  const [customBorder, setCustomBorder] = useState(currentColor?.border || '#f472b6');
  const emojis = getEmojiPickerOptions();

  const handleSelectEmoji = (emoji: string) => {
    onSelectEmoji(emoji);
    setOpen(false);
  };

  const handleSelectPresetColor = (preset: { name: string; value: string; border: string }) => {
    onSelectColor({ bg: preset.value, border: preset.border });
    setOpen(false);
  };

  const handleApplyCustomColor = () => {
    onSelectColor({ bg: customColor, border: customBorder });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-10 p-0 text-2xl hover:bg-primary/10"
          title={`Customize ${productName}`}
        >
          {currentEmoji}
          <span className="sr-only">Customize</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3 bg-popover" align="start">
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b">
            <Edit2 className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-medium truncate">
              Customize <span className="text-primary">{productName}</span>
            </p>
          </div>
          
          <Tabs defaultValue="emoji" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="emoji" className="flex items-center gap-1">
                <Smile className="w-4 h-4" />
                Emoji
              </TabsTrigger>
              <TabsTrigger value="color" className="flex items-center gap-1">
                <Palette className="w-4 h-4" />
                Color
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="emoji" className="mt-3">
              <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto">
                {emojis.map((emoji, index) => (
                  <button
                    key={index}
                    onClick={() => handleSelectEmoji(emoji)}
                    className={`p-2 text-xl rounded hover:bg-accent transition-colors ${
                      emoji === currentEmoji ? 'bg-primary/20 ring-2 ring-primary' : ''
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="color" className="mt-3 space-y-4">
              {/* Preset Colors */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Preset Colors</p>
                <div className="grid grid-cols-6 gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => handleSelectPresetColor(color)}
                      className="w-8 h-8 rounded-lg border-2 hover:scale-110 transition-transform"
                      style={{
                        backgroundColor: color.value, 
                        borderColor: color.border 
                      }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>
              
              {/* Custom Color Picker */}
              <div className="space-y-3 pt-3 border-t">
                <p className="text-xs font-medium text-muted-foreground">Custom Color</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 space-y-2">
                    <label className="text-xs text-muted-foreground">Background</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customColor}
                        onChange={(e) => setCustomColor(e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer border-0"
                      />
                      <input
                        type="text"
                        value={customColor}
                        onChange={(e) => setCustomColor(e.target.value)}
                        className="flex-1 px-2 py-1 text-xs bg-secondary rounded border"
                        placeholder="#ffffff"
                      />
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="text-xs text-muted-foreground">Border</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={customBorder}
                        onChange={(e) => setCustomBorder(e.target.value)}
                        className="w-10 h-10 rounded cursor-pointer border-0"
                      />
                      <input
                        type="text"
                        value={customBorder}
                        onChange={(e) => setCustomBorder(e.target.value)}
                        className="flex-1 px-2 py-1 text-xs bg-secondary rounded border"
                        placeholder="#000000"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Preview */}
                <div 
                  className="p-3 rounded-lg border-2 flex items-center gap-2"
                  style={{ backgroundColor: customColor, borderColor: customBorder }}
                >
                  <span className="text-2xl">{currentEmoji}</span>
                  <span className="font-medium">Preview</span>
                </div>
                
                <Button onClick={handleApplyCustomColor} className="w-full" size="sm">
                  Apply Custom Color
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </PopoverContent>
    </Popover>
  );
}
