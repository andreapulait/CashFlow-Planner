import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function Guida() {
  return (
    <div className="container max-w-3xl py-8 px-4">
      <div className="mb-6">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Torna alla Dashboard
          </Button>
        </Link>
      </div>

      <div className="prose prose-sm max-w-none dark:prose-invert space-y-6 text-foreground">
        <h1 className="text-2xl font-bold">Guida all'app Cash Flow Planner</h1>

        <section>
          <h2 className="text-xl font-semibold mt-6 mb-3">Cos'è Cash Flow Planner?</h2>
          <p>
            Cash Flow Planner ti aiuta a pianificare e monitorare il tuo patrimonio investito nel tempo.
            Il concetto chiave è il <strong>fiume</strong>: ogni fonte di investimento (un ETF, un conto deposito,
            un immobile, ecc.) è un fiume che cresce nel tempo grazie al suo rendimento e agli apporti che riceve.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-6 mb-3">I Fiumi</h2>
          <p>
            Ogni fiume ha:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Capitale sorgente</strong>: importo iniziale investito</li>
            <li><strong>Rendimento annuo</strong>: tasso percentuale annuo (es. 8%)</li>
            <li><strong>Mese di partenza</strong>: da quale mese del piano inizia a produrre rendita</li>
            <li><strong>% reinvestimento</strong>: quanta parte della rendita mensile viene automaticamente reinvestita nel capitale (default 100%)</li>
          </ul>
          <p className="mt-2">
            La rendita mensile del fiume è calcolata come <code>capitale × rendimento_annuo / 12</code>.
            Se il reinvestimento è 100%, la rendita si accumula al capitale (interesse composto).
            Se è inferiore, la quota non reinvestita diventa liquidità prelevabile.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-6 mb-3">Gli Affluenti</h2>
          <p>
            Gli affluenti sono apporti aggiuntivi di capitale verso un fiume, programmati in un mese specifico.
            Possono essere una tantum o ricorrenti (mensili, trimestrali, semestrali, annuali).
            Aumentano direttamente il capitale del fiume nel mese indicato.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-6 mb-3">I Reinvestimenti</h2>
          <p>
            I reinvestimenti permettono di spostare quota di rendita da un fiume a un altro.
            Nella sezione Reinvestimenti puoi pianificare:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Reinvestimento una tantum</strong>: in un mese specifico, preleva un importo fisso (o percentuale della rendita) dal fiume A e versalo nel fiume B</li>
            <li><strong>Reinvestimento periodico</strong>: ogni N mesi, per un periodo definito, ripeti l'operazione automaticamente</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-6 mb-3">Pianificazione</h2>
          <p>
            Nelle <strong>Impostazioni</strong> definisci:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Obiettivo cash flow mensile</strong>: la rendita netta mensile che vuoi raggiungere</li>
            <li><strong>Orizzonte temporale</strong>: numero di mesi del piano (es. 60 = 5 anni)</li>
            <li><strong>Data di inizio</strong>: il mese 0 del piano</li>
          </ul>
          <p className="mt-2">
            La <strong>Dashboard</strong> mostra l'evoluzione del patrimonio complessivo e della rendita mensile lungo tutto l'orizzonte, confrontando piano e reale.
          </p>
          <p className="mt-2">
            La <strong>Simulazione</strong> ti permette di esplorare scenari alternativi modificando parametri senza toccare il piano principale. Puoi salvare gli scenari e confrontarli.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-6 mb-3">Monitoraggio</h2>
          <p>
            Il monitoraggio registra ciò che accade realmente ai tuoi fiumi, mese per mese.
            Hai a disposizione cinque tipi di evento:
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Capitale</strong> (snapshot): registra il valore esatto del capitale del fiume in una certa data.
              È un valore assoluto, non una variazione. Usalo quando sai con certezza quanto vale il tuo investimento.
            </li>
            <li>
              <strong>Rendita</strong>: registra la rendita effettivamente prodotta dal fiume in un mese.
              Se parte della rendita non viene reinvestita (es. la prelevi), indica la <em>quota non reinvestita</em>:
              solo quella quota riduce il capitale, la parte reinvestita si accumula.
            </li>
            <li>
              <strong>Apporto</strong>: registra un versamento aggiuntivo di capitale nel fiume (corrisponde a un affluente pianificato).
            </li>
            <li>
              <strong>Prelievo</strong>: registra un prelievo di capitale dal fiume. Riduce il capitale carry-forward.
            </li>
            <li>
              <strong>Reinvestimento</strong>: sposta capitale da un fiume sorgente a un fiume destinazione.
              Riduce il capitale del primo e aumenta quello del secondo.
            </li>
          </ul>
          <p className="mt-3">
            Il <strong>patrimonio reale</strong> di ogni fiume si calcola a partire dall'ultimo snapshot di capitale,
            sommando algebricamente tutti gli eventi successivi (rendite nette, apporti, prelievi, reinvestimenti in entrata/uscita)
            fino al mese corrente.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-6 mb-3">Analisi e grafici</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Analytics</strong>: grafici dettagliati sull'evoluzione del portafoglio, breakdown per fiume, proiezioni</li>
            <li><strong>Flussi</strong>: visualizzazione a diagramma dei flussi tra fiumi e reinvestimenti</li>
            <li><strong>Calendario</strong>: vista mensile degli eventi pianificati (affluenti, reinvestimenti)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-6 mb-3">Alert</h2>
          <p>
            Nella sezione <strong>Alert</strong> puoi configurare regole automatiche di notifica, ad esempio:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Avvisami quando il patrimonio totale supera X€</li>
            <li>Avvisami quando la rendita mensile supera Y€</li>
            <li>Avvisami in prossimità di una data specifica</li>
          </ul>
          <p className="mt-2">
            Le notifiche compaiono nel campanello in alto a destra e restano salvate finché non le segni come lette.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mt-6 mb-3">Scenari</h2>
          <p>
            Nella sezione <strong>Simulazione</strong> puoi creare scenari alternativi: copie del tuo piano
            su cui sperimentare variazioni (cambiare rendimenti, aggiungere fiumi, modificare apporti)
            senza impattare il piano principale. Gli scenari sono indipendenti e confrontabili tra loro.
          </p>
        </section>

        <div className="mt-8 pt-6 border-t text-sm text-muted-foreground">
          Per assistenza o segnalazioni, contatta il supporto.
        </div>
      </div>
    </div>
  );
}
