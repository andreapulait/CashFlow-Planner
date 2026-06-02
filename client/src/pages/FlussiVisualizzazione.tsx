import { useState, useCallback, useMemo } from "react";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Network, TrendingUp } from "lucide-react";

export default function FlussiVisualizzazione() {
  const [annoFiltro, setAnnoFiltro] = useState<number | undefined>(undefined);
  
  const { data: flussi, isLoading } = trpc.calcoli.flussiReinvestimenti.useQuery({
    mese: annoFiltro,
  });
  
  const { data: impostazioni } = trpc.impostazioni.get.useQuery();

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M€`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}k€`;
    }
    return `${value.toFixed(0)}€`;
  };

  // Convert flussi data to ReactFlow nodes and edges
  const { nodes, edges } = useMemo(() => {
    if (!flussi) return { nodes: [], edges: [] };

    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];

    // Group nodes by type for layout
    const externalNodes: typeof flussi.nodes = [];
    const fiumeNodes: typeof flussi.nodes = [];
    const newFiumeNodes: typeof flussi.nodes = [];

    flussi.nodes.forEach(node => {
      if (node.type === 'external') {
        externalNodes.push(node);
      } else if (node.type === 'fiume-nuovo') {
        newFiumeNodes.push(node);
      } else {
        fiumeNodes.push(node);
      }
    });

    // Position external nodes on the left
    externalNodes.forEach((node, index) => {
      flowNodes.push({
        id: node.id,
        data: { label: node.label },
        position: { x: 50, y: 200 + index * 100 },
        style: {
          background: '#10b981',
          color: 'white',
          border: '2px solid #059669',
          borderRadius: '8px',
          padding: '12px 20px',
          fontSize: '14px',
          fontWeight: '600',
        },
      });
    });

    // Position fiume nodes in the middle
    fiumeNodes.forEach((node, index) => {
      flowNodes.push({
        id: node.id,
        data: { label: node.label },
        position: { x: 400, y: 100 + index * 120 },
        style: {
          background: '#3b82f6',
          color: 'white',
          border: '2px solid #2563eb',
          borderRadius: '8px',
          padding: '12px 20px',
          fontSize: '14px',
          fontWeight: '600',
        },
      });
    });

    // Position new fiume nodes on the right
    newFiumeNodes.forEach((node, index) => {
      flowNodes.push({
        id: node.id,
        data: { label: node.label },
        position: { x: 750, y: 100 + index * 120 },
        style: {
          background: '#8b5cf6',
          color: 'white',
          border: '2px solid #7c3aed',
          borderRadius: '8px',
          padding: '12px 20px',
          fontSize: '14px',
          fontWeight: '600',
        },
      });
    });

    // Create edges with labels
    flussi.links.forEach((link, index) => {
      const edgeColor = 
        link.tipo === 'iniziale' ? '#10b981' :
        link.tipo === 'apporto' ? '#06b6d4' :
        '#f59e0b';

      flowEdges.push({
        id: `edge-${index}`,
        source: link.source,
        target: link.target,
        label: formatCurrency(link.value),
        animated: link.tipo === 'reinvestimento',
        style: { 
          stroke: edgeColor, 
          strokeWidth: Math.max(2, Math.min(8, link.value / 5000)),
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: edgeColor,
        },
        labelStyle: {
          fill: edgeColor,
          fontWeight: 600,
          fontSize: 12,
        },
        labelBgStyle: {
          fill: 'white',
          fillOpacity: 0.9,
        },
      });
    });

    return { nodes: flowNodes, edges: flowEdges };
  }, [flussi]);

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(nodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(edges);

  // Update nodes and edges when data changes
  useMemo(() => {
    setFlowNodes(nodes);
    setFlowEdges(edges);
  }, [nodes, edges, setFlowNodes, setFlowEdges]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-8">
          <Skeleton className="h-10 w-64 mb-8" />
          <Skeleton className="h-[600px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Network className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">Visualizzazione Flussi</h1>
          </div>
          <p className="text-muted-foreground">
            Diagramma interattivo dei flussi di capitale tra i tuoi fiumi di investimento
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtri</CardTitle>
            <CardDescription>Personalizza la visualizzazione dei flussi</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="anno-filtro">Filtra per Anno</Label>
                <Select
                  value={annoFiltro?.toString() || "tutti"}
                  onValueChange={(value) => setAnnoFiltro(value === "tutti" ? undefined : parseInt(value))}
                >
                  <SelectTrigger id="anno-filtro">
                    <SelectValue placeholder="Tutti gli anni" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tutti">Tutti gli anni</SelectItem>
                    {impostazioni && Array.from({ length: impostazioni.orizzonteTemporale }, (_, i) => i + 1).map(anno => (
                      <SelectItem key={anno} value={anno.toString()}>
                        Mese {anno}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Diagramma Flussi di Capitale</CardTitle>
            <CardDescription>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span className="text-sm">Capitale Esterno</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span className="text-sm">Fiumi Esistenti</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-purple-500 rounded"></div>
                  <span className="text-sm">Nuovi Fiumi</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-1 bg-orange-500"></div>
                  <span className="text-sm">Reinvestimenti</span>
                </div>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {flowNodes.length === 0 ? (
              <div className="h-[600px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nessun flusso da visualizzare.</p>
                  <p className="text-sm mt-2">Crea fiumi e reinvestimenti per vedere il diagramma.</p>
                </div>
              </div>
            ) : (
              <div className="h-[600px] border rounded-lg bg-muted/20">
                <ReactFlow
                  nodes={flowNodes}
                  edges={flowEdges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  fitView
                  attributionPosition="bottom-left"
                >
                  <Background />
                  <Controls />
                  <MiniMap 
                    nodeColor={(node) => {
                      const style = node.style as any;
                      return style?.background || '#3b82f6';
                    }}
                    maskColor="rgba(0, 0, 0, 0.1)"
                  />
                </ReactFlow>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h3 className="font-semibold mb-2">Come leggere il diagramma:</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• <strong>Larghezza delle frecce</strong>: proporzionale all'importo del flusso</li>
            <li>• <strong>Frecce animate</strong>: rappresentano reinvestimenti tra fiumi</li>
            <li>• <strong>Frecce statiche</strong>: rappresentano capitale iniziale e apporti esterni</li>
            <li>• Puoi trascinare i nodi per riorganizzare il layout</li>
            <li>• Usa i controlli in basso a sinistra per zoom e navigazione</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
