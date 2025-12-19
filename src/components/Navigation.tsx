import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  Search, 
  Clock, 
  CheckCircle, 
  BarChart3, 
  Upload, 
  Shield,
  Printer,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';
import { useOrders } from '@/context/OrderContext';
import { Button } from '@/components/ui/button';

const navItems = [
  { path: '/', label: 'Order Lookup', icon: Search },
  { path: '/pending', label: 'Pending', icon: Clock },
  { path: '/collected', label: 'Collected', icon: CheckCircle },
  { path: '/stock', label: 'Stock', icon: BarChart3 },
  { path: '/upload', label: 'Upload', icon: Upload },
  { path: '/backup', label: 'Backup', icon: Shield },
  { path: '/print', label: 'Print', icon: Printer },
];

export function Navigation() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { getRemainingCount, orders } = useOrders();
  const remaining = getRemainingCount();

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-sidebar border-r border-sidebar-border h-screen sticky top-0 no-print">
        <div className="p-5 border-b border-sidebar-border">
          <h1 className="text-2xl font-bold text-sidebar-foreground">🐝 Buzzy Bee</h1>
          <p className="text-sm text-muted-foreground mt-1">Christmas Collections</p>
        </div>

        {/* Countdown */}
        {orders.length > 0 && (
          <div className="p-4 m-4 countdown-indicator">
            <p className="text-sm font-medium text-muted-foreground">Orders Remaining</p>
            <p className="text-4xl font-bold text-primary">{remaining}</p>
          </div>
        )}

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'nav-item',
                  isActive && 'nav-item-active'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-lg">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border">
          <p className="text-xs text-muted-foreground text-center">
            {orders.length} total orders loaded
          </p>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="lg:hidden sticky top-0 z-50 bg-background border-b border-border no-print">
        <div className="flex items-center justify-between p-4">
          <div>
            <h1 className="text-xl font-bold">🐝 Buzzy Bee</h1>
            {orders.length > 0 && (
              <p className="text-sm text-primary font-medium">{remaining} remaining</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="h-12 w-12"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <nav className="absolute top-full left-0 right-0 bg-background border-b border-border shadow-lg">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-6 py-4 border-b border-border/50 text-lg',
                    isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'
                  )}
                >
                  <Icon className="w-6 h-6" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        )}
      </header>
    </>
  );
}
