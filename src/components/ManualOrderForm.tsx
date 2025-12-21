import { useState, useMemo } from 'react';
import { useOrders } from '@/context/OrderContext';
import { Order } from '@/types/order';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Plus, Trash2, UserPlus, Package, Check, ChevronsUpDown } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { getProductStyle } from '@/utils/productColors';
import { cn } from '@/lib/utils';

interface ProductEntry {
  id: string;
  name: string;
  quantity: number;
}

export function ManualOrderForm() {
  const { addOrder, getLocations, orders, productEmojis } = useOrders();
  const existingLocations = getLocations();

  // Get unique product names from existing orders
  const existingProducts = useMemo(() => {
    const productSet = new Set<string>();
    orders.forEach(order => {
      order.products.forEach(product => {
        productSet.add(product.name);
      });
    });
    return Array.from(productSet).sort();
  }, [orders]);

  // Generate next staff order number
  const generateOrderNumber = () => {
    const staffOrders = orders.filter(o => o.orderNumber.startsWith('STAFF-'));
    const maxNum = staffOrders.reduce((max, o) => {
      const num = parseInt(o.orderNumber.replace('STAFF-', ''), 10);
      return isNaN(num) ? max : Math.max(max, num);
    }, 0);
    return `STAFF-${String(maxNum + 1).padStart(3, '0')}`;
  };

  const [orderNumber, setOrderNumber] = useState(generateOrderNumber());
  const [collectionName, setCollectionName] = useState('');
  const [alternativeName, setAlternativeName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [collectionDate, setCollectionDate] = useState<'23' | '24'>('23');
  const [collectionLocation, setCollectionLocation] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [products, setProducts] = useState<ProductEntry[]>([
    { id: crypto.randomUUID(), name: '', quantity: 1 }
  ]);
  const [openComboboxId, setOpenComboboxId] = useState<string | null>(null);

  const addProductEntry = () => {
    setProducts(prev => [...prev, { id: crypto.randomUUID(), name: '', quantity: 1 }]);
  };

  const removeProductEntry = (id: string) => {
    if (products.length > 1) {
      setProducts(prev => prev.filter(p => p.id !== id));
    }
  };

  const updateProduct = (id: string, field: 'name' | 'quantity', value: string | number) => {
    setProducts(prev => prev.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const resetForm = () => {
    setOrderNumber(generateOrderNumber());
    setCollectionName('');
    setAlternativeName('');
    setPhoneNumber('');
    setCollectionDate('23');
    setCollectionLocation('');
    setCustomLocation('');
    setProducts([{ id: crypto.randomUUID(), name: '', quantity: 1 }]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!collectionName.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter the customer name.",
        variant: "destructive",
      });
      return;
    }

    const finalLocation = collectionLocation === 'custom' ? customLocation : collectionLocation;
    if (!finalLocation.trim()) {
      toast({
        title: "Missing information",
        description: "Please select or enter a collection location.",
        variant: "destructive",
      });
      return;
    }

    const validProducts = products.filter(p => p.name.trim() && p.quantity > 0);
    if (validProducts.length === 0) {
      toast({
        title: "Missing information",
        description: "Please add at least one product.",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicate order number
    if (orders.some(o => o.orderNumber === orderNumber)) {
      toast({
        title: "Duplicate order number",
        description: "This order number already exists. A new one has been generated.",
        variant: "destructive",
      });
      setOrderNumber(generateOrderNumber());
      return;
    }

    const newOrder: Order = {
      id: crypto.randomUUID(),
      orderNumber: orderNumber.trim(),
      collectionName: collectionName.trim(),
      alternativeName: alternativeName.trim() || undefined,
      phoneNumber: phoneNumber.trim() || undefined,
      collectionDate,
      collectionLocation: finalLocation.trim(),
      products: validProducts.map(p => ({
        name: p.name.trim(),
        quantity: p.quantity,
      })),
      status: 'pending',
    };

    addOrder(newOrder);
    
    toast({
      title: "Order added",
      description: `Order ${orderNumber} has been added successfully.`,
    });

    resetForm();
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <UserPlus className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-bold">Add Staff/Manual Order</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Order Number */}
        <div className="space-y-2">
          <Label htmlFor="orderNumber" className="text-base">Order Number</Label>
          <Input
            id="orderNumber"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="STAFF-001"
            className="text-lg py-6"
          />
          <p className="text-sm text-muted-foreground">Auto-generated for staff orders</p>
        </div>

        {/* Customer Name */}
        <div className="space-y-2">
          <Label htmlFor="collectionName" className="text-base">Customer Name *</Label>
          <Input
            id="collectionName"
            value={collectionName}
            onChange={(e) => setCollectionName(e.target.value)}
            placeholder="John Smith"
            className="text-lg py-6"
            required
          />
        </div>

        {/* Alternative Name */}
        <div className="space-y-2">
          <Label htmlFor="alternativeName" className="text-base">Alternative Name (optional)</Label>
          <Input
            id="alternativeName"
            value={alternativeName}
            onChange={(e) => setAlternativeName(e.target.value)}
            placeholder="Different name for collection"
            className="text-lg py-6"
          />
        </div>

        {/* Phone Number */}
        <div className="space-y-2">
          <Label htmlFor="phoneNumber" className="text-base">Phone Number (optional)</Label>
          <Input
            id="phoneNumber"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="07123 456789"
            className="text-lg py-6"
            type="tel"
          />
        </div>

        {/* Collection Date & Location Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-base">Collection Date *</Label>
            <Select value={collectionDate} onValueChange={(v) => setCollectionDate(v as '23' | '24')}>
              <SelectTrigger className="text-lg py-6">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="23" className="text-lg">23rd December</SelectItem>
                <SelectItem value="24" className="text-lg">24th December</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-base">Collection Location *</Label>
            <Select value={collectionLocation} onValueChange={setCollectionLocation}>
              <SelectTrigger className="text-lg py-6">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {existingLocations.map(loc => (
                  <SelectItem key={loc} value={loc} className="text-lg">{loc}</SelectItem>
                ))}
                <SelectItem value="custom" className="text-lg text-primary">+ Add custom location</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Custom Location Input */}
        {collectionLocation === 'custom' && (
          <div className="space-y-2">
            <Label htmlFor="customLocation" className="text-base">Custom Location</Label>
            <Input
              id="customLocation"
              value={customLocation}
              onChange={(e) => setCustomLocation(e.target.value)}
              placeholder="Enter location name"
              className="text-lg py-6"
            />
          </div>
        )}

        {/* Products Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-base flex items-center gap-2">
              <Package className="w-5 h-5" />
              Products *
            </Label>
            <Button 
              type="button" 
              variant="outline" 
              size="sm"
              onClick={addProductEntry}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Product
            </Button>
          </div>

          <div className="space-y-3">
            {existingProducts.length === 0 ? (
              <p className="text-muted-foreground p-4 bg-secondary/50 rounded-lg text-center">
                No products available. Please upload a CSV with orders first to populate the product list.
              </p>
            ) : (
              products.map((product) => {
                const style = product.name ? getProductStyle(product.name, productEmojis) : null;
                
                return (
                  <div key={product.id} className="flex gap-3 items-start">
                    <div className="flex-1">
                      <Popover 
                        open={openComboboxId === product.id} 
                        onOpenChange={(open) => setOpenComboboxId(open ? product.id : null)}
                      >
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openComboboxId === product.id}
                            className="w-full justify-between text-lg py-6 h-auto"
                          >
                            {product.name ? (
                              <span className="flex items-center gap-2">
                                <span>{style?.emoji}</span>
                                <span>{product.name}</span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">Type to search products...</span>
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0 bg-popover" align="start">
                          <Command>
                            <CommandInput placeholder="Search products..." className="text-lg" />
                            <CommandList>
                              <CommandEmpty>No product found.</CommandEmpty>
                              <CommandGroup className="max-h-64 overflow-auto">
                                {existingProducts.map((productName) => {
                                  const prodStyle = getProductStyle(productName, productEmojis);
                                  return (
                                    <CommandItem
                                      key={productName}
                                      value={productName}
                                      onSelect={() => {
                                        updateProduct(product.id, 'name', productName);
                                        setOpenComboboxId(null);
                                      }}
                                      className="text-base py-3"
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          product.name === productName ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <span className="mr-2 text-xl">{prodStyle.emoji}</span>
                                      {productName}
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="w-24">
                      <Input
                        type="number"
                        min="1"
                        value={product.quantity}
                        onChange={(e) => updateProduct(product.id, 'quantity', parseInt(e.target.value) || 1)}
                        className="text-lg py-6 text-center"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-12 w-12 text-muted-foreground hover:text-destructive"
                      onClick={() => removeProductEntry(product.id)}
                      disabled={products.length === 1}
                    >
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-4 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={resetForm}
            className="text-lg py-6 flex-1"
          >
            Clear Form
          </Button>
          <Button
            type="submit"
            className="btn-collect text-lg py-6 flex-1"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Order
          </Button>
        </div>
      </form>
    </Card>
  );
}
