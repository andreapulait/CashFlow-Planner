import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, Bell, TrendingUp, Target, DollarSign } from "lucide-react";
import { toast } from "sonner";

export default function Alert() {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    tipo: "roi_threshold" as "roi_threshold" | "value_milestone" | "rendita_threshold",
    nome: "",
    soglia: 0,
    fiumeId: undefined as number | undefined,
    operatore: "gte" as "gt" | "lt" | "gte" | "lte" | "eq",
  });

  const { data: alerts = [], isLoading, refetch } = trpc.alertConfig.list.useQuery();
  const { data: fiumi = [] } = trpc.fiumi.list.useQuery();

  const createMutation = trpc.alertConfig.create.useMutation({
    onSuccess: () => {
      refetch();
      setOpen(false);
      resetForm();
      toast.success("Alert creato con successo");
    },
    onError: (error) => {
      toast.error("Errore nella creazione dell'alert: " + error.message);
    },
  });

  const toggleMutation = trpc.alertConfig.toggle.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Alert aggiornato");
    },
  });

  const deleteMutation = trpc.alertConfig.delete.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Alert eliminato");
    },
  });

  const resetForm = () => {
    setFormData({
      tipo: "roi_threshold",
      nome: "",
      soglia: 0,
      fiumeId: undefined,
      operatore: "gte",
    });
  };

  const handleCreate = () => {
    if (!formData.nome || formData.soglia === 0) {
      toast.error("Compila tutti i campi obbligatori");
      return;
    }

    createMutation.mutate(formData);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("it-IT", {
      style: "currency",
      currency: "EUR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value / 100);
  };

  const getAlertIcon = (tipo: string) => {
    switch (tipo) {
      case "roi_threshold":
        return <TrendingUp className="h-5 w-5 text-blue-600" />;
      case "value_milestone":
        return <Target className="h-5 w-5 text-green-600" />;
      case "rendita_threshold":
        return <DollarSign className="h-5 w-5 text-purple-600" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const getAlertTypeLabel = (tipo: string) => {
    switch (tipo) {
      case "roi_threshold":
        return "Soglia ROI";
      case "value_milestone":
        return "Traguardo Valore";
      case "rendita_threshold":
        return "Soglia Rendita";
      default:
        return tipo;
    }
  };

  const getOperatorLabel = (operatore: string) => {
    switch (operatore) {
      case "gt":
        return ">";
      case "lt":
        return "<";
      case "gte":
        return "≥";
      case "lte":
        return "≤";
      case "eq":
        return "=";
      default:
        return operatore;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8">
          <div className="mb-8">
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-6 w-96" />
          </div>
          <div className="grid gap-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Configurazione Alert</h1>
            <p className="text-muted-foreground">
              Imposta alert personalizzati per monitorare i tuoi obiettivi finanziari
            </p>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nuovo Alert
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crea Nuovo Alert</DialogTitle>
                <DialogDescription>
                  Configura un alert per ricevere notifiche quando vengono raggiunti determinati traguardi
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="tipo">Tipo Alert</Label>
                  <Select
                    value={formData.tipo}
                    onValueChange={(value: any) => setFormData({ ...formData, tipo: value })}
                  >
                    <SelectTrigger id="tipo">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="roi_threshold">Soglia ROI (%)</SelectItem>
                      <SelectItem value="value_milestone">Traguardo Valore (€)</SelectItem>
                      <SelectItem value="rendita_threshold">Soglia Rendita Mensile (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="nome">Nome Alert</Label>
                  <Input
                    id="nome"
                    placeholder="es. ROI superiore al 10%"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="operatore">Condizione</Label>
                  <Select
                    value={formData.operatore}
                    onValueChange={(value: any) => setFormData({ ...formData, operatore: value })}
                  >
                    <SelectTrigger id="operatore">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gte">Maggiore o uguale (≥)</SelectItem>
                      <SelectItem value="lte">Minore o uguale (≤)</SelectItem>
                      <SelectItem value="gt">Maggiore (&gt;)</SelectItem>
                      <SelectItem value="lt">Minore (&lt;)</SelectItem>
                      <SelectItem value="eq">Uguale (=)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="soglia">
                    Valore Soglia{" "}
                    {formData.tipo === "roi_threshold"
                      ? "(%)"
                      : formData.tipo === "value_milestone"
                      ? "(€)"
                      : "(€/mese)"}
                  </Label>
                  <Input
                    id="soglia"
                    type="number"
                    placeholder="es. 10000"
                    value={formData.soglia === 0 ? "" : formData.soglia / 100}
                    onChange={(e) =>
                      setFormData({ ...formData, soglia: Math.round(parseFloat(e.target.value || "0") * 100) })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="fiumeId">Fiume (opzionale)</Label>
                  <Select
                    value={formData.fiumeId?.toString() || "all"}
                    onValueChange={(value) =>
                      setFormData({ ...formData, fiumeId: value === "all" ? undefined : parseInt(value) })
                    }
                  >
                    <SelectTrigger id="fiumeId">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tutti i fiumi</SelectItem>
                      {fiumi.map((fiume) => (
                        <SelectItem key={fiume.id} value={fiume.id.toString()}>
                          {fiume.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleCreate} className="w-full" disabled={createMutation.isPending}>
                  Crea Alert
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {alerts.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  Nessun alert configurato. Crea il tuo primo alert per iniziare a monitorare i tuoi obiettivi.
                </div>
              </CardContent>
            </Card>
          ) : (
            alerts.map((alert) => {
              const fiume = alert.fiumeId ? fiumi.find((f) => f.id === alert.fiumeId) : null;

              return (
                <Card key={alert.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {getAlertIcon(alert.tipo)}
                        <div>
                          <CardTitle className="text-lg">{alert.nome}</CardTitle>
                          <CardDescription>
                            {alert.tipo === "affluente_programmato" ? (
                              <>
                                Alert affluente {alert.giorniPreavviso} giorni prima
                                {fiume && ` • ${fiume.nome}`}
                              </>
                            ) : (
                              <>
                                {getAlertTypeLabel(alert.tipo)}{" "}
                                {alert.operatore && getOperatorLabel(alert.operatore)}{" "}
                                {alert.soglia !== null && (
                                  alert.tipo === "roi_threshold"
                                    ? `${(alert.soglia / 100).toFixed(1)}%`
                                    : formatCurrency(alert.soglia)
                                )}
                                {fiume && ` • ${fiume.nome}`}
                              </>
                            )}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={alert.attivo === 1}
                          onCheckedChange={() => toggleMutation.mutate({ id: alert.id })}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteMutation.mutate({ id: alert.id })}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
