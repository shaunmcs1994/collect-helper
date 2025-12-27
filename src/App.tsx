import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { OrderProvider } from "@/context/OrderContext";
import { Navigation } from "@/components/Navigation";
import Index from "./pages/Index";
import PendingOrders from "./pages/PendingOrders";
import CollectedOrders from "./pages/CollectedOrders";
import StockPage from "./pages/StockPage";
import UploadPage from "./pages/UploadPage";
import BackupPage from "./pages/BackupPage";
import PrintPage from "./pages/PrintPage";
import CalendarPage from "./pages/CalendarPage";
import CakePrintPage from "./pages/CakePrintPage";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

// App layout with navigation
function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      <Navigation />
      <main className="flex-1 p-4 lg:p-8 max-w-5xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
}

// Main routes component
function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Index />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/pending"
        element={
          <ProtectedRoute>
            <AppLayout>
              <PendingOrders />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/collected"
        element={
          <ProtectedRoute>
            <AppLayout>
              <CollectedOrders />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/stock"
        element={
          <ProtectedRoute>
            <AppLayout>
              <StockPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/upload"
        element={
          <ProtectedRoute>
            <AppLayout>
              <UploadPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/backup"
        element={
          <ProtectedRoute>
            <AppLayout>
              <BackupPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/print"
        element={
          <ProtectedRoute>
            <AppLayout>
              <PrintPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/calendar"
        element={
          <ProtectedRoute>
            <AppLayout>
              <CalendarPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/cake-print"
        element={
          <ProtectedRoute>
            <AppLayout>
              <CakePrintPage />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

// Main App component
const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
      <AuthProvider>
        <OrderProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppRoutes />
          </TooltipProvider>
        </OrderProvider>
      </AuthProvider>
    </BrowserRouter>
  </QueryClientProvider>
);

export default App;
