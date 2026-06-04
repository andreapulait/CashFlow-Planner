import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/_core/hooks/useAuth";
import { APP_TITLE } from "@/const";
import { LoginDialog } from "@/components/LoginDialog";
import { useState } from "react";
import {
  LayoutDashboard,
  LineChart,
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
  Bell,
  Menu,
  BellRing,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import NotificationCenter from "./NotificationCenter";

// ─── Struttura menu ───────────────────────────────────────────────────────────

const ANALISI_ITEMS = [
  { href: "/simulazione", icon: LineChart,    label: "Simulazione" },
  { href: "/analytics",   icon: TrendingUp,   label: "Analytics" },
  { href: "/flussi",      icon: Network,      label: "Flussi" },
  // { href: "/scenari", icon: Layers, label: "Scenari" }, // nascosto — da reimplementare come sandbox what-if
  { href: "/calendario",  icon: CalendarDays, label: "Calendario" },
];

const GESTIONE_ITEMS = [
  { href: "/fiumi",        icon: LayoutDashboard, label: "Fiumi" },
  { href: "/apporti",      icon: Wallet,          label: "Affluenti" },
  { href: "/reinvestimenti", icon: ArrowRightLeft, label: "Reinvestimenti" },
  { href: "/alert",        icon: BellRing,        label: "Regole Alert" },
];

// ─── Componente ──────────────────────────────────────────────────────────────

export default function Navigation() {
  const [location] = useLocation();
  const { user, isAuthenticated, loading } = useAuth();
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => { window.location.href = "/"; },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
    toast.success("Logout effettuato");
  };

  const isActive = (routes: string[]) => routes.includes(location);

  // Link riutilizzabile per entrambi desktop e mobile
  const NavLink = ({ href, icon: Icon, label, onClick }: {
    href: string; icon: any; label: string; onClick?: () => void;
  }) => (
    <Link href={href} onClick={onClick}>
      <div className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer transition-colors
        ${location === href
          ? "bg-primary text-primary-foreground"
          : "hover:bg-accent text-foreground"
        }`}>
        <Icon className="h-4 w-4 shrink-0" />
        {label}
      </div>
    </Link>
  );

  return (
    <nav className="border-b bg-card sticky top-0 z-50">
      <div className="container flex h-14 items-center justify-between gap-4">

        {/* Logo */}
        <Link href="/">
          <span className="text-base font-bold text-foreground whitespace-nowrap cursor-pointer">
            {APP_TITLE}
          </span>
        </Link>

        {isAuthenticated && (
          <>
            {/* ── Desktop nav (md+) ─────────────────────── */}
            <div className="hidden lg:flex items-center gap-1 flex-1">

              {/* Dashboard */}
              <Link href="/">
                <Button variant={location === "/" ? "default" : "ghost"} size="sm">
                  <LayoutDashboard className="mr-1.5 h-4 w-4" />
                  Dashboard
                </Button>
              </Link>

              {/* Analisi */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isActive(ANALISI_ITEMS.map(i => i.href)) ? "default" : "ghost"}
                    size="sm"
                  >
                    <LineChart className="mr-1.5 h-4 w-4" />
                    Analisi
                    <ChevronDown className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {ANALISI_ITEMS.map(({ href, icon: Icon, label }) => (
                    <DropdownMenuItem key={href} asChild>
                      <Link href={href} className="flex items-center cursor-pointer w-full">
                        <Icon className="mr-2 h-4 w-4" />
                        {label}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Gestione */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isActive(GESTIONE_ITEMS.map(i => i.href).filter(h => h !== "/")) ? "default" : "ghost"}
                    size="sm"
                  >
                    <Database className="mr-1.5 h-4 w-4" />
                    Gestione
                    <ChevronDown className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {GESTIONE_ITEMS.map(({ href, icon: Icon, label }, i) => (
                    <>
                      {i === 3 && <DropdownMenuSeparator key="sep" />}
                      <DropdownMenuItem key={href} asChild>
                        <Link href={href} className="flex items-center cursor-pointer w-full">
                          <Icon className="mr-2 h-4 w-4" />
                          {label}
                        </Link>
                      </DropdownMenuItem>
                    </>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Impostazioni */}
              <Link href="/impostazioni">
                <Button variant={location === "/impostazioni" ? "default" : "ghost"} size="sm">
                  <Settings className="mr-1.5 h-4 w-4" />
                  Impostazioni
                </Button>
              </Link>
            </div>

            {/* ── Destra: notifiche + utente + hamburger ─ */}
            <div className="flex items-center gap-2 shrink-0">
              <NotificationCenter />

              {/* Utente + logout — solo desktop */}
              <span className="hidden lg:inline text-sm text-muted-foreground">
                {user?.name || user?.email}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                className="hidden lg:flex"
              >
                <LogOut className="mr-1.5 h-4 w-4" />
                Logout
              </Button>

              {/* Hamburger — solo mobile */}
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-72 overflow-y-auto">
                  <SheetHeader className="mb-4">
                    <SheetTitle className="text-left">{APP_TITLE}</SheetTitle>
                    {user && (
                      <p className="text-sm text-muted-foreground text-left">
                        {user.name || user.email}
                      </p>
                    )}
                  </SheetHeader>

                  <div className="space-y-1">
                    <NavLink href="/" icon={LayoutDashboard} label="Dashboard" onClick={() => setMobileOpen(false)} />

                    <p className="px-3 pt-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Analisi
                    </p>
                    {ANALISI_ITEMS.map(item => (
                      <NavLink key={item.href} {...item} onClick={() => setMobileOpen(false)} />
                    ))}

                    <p className="px-3 pt-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Gestione
                    </p>
                    {GESTIONE_ITEMS.map(item => (
                      <NavLink key={item.href} {...item} onClick={() => setMobileOpen(false)} />
                    ))}

                    <p className="px-3 pt-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Altro
                    </p>
                    <NavLink href="/impostazioni" icon={Settings} label="Impostazioni" onClick={() => setMobileOpen(false)} />

                    <div className="pt-4 border-t mt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => { setMobileOpen(false); handleLogout(); }}
                        disabled={logoutMutation.isPending}
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </>
        )}

        {/* Non autenticato */}
        {!isAuthenticated && !loading && (
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setShowLoginDialog(true)}>
              Accedi
            </Button>
            <LoginDialog open={showLoginDialog} onOpenChange={setShowLoginDialog} />
          </div>
        )}
      </div>
    </nav>
  );
}
