import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import Fiumi from "./pages/Fiumi";
import Simulazione from "./pages/Simulazione";
import Grafici from "./pages/Grafici";
import Analytics from "./pages/Analytics";
import Impostazioni from "./pages/Impostazioni";
import Apporti from "@/pages/Apporti";
import Reinvestimenti from "@/pages/Reinvestimenti";
import FlussiVisualizzazione from "@/pages/FlussiVisualizzazione";
import Monitoraggio from "@/pages/Monitoraggio";
import Calendario from "@/pages/Calendario";
import Alert from "@/pages/Alert";
import ResetPassword from "@/pages/ResetPassword";
import Navigation from "./components/Navigation";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Dashboard} />
      <Route path="/fiumi" component={Fiumi} />
      <Route path="/simulazione" component={Simulazione} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/impostazioni" component={Impostazioni} />
      <Route path="/apporti" component={Apporti} />
      <Route path="/reinvestimenti" component={Reinvestimenti} />
      <Route path="/flussi" component={FlussiVisualizzazione} />
      <Route path="/monitoraggio" component={Monitoraggio} />
      <Route path="/calendario" component={Calendario} />
      <Route path="/alert" component={Alert} />
      <Route path="/reset-password" component={ResetPassword} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Navigation />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
