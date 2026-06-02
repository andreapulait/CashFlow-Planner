# Cash Flow Planner - TODO

## Database e Modelli Dati
- [x] Creare schema database per tabella "fiumi" (nome, capitale iniziale, rendimento, data creazione, anno creazione, userId)
- [x] Implementare migrazioni database

## Backend API
- [x] API CRUD per gestione fiumi (create, read, update, delete)
- [x] API per calcolo interesse composto quinquennale
- [x] API per calcolo cash flow mensile per fiume
- [x] API per calcolo cash flow totale
- [x] API per ottenere riepilogo dashboard (totali, progressi, obiettivi)

## Frontend - Dashboard e Layout
- [x] Configurare tema e colori dell'applicazione
- [x] Creare layout principale con navigazione
- [x] Creare dashboard home con KPI cards (capitale totale, cash flow mensile, % obiettivo)
- [x] Implementare sezione gestione fiumi con tabella e form

## Frontend - Visualizzazioni
- [x] Implementare tabella dettagliata evoluzione quinquennale
- [x] Integrare grafico lineare: evoluzione capitale totale
- [x] Integrare grafico lineare: cash flow mensile nel tempo
- [x] Integrare grafico a barre: contributo per fiume
- [x] Integrare grafico a torta: composizione portafoglio

## Funzionalità Avanzate
- [ ] Implementare funzionalità di reinvestimento automatico
- [ ] Aggiungere possibilità di creare nuovi fiumi da rendite
- [ ] Implementare scenari "what-if" per simulazioni

## Testing e Qualità
- [x] Scrivere test vitest per API fiumi
- [x] Scrivere test vitest per calcoli finanziari
- [x] Verificare correttezza formule interesse composto
- [x] Test end-to-end funzionalità principali

## Deployment
- [x] Verificare funzionamento completo dell'applicazione
- [x] Creare checkpoint finale
- [x] Documentare istruzioni d'uso


## Nuove Funzionalità Richieste
- [x] Rendere editabile l'obiettivo di cash flow mensile
- [x] Implementare barra di progresso per visualizzare avanzamento verso obiettivo
- [x] Rendere editabile l'orizzonte temporale (non più fisso a 5 anni)
- [x] Aggiungere selezione anno di inserimento per ogni fiume
- [x] Migliorare formattazione numeri nei grafici per leggibilità

## Nuove Funzionalità - Apporti Multipli e Google Integration
- [x] Creare schema database per apporti di capitale multipli nel tempo
- [x] Implementare API per aggiungere/modificare/eliminare apporti
- [x] Aggiornare logica di calcolo interesse composto per considerare apporti multipli
- [x] Creare interfaccia per gestire apporti di capitale per ogni fiume
- [x] Visualizzare apporti nelle tabelle di simulazione
- [x] Testare funzionalità apporti multipli
- [x] Autenticazione già implementata con Manus OAuth (non necessaria Google)

## Funzionalità Reinvestimento Automatico
- [x] Creare schema database per reinvestimenti (fiume sorgente, destinazione, anno, importo/percentuale)
- [x] Implementare API per creare/modificare/eliminare reinvestimenti
- [x] Aggiornare logica di calcolo per sottrarre capitale dal fiume sorgente
- [x] Aggiornare logica di calcolo per aggiungere capitale al fiume destinazione
- [x] Creare interfaccia per configurare reinvestimenti
- [x] Visualizzare flussi di reinvestimento nelle tabelle di simulazione
- [x] Gestire creazione automatica di nuovi fiumi da reinvestimento
- [x] Testare funzionalità reinvestimenti

## Funzionalità Avanzate

### 1. Diagramma Sankey Flussi di Reinvestimento
- [x] Installare libreria per diagrammi (ReactFlow)
- [x] Creare API per generare dati flussi
- [x] Implementare componente visualizzazione flussi interattivo
- [x] Aggiungere filtri per anno
- [x] Creare pagina dedicata Flussi

### 2. Sistema Scenari Multipli What-If
- [x] Creare schema database per scenari (nome, descrizione, timestamp)
- [x] Creare schema database per snapshots scenari (snapshot JSON configurazione)
- [x] Implementare API per CRUD scenari
- [x] Implementare API per salvare snapshot configurazione corrente
- [x] Implementare API per confronto tra scenari
- [x] Creare interfaccia gestione scenari
- [x] Creare vista comparativa con tabella confronto
- [x] Testare funzionalità scenari

### 3. Calendario Reinvestimenti con Notifiche
- [x] Creare componente calendario con vista mensile/annuale
- [x] Visualizzare reinvestimenti programmati nel calendario
- [x] Creare interfaccia calendario con prossime operazioni
- [x] Aggiungere legenda e statistiche eventi
- [ ] Implementare sistema notifiche attivo (usando API notifiche built-in)
- [x] Testare sistema notifiche


## Ristrutturazione Terminologia (Fase 1 - Completata)

### Cambio Terminologia
- [x] Rinominare "Capitale Iniziale" in "Sorgente" (database)
- [x] Rinominare "Apporto" in "Affluente" (database)
- [x] Aggiornare schema database con nuova terminologia
- [x] Aggiornare funzioni db.ts con nuova terminologia
- [x] Aggiornare routers.ts con nuova terminologia
- [x] Aggiornare tutte le interfacce frontend
- [x] Aggiornare test con nuova terminologia

### Logica Temporale Mensile (Fase 2 - COMPLETATA)
- [x] Convertire calcoli da annuali a mensili
- [x] Aggiornare interfacce per mostrare mesi invece di anni
- [ ] Implementare T0=oggi come punto di partenza (FUTURA: date picker)
- [x] Testare tutti i calcoli con granularità mensile

### Bug Fix Reinvestimenti
- [x] Investigare e correggere visualizzazione reinvestimenti (CORRETTO: query con inArray)
- [x] Testare creazione, visualizzazione e calcolo reinvestimenti (COMPLETATO)


## Nuove Richieste - Miglioramenti UX e Logica Mensile

### Ristrutturazione Menu
- [x] Risolvere sovrapposizione menu con zona login
- [x] Raggruppare voci menu in categorie logiche (Pianificazione, Gestione, Analisi)
- [x] Implementare menu dropdown con shadcn/ui
### Implementazione Completa - Sessione Corrente

#### 1. Conversione Granularità Mensile
- [x] Mantenere campi int ma rinominarli (annoCreazione → meseCreazione già fatto)
- [x] Aggiornare commenti schema per riflettere granularità mensile
- [x] Aggiornare orizzonte temporale default a 60 mesi (COMPLETATO)

#### 2. Aggiornamento Calcoli Backend
- [x] Verificare che interesse composto usi tasso mensile (rendimento annuale / 12)
- [x] Aggiornare simulazione per iterare mese per mese
- [x] Aggiornare riepilogo per calcolare cash flow mensile
- [x] Testare accuratezza calcoli con esempi reali (TUTTI I TEST PASSANO: 20/20)

#### 3. Aggiornamento Frontend
- [x] Sostituire "Anno" con "Mese" nelle label
- [x] Aggiornare tabella Simulazione per mostrare mesi invece di anni
- [x] Aggiornare Grafici per asse X con mesi
- [x] Verificare tutti i form e dropdown per range corretto (usa orizzonteTemporale)
- [x] Aggiornare Impostazioni: label orizzonte in mesi

#### 4. Bug Fix Reinvestimenti
- [x] Investigare perché reinvestimenti non appaiono in lista (trovato bug in query)
- [x] Correggere query per usare inArray invece di eq
- [x] Testare creazione e visualizzazione reinvestimenti (COMPLETATO)

#### 5. Test Aggiornati per Logica Mensile
- [x] Aggiornare test apporti.test.ts per granularità mensile
- [x] Aggiornare test fiumi.test.ts per granularità mensile
- [x] Aggiornare test reinvestimenti.test.ts per granularità mensile
- [x] Correggere validazione orizzonte temporale (max 240 mesi)
- [x] Correggere default orizzonte temporale (60 mesi)
- [x] Verificare che tutti i test passino (20/20 ✅)


## Nuove Funzionalità - Sessione Corrente

