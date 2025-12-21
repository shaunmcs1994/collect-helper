import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { OrderProvider } from "@/context/OrderContext";
import { Navigation } from "@/components/Navigation";
import Index from "./pages/Index";
import PendingOrders from "./pages/PendingOrders";
import CollectedOrders from "./pages/CollectedOrders";
import StockPage from "./pages/StockPage";
import UploadPage from "./pages/UploadPage";
import BackupPage from "./pages/BackupPage";
import PrintPage from "./pages/PrintPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Main App component
const App = () => (
  <QueryClientProvider client={queryClient}>
    <OrderProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <div className="flex flex-col lg:flex-row min-h-screen">
            <Navigation />
            <main className="flex-1 p-4 lg:p-8 max-w-5xl mx-auto w-full">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/pending" element={<PendingOrders />} />
                <Route path="/collected" element={<CollectedOrders />} />
                <Route path="/stock" element={<StockPage />} />
                <Route path="/upload" element={<UploadPage />} />
                <Route path="/backup" element={<BackupPage />} />
                <Route path="/print" element={<PrintPage />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      </TooltipProvider>
    </OrderProvider>
  </QueryClientProvider>
);

export default App;
