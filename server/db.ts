import { db } from "./db.config";
import { 
  fiumi, 
  affluenti, 
  reinvestimenti, 
  impostazioni, 
  notifiche, 
  alertConfig, 
  scenari, 
  scenarioSnapshots,
  users,
  passwordResetTokens,
} from "../drizzle/schema";
import { eq, and, gte, lte, desc, asc, sql, inArray } from "drizzle-orm";
import { dateToMonthOffset } from './dateUtils';

// ============================================================================
// IMPOSTAZIONI
// ============================================================================

export async function getImpostazioni() {
  const result = await db.select().from(impostazioni).limit(1);
  if (result.length === 0) {
    // Return defaults without persisting (userId required for insert)
    return {
      id: 0,
      userId: 0,
      obiettivoMensile: 20000,
      orizzonteTemporale: 60,
      budgetMensileAffluenti: 5000,
      dataInizio: new Date('2026-01-01'),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
  return result[0];
}

export async function getImpostazioniByUserId(userId: number) {
  const result = await db.select().from(impostazioni).where(eq(impostazioni.userId, userId)).limit(1);
  if (result.length === 0) {
    // Create default settings for this user
    const defaultSettings = {
      userId,
      obiettivoMensile: 2000000, // 20000 euro in cents
      orizzonteTemporale: 60, // 5 years in months
      budgetMensileAffluenti: 500000, // 5000 euro in cents
      dataInizio: new Date('2026-01-01'),
    };
    await db.insert(impostazioni).values(defaultSettings);
    // Retrieve the inserted record with auto-generated ID
    const inserted = await db.select().from(impostazioni).where(eq(impostazioni.userId, userId)).limit(1);
    return inserted[0];
  }
  return result[0];
}

export async function updateImpostazioni(
  userId: number,
  params: {
    obiettivoMensile?: number;
    orizzonteTemporale?: number;
    budgetMensileAffluenti?: number;
    dataInizio?: Date;
  }
) {
  const current = await getImpostazioniByUserId(userId);
  if (!current) throw new Error("Impostazioni non trovate");
  await db.update(impostazioni).set(params).where(eq(impostazioni.userId, userId));
  return getImpostazioniByUserId(userId);
}

// ============================================================================
// FIUMI
// ============================================================================

export async function getFiumi() {
  return db.select().from(fiumi).orderBy(asc(fiumi.nome));
}

export async function getFiumiByUserId(userId: number) {
  return db.select().from(fiumi).where(eq(fiumi.userId, userId)).orderBy(asc(fiumi.nome));
}

export async function getFiumeById(id: number) {
  const result = await db.select().from(fiumi).where(eq(fiumi.id, id));
  return result[0] || null;
}

export async function createFiume(params: {
  userId: number;
  nome: string;
  sorgente: number;
  rendimento: number;
  meseCreazione: number;
  dataCreazione?: Date | null;
  percentualeReinvestimento?: number | null;
}) {
  const result = await db.insert(fiumi).values(params).returning({ id: fiumi.id });
  return getFiumeById(result[0].id);
}

export async function updateFiume(
  id: number,
  userId: number,
  params: {
    nome?: string;
    sorgente?: number;
    rendimento?: number;
    meseCreazione?: number;
    dataCreazione?: Date | null;
    percentualeReinvestimento?: number | null;
  }
) {
  await db.update(fiumi).set(params).where(and(eq(fiumi.id, id), eq(fiumi.userId, userId)));
  return getFiumeById(id);
}

export async function deleteFiume(id: number, userId: number) {
  // Verify ownership first
  const fiume = await db.select().from(fiumi).where(and(eq(fiumi.id, id), eq(fiumi.userId, userId))).limit(1);
  if (fiume.length === 0) {
    throw new Error('Fiume not found or unauthorized');
  }
  
  // Delete related affluenti first
  await db.delete(affluenti).where(eq(affluenti.fiumeId, id));
  // Delete related reinvestimenti (both source and target)
  await db.delete(reinvestimenti).where(eq(reinvestimenti.fiumeOrigineId, id));
  await db.delete(reinvestimenti).where(eq(reinvestimenti.fiumeDestinazioneId, id));
  // Delete fiume
  await db.delete(fiumi).where(and(eq(fiumi.id, id), eq(fiumi.userId, userId)));
  return { success: true };
}

// ============================================================================
// AFFLUENTI
// ============================================================================

export async function getAffluenti(fiumeId?: number) {
  if (fiumeId) {
    return db
      .select({
        affluente: affluenti,
        fiumeNome: fiumi.nome,
      })
      .from(affluenti)
      .leftJoin(fiumi, eq(affluenti.fiumeId, fiumi.id))
      .where(eq(affluenti.fiumeId, fiumeId))
      .orderBy(asc(affluenti.mese));
  }
  return db
    .select({
      affluente: affluenti,
      fiumeNome: fiumi.nome,
    })
    .from(affluenti)
    .leftJoin(fiumi, eq(affluenti.fiumeId, fiumi.id))
    .orderBy(asc(affluenti.mese));
}

export async function getAffluentiByFiumeId(fiumeId: number) {
  return db.select().from(affluenti).where(eq(affluenti.fiumeId, fiumeId)).orderBy(asc(affluenti.mese));
}

export async function getAllAffluentiWithFiume(userId: number) {
  const result = await db
    .select({
      affluente: affluenti,
      fiumeNome: fiumi.nome,
    })
    .from(affluenti)
    .leftJoin(fiumi, eq(affluenti.fiumeId, fiumi.id))
    .where(eq(fiumi.userId, userId))
    .orderBy(asc(affluenti.mese));
  
  return result.map(r => ({
    ...r.affluente,
    fiumeNome: r.fiumeNome,
  }));
}

export async function createAffluente(params: {
  fiumeId: number;
  importo: number;
  mese: number;
  dataAffluente?: Date | null;
  descrizione?: string | null;
}) {
  const result = await db.insert(affluenti).values({
    ...params,
    ricorrente: false,
    periodicita: null,
    durataMesi: null,
    groupId: null,
  }).returning({ id: affluenti.id });
  const inserted = await db.select().from(affluenti).where(eq(affluenti.id, result[0].id)).limit(1);
  return inserted[0];
}

export async function createAffluentiRicorrenti(params: {
  fiumeId: number;
  importo: number;
  meseInizio: number;
  dataAffluente?: Date | null;
  descrizione?: string | null;
  periodicita: number; // 1=monthly, 3=quarterly, 6=semestral, 12=annual
  durataMesi: number; // duration in months
  orizzonteTemporale?: number; // se fornito, gli apport oltre questo mese vengono esclusi
}) {
  const groupId = `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const affluentiToCreate = [];

  // La data base è quella del primo apporto (obbligatoria)
  const baseDate = params.dataAffluente || new Date();

  // Il primo apporto parte esattamente a meseInizio.
  // Il numero di apport richiesti è floor(durataMesi / periodicita).
  const numRichiesti = Math.floor(params.durataMesi / params.periodicita);

  // Se è fornito l'orizzonte temporale, calcola quanti apport rientrano nel piano.
  // L'ultimo apport valido è il più grande i tale che meseInizio + i*periodicita <= orizzonteTemporale.
  const numNelPiano = params.orizzonteTemporale !== undefined
    ? params.meseInizio <= params.orizzonteTemporale
      ? Math.floor((params.orizzonteTemporale - params.meseInizio) / params.periodicita) + 1
      : 0
    : numRichiesti;

  const numApporti = Math.min(numRichiesti, numNelPiano);
  const esclusi = numRichiesti - numApporti;

  for (let i = 0; i < numApporti; i++) {
    const currentMese = params.meseInizio + (i * params.periodicita);

    // La data di ogni apporto è calcolata aggiungendo i*periodicita mesi alla data base
    const currentDate = new Date(baseDate);
    currentDate.setMonth(currentDate.getMonth() + (i * params.periodicita));

    affluentiToCreate.push({
      fiumeId: params.fiumeId,
      importo: params.importo,
      mese: currentMese,
      dataAffluente: currentDate,
      descrizione: params.descrizione,
      ricorrente: true,
      periodicita: params.periodicita,
      durataMesi: params.durataMesi,
      groupId,
    });
  }
  
  if (affluentiToCreate.length > 0) {
    await db.insert(affluenti).values(affluentiToCreate);
  }
  
  return { count: affluentiToCreate.length, groupId, esclusi };
}

export async function updateAffluente(
  id: number,
  userId: number,
  params: {
    importo?: number;
    mese?: number;
    dataAffluente?: Date | null;
    descrizione?: string | null;
  }
) {
  const check = await db
    .select({ id: affluenti.id })
    .from(affluenti)
    .innerJoin(fiumi, eq(affluenti.fiumeId, fiumi.id))
    .where(and(eq(affluenti.id, id), eq(fiumi.userId, userId)))
    .limit(1);
  if (check.length === 0) throw new Error("Affluente non trovato o non autorizzato");

  await db.update(affluenti).set(params).where(eq(affluenti.id, id));
  const updated = await db.select().from(affluenti).where(eq(affluenti.id, id)).limit(1);
  return updated[0];
}

export async function getAffluentiByGroupId(groupId: string) {
  return db
    .select()
    .from(affluenti)
    .where(eq(affluenti.groupId, groupId))
    .orderBy(asc(affluenti.mese));
}

export async function updateAffluentiGroup(
  groupId: string,
  userId: number,
  params: {
    importo?: number;
    descrizione?: string | null;
    periodicita?: number;
    durataMesi?: number;
    dataInizio?: Date;
  }
) {
  // Verifica ownership
  const check = await db
    .select({ id: affluenti.id })
    .from(affluenti)
    .innerJoin(fiumi, eq(affluenti.fiumeId, fiumi.id))
    .where(and(eq(affluenti.groupId, groupId), eq(fiumi.userId, userId)))
    .limit(1);
  if (check.length === 0) throw new Error("Gruppo non trovato o non autorizzato");

  // Get all affluenti in the group
  const groupAffluenti = await db
    .select()
    .from(affluenti)
    .where(eq(affluenti.groupId, groupId))
    .orderBy(asc(affluenti.mese));
  
  if (groupAffluenti.length === 0) {
    throw new Error("Group not found");
  }
  
  const firstAffluente = groupAffluenti[0];
  
  // If periodicita or durataMesi changed, we need to regenerate the group
  if (params.periodicita !== undefined || params.durataMesi !== undefined) {
    const newPeriodicita = params.periodicita ?? firstAffluente.periodicita ?? 1;
    const newDurataMesi = params.durataMesi ?? firstAffluente.durataMesi ?? 12;
    const newImporto = params.importo ?? firstAffluente.importo;
    const newDescrizione = params.descrizione !== undefined ? params.descrizione : firstAffluente.descrizione;
    
    // Get fiume to retrieve correct dataCreazione
    const fiume = await getFiumeById(firstAffluente.fiumeId);
    if (!fiume) {
      throw new Error("Fiume not found");
    }
    
    // Delete old affluenti
    await db.delete(affluenti).where(eq(affluenti.groupId, groupId));
    
    // Use provided dataInizio or first affluente's dataAffluente as starting point
    const dataAffluente = params.dataInizio || firstAffluente.dataAffluente || fiume.dataCreazione || new Date('2026-01-01');
    
    // Calculate meseInizio from dataAffluente relative to impostazioni.dataInizio (NOT fiume.dataCreazione)
    const settings = await getImpostazioniByUserId(userId);
    const pianoDataInizio = settings.dataInizio || new Date('2026-01-01');
    const meseInizio = dateToMonthOffset(pianoDataInizio, dataAffluente);
    
    // Recalculate actual durataMesi: how many affluenti fit between meseInizio and end of plan
    const orizzonteTemporale = settings.orizzonteTemporale || 60;
    const mesiRimanenti = orizzonteTemporale - meseInizio;
    const actualDurataMesi = Math.max(1, Math.min(newDurataMesi, mesiRimanenti));
    
    // Recreate with new parameters using the correct fiume.id
    const result = await createAffluentiRicorrenti({
      fiumeId: fiume.id,
      importo: newImporto,
      meseInizio,
      dataAffluente,
      descrizione: newDescrizione,
      periodicita: newPeriodicita,
      durataMesi: actualDurataMesi,
    });
    
    return result;
  } else {
    // Just update importo and/or descrizione for all affluenti in group
    const updateData: any = {};
    if (params.importo !== undefined) updateData.importo = params.importo;
    if (params.descrizione !== undefined) updateData.descrizione = params.descrizione;
    
    // Only update if there are values to set
    if (Object.keys(updateData).length > 0) {
      await db.update(affluenti).set(updateData).where(eq(affluenti.groupId, groupId));
    }
    
    return { count: groupAffluenti.length, groupId };
  }
}

export async function deleteAffluente(id: number, userId: number) {
  const check = await db
    .select({ id: affluenti.id })
    .from(affluenti)
    .innerJoin(fiumi, eq(affluenti.fiumeId, fiumi.id))
    .where(and(eq(affluenti.id, id), eq(fiumi.userId, userId)))
    .limit(1);
  if (check.length === 0) throw new Error("Affluente non trovato o non autorizzato");

  await db.delete(affluenti).where(eq(affluenti.id, id));
  return { success: true };
}

export async function deleteAffluentiGroup(groupId: string, userId: number) {
  const check = await db
    .select({ id: affluenti.id })
    .from(affluenti)
    .innerJoin(fiumi, eq(affluenti.fiumeId, fiumi.id))
    .where(and(eq(affluenti.groupId, groupId), eq(fiumi.userId, userId)))
    .limit(1);
  if (check.length === 0) throw new Error("Gruppo non trovato o non autorizzato");

  const deleted = await db
    .delete(affluenti)
    .where(eq(affluenti.groupId, groupId))
    .returning({ id: affluenti.id });
  return { count: deleted.length };
}

/**
 * Get monthly aggregated affluenti allocation for budget tracking
 * 
 * Logic:
 * Somma gli importi reali degli affluenti pianificati mese per mese.
 * Ogni mese mostra esattamente quanto liquidità è impegnata in quel mese,
 * senza medie né distribuzioni: se a giugno escono 1200€, giugno mostra 1200€.
 */
export async function getAffluentiMensiliAggregati(userId: number, orizzonteTemporale: number) {
  // Recupera solo i fiumi dell'utente
  const userFiumi = await db.select({ id: fiumi.id }).from(fiumi).where(eq(fiumi.userId, userId));
  const fiumiIds = userFiumi.map(f => f.id);

  const emptyResult = Array.from({ length: orizzonteTemporale }, (_, i) => ({ mese: i, totale: 0 }));
  if (fiumiIds.length === 0) return emptyResult;

  const allAffluenti = await db
    .select({ mese: affluenti.mese, importo: affluenti.importo })
    .from(affluenti)
    .where(inArray(affluenti.fiumeId, fiumiIds));

  const monthlyTotals: Record<number, number> = {};
  for (const aff of allAffluenti) {
    if (aff.mese >= 0 && aff.mese < orizzonteTemporale) {
      monthlyTotals[aff.mese] = (monthlyTotals[aff.mese] || 0) + aff.importo;
    }
  }

  return Array.from({ length: orizzonteTemporale }, (_, i) => ({
    mese: i,
    totale: monthlyTotals[i] || 0,
  }));
}

// ============================================================================
// REINVESTIMENTI
// ============================================================================

export async function getReinvestimenti() {
  const result = await db
    .select({
      reinvestimento: reinvestimenti,
      fiumeOrigineNome: sql<string>`fiume_origine.nome`,
      fiumeDestinazioneNome: sql<string>`fiume_destinazione.nome`,
    })
    .from(reinvestimenti)
    .leftJoin(
      sql`${fiumi} as fiume_origine`,
      eq(reinvestimenti.fiumeOrigineId, sql`fiume_origine.id`)
    )
    .leftJoin(
      sql`${fiumi} as fiume_destinazione`,
      eq(reinvestimenti.fiumeDestinazioneId, sql`fiume_destinazione.id`)
    )
    .orderBy(asc(reinvestimenti.meseReinvestimento));
  
  return result;
}

export async function getReinvestimentiByUserId(userId: number) {
  // First get all fiumi IDs for this user
  const userFiumi = await db
    .select({ id: fiumi.id })
    .from(fiumi)
    .where(eq(fiumi.userId, userId));
  
  const fiumiIds = userFiumi.map(f => f.id);
  
  if (fiumiIds.length === 0) {
    return [];
  }
  
  // Then get reinvestimenti where fiumeOrigineId is in user's fiumi
  const result = await db
    .select({
      reinvestimento: reinvestimenti,
      fiumeOrigineNome: sql<string>`fiume_origine.nome`,
      fiumeDestinazioneNome: sql<string>`fiume_destinazione.nome`,
    })
    .from(reinvestimenti)
    .leftJoin(
      sql`${fiumi} as fiume_origine`,
      eq(reinvestimenti.fiumeOrigineId, sql`fiume_origine.id`)
    )
    .leftJoin(
      sql`${fiumi} as fiume_destinazione`,
      eq(reinvestimenti.fiumeDestinazioneId, sql`fiume_destinazione.id`)
    )
    .where(sql`${reinvestimenti.fiumeOrigineId} IN (${sql.join(fiumiIds.map(id => sql`${id}`), sql`, `)})`)
    .orderBy(reinvestimenti.meseReinvestimento);
  
  return result;
}

export async function createReinvestimento(params: {
  fiumeOrigineId: number;
  fiumeDestinazioneId: number | null;
  meseReinvestimento: number;
  dataReinvestimento?: Date | null;
  importoFisso?: number | null;
  percentuale?: number | null;
  nuovoFiumeNome?: string | null;
  nuovoFiumeRendimento?: number | null;
  descrizione?: string | null;
}) {
  const result = await db.insert(reinvestimenti).values(params).returning({ id: reinvestimenti.id });
  const inserted = await db.select().from(reinvestimenti).where(eq(reinvestimenti.id, result[0].id)).limit(1);
  return inserted[0];
}

export async function updateReinvestimento(
  id: number,
  userId: number,
  params: {
    fiumeOrigineId?: number;
    fiumeDestinazioneId?: number | null;
    meseReinvestimento?: number;
    dataReinvestimento?: Date | null;
    importoFisso?: number | null;
    percentuale?: number | null;
    nuovoFiumeNome?: string | null;
    nuovoFiumeRendimento?: number | null;
    descrizione?: string | null;
  }
) {
  const check = await db
    .select({ id: reinvestimenti.id })
    .from(reinvestimenti)
    .innerJoin(fiumi, eq(reinvestimenti.fiumeOrigineId, fiumi.id))
    .where(and(eq(reinvestimenti.id, id), eq(fiumi.userId, userId)))
    .limit(1);
  if (check.length === 0) throw new Error("Reinvestimento non trovato o non autorizzato");

  // Costruisce l'oggetto SET solo con le colonne esistenti nella tabella.
  // Campi extra (es. "descrizione" non presente nello schema) causerebbero
  // un errore PostgreSQL silenzioso che blocca la request.
  const updateData: Record<string, any> = {};
  if (params.fiumeOrigineId      !== undefined) updateData.fiumeOrigineId      = params.fiumeOrigineId;
  if (params.fiumeDestinazioneId !== undefined) updateData.fiumeDestinazioneId = params.fiumeDestinazioneId;
  if (params.meseReinvestimento  !== undefined) updateData.meseReinvestimento  = params.meseReinvestimento;
  if (params.dataReinvestimento  !== undefined) updateData.dataReinvestimento  = params.dataReinvestimento;
  if (params.importoFisso        !== undefined) updateData.importoFisso        = params.importoFisso;
  if (params.percentuale         !== undefined) updateData.percentuale         = params.percentuale;
  if (params.nuovoFiumeNome      !== undefined) updateData.nuovoFiumeNome      = params.nuovoFiumeNome;
  if (params.nuovoFiumeRendimento !== undefined) updateData.nuovoFiumeRendimento = params.nuovoFiumeRendimento;
  if (params.descrizione          !== undefined) updateData.descrizione          = params.descrizione;

  if (Object.keys(updateData).length === 0) return (await db.select().from(reinvestimenti).where(eq(reinvestimenti.id, id)).limit(1))[0];

  await db.update(reinvestimenti).set(updateData).where(eq(reinvestimenti.id, id));
  const updated = await db.select().from(reinvestimenti).where(eq(reinvestimenti.id, id)).limit(1);
  return updated[0];
}

export async function deleteReinvestimento(id: number, userId: number) {
  const check = await db
    .select({ id: reinvestimenti.id })
    .from(reinvestimenti)
    .innerJoin(fiumi, eq(reinvestimenti.fiumeOrigineId, fiumi.id))
    .where(and(eq(reinvestimenti.id, id), eq(fiumi.userId, userId)))
    .limit(1);
  if (check.length === 0) throw new Error("Reinvestimento non trovato o non autorizzato");

  await db.delete(reinvestimenti).where(eq(reinvestimenti.id, id));
  return { success: true };
}

// ============================================================================
// SIMULAZIONE QUINQUENNALE
// ============================================================================

interface SimulazioneRiga {
  mese: number;
  fiumi: {
    id: number;
    nome: string;
    valore: number;
    rendita: number;
    affluente: number;
    reinvestimentoUscita: number;
    reinvestimentoEntrata: number;
  }[];
  totaleValore: number;
  totaleRendita: number;
  totaleAffluente: number;
  totaleReinvestimentoUscita: number;
  totaleReinvestimentoEntrata: number;
}

export async function simulazioneQuinquennale() {
  const settings = await getImpostazioni();
  const allFiumi = await getFiumi();
  const allAffluenti = await db.select().from(affluenti);
  const allReinvestimenti = await getReinvestimenti();
  
  const risultati: SimulazioneRiga[] = [];
  
  // Initialize state for each fiume
  const statoFiumi: Record<number, { valore: number; meseInizio: number }> = {};
  for (const fiume of allFiumi) {
    statoFiumi[fiume.id] = {
      valore: fiume.sorgente,
      meseInizio: fiume.meseCreazione,
    };
  }

  // Simulate month by month
  for (let mese = 0; mese < settings.orizzonteTemporale; mese++) {
    const rigaMese: SimulazioneRiga = {
      mese,
      fiumi: [],
      totaleValore: 0,
      totaleRendita: 0,
      totaleAffluente: 0,
      totaleReinvestimentoUscita: 0,
      totaleReinvestimentoEntrata: 0,
    };
    
    // Process each fiume
    for (const fiume of allFiumi) {
      const stato = statoFiumi[fiume.id];
      let valore = stato.valore;
      let rendita = 0;
      let affluente = 0;
      let reinvestimentoUscita = 0;
      let reinvestimentoEntrata = 0;
      
      // Only process if fiume has started
      if (mese >= stato.meseInizio) {
        // Apply monthly return
        const rendimentoMensile = fiume.rendimento / 12 / 100;
        rendita = valore * rendimentoMensile;
        
        // Apply affluenti for this month
        const affluentiMese = allAffluenti.filter(
          (a) => a.fiumeId === fiume.id && a.mese === mese
        );
        affluente = affluentiMese.reduce((sum, a) => sum + a.importo, 0);
        
        // Apply reinvestimenti OUT (this fiume is source)
        const reinvestimentiOut = allReinvestimenti.filter(
          (r) => r.reinvestimento.fiumeOrigineId === fiume.id && r.reinvestimento.meseReinvestimento === mese
        );
        for (const r of reinvestimentiOut) {
          if (r.reinvestimento.importoFisso) {
            reinvestimentoUscita += r.reinvestimento.importoFisso;
          } else if (r.reinvestimento.percentuale) {
            reinvestimentoUscita += valore * (r.reinvestimento.percentuale / 100);
          }
        }
        
        // Apply reinvestimenti IN (this fiume is destination)
        const reinvestimentiIn = allReinvestimenti.filter(
          (r) => r.reinvestimento.fiumeDestinazioneId === fiume.id && r.reinvestimento.meseReinvestimento === mese
        );
        for (const r of reinvestimentiIn) {
          const origineId = r.reinvestimento.fiumeOrigineId;
          const statoOrigine = statoFiumi[origineId];
          if (r.reinvestimento.importoFisso) {
            reinvestimentoEntrata += r.reinvestimento.importoFisso;
          } else if (r.reinvestimento.percentuale) {
            reinvestimentoEntrata += statoOrigine.valore * (r.reinvestimento.percentuale / 100);
          }
        }
        
        // Calculate reinvestment of rendita based on percentualeReinvestimento
        const percentualeReinvestimento = fiume.percentualeReinvestimento ?? 100;
        const renditaReinvestita = rendita * (percentualeReinvestimento / 100);
        const renditaPrelevata = rendita * ((100 - percentualeReinvestimento) / 100);
        
        // Update value: add rendita reinvestita, affluente, reinvestimenti
        valore = valore + renditaReinvestita + affluente - reinvestimentoUscita + reinvestimentoEntrata;
        
        // Rendita shown is the amount withdrawn (not reinvested)
        rendita = renditaPrelevata;
      }
      
      // Update state for next month
      statoFiumi[fiume.id].valore = valore;
      
      // Add to results
      rigaMese.fiumi.push({
        id: fiume.id,
        nome: fiume.nome,
        valore,
        rendita,
        affluente,
        reinvestimentoUscita,
        reinvestimentoEntrata,
      });
      
      rigaMese.totaleValore += valore;
      rigaMese.totaleRendita += rendita;
      rigaMese.totaleAffluente += affluente;
      rigaMese.totaleReinvestimentoUscita += reinvestimentoUscita;
      rigaMese.totaleReinvestimentoEntrata += reinvestimentoEntrata;
    }
    
    risultati.push(rigaMese);
  }
  
  return risultati;
}

// ============================================================================
// ANALYTICS
// ============================================================================

export async function getEvoluzionePatrimonio() {
  const settings = await getImpostazioni();
  const allFiumi = await getFiumi();
  const allAffluenti = await db.select().from(affluenti);
  
  const risultati = [];
  
  // Initialize state for each fiume
  const statoFiumi: Record<number, { valore: number; meseInizio: number }> = {};
  for (const fiume of allFiumi) {
    statoFiumi[fiume.id] = {
      valore: fiume.sorgente,
      meseInizio: fiume.meseCreazione,
    };
  }

  // Simulate month by month
  for (let mese = 0; mese < settings.orizzonteTemporale; mese++) {
    let valoreTotale = 0;
    let renditaMensile = 0;
    let affluentiMese = 0;
    
    for (const fiume of allFiumi) {
      const stato = statoFiumi[fiume.id];
      let valore = stato.valore;
      
      if (mese >= stato.meseInizio) {
        // Apply monthly return
        const rendimentoMensile = fiume.rendimento / 12 / 100;
        const rendita = valore * rendimentoMensile;
        renditaMensile += rendita;
        
        // Apply affluenti
        const affluentiDelMese = allAffluenti.filter(
          (a) => a.fiumeId === fiume.id && a.mese === mese
        );
        const totaleAffluenti = affluentiDelMese.reduce((sum, a) => sum + a.importo, 0);
        affluentiMese += totaleAffluenti;
        
        // Calculate reinvestment based on percentualeReinvestimento
        const percentualeReinvestimento = fiume.percentualeReinvestimento ?? 100;
        const renditaReinvestita = rendita * (percentualeReinvestimento / 100);
        
        // Update value
        valore = valore + renditaReinvestita + totaleAffluenti;
      }
      
      statoFiumi[fiume.id].valore = valore;
      valoreTotale += valore;
    }
    
    risultati.push({
      mese,
      valoreTotale,
      renditaMensile,
      affluentiMese,
    });
  }
  
  return risultati;
}

export async function getPerformanceComparativa() {
  const settings = await getImpostazioni();
  const allFiumi = await getFiumi();
  const allAffluenti = await db.select().from(affluenti);
  
  const risultati = [];
  
  for (const fiume of allFiumi) {
    let valore = fiume.sorgente;
    const totaleAffluenti = allAffluenti
      .filter((a) => a.fiumeId === fiume.id)
      .reduce((sum, a) => sum + a.importo, 0);
    
    // Simulate to end of horizon
    for (let mese = fiume.meseCreazione; mese < settings.orizzonteTemporale; mese++) {
      const rendimentoMensile = fiume.rendimento / 12 / 100;
      const rendita = valore * rendimentoMensile;
      
      const affluentiMese = allAffluenti.filter(
        (a) => a.fiumeId === fiume.id && a.mese === mese
      );
      const totaleAffluenteMese = affluentiMese.reduce((sum, a) => sum + a.importo, 0);
      
      // Calculate reinvestment based on percentualeReinvestimento
      const percentualeReinvestimento = fiume.percentualeReinvestimento ?? 100;
      const renditaReinvestita = rendita * (percentualeReinvestimento / 100);
      
      valore = valore + renditaReinvestita + totaleAffluenteMese;
    }
    
    const valoreIniziale = fiume.sorgente + totaleAffluenti;
    const valoreFinale = valore;
    const guadagno = valoreFinale - valoreIniziale;
    const roi = valoreIniziale > 0 ? (guadagno / valoreIniziale) * 100 : 0;
    
    risultati.push({
      fiumeId: fiume.id,
      nome: fiume.nome,
      valoreIniziale,
      valoreFinale,
      guadagno,
      roi,
    });
  }
  
  return risultati.sort((a, b) => b.roi - a.roi);
}

// ============================================================================
// NOTIFICHE
// ============================================================================

export async function getNotifiche() {
  return db.select().from(notifiche).orderBy(desc(notifiche.createdAt));
}

export async function markNotificaAsRead(id: number) {
  await db.update(notifiche).set({ letta: 1 }).where(eq(notifiche.id, id));
  return { success: true };
}

export async function markAllNotificheAsRead() {
  await db.update(notifiche).set({ letta: 1 });
  return { success: true };
}

export async function deleteNotifica(id: number) {
  await db.delete(notifiche).where(eq(notifiche.id, id));
  return { success: true };
}

export async function createNotifica(params: {
  userId: number;
  tipo: "info" | "warning" | "success" | "error";
  titolo: string;
  messaggio: string;
  priorita?: "bassa" | "media" | "alta";
  dataAlert?: Date | null;
  affluenteId?: number | null;
}) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { affluenteId: _affluenteId, dataAlert: _dataAlert, ...notificaParams } = params;
  const result = await db.insert(notifiche).values({
    ...notificaParams,
    letta: 0,
    priorita: params.priorita || "medium",
  }).returning({ id: notifiche.id });
  const inserted = await db.select().from(notifiche).where(eq(notifiche.id, result[0].id)).limit(1);
  return inserted[0];
}

// ============================================================================
// ALERT CONFIG
// ============================================================================

export async function getAlertConfig() {
  return db.select().from(alertConfig).orderBy(asc(alertConfig.createdAt));
}

export async function createAlertConfig(params: {
  userId: number;
  nome: string;
  tipo: string;
  soglia?: number | null;
  operatore?: string | null;
  fiumeId?: number | null;
  attivo?: number;
  dataAlert?: Date | null;
  giorniPreavviso?: number | null;
  affluenteId?: number | null;
}) {
  const result = await db.insert(alertConfig).values({
    ...params,
    attivo: params.attivo ?? 1,
  }).returning({ id: alertConfig.id });
  const inserted = await db.select().from(alertConfig).where(eq(alertConfig.id, result[0].id)).limit(1);
  return inserted[0];
}

export async function updateAlertConfig(
  id: number,
  params: {
    soglia?: number;
    operatore?: "maggiore" | "minore" | "uguale";
    fiumeId?: number | null;
    attivo?: number;
  }
) {
  await db.update(alertConfig).set(params).where(eq(alertConfig.id, id));
  const updated = await db.select().from(alertConfig).where(eq(alertConfig.id, id)).limit(1);
  return updated[0];
}

export async function toggleAlertConfig(id: number) {
  const current = await db.select().from(alertConfig).where(eq(alertConfig.id, id));
  if (current.length === 0) throw new Error("Alert not found");
  
  const newAttivo = current[0].attivo ? 0 : 1;
  await db.update(alertConfig).set({ attivo: newAttivo }).where(eq(alertConfig.id, id));
  return { attivo: newAttivo };
}

export async function deleteAlertConfig(id: number) {
  await db.delete(alertConfig).where(eq(alertConfig.id, id));
  return { success: true };
}

export async function createAlertAutomatico(params: {
  affluenteId: number;
  giorniPreavviso: number;
}) {
  const affluente = await db.select().from(affluenti).where(eq(affluenti.id, params.affluenteId));
  if (affluente.length === 0) throw new Error("Affluente not found");
  
  const aff = affluente[0];
  if (!aff.dataAffluente) throw new Error("Affluente has no date");
  
  const dataAlert = new Date(aff.dataAffluente);
  dataAlert.setDate(dataAlert.getDate() - params.giorniPreavviso);
  
  const fiume = await getFiumeById(aff.fiumeId);
  const fiumeNome = fiume?.nome || "Fiume";
  
  return createNotifica({
    userId: fiume?.userId ?? 0,
    tipo: "info",
    titolo: `Promemoria Affluente: ${fiumeNome}`,
    messaggio: `Affluente di ${aff.importo.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })} programmato per ${aff.dataAffluente.toLocaleDateString('it-IT')}`,
    priorita: "media",
    dataAlert,
    affluenteId: aff.id,
  });
}

export async function createAlertGruppo(params: {
  groupId: string;
  giorniPreavviso: number;
}) {
  const groupAffluenti = await db
    .select()
    .from(affluenti)
    .where(eq(affluenti.groupId, params.groupId))
    .orderBy(asc(affluenti.mese));
  
  if (groupAffluenti.length === 0) throw new Error("Group not found");
  
  const fiume = await getFiumeById(groupAffluenti[0].fiumeId);
  const fiumeNome = fiume?.nome || "Fiume";
  
  let createdCount = 0;
  const now = new Date();
  
  for (const aff of groupAffluenti) {
    if (!aff.dataAffluente) continue;
    
    // Skip past affluenti
    if (aff.dataAffluente < now) continue;
    
    // Check if alert already exists for this affluente
    const existingAlert = await db
      .select()
      .from(alertConfig)
      .where(eq(alertConfig.affluenteId, aff.id));
    
    if (existingAlert.length > 0) continue;
    
    const dataAlert = new Date(aff.dataAffluente);
    dataAlert.setDate(dataAlert.getDate() - params.giorniPreavviso);
    
    await createNotifica({
      userId: fiume?.userId ?? 0,
      tipo: "info",
      titolo: `Promemoria Affluente: ${fiumeNome}`,
      messaggio: `Affluente di ${aff.importo.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })} programmato per ${aff.dataAffluente.toLocaleDateString('it-IT')}`,
      priorita: "media",
      dataAlert,
      affluenteId: aff.id,
    });

    createdCount++;
  }
  
  return { count: createdCount };
}

// ============================================================================
// SCENARI
// ============================================================================

export async function getScenari() {
  return db.select().from(scenari).orderBy(desc(scenari.createdAt));
}

export async function getScenariByUserId(userId: number) {
  return db.select().from(scenari).where(eq(scenari.userId, userId)).orderBy(desc(scenari.createdAt));
}

export async function createScenario(params: {
  userId: number;
  nome: string;
  descrizione?: string | null;
  attivo?: number;
}) {
  const result = await db.insert(scenari).values(params).returning({ id: scenari.id });
  const inserted = await db.select().from(scenari).where(eq(scenari.id, result[0].id)).limit(1);
  return inserted[0];
}

export async function deleteScenario(id: number) {
  // Delete related snapshots
  await db.delete(scenarioSnapshots).where(eq(scenarioSnapshots.scenarioId, id));
  // Delete scenario
  await db.delete(scenari).where(eq(scenari.id, id));
  return { success: true };
}

export async function saveScenarioSnapshot(scenarioId: number) {
  const allFiumi = await getFiumi();
  const allAffluenti = await getAffluenti();
  const allReinvestimenti = await getReinvestimenti();
  const settings = await getImpostazioni();
  
  const snapshot = {
    fiumi: allFiumi,
    affluenti: allAffluenti.map(a => a.affluente),
    reinvestimenti: allReinvestimenti.map(r => r.reinvestimento),
    impostazioni: settings,
  };
  
  const result = await db.insert(scenarioSnapshots).values({
    scenarioId,
    fiumiData: JSON.stringify(snapshot.fiumi),
    affluentiData: JSON.stringify(snapshot.affluenti),
    reinvestimentiData: JSON.stringify(snapshot.reinvestimenti),
    impostazioniData: JSON.stringify(snapshot.impostazioni),
  }).returning({ id: scenarioSnapshots.id });
  const inserted = await db.select().from(scenarioSnapshots).where(eq(scenarioSnapshots.id, result[0].id)).limit(1);
  return inserted[0];
}

export async function createScenarioSnapshot(params: {
  scenarioId: number;
  fiumiData: string;
  affluentiData: string;
  reinvestimentiData: string;
  impostazioniData: string;
}) {
  const result = await db.insert(scenarioSnapshots).values(params).returning({ id: scenarioSnapshots.id });
  const inserted = await db.select().from(scenarioSnapshots).where(eq(scenarioSnapshots.id, result[0].id)).limit(1);
  return inserted[0];
}

export async function getScenarioSnapshots(scenarioId: number) {
  return db.select().from(scenarioSnapshots).where(eq(scenarioSnapshots.scenarioId, scenarioId)).orderBy(desc(scenarioSnapshots.createdAt));
}

export async function getScenarioSnapshotByScenarioId(scenarioId: number) {
  const result = await db.select().from(scenarioSnapshots).where(eq(scenarioSnapshots.scenarioId, scenarioId)).orderBy(desc(scenarioSnapshots.createdAt)).limit(1);
  return result[0] || null;
}

export async function getScenarioById(id: number) {
  const result = await db.select().from(scenari).where(eq(scenari.id, id)).limit(1);
  return result[0] || null;
}

export async function setScenarioAttivo(userId: number, scenarioId: number) {
  // Deactivate all scenarios for this user
  await db.update(scenari).set({ attivo: 0 }).where(eq(scenari.userId, userId));
  // Activate the selected scenario
  await db.update(scenari).set({ attivo: 1 }).where(and(eq(scenari.id, scenarioId), eq(scenari.userId, userId)));
  return getScenarioById(scenarioId);
}

// ============================================================================
// DATA MANAGEMENT (Import/Export)
// ============================================================================

export async function exportAllData() {
  const allFiumi = await getFiumi();
  const allAffluenti = await getAffluenti();
  const allReinvestimenti = await getReinvestimenti();
  const settings = await getImpostazioni();
  
  return {
    version: "1.0",
    exportDate: new Date().toISOString(),
    data: {
      fiumi: allFiumi,
      affluenti: allAffluenti.map(a => a.affluente),
      reinvestimenti: allReinvestimenti.map(r => r.reinvestimento),
      impostazioni: settings,
    },
  };
}

export async function importData(data: any) {
  if (data.version !== "1.0") {
    throw new Error("Unsupported data version");
  }
  
  const { fiumi: importFiumi, affluenti: importAffluenti, reinvestimenti: importReinvestimenti, impostazioni: importImpostazioni } = data.data;
  
  // Map old fiume IDs to new fiume IDs
  const fiumeIdMap: Record<number, number> = {};
  
  // Import fiumi
  for (const fiume of importFiumi) {
    const { id, createdAt, updatedAt, ...fiumeData } = fiume;
    const newFiume = await createFiume(fiumeData);
    fiumeIdMap[id] = newFiume.id;
  }
  
  // Import affluenti
  for (const affluente of importAffluenti) {
    const { id, createdAt, updatedAt, fiumeId, ...affluenteData } = affluente;
    const newFiumeId = fiumeIdMap[fiumeId];
    if (newFiumeId) {
      await db.insert(affluenti).values({
        ...affluenteData,
        fiumeId: newFiumeId,
      });
    }
  }
  
  // Import reinvestimenti
  for (const reinvestimento of importReinvestimenti) {
    const { id, createdAt, updatedAt, fiumeOrigineId, fiumeDestinazioneId, ...reinvestimentoData } = reinvestimento;
    const newOrigineId = fiumeIdMap[fiumeOrigineId];
    const newDestinazioneId = fiumeDestinazioneId ? fiumeIdMap[fiumeDestinazioneId] : null;
    if (newOrigineId) {
      await db.insert(reinvestimenti).values({
        ...reinvestimentoData,
        fiumeOrigineId: newOrigineId,
        fiumeDestinazioneId: newDestinazioneId,
      });
    }
  }
  
  // Import impostazioni (merge with existing)
  if (importImpostazioni) {
    const { id, userId, ...impostazioniData } = importImpostazioni;
    if (userId) {
      await updateImpostazioni(userId, impostazioniData);
    }
  }
  
  return { success: true };
}

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export async function getDb() {
  return db;
}

export async function getUserById(id: number) {
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0] || null;
}

export async function getUserByOpenId(openId: string) {
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0] || null;
}

export async function getUserByEmail(email: string) {
  try {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0] || null;
  } catch (error: any) {
    console.error('[DB] getUserByEmail REAL error:', error?.cause?.message ?? error?.message ?? String(error));
    throw error;
  }
}

export async function getUserByOAuthProvider(provider: string, providerId: string) {
  const result = await db.select().from(users)
    .where(and(eq(users.authProvider, provider), eq(users.oauthProviderId, providerId)))
    .limit(1);
  return result[0] || null;
}

export async function upsertUser(userData: {
  openId?: string | null;
  name?: string | null;
  email?: string | null;
  passwordHash?: string | null;
  authProvider?: string;
  oauthProviderId?: string | null;
  loginMethod?: string | null;
  lastSignedIn?: Date;
}) {
  // Check if user exists by openId or email
  let existingUser = null;
  
  if (userData.openId) {
    existingUser = await getUserByOpenId(userData.openId);
  } else if (userData.email) {
    existingUser = await getUserByEmail(userData.email);
  }
  
  if (existingUser) {
    // Update existing user
    await db.update(users)
      .set({
        ...userData,
        updatedAt: new Date(),
        lastSignedIn: userData.lastSignedIn || new Date(),
      })
      .where(eq(users.id, existingUser.id));
    return getUserById(existingUser.id);
  } else {
    // Create new user
    const result = await db.insert(users).values({
      ...userData,
      authProvider: userData.authProvider || 'email',
      lastSignedIn: userData.lastSignedIn || new Date(),
    }).returning({ id: users.id });
    return getUserById(result[0].id);
  }
}

export async function updateUserLastSignedIn(id: number) {
  await db.update(users)
    .set({ lastSignedIn: new Date(), updatedAt: new Date() })
    .where(eq(users.id, id));
}

export async function createEmailUser(params: {
  email: string;
  passwordHash: string;
  name: string;
}) {
  const result = await db.insert(users).values({
    email: params.email,
    passwordHash: params.passwordHash,
    name: params.name,
    authProvider: 'email',
    lastSignedIn: new Date(),
  }).returning({ id: users.id });
  return getUserById(result[0].id);
}

export async function createOAuthUser(params: {
  email: string | null;
  name: string | null;
  authProvider: string;
  oauthProviderId: string;
}) {
  const result = await db.insert(users).values({
    email: params.email,
    name: params.name,
    authProvider: params.authProvider,
    oauthProviderId: params.oauthProviderId,
    lastSignedIn: new Date(),
  }).returning({ id: users.id });
  const user = await getUserById(result[0].id);
  if (!user) throw new Error('Failed to create OAuth user');
  return user;
}

export async function updateUserOAuthInfo(id: number, provider: string, providerId: string) {
  await db.update(users)
    .set({ authProvider: provider, oauthProviderId: providerId, updatedAt: new Date() })
    .where(eq(users.id, id));
}

export async function updateUserPassword(id: number, passwordHash: string) {
  await db.update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, id));
}

export async function createPasswordResetToken(params: {
  userId: number;
  token: string;
  expiresAt: Date;
}) {
  await db.insert(passwordResetTokens).values({
    userId: params.userId,
    token: params.token,
    expiresAt: params.expiresAt,
    used: 0,
  });
}

export async function getPasswordResetToken(token: string) {
  const result = await db.select().from(passwordResetTokens)
    .where(eq(passwordResetTokens.token, token))
    .limit(1);
  return result[0] || null;
}

export async function markPasswordResetTokenUsed(id: number) {
  await db.update(passwordResetTokens)
    .set({ used: 1 })
    .where(eq(passwordResetTokens.id, id));
}
