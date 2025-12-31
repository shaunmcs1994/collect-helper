import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Order } from '@/types/order';
import { useOrders } from '@/context/OrderContext';
import { X, Upload, Loader2, Cake, ImageIcon } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface OrderDetailModalProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OrderDetailModal({ order, open, onOpenChange }: OrderDetailModalProps) {
  const { updateOrderDetails, uploadCakeImage, deleteCakeImage } = useOrders();
  const [isCustomCake, setIsCustomCake] = useState(false);
  const [customNotes, setCustomNotes] = useState('');
  const [customImages, setCustomImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state when order changes
  useEffect(() => {
    if (order) {
      setIsCustomCake(order.isCustomCake || false);
      setCustomNotes(order.customNotes || '');
      setCustomImages(order.customImages || []);
    }
  }, [order]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    const newImages: string[] = [];

    for (const file of Array.from(files)) {
      const url = await uploadCakeImage(file);
      if (url) {
        newImages.push(url);
      }
    }

    setCustomImages(prev => [...prev, ...newImages]);
    setIsUploading(false);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = async (imageUrl: string) => {
    await deleteCakeImage(imageUrl);
    setCustomImages(prev => prev.filter(url => url !== imageUrl));
  };

  const handleSave = async () => {
    if (!order) return;

    setIsSaving(true);
    await updateOrderDetails(order.id, {
      isCustomCake,
      customNotes: customNotes || undefined,
      customImages,
    });
    setIsSaving(false);
    onOpenChange(false);
  };

  if (!order) return null;

  const formatDate = (dateStr: string) => {
    try {
      return format(parseISO(dateStr), 'EEEE, d MMMM yyyy');
    } catch {
      return dateStr;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>Order #{order.orderNumber}</span>
            {isCustomCake && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-medium">
                <Cake className="h-3 w-3" />
                Custom Cake
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Info Summary */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Customer</p>
              <p className="font-medium">{order.collectionName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Collection Date</p>
              <p className="font-medium">{formatDate(order.collectionDate)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Location</p>
              <p className="font-medium">{order.collectionLocation}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Products</p>
              <p className="font-medium">{order.products.map(p => `${p.quantity}x ${p.name}`).join(', ')}</p>
            </div>
          </div>

          {/* Custom Cake Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="custom-cake" className="text-base font-medium">Custom Cake Order</Label>
              <p className="text-sm text-muted-foreground">
                Mark as custom cake to add detailed notes and photos. Will print on a full page.
              </p>
            </div>
            <Switch
              id="custom-cake"
              checked={isCustomCake}
              onCheckedChange={setIsCustomCake}
            />
          </div>

          {/* Custom Details Section - Only show when custom cake is enabled */}
          {isCustomCake && (
            <>
              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="custom-notes" className="text-base font-medium">
                  Custom Cake Notes
                </Label>
                <Textarea
                  id="custom-notes"
                  placeholder="Paste email instructions, design details, special requirements..."
                  value={customNotes}
                  onChange={(e) => setCustomNotes(e.target.value)}
                  rows={6}
                  className="resize-none"
                />
              </div>

              {/* Image Upload */}
              <div className="space-y-3">
                <Label className="text-base font-medium">Reference Images</Label>
                
                {/* Upload Area */}
                <div
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Uploading...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Click to upload images</p>
                      <p className="text-xs text-muted-foreground">or drag and drop</p>
                    </div>
                  )}
                </div>

                {/* Image Previews */}
                {customImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {customImages.map((url, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={url}
                          alt={`Reference ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => handleRemoveImage(url)}
                          className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