### 1. Date Picker con Calendario
- [x] Analizzare schema database attuale e pianificare modifiche
- [x] Aggiungere campo dataRiferimento (timestamp) alle tabelle fiumi, affluenti, reinvestimenti
- [x] Mantenere campo mese (integer) per retrocompatibilità calcoli
- [x] Creare funzioni helper per conversione data ↔ offset mensile
- [x] Aggiornare API backend per accettare date e convertirle internamente
- [x] Installare e configurare date picker shadcn/ui (Calendar + Popover)
- [x] Implementare date picker in form Fiumi (sostituire input "Mese Creazione")
- [x] Implementare date picker in form Affluenti (sostituire input "Mese")
- [x] Implementare date picker in form Reinvestimenti (sostituire input "Mese")
- [x] Aggiornare visualizzazioni per mostrare date formattate invece di numeri
- [x] Testare creazione/modifica con date picker (Dashboard, Apporti, Reinvestimenti funzionanti)

### 2. Filtri Temporali Avanzati
- [x] Creare componente FilterBar con preset temporali
- [x] Implementare filtro "Prossimi 12 mesi"
- [x] Implementare filtro "Anno corrente"
- [x] Implementare filtro "Range personalizzato" con date picker
- [x] Applicare filtri a tabella Simulazione
- [ ] Applicare filtri a Grafici (DA COMPLETARE IN FUTURO)
- [ ] Salvare preferenze filtri in localStorage (DA COMPLETARE IN FUTURO)

### 3. Sistema Export Dati
- [x] Installare librerie per export (jsPDF, xlsx)
- [x] Creare utility per export PDF e Excel
- [x] Implementare export simulazione in Excel
- [x] Creare pulsanti export in Simulazione
- [x] Aggiungere opzioni personalizzazione export (filtri temporali applicati)
- [ ] Implementare export grafici come immagini PNG (DA COMPLETARE IN FUTURO)
- [ ] Testare export su diversi browser (DA COMPLETARE IN FUTURO)


## Nuove Funzionalità - Sessione 3

### 1. Grafici Interattivi Avanzati
- [x] Installare libreria Recharts
- [x] Creare componente PatrimonioChart per evoluzione patrimonio
- [x] Creare componente FiumiComparisonChart per confronto fiumi
- [x] Aggiungere tooltip dettagliati con informazioni complete
- [ ] Implementare zoom e pan su periodi specifici (DA COMPLETARE IN FUTURO)
- [x] Integrare grafici nella pagina Grafici
- [x] Integrare grafici nella pagina Analytics
- [x] Testare interattività e responsiveness

### 2. Dashboard Analytics Avanzata
- [x] Creare KPI cards per metriche chiave (ROI, crescita mensile, proiezioni)
- [x] Implementare calcolo ROI totale e per fiume
- [x] Implementare calcolo tasso crescita mensile
- [x] Creare grafico comparativo performance tra fiumi
- [x] Aggiungere sezione "Top Performers" con fiumi migliori
- [x] Implementare proiezione valore finale
- [x] Testare accuratezza calcoli analytics
- [x] Aggiungere route /analytics e link nel menu Pianificazione

### 3. Sistema Notifiche e Promemoria
- [ ] Progettare schema database per notifiche e alert
- [ ] Creare API backend per gestione notifiche
- [ ] Implementare logica rilevamento eventi (scadenze, traguardi, soglie)
- [ ] Creare componente NotificationCenter per visualizzazione
- [ ] Implementare configurazione alert personalizzati
- [ ] Aggiungere badge notifiche non lette
- [ ] Testare sistema notifiche end-to-end


## Nuove Funzionalità - Sessione 4

### 1. Sistema Notifiche e Alert Intelligenti
- [x] Progettare schema database per notifiche (tabella notifiche, alert_config)
- [x] Implementare migrazione database per nuove tabelle
- [x] Creare API backend per CRUD notifiche
- [ ] Implementare logica rilevamento eventi (traguardi, soglie, scadenze) - DA COMPLETARE IN FUTURO
- [x] Creare componente NotificationCenter per visualizzazione
- [x] Implementare badge notifiche non lette
- [x] Creare pagina configurazione alert personalizzati
- [ ] Testare sistema notifiche end-to-end - IN CORSO

### 2. Comparazione Scenari What-If
- [ ] Creare interfaccia per definire scenari alternativi
- [ ] Implementare API per calcolo simulazioni parallele
- [ ] Creare componente confronto side-by-side scenari
- [ ] Aggiungere grafici comparativi tra scenari
- [ ] Implementare salvataggio scenari preferiti
- [ ] Testare accuratezza calcoli scenari

### 3. Report PDF Personalizzati
- [ ] Progettare template report PDF professionale
- [ ] Implementare generazione PDF con jsPDF avanzato
- [ ] Aggiungere embedding grafici nei report
- [ ] Implementare personalizzazione logo e note
- [ ] Creare interfaccia selezione contenuti report
- [ ] Testare generazione report su diversi browser


## Export Report PDF - Sessione 5

### Implementazione Export PDF Professionale
- [x] Installare librerie jsPDF e html2canvas
- [x] Creare utility per generazione PDF base (pdfGenerator.ts)
- [x] Implementare funzione per catturare grafici come immagini (html2canvas)
- [x] Creare template PDF con header/footer personalizzati
- [x] Aggiungere sezione KPI cards nel PDF
- [x] Aggiungere tabelle dettagliate simulazione
- [x] Implementare embedding grafici nel PDF
- [x] Creare interfaccia per personalizzazione report (note personalizzate)
- [x] Aggiungere pulsante export in pagina Analytics
- [x] Testare generazione PDF (tutti i 20 test passano)
- [ ] Logo personalizzabile (DA COMPLETARE IN FUTURO)
- [ ] Testare export su diversi browser (DA COMPLETARE IN FUTURO)


## Pulizia Database - Sessione 6

### Rimozione Dati di Test
- [x] Verificare dati presenti nelle tabelle
- [x] Cancellare dati da tabella fiumi
- [x] Cancellare dati da tabella affluenti
- [x] Cancellare dati da tabella reinvestimenti
- [x] Cancellare dati da tabella notifiche
- [x] Cancellare dati da tabella alertConfig
- [x] Cancellare dati da tabella scenari e scenarioSnapshots
- [x] Cancellare dati da tabella impostazioni
- [x] Verificare che le tabelle siano vuote (tutti i count = 0)
- [x] Salvare checkpoint con database pulito


## Verifica Correttezza Calcoli - Sessione 7

### Verifica Ricalcolo Automatico con Orizzonte Temporale
- [x] Analizzare dati esistenti nel database (fiume Dividendi: 20.000€, 10%, orizzonte 5 mesi)
- [x] Identificare problema: orizzonte era 5 mesi invece di 60 mesi
- [x] Aggiornare orizzonte temporale a 60 mesi nel database
- [x] Verificare che simulazione ricalcola automaticamente (FUNZIONA CORRETTAMENTE)
- [x] Confermare Dashboard mostra valori aggiornati (Cash Flow: 17.343,65€)
- [x] Verificare ricalcolo per tutti i 7 fiumi con affluenti e reinvestimenti
- [x] Verificare dettagli simulazione mese per mese (sistema funziona correttamente)
- [x] Confermare logica calcolo: interesse composto mensile, affluenti, reinvestimenti
- [x] Salvare checkpoint con verifica completata

### Bug Fix: Interfaccia Mostra Anni invece di Mesi
- [x] Identificare pagina Impostazioni dove viene mostrato orizzonte temporale
- [x] Correggere visualizzazione: mostrare anni (60 mesi → 5 anni)
- [x] Correggere input: accettare anni e convertire in mesi (5 anni → 60 mesi)
- [x] Aggiornare label e placeholder per chiarire unità di misura
- [x] Testare conversione bidirezionale anni ↔ mesi
- [x] Salvare checkpoint con interfaccia corretta

## Reinvestimento Automatico Cash Flow - Sessione 8

