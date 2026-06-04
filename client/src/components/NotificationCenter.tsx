import { trpc } from "@/lib/trpc";
import { useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, CheckCheck, Trash2, AlertCircle, TrendingUp, Target } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { it } from "date-fns/locale";

export default function NotificationCenter() {
  const utils = trpc.useUtils();
  const { data: notifiche = [] } = trpc.notifiche.list.useQuery();
  const { data: unreadCount = 0 } = trpc.notifiche.unreadCount.useQuery();

  const checkEventsMutation = trpc.notifiche.checkUpcomingEvents.useMutation({
    onSuccess: (data) => {
      if (data.created > 0) {
        utils.notifiche.list.invalidate();
        utils.notifiche.unreadCount.invalidate();
      }
    },
  });

  // Controlla alert in scadenza una volta per sessione
  useEffect(() => {
    const key = "cfp_events_checked_" + new Date().toDateString();
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1");
      checkEventsMutation.mutate();
    }
  }, []);

  const invalidateAll = () => {
    utils.notifiche.list.invalidate();
    utils.notifiche.unreadCount.invalidate();
  };

  const markAsReadMutation = trpc.notifiche.markAsRead.useMutation({
    onSuccess: () => invalidateAll(),
  });

  const markAllAsReadMutation = trpc.notifiche.markAllAsRead.useMutation({
    onSuccess: () => {
      invalidateAll();
      toast.success("Tutte le notifiche segnate come lette");
    },
  });

  const deleteMutation = trpc.notifiche.delete.useMutation({
    onSuccess: () => invalidateAll(),
  });

  const getNotificationIcon = (tipo: string) => {
    switch (tipo) {
      case "milestone":
        return <Target className="h-4 w-4 text-green-600" />;
      case "threshold":
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case "deadline":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <TrendingUp className="h-4 w-4 text-blue-600" />;
    }
  };

  const getPriorityColor = (priorita: string) => {
    switch (priorita) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-blue-100 text-blue-800 border-blue-200";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <div className="flex items-center justify-between px-4 py-2 border-b">
          <h3 className="font-semibold text-foreground">Notifiche</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              className="h-8 text-xs"
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Segna tutte lette
            </Button>
          )}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {notifiche.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">
              Nessuna notifica
            </div>
          ) : (
            notifiche.map((notifica) => (
              <div
                key={notifica.id}
                className={`px-4 py-3 border-b hover:bg-accent transition-colors ${
                  notifica.letta === 0 ? "bg-blue-50/50" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">{getNotificationIcon(notifica.tipo)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h4 className="font-medium text-sm text-foreground line-clamp-1">
                        {notifica.titolo}
                      </h4>
                      <Badge
                        variant="outline"
                        className={`text-xs ${getPriorityColor(notifica.priorita)}`}
                      >
                        {notifica.priorita === "high"
                          ? "Alta"
                          : notifica.priorita === "medium"
                          ? "Media"
                          : "Bassa"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                      {notifica.messaggio}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notifica.createdAt), {
                          addSuffix: true,
                          locale: it,
                        })}
                      </span>
                      <div className="flex gap-1">
                        {notifica.letta === 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => markAsReadMutation.mutate({ id: notifica.id })}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate({ id: notifica.id })}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {notifiche.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center text-sm text-primary cursor-pointer">
              Vedi tutte le notifiche
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
