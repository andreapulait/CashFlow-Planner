import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/_core/hooks/useAuth";
import { APP_TITLE } from "@/const";
import { LoginDialog } from "@/components/LoginDialog";
import { useState } from "react";
import { 
  LayoutDashboard, 
  LineChart, 
  BarChart3, 
  Settings, 
  Wallet, 
  LogOut, 
  ArrowRightLeft, 
  Network, 
  Layers, 
  CalendarDays,
  ChevronDown,
  Database,
  TrendingUp,
  Bell
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import NotificationCenter from "./NotificationCenter";

export default function Navigation() {
  const [location] = useLocation();
  const { user, isAuthenticated, loading } = useAuth();
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      window.location.href = "/";
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
    toast.success("Logout effettuato");
  };

  const isActiveRoute = (routes: string[]) => routes.includes(location);

  return (
    <nav className="border-b bg-card">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold text-foreground">{APP_TITLE}</h1>
          
          {isAuthenticated && (
            <div className="flex gap-2">
              {/* Dashboard principale */}
              <Link href="/">
                <Button
                  variant={location === "/" ? "default" : "ghost"}
                  size="sm"
                >
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
                </Button>
              </Link>

              {/* Menu Pianificazione & Analisi (unito) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isActiveRoute(["/simulazione", "/grafici", "/analytics", "/flussi", "/scenari", "/calendario"]) ? "default" : "ghost"}
                    size="sm"
                  >
                    <LineChart className="mr-2 h-4 w-4" />
                    Pianificazione & Analisi
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem asChild>
                    <Link href="/simulazione" className="flex items-center cursor-pointer w-full">
                      <LineChart className="mr-2 h-4 w-4" />
                      Simulazione
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/grafici" className="flex items-center cursor-pointer w-full">
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Grafici
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/analytics" className="flex items-center cursor-pointer w-full">
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Analytics
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/flussi" className="flex items-center cursor-pointer w-full">
                      <Network className="mr-2 h-4 w-4" />
                      Flussi
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/scenari" className="flex items-center cursor-pointer w-full">
                      <Layers className="mr-2 h-4 w-4" />
                      Scenari
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/calendario" className="flex items-center cursor-pointer w-full">
                      <CalendarDays className="mr-2 h-4 w-4" />
                      Calendario
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Menu Gestione Dati */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isActiveRoute(["/apporti", "/reinvestimenti"]) ? "default" : "ghost"}
                    size="sm"
                  >
                    <Database className="mr-2 h-4 w-4" />
                    Gestione
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem asChild>
                    <Link href="/apporti" className="flex items-center cursor-pointer w-full">
                      <Wallet className="mr-2 h-4 w-4" />
                      Affluenti
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/reinvestimenti" className="flex items-center cursor-pointer w-full">
                      <ArrowRightLeft className="mr-2 h-4 w-4" />
                      Reinvestimenti
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Alert */}
              <Link href="/alert">
                <Button
                  variant={location === "/alert" ? "default" : "ghost"}
                  size="sm"
                >
                  <Bell className="mr-2 h-4 w-4" />
                  Alert
                </Button>
              </Link>

              {/* Impostazioni */}
              <Link href="/impostazioni">
                <Button
                  variant={location === "/impostazioni" ? "default" : "ghost"}
                  size="sm"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Impostazioni
                </Button>
              </Link>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          {loading ? (
            <div className="text-sm text-muted-foreground">Caricamento...</div>
          ) : isAuthenticated && user ? (
            <div className="flex items-center gap-4">
              <NotificationCenter />
              <span className="text-sm text-muted-foreground">
                Ciao, {user.name || user.email}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </div>
          ) : (
            <>
              <Button size="sm" onClick={() => setShowLoginDialog(true)}>
                Accedi
              </Button>
              <LoginDialog open={showLoginDialog} onOpenChange={setShowLoginDialog} />
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