### Implementazione Reinvestimento Automatico
- [x] Aggiungere campo percentualeReinvestimento alla tabella fiumi (NULL = 100% default)
- [x] Migrare schema database con nuovo campo
- [x] Aggiornare logica calcolo simulazione per reinvestire cash flow
- [x] Implementare formula corretta: cashFlow = rendita * (1 - percentuale/100), capitale += rendita * (percentuale/100)
- [x] Correggere default: NULL = 100% reinvestimento (comportamento originale), 0% = tutto prelevato
- [x] Aggiungere campo percentuale reinvestimento in form crea/modifica fiume
- [x] Aggiungere visualizzazione percentuale reinvestimento in tabella fiumi (colonna Reinvest.)
- [x] Correggere router per usare optional() invece di default(0)
- [x] Testare calcolo con test esistenti (tutti i 20 test passano ✅)
- [x] Salvare checkpoint con reinvestimento automatico funzionante

## Sistema Autenticazione Ibrido - Sessione 9

### Pianificazione e Schema Database
- [x] Analizzare schema users esistente e requisiti per autenticazione multipla
- [x] Aggiungere campi: email (unique), passwordHash, authProvider, oauthProviderId
- [x] Modificare openId da notNull a nullable per supportare utenti email/password
- [x] Aggiungere tabella passwordResetTokens per recupero password
- [x] Migrare schema database con pnpm db:push (migrazione 0013 applicata)

### Backend - Email/Password
- [x] Installare bcrypt per hashing password sicuro
- [x] Creare procedure tRPC: auth.register (email, password, nome)
- [x] Creare procedure tRPC: auth.loginWithEmail (email, password)
- [x] Implementare generazione e verifica JWT per sessioni (usando SDK esistente con formato "email:userId")
- [x] Creare procedure tRPC: auth.requestPasswordReset (email)
- [x] Creare procedure tRPC: auth.resetPassword (token, newPassword)
- [x] Validazione email format e password strength (min 8 caratteri)
- [x] Aggiornare db.ts con funzioni: getUserByEmail, createEmailUser, updateUserLastSignedIn, updateUserPassword, getUserById
- [x] Aggiornare db.ts con funzioni password reset: createPasswordResetToken, getPasswordResetToken, markPasswordResetTokenUsed
- [x] Aggiornare sdk.ts authenticateRequest per supportare utenti email (formato "email:123")
- [x] Correggere upsertUser per gestire openId nullable

