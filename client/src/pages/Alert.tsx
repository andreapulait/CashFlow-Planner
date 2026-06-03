import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Pencil, Trash2, Bell, TrendingUp, Target, DollarSign } from "lucide-react";
import { toast } from "sonner";

// ─── Tipi ─────────────────────────────────────────────────────────────────────

type AlertTipo = "roi_threshold" | "value_milestone" | "rendita_threshold";
type AlertOperatore = "gt" | "lt" | "gte" | "lte" | "eq";

type FormData = {
  tipo: AlertTipo;
  nome: string;
  soglia: number;
  fiumeId: number | undefined;
  operatore: AlertOperatore;
};

const emptyForm = (): FormData => ({
  tipo: "roi_threshold",
  nome: "",
  soglia: 0,
  fiumeId: undefined,
  operatore: "gte",
});

// ─── Helpers UI ───────────────────────────────────────────────────────────────

function getAlertIcon(tipo: string) {
  switch (tipo) {
    case "roi_threshold":    return <TrendingUp className="h-5 w-5 text-blue-600" />;
    case "value_milestone":  return <Target className="h-5 w-5 text-green-600" />;
    case "rendita_threshold":return <DollarSign className="h-5 w-5 text-purple-600" />;
    default:                 return <Bell className="h-5 w-5" />;
  }
}

function getAlertTypeLabel(tipo: string) {
  switch (tipo) {
    case "roi_threshold":    return "Soglia ROI";
    case "value_milestone":  return "Traguardo Valore";
    case "rendita_threshold":return "Soglia Rendita";
    default:                 return tipo;
  }
}

function getOperatorLabel(op: string) {
  const MAP: Record<string, string> = { gt: ">", lt: "<", gte: "≥", lte: "≤", eq: "=" };
  return MAP[op] ?? op;
}

// ─── AlertForm (a livello modulo — NON dentro il componente) ─────────────────
// Deve stare fuori per evitare che React smonta/rimonta il form ad ogni render
// del componente padre (che causerebbe la perdita del focus ad ogni keystroke).

interface AlertFormProps {
  formData: FormData;
  setFormData: (f: FormData) => void;
  fiumi: Array<{ id: number; nome: string }>;
}

function AlertForm({ formData, setFormData, fiumi }: AlertFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <Label>Tipo Alert</Label>
        <Select value={formData.tipo} onValueChange={(v: AlertTipo) => setFormData({ ...formData, tipo: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="roi_threshold">Soglia ROI (%)</SelectItem>
            <SelectItem value="value_milestone">Traguardo Valore (€)</SelectItem>
            <SelectItem value="rendita_threshold">Soglia Rendita Mensile (€)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Nome Alert</Label>
        <Input
          id="alert-nome"
          placeholder="es. ROI superiore al 10%"
          value={formData.nome}
          onChange={e => setFormData({ ...formData, nome: e.target.value })}
        />
      </div>

      <div>
        <Label>Condizione</Label>
        <Select value={formData.operatore} onValueChange={(v: AlertOperatore) => setFormData({ ...formData, operatore: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
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
        <Label>
          Valore Soglia {formData.tipo === "roi_threshold" ? "(%)" : "(€)"}
        </Label>
        <Input
          id="alert-soglia"
          type="number"
          placeholder="es. 10"
          value={formData.soglia === 0 ? "" : formData.soglia / 100}
          onChange={e => setFormData({ ...formData, soglia: Math.round(parseFloat(e.target.value || "0") * 100) })}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {formData.tipo === "roi_threshold"
            ? "Percentuale di ritorno sull'investimento iniziale al termine del piano"
            : formData.tipo === "value_milestone"
            ? "Valore totale del portafoglio al termine del piano"
            : "Rendita mensile generata al termine del piano"}
        </p>
      </div>

      <div>
        <Label>Fiume (opzionale)</Label>
        <Select
          value={formData.fiumeId?.toString() || "all"}
          onValueChange={v => setFormData({ ...formData, fiumeId: v === "all" ? undefined : parseInt(v) })}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i fiumi</SelectItem>
            {fiumi.map(f => (
              <SelectItem key={f.id} value={f.id.toString()}>{f.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ─── Componente principale ────────────────────────────────────────────────────

export default function Alert() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<any>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm());

  const utils = trpc.useUtils();
  const { data: alerts = [], isLoading } = trpc.alertConfig.list.useQuery();
  const { data: fiumi = [] } = trpc.fiumi.list.useQuery();

  const invalidate = () => {
    utils.alertConfig.list.invalidate();
    utils.notifiche.list.invalidate();
    utils.notifiche.unreadCount.invalidate();
  };

  const createMutation = trpc.alertConfig.create.useMutation({
    onSuccess: () => {
      invalidate();
      setIsCreateOpen(false);
      setFormData(emptyForm());
      toast.success("Alert creato — condizione valutata");
    },
    onError: (e) => toast.error("Errore: " + e.message),
  });

  const updateMutation = trpc.alertConfig.update.useMutation({
    onSuccess: () => {
      invalidate();
      setIsEditOpen(false);
      setEditingAlert(null);
      toast.success("Alert aggiornato — condizione rivalutata");
    },
    onError: (e) => toast.error("Errore: " + e.message),
  });

  const toggleMutation = trpc.alertConfig.toggle.useMutation({
    onSuccess: () => { invalidate(); },
  });

  const deleteMutation = trpc.alertConfig.delete.useMutation({
    onSuccess: () => { invalidate(); toast.success("Alert eliminato"); },
    onError: (e) => toast.error("Errore: " + e.message),
  });

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", minimumFractionDigits: 0 }).format(v / 100);

  const openEdit = (alert: any) => {
    setEditingAlert(alert);
    setFormData({
      tipo: alert.tipo as AlertTipo,
      nome: alert.nome,
      soglia: alert.soglia ?? 0,
      fiumeId: alert.fiumeId ?? undefined,
      operatore: (alert.operatore ?? "gte") as AlertOperatore,
    });
    setIsEditOpen(true);
  };

  const handleCreate = () => {
    if (!formData.nome || formData.soglia === 0) {
      toast.error("Compila nome e valore soglia");
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEdit = () => {
    if (!editingAlert) return;
    if (!formData.nome || formData.soglia === 0) {
      toast.error("Compila nome e valore soglia");
      return;
    }
    updateMutation.mutate({
      id: editingAlert.id,
      tipo: formData.tipo,
      nome: formData.nome,
      soglia: formData.soglia,
      fiumeId: formData.fiumeId ?? null,
      operatore: formData.operatore,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-6 w-96 mb-8" />
          <div className="grid gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
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
            <h1 className="text-4xl font-bold text-foreground mb-2">Regole Alert</h1>
            <p className="text-muted-foreground">
              Imposta alert personalizzati — la condizione viene verificata subito dopo il salvataggio
            </p>
          </div>
          <Button onClick={() => { setFormData(emptyForm()); setIsCreateOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Nuovo Alert
          </Button>
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
              const fiume = alert.fiumeId ? fiumi.find(f => f.id === alert.fiumeId) : null;
              const isManual = ['roi_threshold', 'value_milestone', 'rendita_threshold'].includes(alert.tipo);

              return (
                <Card
                  key={alert.id}
                  className="cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => isManual && openEdit(alert)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {getAlertIcon(alert.tipo)}
                        <div>
                          <CardTitle className="text-lg">{alert.nome}</CardTitle>
                          <CardDescription>
                            {alert.tipo === "affluente_programmato" ? (
                              <>Alert affluente {alert.giorniPreavviso} giorni prima{fiume && ` • ${fiume.nome}`}</>
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
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <Switch
                          checked={alert.attivo === 1}
                          onCheckedChange={() => toggleMutation.mutate({ id: alert.id })}
                        />
                        {isManual && (
                          <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); openEdit(alert); }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={e => { e.stopPropagation(); deleteMutation.mutate({ id: alert.id }); }}
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

        {/* Dialog Crea */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crea Nuovo Alert</DialogTitle>
              <DialogDescription>
                La condizione sarà verificata subito dopo il salvataggio
              </DialogDescription>
            </DialogHeader>
            <AlertForm formData={formData} setFormData={setFormData} fiumi={fiumi} />
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Annulla</Button>
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Salvataggio..." : "Crea Alert"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog Modifica */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Modifica Alert</DialogTitle>
              <DialogDescription>
                La condizione sarà rivalutata subito dopo il salvataggio
              </DialogDescription>
            </DialogHeader>
            <AlertForm formData={formData} setFormData={setFormData} fiumi={fiumi} />
            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>Annulla</Button>
              <Button onClick={handleEdit} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Salvataggio..." : "Salva"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