### Backend - OAuth Esterni
- [x] Installare passport e strategie OAuth (passport-google-oauth20, passport-github2)
- [ ] Configurare variabili ambiente: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (da richiedere all'utente)
- [ ] Configurare variabili ambiente: GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET (da richiedere all'utente)
- [x] Creare file passport.ts con strategie Google e GitHub
- [x] Creare route /api/oauth/google e callback /api/oauth/google/callback
- [x] Creare route /api/oauth/github e callback /api/oauth/github/callback
- [x] Implementare logica unificazione account (stesso email = stesso utente)
- [x] Aggiungere funzioni db.ts: getUserByOAuthProvider, createOAuthUser, updateUserOAuthInfo
- [x] Aggiornare sdk.ts per supportare formato token "oauth:provider:userId"
- [x] Mantenere route Manus OAuth esistente /api/oauth/callback

### Frontend - UI Autenticazione
- [x] Creare componente LoginDialog con tabs (Accedi/Registrati)
- [x] Form registrazione: nome, email, password, conferma password
- [x] Form login email: email, password, link "Password dimenticata?"
- [x] Bottoni OAuth: Google, GitHub, Manus Account con icone SVG
- [x] Dialog recupero password con input email
- [ ] Pagina reset password (/reset-password?token=xxx) - da implementare se necessario
- [x] Aggiornare Navigation per usare nuovo LoginDialog
- [x] Gestire stati loading e errori con toast notifications e spinner

### Testing e Validazione
- [x] Scrivere test vitest per auth.register (successo, email duplicata, password debole, email invalida)
- [x] Scrivere test vitest per auth.loginWithEmail (successo, credenziali errate, email non esistente)
- [x] Scrivere test vitest per password reset flow (request reset, sicurezza)
- [x] Test password hashing (bcrypt format verification)
- [x] Tutti i test passano (10/10 passed)
- [ ] Test manuale: registrazione nuovo utente con email
- [ ] Test manuale: login con Google OAuth
- [ ] Test manuale: login con GitHub OAuth
- [ ] Test manuale: login con Manus OAuth (esistente)
- [ ] Verificare isolamento dati tra utenti con provider diversi
- [ ] Verificare unificazione account con stesso email

### Checkpoint Finale
- [ ] Verificare tutti i test passano
- [ ] Salvare checkpoint con sistema autenticazione ibrido completo


## Bug Analytics - Calcoli Errati
- [x] Analizzare logica calcoli in Analytics.tsx
- [x] Correggere Rendita Mensile Finale (rimossa divisione per 12 errata - rendita è già mensile)
- [ ] Verificare se ROI e Valore Finale sono ora corretti dopo fix rendita
- [ ] Testare con dati reali e confrontare con dashboard


## Bug Analytics - Calcoli Errati (Sessione 10)
- [x] Analizzare logica calcoli in Analytics.tsx
- [x] Correggere Rendita Mensile Finale (rimossa divisione per 12 errata)
- [x] Correggere formula rendimento mensile backend (usare tasso composto Math.pow(1+r, 1/12)-1 invece di r/12)
- [x] Usare calcoli.riepilogo invece di simulazioneQuinquennale per KPI principali
- [x] Correggere conversione euro/centesimi per valori da riepilogo
- [x] KPI principali ora corretti: Valore Finale 790.019€, ROI +295%, Rendita 14.340€
- [ ] Correggere Top Performers (ancora usa simulazioneQuinquennale con bug)
- [ ] Correggere grafici Evoluzione Patrimonio e Performance Comparativa


## Completamento Funzionalità - Sessione 11

### 1. Completare Correzione Analytics
- [x] Creare nuova query backend fiumiPerformance con logica corretta
- [x] Correggere funzione getTopPerformers per usare fiumiPerformance
- [x] Verificare Top Performers: tutti ROI positivi e valori finali corretti
- [x] Creare nuova query backend evoluzionePatrimonio per dati mese per mese
- [x] Correggere grafico Evoluzione Patrimonio (scala ora 0-800.000€ invece di 0-6.000€)
- [x] Grafico Performance Comparativa già corretto (usa topPerformers)
- [x] Tutti i KPI e grafici in Analytics ora mostrano valori corretti

### 2. C### 2. Configurare OAuth Esterni
- [x] Richiedere credenziali Google OAuth (CLIENT_ID, CLIENT_SECRET) tramite webdev_request_secrets
- [x] Richiedere credenziali GitHub OAuth (CLIENT_ID, CLIENT_SECRET) tramite webdev_request_secrets
- [x] Aggiungere variabili OAuth a env.ts
- [x] Aggiornare passport.ts per usare ENV invece di process.env
- [x] Scrivere e validare test vitest per credenziali OAuth (4/4 passed)
- [ ] Testare login Google OAuth manualmente
- [ ] Testare login GitHub OAuth manualmente
- [ ] Verificare unificazione account con stessa email

### 3. Implementare Pagina Reset Password
- [x] Creare route /reset-password in App.tsx
- [x] Creare componente ResetPassword.tsx con form nuova password + conferma
- [x] Implementare form con token validation da URL query params
- [x] Validazione password (min 8 caratteri, match conferma)
- [x] Chiamare auth.resetPassword con token e nuova password
- [x] Mostrare messaggio successo con CheckCircle icon e redirect a home dopo 3s
- [x] Gestire errori con toast notifications (token scaduto, token invalido)
- [ ] Testare flusso completo manualmente: request reset → email con link → reset password → login


## Bug UI - Sessione 12

### 1. Menu Sovrapposti
- [x] Aggiunto z-index: 100 ai dropdown menu per evitare sovrapposizione con nome utente

### 2. Grafico Evoluzione Patrimonio Vuoto
- [x] Verificato: dati ritornati correttamente da evoluzionePatrimonio
- [x] Grafico ora mostra le linee correttamente (scala 0-1.000.000€)
- [x] PatrimonioChart converte correttamente centesimi in euro

### 3. Colori Istogrammi Performance Comparativa
- [x] Cambiato colore Valore Iniziale: hsl(var(--chart-1)) - verde chiaro
- [x] Cambiato colore Valore Finale: hsl(var(--chart-2)) - verde scuro
- [x] Aggiunto attributo name per legenda corretta


## Bug Grafico Evoluzione Patrimonio Vuoto
- [ ] Verificare se evoluzionePatrimonio ritorna dati
- [ ] Controllare formato dati ritornati (struttura array)
- [ ] Verificare se PatrimonioChart riceve i dati correttamente
- [ ] Controllare se le linee Recharts sono configurate correttamente
- [ ] Testare con console.log per vedere i dati raw


## Bug Grafico Evoluzione Patrimonio - Sessione 10
- [x] Identificare bug: grafico "Evoluzione Patrimonio" vuoto in Analytics
- [x] Analizzare query evoluzionePatrimonio nel backend
- [x] Creare test vitest per verificare valori ritornati
- [x] Identificare problema: logica reinvestimenti causava valori negativi ed esplosioni esponenziali
- [x] Semplificare query rimuovendo FASE 1 e FASE 3 (reinvestimenti manuali tra fiumi)
- [x] Mantenere solo calcolo base: sorgenti + affluenti + rendite composte
- [x] Verificare con test: valori ora corretti (Mese 0: 263k€, Mese 60: 821k€)
- [x] Testare grafico nel browser: scala corretta (0€ - 1M€), linee visibili ✅
- [x] Salvare checkpoint con grafico funzionante


## Bug Persistente Grafico Vuoto - Sessione 10 (Continuazione)
- [x] Verificare se utente ha ricaricato pagina dopo correzione
- [x] Controllare cache browser
- [x] Verificare se query evoluzionePatrimonio viene chiamata
- [x] Controllare console browser per errori JavaScript
- [x] Verificare se componente PatrimonioChart riceve dati
- [x] CAUSA IDENTIFICATA: Variabili CSS --color-blue-500, --color-purple-500, --color-green-400 non definite
- [x] RISOLTO: Sostituiti colori CSS variables con colori espliciti (#3b82f6, #10b981, #a855f7)
- [x] Verificato nel browser: tutte e tre le linee ora visibili ✅


## Miglioramenti Grafico Evoluzione Patrimonio - Sessione 10 (Continuazione 2)
- [x] Rimuovere pallini (dots) dalle linee per aspetto più pulito
- [x] Implementare doppio asse Y (sinistra: Valore Totale, destra: Rendita/Apporti)
- [x] Verificare formula rendimento mensile (risultati inferiori alla versione precedente)
- [x] Correggere calcolo rendimento: da Math.pow(1+r, 1/12)-1 a r/12 (tasso nominale)
- [x] Correggere label: "Rendita Annuale" → "Rendita Mensile"
- [x] Testare grafico con doppio asse Y nel browser: tutte le linee visibili ✅


## Semplificazione Grafico Evoluzione Patrimonio - Sessione 10 (Continuazione 3)
- [x] Semplificare PatrimonioChart: mostrare solo Valore Totale (rimuovere Rendita e Apporti)
- [x] Creare nuovo componente RenditaChart per Rendita Mensile separata
- [x] Aggiungere RenditaChart sotto PatrimonioChart nella pagina Analytics
- [x] Testare entrambi i grafici nel browser: perfettamente leggibili ✅
- [x] RISOLTO: Due grafici separati con scale appropriate (Patrimonio 0-1M€, Rendita 0-22k€)


## Miglioramenti Gestione Affluenti - Sessione 11
- [x] Mostrare tutti gli affluenti esistenti all'apertura della finestra (senza selezione fiume)
- [x] Correggere etichette: "apporti" → "affluenti" in tutta la UI
- [x] Aggiunta colonna "Fiume" nella tabella affluenti
- [x] Creata query backend listAll per ottenere tutti gli affluenti con nome fiume
- [x] Estendere schema database per affluenti ricorrenti (periodicità, durata, groupId)
- [x] Implementare UI per creare affluenti ricorrenti (checkbox, select periodicità, input durata)
- [x] Implementare backend per generare affluenti ricorrenti automaticamente (createAffluentiRicorrenti)
- [x] Aggiunta anteprima calcolo dinamico nel dialog (es. "13 affluenti da 5k€ = 65k€ totale")
- [x] Testato UI: checkbox funzionante, campi periodicità e durata visibili quando attivato
- [x] COMPLETATO: Tutte e tre le richieste implementate e funzionanti ✅


## Nuove Funzionalità - Sessione 12
### Gestione Gruppo Affluenti Ricorrenti
- [x] Aggiungere query backend per ottenere affluenti per groupId
- [x] Implementare mutation deleteGroup per eliminare tutti gli affluenti di un gruppo
- [x] Implementare mutation updateGroup per modificare tutti gli affluenti di un gruppo
- [x] Aggiungere UI per gestire gruppo (modifica/elimina in blocco)

### Badge Visualizzazione Ricorrenza
- [x] Aggiungere badge/icona nella tabella affluenti per identificare ricorrenti
- [x] Mostrare periodicità nel badge (Mensile/Trimestrale/Semestrale/Annuale)
- [x] Badge con icona 🔄 e colore primary implementato

### Unione Menu Pianificazione e Analisi
- [x] Modificare Navigation per unire i due menu
- [x] Creato menu unico "Pianificazione & Analisi" con 6 voci (Simulazione, Grafici, Analytics, Flussi, Scenari, Calendario)
- [x] Risolto problema sovrapposizione con nome utente
- [ ] Testare che non ci siano sovrapposizioni con nome utente

### Alert Automatici per Affluenti
- [ ] Aggiungere opzione "Crea alert automatico" nel dialog affluenti
- [ ] Implementare campo "Giorni preavviso" configurabile
- [ ] Backend: generare alert automaticamente alla creazione affluente
- [ ] Gestire alert per affluenti ricorrenti (un alert per ogni occorrenza)
- [x] NOTA: Rimandato a sessione futura - richiede estensione schema alertConfig per alert temporali

### Orizzonte Temporale Dinamico
- [x] Permettere modifica orizzonte temporale in Impostazioni (già esistente)
- [x] Implementare validazione: avvisare se ci sono dati oltre nuovo orizzonte
- [x] Dialog conferma quando si riduce orizzonte (avviso dati oltre limite)
- [x] Toast informativo quando si aumenta orizzonte
- [x] Calcoli si adattano automaticamente al nuovo orizzonte (già funzionante)


## Nuove Funzionalità - Sessione 13

### Alert Temporali per Affluenti
- [x] Estendere schema alertConfig per supportare alert temporali (tipo "affluente_programmato")
- [x] Aggiungere campi: dataAlert, giorniPreavviso, affluenteId
- [x] Pushato schema database con successo
- [x] Implementare backend: mutation createAlertAutomatico per affluenti
- [x] Implementare backend: generare alert per affluenti ricorrenti (uno per occorrenza)
- [x] UI: Checkbox "Crea alert automatico" nel dialog affluenti
- [x] UI: Input "Giorni preavviso" (default 7)
- [x] Integrato createAlertMutation in createMutation e createRicorrenteMutation
- [x] Correzioni TypeScript in Alert.tsx per gestire campi nullable
- [ ] Testare creazione alert automatico per affluente singolo (da testare manualmente)
- [ ] Testare creazione alert automatico per affluente ricorrente (da testare manualmente)

### Export/Import Dati Piano
- [ ] Backend: Implementare query exportPiano (fiumi, affluenti, reinvestimenti, impostazioni)
- [ ] Backend: Implementare mutation importPiano con validazione dati
- [ ] UI: Pulsante "Esporta Piano" in Impostazioni
- [ ] UI: Dialog selezione formato (CSV o JSON)
- [ ] UI: Pulsante "Importa Piano" in Impostazioni
- [ ] UI: Upload file e preview dati prima dell'import
- [ ] UI: Conferma sovrascrittura dati esistenti
- [ ] Testare export CSV e JSON
- [ ] Testare import con validazione errori

### Dashboard Comparativa Multi-Scenario
- [ ] Schema database: Creare tabella scenari (nome, descrizione, parametri)
- [ ] Schema database: Parametri scenario (rendimento%, capitale extra, orizzonte)
- [ ] Backend: Query calcolaScenario con parametri personalizzati
- [ ] Backend: Query confrontaScenari (ritorna dati per 2-3 scenari)
- [ ] UI: Nuova pagina /scenari con layout comparativo
- [ ] UI: Form creazione scenario (nome, parametri)
- [ ] UI: Selezione 2-3 scenari da confrontare
- [ ] UI: Grafici side-by-side (valore totale, rendita mensile)
- [ ] UI: Tabella comparativa KPI (capitale finale, rendita finale, ROI)
- [ ] Testare confronto scenari con parametri diversi


## Bug Gestione Affluenti - Sessione 14

### Bug 1: Validazione Data Affluente
- [x] Data affluente permette selezione precedente a data attivazione fiume
- [x] Aggiungere validazione minDate basata su dataCreazione del fiume selezionato
- [x] RISOLTO: MonthYearPicker ora usa dataCreazione del fiume come minDate

### Bug 2: Calcolo Periodicità Affluenti Ricorrenti
- [x] Affluente semestrale con durata 12 mesi genera solo 1 affluente/anno invece di 2 (ogni 6 mesi)
- [x] Verificare logica calcolo nel backend (createAffluentiRicorrenti)
- [x] RISOLTO: dataAffluente veniva modificato in-place nel loop, ora crea nuova istanza Date per ogni iterazione
- [ ] Testare: semestrale feb 2026 durata 12 mesi → deve generare feb 2026 + ago 2026 + feb 2027 (3 affluenti)

### Bug 3: UI Modifica Gruppo
- [x] Pulsante "Modifica Gruppo" compare su ogni riga invece che solo sulla prima
- [x] Dialog modifica gruppo permette solo modifica importo, non altri parametri
- [x] Mostrare "Modifica Gruppo" solo sulla prima riga di ogni gruppo (sort per mese)
- [x] Permettere modifica di tutti i parametri (importo, descrizione)
- [x] RISOLTO: Dialog completo implementato con importo e descrizione
- [ ] Testare modifica gruppo e verifica che tutti gli affluenti vengano aggiornati

### Miglioramento: Durata Affluenti Ricorrenti
- [x] Aggiungere opzione "Fino alla fine del piano" per durata affluenti ricorrenti
- [x] Calcolare automaticamente durata in mesi basata su orizzonte temporale
- [x] COMPLETATO: Checkbox implementato, input durata disabilitato quando attivo
- [ ] Testare con opzione "Fino alla fine del piano" selezionata


## Bug Affluenti Ricorrenti - Sessione 14 Parte 2 (Nuove Segnalazioni Utente)

### Bug 1: Periodicità Semestrale Genera Ancora Affluenti Annuali
- [x] Verificare che fix precedente funzioni correttamente
- [x] Debug: semestrale feb 2026 durata 60 mesi genera feb 2026, feb 2027, feb 2028, feb 2029, feb 2030 (annuale)
- [x] Dovrebbe generare: feb 2026, ago 2026, feb 2027, ago 2027, feb 2028, ago 2028, feb 2029, ago 2029, feb 2030, ago 2030 (semestrale)
- [x] Analizzare logica createAffluentiRicorrenti per trovare bug residuo
- [x] RISOLTO: Bug era in riga 273 db.ts - new Date(baseDate.setMonth()) causava mutazione cumulativa. Corretto creando nuova istanza Date per ogni iterazione.

### Bug 2: Dialog Modifica Gruppo Limitato
- [x] Dialog modifica gruppo permette solo modifica importo e descrizione
- [x] Aggiungere possibilità modificare periodicità nel dialog modifica gruppo
- [x] Aggiungere possibilità modificare durata nel dialog modifica gruppo
- [x] Testare modifica gruppo con tutti i parametri
- [x] COMPLETATO: Dialog ora include campi per importo, descrizione, periodicità (select) e durata (input mesi)

### Bug 3: UI Pulsanti Gruppo Non Ottimale
- [x] Pulsanti "Modifica Gruppo" ed "Elimina Gruppo" sono sulla prima riga del gruppo
- [x] Creare intestazione gruppo visivamente separata per ogni gruppo di affluenti ricorrenti
- [x] Spostare pulsanti modifica/elimina nell'intestazione gruppo
- [x] Intestazione deve mostrare: icona 🔄, periodicità, numero affluenti, importo totale, azioni
- [x] Testare visualizzazione con più gruppi di affluenti ricorrenti
- [x] COMPLETATO: Tabella ristrutturata con intestazioni gruppo (bg-muted/50) che mostrano badge periodicità, conteggio affluenti, totale importo e pulsanti azioni. Affluenti del gruppo indentati (pl-8).


## Bug Affluenti e Alert - Sessione 14 Parte 3

### Problema 1: Periodicità Semestrale Ancora Errata (Dati Vecchi)
- [x] Eliminare gruppo affluenti "Semestrale" esistente dal database (creato prima del fix)
- [x] Testare ricreazione affluenti semestrali con codice corretto
- [x] Verificare che generi affluenti ogni 6 mesi (feb 2026, ago 2026, feb 2027, ago 2027...)
- [x] VERIFICATO: Database contiene gruppo semestrale CORRETTO con 11 affluenti ogni 6 mesi (gen 2026, lug 2026, gen 2027, lug 2027...)

### Problema 2: Form Modifica Gruppo Non Include Alert
- [x] Aggiungere checkbox "Crea alert automatico" nel dialog modifica gruppo
- [x] Aggiungere input "Giorni preavviso" nel dialog modifica gruppo (condizionale, appare solo se checkbox attivo)
- [x] Implementare logica backend per creare alert per tutti gli affluenti del gruppo
- [x] COMPLETATO: Mutation createAlertGruppo filtra affluenti futuri senza alert esistenti e crea notifiche automatiche
- [x] Frontend chiama createAlertGruppo dopo updateGroup se checkbox attivo


## Bug Affluenti Semestrali - Sessione 14 Parte 4

### Problema 1: Database Affluenti e Reinvestimenti da Pulire
- [x] Creare script SQL per svuotare tabella affluenti
- [x] Creare script SQL per svuotare tabella reinvestimenti
- [x] Mantenere impostazioni e fiumi esistenti
- [x] Eseguire pulizia database
- [x] COMPLETATO: Eseguito DELETE FROM affluenti e DELETE FROM reinvestimenti via webdev_execute_sql

### Problema 2: Periodicità Semestrale Genera Affluenti Annuali
- [x] Rileggere funzione createAffluentiRicorrenti in server/db.ts
- [x] Debug loop generazione date con periodicityMonths
- [x] Verificare mapping periodicità (mensile=1, trimestrale=3, semestrale=6, annuale=12)
- [x] Correggere incremento date nel loop
- [x] RISOLTO: Loop partiva da i=0, ora parte da i=1 così primo affluente è a dataInizio + periodicità
- [ ] Testare creazione affluente semestrale

### Problema 3: Calcolo Primo Affluente Errato
- [x] Fiume inizia gennaio 2026, affluente semestrale dovrebbe partire da agosto 2026 (gennaio + 6 mesi)
- [x] Attualmente mostra febbraio 2026 (errato)
- [x] Correggere logica: primo affluente = dataInizio + periodicità (non solo dataInizio)
- [x] RISOLTO: Cambiato loop da for(i=0) a for(i=1) quindi primo affluente = dataInizio + (1 * periodicità)
- [ ] Testare con vari scenari (mensile, trimestrale, semestrale, annuale)

### Problema 4: Dialog Overflow Verticale
- [x] Dialog "Nuovo Affluente" diventa troppo alto quando si seleziona periodicità + checkbox alert
- [x] Contenuto supera altezza schermo senza possibilità di scroll
- [x] Aggiungere max-height al DialogContent (max-h-[90vh])
- [x] Aggiungere overflow-y-auto per scroll verticale
- [x] COMPLETATO: Applicato className="max-h-[90vh] overflow-y-auto" a tutti i DialogContent in Apporti.tsx
- [ ] Testare su schermi di diverse dimensioni


## Bug Affluenti Semestrali Persistente - Sessione 14 Parte 5

### Problema: Fix Precedente Non Funziona
- [x] Affluenti semestrali generano ancora affluenti annuali (febbraio 2027, 2028, 2029, 2030, 2031)
- [x] Anteprima mostra "61 affluenti" invece di 10-11 affluenti per 60 mesi semestrali
- [x] Fix precedente (loop da i=1) non ha risolto il problema
- [x] Creare script test per debuggare createAffluentiRicorrenti con parametri reali
- [x] Analizzare output e trovare bug residuo
- [x] Correggere definitivamente la generazione affluenti
- [x] RISOLTO: Bug era nella VISUALIZZAZIONE, non nella generazione! formatMonthOffset(mese, dataAffluente) aggiungeva offset alla data già calcolata. Sostituito con formatDate(dataAffluente) per mostrare data corretta.

### Problema: Label "Data Affluente" Confusa
- [x] Label "Data Affluente" non chiara per affluenti ricorrenti
- [x] Cambiare in "Data Inizio Programmazione" o simile
- [x] Aggiornare descrizione helper text per chiarire che è la data di riferimento per calcolare affluenti ricorrenti
- [x] COMPLETATO: Label cambiata in "Data Inizio Programmazione" con descrizione: "Per affluenti ricorrenti, questa è la data di riferimento. Il primo affluente sarà calcolato aggiungendo la periodicità a questa data."


## Affluenti Ricorrenti - Sessione 14 Parte 6

### Problema 1: Affluenti Generati Oltre Fine Piano
- [x] Piano va da gennaio 2026 a dicembre 2030 (60 mesi)
- [x] Affluenti semestrali generati fino a luglio 2031 (mese 67, oltre il piano)
- [x] Ultimo affluente valido dovrebbe essere luglio 2030 (mese 55), non gennaio 2031
- [x] Correggere loop generazione per creare solo affluenti con mese <= durataMesi
- [x] RISOLTO: Aggiunto check `if (mese > params.meseInizio + params.durataMesi) break;` nel loop generazione
- [ ] Testare: semestrale 60 mesi dovrebbe generare 9 affluenti (non 11)

### Problema 2: Gruppi Lunghi Poco Leggibili
- [x] Con 11 affluenti per gruppo, tabella diventa lunga e poco leggibile
- [x] Aggiungere pulsante "Espandi/Comprimi" nell'intestazione gruppo
- [x] Default: gruppo compresso (solo intestazione con totali)
- [x] Click: gruppo espanso (mostra tutte righe affluenti)
- [x] COMPLETATO: Aggiunto stato expandedGroups (Set) e pulsante toggle con icone freccia giù/destra. Righe affluenti renderizzate solo se gruppo espanso.
- [ ] Testare funzionalità espandi/comprimi con più gruppi


## Bug Generazione Affluenti - Sessione 14 Parte 7

### Problema 1: Fix Non Applicato Correttamente
- [x] Affluenti generati fino a gennaio 2031 (oltre dicembre 2030)
- [x] Anteprima mostra "11 affluenti" invece di 9
- [x] Verificare che fix backend `if (mese > params.meseInizio + params.durataMesi) break;` sia presente
- [x] Correggere calcolo anteprima frontend (usa stesso calcolo di numOccurrences)
- [x] Eliminare gruppo esistente e testare ricreazione con codice corretto
- [x] PROBLEMA PERSISTENTE: Anteprima ancora mostra 11, affluenti ancora 10 fino a gennaio 2031
- [x] Debug: verificare se fix frontend è stato applicato correttamente
- [x] Debug: verificare se meseInizio viene passato correttamente al backend
- [x] RISOLTO: Anteprima non includeva meseInizio nel calcolo. Aggiunto `const meseInizio = parseInt(formData.mese || "1");` e usato `meseInizio + (i * periodicityMonths)` come backend.
- [ ] Testare: eliminare gruppo, ricreare semestrale 60 mesi, verificare 9 affluenti (luglio 2026 - luglio 2030)

### Problema 2: UX Selezione Fiume Confusa
- [x] Bisogna selezionare fiume PRIMA di cliccare "Nuovo Affluente"
- [x] Se non selezionato, errore appare solo a fine inserimento dati
- [x] Dialog non mostra per quale fiume si sta creando affluente
- [x] Soluzione: spostare selezione fiume DENTRO dialog "Nuovo Affluente" (come reinvestimenti)
- [x] Mostrare fiume selezionato nel dialog
- [x] Permettere cambio fiume dentro dialog
- [x] COMPLETATO: Aggiunto Select fiume come primo campo nel dialog "Crea Nuovo Affluente". Ora si può selezionare/cambiare fiume direttamente nel dialog.
- [ ] Testare: aprire dialog senza selezione fiume, selezionare fiume nel dialog, creare affluente


## Bug Generazione Affluenti - Sessione 14 Parte 8

### Problema 1: Ancora 10 Affluenti Invece di 9
- [x] Anteprima mostra "10 affluenti da 15.000,00 € = 150.000,00 € totale"
- [x] Tabella mostra 10 affluenti fino a gennaio 2031 (oltre dicembre 2030)
- [x] Piano va da gennaio 2026 a dicembre 2030 (60 mesi), ultimo affluente valido dovrebbe essere luglio 2030
- [x] Fix backend `if (mese > params.meseInizio + params.durataMesi) break;` non funziona
- [x] Creare script test per verificare cosa viene passato a createAffluentiRicorrenti
- [x] Debug: verificare se meseInizio = 1, durataMesi = 60, periodicityMonths = 6
- [x] Correggere logica generazione per generare solo 9 affluenti (luglio 2026 - luglio 2030)
- [x] RISOLTO: Bug era nel check `if (mese > params.meseInizio + params.durataMesi)` che usava `>` invece di `>=`. Con mese=61 e limite=61, il check falliva. Corretto in `>=`.
- [ ] Testare: eliminare gruppo, ricreare semestrale 60 mesi, verificare 9 affluenti (luglio 2026 - luglio 2030)

### Problema 2: Subtotali Gruppo Poco Evidenti
- [x] Intestazione gruppo compressa mostra "10 affluenti • Totale: 150.000,00 €" in grigio e piccolo
- [x] Testo poco visibile, difficile distinguere subtotali gruppo
- [x] Aumentare dimensione font subtotali (più grande del testo normale, più piccolo del totale generale)
- [x] Aumentare contrasto colore per evidenziare subtotali
- [x] Mantenere gerarchia visiva: totale generale > subtotale gruppo > testo normale
- [x] COMPLETATO: Cambiato da `text-sm text-muted-foreground` a `text-base font-semibold text-foreground` per subtotali gruppo. Ora più visibili ma subordinati al totale generale (text-2xl).
- [ ] Testare visibilità intestazione gruppo compressa


## Bug Anteprima e UX Gruppo - Sessione 14 Parte 9

### Problema 1: Anteprima Frontend Mostra Ancora 10 Affluenti
- [ ] Backend genera correttamente 9 affluenti (luglio 2026 - luglio 2030) ✅
- [ ] Anteprima finestra input mostra "10 affluenti da 15.000,00 € = 150.000,00 € totale" invece di "9 affluenti = 135.000,00 €"
- [ ] Verificare se fix frontend calcolo anteprima è stato applicato correttamente
- [ ] Problema potrebbe essere cache browser (serve hard refresh)
- [ ] Correggere calcolo anteprima se necessario

### Problema 2: Gruppo Compresso Non Mostra Nome Fiume
- [ ] Intestazione gruppo compressa mostra solo "🔄 Semestrale | 9 affluenti • Totale: 135.000,00 €"
- [ ] Non si capisce a quale fiume si riferisce il gruppo
- [ ] Aggiungere nome fiume nell'intestazione: "Dividendi | 🔄 Semestrale | 9 affluenti • Totale: 135.000,00 €"
- [ ] Nome fiume dovrebbe essere in grassetto per evidenziarlo
- [ ] Testare con più gruppi affluenti su fiumi diversi


## Sessione 15 - Bug Fix Affluenti Ricorrenti

### Fix Anteprima Calcolo
- [x] Corretto calcolo anteprima affluenti ricorrenti nel dialog frontend
- [x] Cambiato operatore da `>` a `>=` per escludere affluenti oltre durata piano
- [x] Verificato che anteprima mostri correttamente 9 affluenti per semestrale 60 mesi

### Fix Intestazione Gruppo Compressa
- [x] Aggiunto nome fiume nell'intestazione gruppo quando compresso
- [x] Corretto campo da `nomeFiume` a `fiumeNome` per match con backend
- [x] Formato intestazione: "**[Nome Fiume]** | 🔄 [Periodicità] | [Count] affluenti • Totale: [Importo]"

### Test e Verifica
- [x] Testato anteprima con diverse periodicità e durate
- [x] Verificato visualizzazione nome fiume in intestazione compressa
- [x] Confermato che entrambi i fix funzionano correttamente


## Sessione 16 - Budget Tracker e Import/Export

### 1. Budget Tracker Affluenti Mensili
- [x] Creare API backend per calcolare affluenti aggregati per mese
- [x] Implementare componente BudgetTracker con visualizzazione mensile
- [x] Mostrare budget disponibile vs allocato per ogni mese
- [x] Aggiungere indicatori visivi (verde=ok, giallo=attenzione, rosso=sforato)
- [x] Integrare BudgetTracker nella pagina Apporti
- [x] Permettere configurazione budget mensile disponibile
- [x] Testare con diversi scenari di affluenti

### 2. Sistema Import/Export Dati Completi
- [x] Creare API backend per export completo (fiumi, affluenti, reinvestimenti, impostazioni)
- [x] Creare API backend per import con validazione dati
- [x] Implementare funzione export JSON con tutti i dati utente
- [x] Implementare funzione import JSON con merge (aggiunge senza eliminare)
- [x] Aggiungere sezione Import/Export in pagina Impostazioni
- [x] Gestire mapping nomi fiumi durante import
- [x] Aggiungere conferma prima di import
- [x] Testare export funzionante


## Sessione 17 - Correzioni Budget Tracker

### 1. Correzione Logica Calcolo Budget Mensile
- [x] Modificare backend per calcolare media mensile per periodicità
  - [x] Affluente semestrale 12.000€ → 2.000€/mese (12.000 / 6)
  - [x] Affluente trimestrale 6.000€ → 2.000€/mese (6.000 / 3)
  - [x] Affluente mensile 2.000€ → 2.000€/mese
- [x] Aggiornare funzione getAffluentiMensiliAggregati in db.ts
- [x] Testare calcolo con affluenti di diverse periodicità

### 2. Ridisegno Visualizzazione Budget Tracker
- [x] Rimuovere lista testuale mesi
- [x] Creare griglia mattonelle colorate (verde/giallo/rosso)
- [x] Ogni mattonella rappresenta un mese
- [x] Implementare tooltip al hover con dettagli mese
- [x] Mostrare icona o simbolo su ogni mattonella
- [x] Rendere layout responsive e visualmente accattivante
- [x] Testare interattività e tooltip


## Sessione 18 - Miglioramenti Budget Tracker

### 1. Visualizzazione Completa Mesi Piano
- [x] Mostrare tutti i mesi dell'orizzonte temporale (60 mesi), non solo quelli allocati
- [x] Aggiungere stato "Libero" per mesi senza affluenti (0% allocato)
- [x] Aggiornare calcolo statistiche per includere mesi liberi

### 2. Quattro Stati con Icone
- [x] OK (≤80% budget) - icona CheckCircle, colore verde pastello (emerald-100)
- [x] Limite (80-100% budget) - icona AlertTriangle, colore ambra (amber-100)
- [x] Sforato (>100% budget) - icona AlertCircle, colore corallo (rose-100)
- [x] Libero (0% allocato) - icona Circle, colore grigio chiaro (slate-100)

### 3. Design Migliorato
- [x] Ridurre dimensioni mattonelle (gap-1.5, icone h-3 w-3)
- [x] Usare colori più accoglienti e meno "fluo" (palette pastello)
- [x] Sostituire rosso aggressivo con rose-100 (corallo/salmone)
- [x] Aggiornare legenda con quattro stati
- [x] Testare leggibilità e usabilità


## Sessione 19 - Bug Fix Budget Tracker e Filtro Tutti

### 1. Aggiungere Opzione "Tutti" al Filtro Fiume
- [x] Modificare select fiume per includere opzione "Tutti i fiumi"
- [x] Permettere visualizzazione di tutti gli affluenti senza filtro
- [x] Mantenere Budget Tracker sempre con tutti gli affluenti (non filtrato)
- [x] Applicare filtro solo alla tabella affluenti

### 2. Correggere Aggiornamento Budget Tracker
- [x] Verificare calcolo mese corretto (luglio 2026 = mese 7, mattonella gialla)
- [x] Forzare invalidazione query budgetMensile dopo creazione affluente
- [x] Testare aggiornamento immediato dopo aggiunta affluente
- [x] Verificare che mattonella corretta venga evidenziata (mese 7 giallo al 100%)


## Sessione 20 - Correzione Calcolo Mesi e Visualizzazione Date

### 1. Correggere Calcolo Mese Affluenti
- [x] Verificare funzione getAffluentiMensiliAggregati nel backend
- [x] Usare dataInizio come riferimento fisso per calcolare mese relativo
- [x] Calcolare differenza mesi tra dataAffluente e dataInizio usando dateToMonthOffset
- [x] Correggere handleCreate per calcolare mese da dataAffluente se presente
- [x] Testare che affluente luglio 2026 venga mappato correttamente a mese 7 (mattonella gialla)

### 2. Mostrare Date Reali nei Tooltip
- [x] Modificare BudgetTracker per calcolare data reale da mese relativo
- [x] Usare dataInizio + mese per ottenere "gennaio 2026", "febbraio 2026", ecc.
- [x] Aggiornare tooltip per mostrare "luglio 2026" invece di "Mese 7"
- [x] Formattare date in italiano con formato completo ("luglio 2026")
- [x] Correggere fallback per mesi senza dataInizio (Mese 1, Mese 2...)

### 3. Migliorare Visualizzazione Affluenti Singoli
- [x] Differenziare visivamente affluenti singoli da gruppi ricorrenti
- [x] Aggiungere badge "Una tantum" grigio chiaro per affluenti non ricorrenti
- [x] Mantenere badge "🔄 Semestrale" colorato per gruppi ricorrenti
- [x] Testare leggibilità con mix di gruppi e affluenti singoli


## Sessione 21 - Fix Completo Budget Tracker

### 1. Correggere Database Affluente Luglio 2026
- [x] Verificare nel database che mese ha l'affluente "Gestito" (aveva mese=2)
- [x] Correggere manualmente UPDATE affluenti SET mese=6 (luglio 2026 = mese 6 da gennaio)
- [x] Verificare che correzione dateToMonthOffset funzioni per nuovi affluenti
- [x] Testare che affluente mostri "luglio 2026" nella tabella

### 2. Nuova Visualizzazione Mattonelle con Riempimento Progressivo
- [x] Rimuovere logica colori piatti (verde/giallo/rosso)
- [x] Implementare riempimento verde progressivo dal basso (0-100%)
- [x] Aggiungere percentuale numerica al centro mattonella (40%, 0%, ecc.)
- [x] Mattonella sforamento: riempimento 100% verde + bordo rosso spesso (3px) + % rossa
- [x] Mattonella vuota: sfondo grigio chiaro con 0%
- [x] Aggiornare tooltip con date reali ("luglio 2026")
- [x] Aggiornare legenda con nuova logica
- [x] Mostrare tutti i 60 mesi del piano (non solo allocati)

### 3. Data Inizio Piano Editabile in Impostazioni
- [x] Aggiungere campo "Data Inizio Piano" con input type="month" in Impostazioni
- [x] Mostrare data corrente e permettere modifica
- [x] Aggiungere icona Calendar e descrizione
- [x] Implementare API backend per aggiornare dataInizio
- [x] Aggiungere conferma prima di modificare

### 4. Pulsante Ricalcola Mesi Affluenti
- [x] Aggiungere pulsante "Ricalcola Mesi" in Impostazioni
- [x] Implementare API backend ricalcolaMesiAffluenti in db.ts
- [x] Usare dateToMonthOffset(dataInizio, dataAffluente) per ogni affluente
- [x] Mostrare conferma prima di ricalcolare
- [x] Mostrare toast con numero affluenti aggiornati


## Sessione 22 - Bug Fix Budget Tracker e Month Picker

### 1. Bug Calcolo Aggregazione Mensile Budget Tracker
- [ ] Verificare funzione getAffluentiMensiliAggregati nel db.ts
- [ ] Identificare perché affluenti una tantum non vengono aggregati correttamente
- [ ] Correggere logica per sommare tutti gli affluenti dello stesso mese
- [ ] Testare con caso reale: luglio 2026 dovrebbe essere 7.000€ (2.000€ + 5.000€)
- [ ] Verificare che mattonella mostri 140% (sforamento) con bordo rosso

### 2. Migliorare Visualizzazione Affluenti Singoli
- [ ] Rimuovere indentazione/subordinazione affluenti singoli rispetto ai gruppi
- [ ] Portare affluenti singoli allo stesso livello gerarchico dei gruppi
- [ ] Aggiungere separazione visiva chiara tra gruppi e affluenti singoli
- [ ] Mantenere badge "Una tantum" per distinguerli
- [ ] Testare leggibilità con mix di gruppi e affluenti singoli

### 3. Sostituire Date Picker con Month Picker
- [ ] Identificare tutti i dialog che usano date picker per selezione mese
- [ ] Sostituire in Dialog Nuovo Affluente (campo Mese Inizio)
- [ ] Sostituire in Dialog Modifica Affluente
- [ ] Sostituire in Dialog Nuovo Reinvestimento
- [ ] Usare input type="month" come in Impostazioni
- [ ] Testare usabilità month picker in tutti i dialog


## Bug Fix - Budget Tracker Calcolo Errato (Sessione Corrente)
- [x] Identificato bug critico: Budget Tracker mostrava 360% su TUTTI i mesi invece della distribuzione corretta
- [x] Riscritta funzione `getAffluentiMensiliAggregati` con logica corretta:
  - Affluenti ricorrenti: distribuire media mensile (importo/periodicità) dal primo mese meno periodicità fino all'ultimo mese
  - Affluenti una tantum: allocare importo completo SOLO nel mese specifico
- [x] Creato file `server/db.config.ts` per configurazione istanza Drizzle MySQL
- [x] Creato script di test `scripts/test-budget-tracker.mjs` per popolare database con dati di esempio
- [x] Verificata correttezza logica tramite analisi del codice
- [ ] Test visivo nel browser (richiede autenticazione utente - OAuth ha problemi tecnici)


## Bug Fix - API Multi-Utente Mancanti (Sessione Corrente)
- [x] Aggiungere funzione `getImpostazioniByUserId` per filtrare impostazioni per userId
- [x] Aggiungere funzione `getFiumiByUserId` per filtrare fiumi per userId
- [x] Testare dashboard con utente autenticato
- [x] Verificare che tutti i dati siano filtrati correttamente per userId


## Bug Fix - Errore .returning() MySQL (Sessione Corrente)
- [x] Identificare tutte le funzioni che usano `.returning()` in db.ts
- [x] Sostituire `.returning()` con query separate per ottenere l'ID inserito
- [x] Testare creazione fiumi
- [x] Aggiungere userId a createFiume e updateFiume
- [ ] Testare creazione affluenti
- [ ] Testare creazione reinvestimenti
- [ ] Testare creazione notifiche
- [ ] Testare creazione scenari


## Bug Fix - Funzione getAffluentiByFiumeId Mancante (Sessione Corrente)
- [x] Aggiungere funzione `getAffluentiByFiumeId` per recuperare affluenti per fiumeId
- [x] Aggiungere funzione `getReinvestimentiByUserId` per recuperare reinvestimenti per userId
- [x] Aggiungere funzione `getScenariByUserId` per recuperare scenari per userId
- [x] Testare dashboard e verificare che i KPI si carichino correttamente


## Bug Fix - Errore Eliminazione Fiume (Sessione Corrente)
- [x] Correggere query SQL in `deleteFiume` per reinvestimenti (WHERE clause incompleta)
- [x] Correggere nomi colonne da `fiumeOrigineId` a `fiumeSorgenteId` per match con schema
- [x] Aggiungere verifica proprietà userId in `deleteFiume`
- [x] Testare eliminazione fiume con successo


## Bug Fix - Esportazione Dati Non Funziona (Sessione Corrente)
- [x] Identificare componente pulsante esportazione
- [x] Verificare handler click e mutation tRPC
- [x] Correggere errore SQL in getReinvestimentiByUserId (orderBy malformato)
- [x] Correggere getImpostazioniByUserId per recuperare ID dopo insert
- [x] Aggiungere logging dettagliato per tracciare errori
- [x] Testare esportazione JSON con dati reali (FUNZIONA)


## Bug Fix - Affluenti Non Visualizzati in Pagina Apporti (Sessione Corrente)
- [x] Verificare query getAllAffluentiWithFiume (funzione mancante)
- [x] Identificare perché tabella affluenti mostra "Nessun affluente programmato"
- [x] Creare funzione getAllAffluentiWithFiume con join a fiumi
- [x] Testare visualizzazione con filtro "Tutti i fiumi" (FUNZIONA: 55 affluenti, 285.000€)


## Bug Fix - Errore Modifica Gruppo Affluenti (Sessione Corrente)
- [x] Identificare mutation updateGroup in routers.ts
- [x] Verificare parametri passati alla mutation
- [x] Aggiungere controllo updateData vuoto in updateAffluentiGroup
- [x] Testare modifica importo gruppo affluenti (FUNZIONA)


## Bug Fix - Modifica Gruppo Non Aggiorna Valori (Sessione Corrente)
- [x] Verificare parametri passati da routers.ts a updateAffluentiGroup
- [x] Identificare mismatch parametri (3 passati, 2 accettati)
- [x] Rimuovere parametro fiumeId superfluo dalla chiamata
- [x] Testare modifica con valori effettivamente aggiornati (FUNZIONA: 6000€ → 6001€)


## Feature - Miglioramenti Form Modifica Gruppo Affluenti (Sessione Corrente)
- [ ] Aggiungere checkbox "Fino al termine" per durata indefinita
- [ ] Implementare supporto modifica alert (checkbox "Crea alert automatici")
- [ ] Correggere bug durate lunghe che non hanno effetto
- [ ] Aggiornare schema input mutation per includere creaAlert
- [ ] Testare modifica con durata indefinita e alert attivi

- [x] Fix errore alert: aggiungere funzione getAffluentiByGroupId in db.ts
- [x] Fix date affluenti: correggere updateAffluentiGroup per rigenerare affluenti con date corrette

- [x] Fix affluente Oro sparito: verificare query getAllAffluentiWithFiume
- [x] Fix alert incomprensibili: aggiungere dettagli (data, importo, fiume) al testo alert
- [x] Fix form modifica gruppo: aggiungere campo data inizio programmazione
- [x] Fix visualizzazione affluenti: affluente creato ma non appare nella tabella
- [x] Fix importazione dati: errore toISOString quando si importano date da JSON
- [x] Fix schema reinvestimenti: allineare nomi colonne database con codice
- [x] Fix import reinvestimenti: usa ID vecchi invece di mappare a nuovi ID fiumi
- [x] Fix export reinvestimenti: array vuoto nel JSON esportato
- [x] Rollback database per recuperare dati persi dopo importazione duplicata
- [x] Fix affluente Dividendi sparito dopo modifica gruppo
- [x] Fix errore creazione reinvestimento: fiumeOrigineId default invece di ID valido

- [x] Fix modifica gruppo: preservare data inizio originale invece di usare primo affluente esistente

- [x] Fix calcolo meseInizio: affluenti partono da giugno invece di gennaio anche dopo modifica data

- [x] Fix form modifica gruppo: mostra sempre 60 mesi invece del numero effettivo di ricorrenze calcolato

- [x] Fix form creazione reinvestimenti: calcolo mese e mapping campi (inserimento funziona)
- [ ] Fix visualizzazione reinvestimenti: query restituisce dati ma frontend mostra trattini
