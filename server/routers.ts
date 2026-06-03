import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";

// ============================================================================
// SIMULAZIONE PORTAFOGLIO — helper condiviso da riepilogo, evoluzionePatrimonio
// e flussiReinvestimenti. Simula mese per mese tutti i fiumi dell'utente
// applicando rendite, affluenti e reinvestimenti esplicitamente.
// ============================================================================
async function runSimulazione(userId: number, orizzonteTemporale: number) {
  const allFiumi = await db.getFiumiByUserId(userId);
  const reinvestimentiData = await db.getReinvestimentiByUserId(userId);

  // Carica affluenti per ogni fiume
  const affluentiByFiume = new Map<number, Map<number, number>>();
  for (const fiume of allFiumi) {
    const aff = await db.getAffluentiByFiumeId(fiume.id);
    const affMap = new Map<number, number>();
    aff.forEach(a => { affMap.set(a.mese, (affMap.get(a.mese) || 0) + a.importo / 100); });
    affluentiByFiume.set(fiume.id, affMap);
  }

  // Reinvestimenti raggruppati per mese
  const reinvestimentiByMese = new Map<number, typeof reinvestimentiData>();
  reinvestimentiData.forEach(r => {
    const mese = r.reinvestimento.meseReinvestimento;
    if (!reinvestimentiByMese.has(mese)) reinvestimentiByMese.set(mese, []);
    reinvestimentiByMese.get(mese)!.push(r);
  });

  // Stato capitale e rendita per ogni fiume (inclusi nuoviFiumi da reinvestimento)
  const fiumiStates = new Map<number, Map<number, number>>();
  const fiumiRendite = new Map<number, Map<number, number>>();
  const fiumiInfo = new Map<number, { nome: string; rendimento: number; meseCreazione: number; sorgente: number; percentualeReinvestimento: number | null }>();
  let nextTempId = -1;

  allFiumi.forEach(f => {
    fiumiStates.set(f.id, new Map());
    fiumiRendite.set(f.id, new Map());
    fiumiInfo.set(f.id, {
      nome: f.nome,
      rendimento: f.rendimento,
      meseCreazione: f.meseCreazione,
      sorgente: f.sorgente,
      percentualeReinvestimento: f.percentualeReinvestimento ?? null,
    });
  });

  for (let mese = 0; mese <= orizzonteTemporale; mese++) {
    // Passo 1: calcola capitale e rendita per ogni fiume
    for (const [fiumeId, stateMap] of Array.from(fiumiStates.entries())) {
      const info = fiumiInfo.get(fiumeId);
      if (!info) continue;

      const rendimentoMensile = Math.pow(1 + info.rendimento / 10000, 1 / 12) - 1;
      const percentualeReinv = info.percentualeReinvestimento ?? 100;
      const affMap = affluentiByFiume.get(fiumeId) || new Map();

      if (mese < info.meseCreazione) {
        stateMap.set(mese, 0);
        fiumiRendite.get(fiumeId)!.set(mese, 0);
        continue;
      }

      if (mese === info.meseCreazione) {
        stateMap.set(mese, info.sorgente / 100 + (affMap.get(mese) || 0));
        fiumiRendite.get(fiumeId)!.set(mese, 0);
        continue;
      }

      const capPrec = stateMap.get(mese - 1) || 0;
      const rendita = capPrec * rendimentoMensile;
      const reinvestito = rendita * (percentualeReinv / 100);
      stateMap.set(mese, capPrec + reinvestito + (affMap.get(mese) || 0));
      fiumiRendite.get(fiumeId)!.set(mese, rendita);
    }

    // Passo 2: applica reinvestimenti espliciti del mese
    for (const rw of (reinvestimentiByMese.get(mese) || [])) {
      const r = rw.reinvestimento;
      const srcState = fiumiStates.get(r.fiumeOrigineId);
      if (!srcState) continue;

      const capSrc = srcState.get(mese) || 0;
      let importo = r.importoFisso
        ? r.importoFisso / 100
        : r.percentuale
          ? capSrc * (r.percentuale / 10000)
          : 0;
      importo = Math.min(importo, Math.max(0, capSrc)); // no capitale negativo

      srcState.set(mese, capSrc - importo);

      if (r.fiumeDestinazioneId) {
        const dstState = fiumiStates.get(r.fiumeDestinazioneId);
        if (dstState) dstState.set(mese, (dstState.get(mese) || 0) + importo);
      } else if (r.nuovoFiumeNome && r.nuovoFiumeRendimento != null) {
        // Crea fiume temporaneo per tracciare il capitale trasferito
        const tempId = nextTempId--;
        fiumiInfo.set(tempId, {
          nome: r.nuovoFiumeNome,
          rendimento: r.nuovoFiumeRendimento,
          meseCreazione: mese,
          sorgente: 0,
          percentualeReinvestimento: 100,
        });
        const newState = new Map<number, number>();
        newState.set(mese, importo);
        fiumiStates.set(tempId, newState);
        fiumiRendite.set(tempId, new Map([[mese, 0]]));
        affluentiByFiume.set(tempId, new Map());
      }
    }
  }

  return { fiumiStates, fiumiRendite, fiumiInfo, allFiumi, affluentiByFiume, reinvestimentiByMese };
}

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    
    // Email/Password authentication
    register: publicProcedure
      .input(z.object({
        email: z.string().email("Email non valida"),
        password: z.string().min(8, "La password deve contenere almeno 8 caratteri"),
        name: z.string().min(1, "Il nome è obbligatorio"),
      }))
      .mutation(async ({ input, ctx }) => {
        const bcrypt = await import("bcrypt");
        
        // Check if email already exists
        const existingUser = await db.getUserByEmail(input.email);
        if (existingUser) {
          throw new Error("Email già registrata");
        }
        
        // Hash password
        const passwordHash = await bcrypt.hash(input.password, 10);
        
        // Create user
        const user = await db.createEmailUser({
          email: input.email,
          passwordHash,
          name: input.name,
        });
        
        // Create session cookie using SDK
        const { sdk } = await import("./_core/sdk");
        const token = await sdk.createSessionToken(`email:${user.id}`, { name: user.name || "" });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, cookieOptions);
        
        return { success: true, user };
      }),
    
    loginWithEmail: publicProcedure
      .input(z.object({
        email: z.string().email("Email non valida"),
        password: z.string().min(1, "La password è obbligatoria"),
      }))
      .mutation(async ({ input, ctx }) => {
        const bcrypt = await import("bcrypt");
        
        // Find user by email
        const user = await db.getUserByEmail(input.email);
        if (!user || !user.passwordHash) {
          throw new Error("Credenziali non valide");
        }
        
        // Verify password
        const isValid = await bcrypt.compare(input.password, user.passwordHash);
        if (!isValid) {
          throw new Error("Credenziali non valide");
        }
        
        // Update last signed in
        await db.updateUserLastSignedIn(user.id);
        
        // Create session cookie using SDK
        const { sdk } = await import("./_core/sdk");
        const token = await sdk.createSessionToken(`email:${user.id}`, { name: user.name || "" });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, cookieOptions);
        
        return { success: true, user };
      }),
    
    requestPasswordReset: publicProcedure
      .input(z.object({
        email: z.string().email("Email non valida"),
      }))
      .mutation(async ({ input }) => {
        const crypto = await import("crypto");
        
        // Find user by email
        const user = await db.getUserByEmail(input.email);
        if (!user || user.authProvider !== "email") {
          // Don't reveal if email exists for security
          return { success: true, message: "Se l'email esiste, riceverai un link per il reset" };
        }
        
        // Generate reset token
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(Date.now() + 3600000); // 1 hour
        
        // Save token
        await db.createPasswordResetToken({
          userId: user.id,
          token,
          expiresAt,
        });
        
        // TODO: Send email with reset link
        // For now, return token in response (in production, send via email)
        console.log(`Password reset token for ${input.email}: ${token}`);
        
        return { success: true, message: "Se l'email esiste, riceverai un link per il reset", token };
      }),
    
    resetPassword: publicProcedure
      .input(z.object({
        token: z.string().min(1, "Token non valido"),
        newPassword: z.string().min(8, "La password deve contenere almeno 8 caratteri"),
      }))
      .mutation(async ({ input }) => {
        const bcrypt = await import("bcrypt");
        
        // Find valid token
        const resetToken = await db.getPasswordResetToken(input.token);
        if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
          throw new Error("Token non valido o scaduto");
        }
        
        // Hash new password
        const passwordHash = await bcrypt.hash(input.newPassword, 10);
        
        // Update user password
        await db.updateUserPassword(resetToken.userId, passwordHash);
        
        // Mark token as used
        await db.markPasswordResetTokenUsed(resetToken.id);
        
        return { success: true, message: "Password aggiornata con successo" };
      }),
  }),

  reinvestimenti: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getReinvestimentiByUserId(ctx.user.id);
    }),
    
    create: protectedProcedure
      .input(z.object({
        fiumeSorgenteId: z.number().int().positive(),
        fiumeDestinazioneId: z.number().int().positive().optional(),
        mese: z.number().int().min(1).max(240),
        dataReinvestimento: z.date().optional(),
        importoFisso: z.number().int().positive().optional(),
        percentuale: z.number().int().min(1).max(10000).optional(),
        nuovoFiumeNome: z.string().optional(),
        nuovoFiumeRendimento: z.number().int().min(0).max(10000).optional(),
        descrizione: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        // Validate: either importoFisso or percentuale must be provided
        if (!input.importoFisso && !input.percentuale) {
          throw new Error("Devi specificare un importo fisso o una percentuale");
        }
        if (input.importoFisso && input.percentuale) {
          throw new Error("Specifica solo importo fisso O percentuale, non entrambi");
        }
        // If creating new fiume, validate required fields
        if (!input.fiumeDestinazioneId && (!input.nuovoFiumeNome || input.nuovoFiumeRendimento === undefined)) {
          throw new Error("Per creare un nuovo fiume, specifica nome e rendimento");
        }
        
        return db.createReinvestimento({
          fiumeOrigineId: input.fiumeSorgenteId,
          fiumeDestinazioneId: input.fiumeDestinazioneId || null,
          meseReinvestimento: input.mese,
          dataReinvestimento: input.dataReinvestimento || null,
          importoFisso: input.importoFisso || null,
          percentuale: input.percentuale || null,
          nuovoFiumeNome: input.nuovoFiumeNome || null,
          nuovoFiumeRendimento: input.nuovoFiumeRendimento || null,
        });
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
        fiumeSorgenteId: z.number().int().positive().optional(),
        fiumeDestinazioneId: z.number().int().positive().optional(),
        mese: z.number().int().min(1).max(240).optional(),
        dataReinvestimento: z.date().optional(),
        importoFisso: z.number().int().positive().optional(),
        percentuale: z.number().int().min(1).max(10000).optional(),
        nuovoFiumeNome: z.string().optional(),
        nuovoFiumeRendimento: z.number().int().min(0).max(10000).optional(),
        descrizione: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, fiumeSorgenteId, mese, ...rest } = input;
        // Rimappa i nomi del campo client → nomi DB
        const params: any = { ...rest };
        if (fiumeSorgenteId !== undefined) params.fiumeOrigineId = fiumeSorgenteId;
        if (mese !== undefined) params.meseReinvestimento = mese;
        return db.updateReinvestimento(id, ctx.user.id, params);
      }),

    delete: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.deleteReinvestimento(input.id, ctx.user.id);
        return { success: true };
      }),
  }),
  
  affluenti: router({
    listAll: protectedProcedure
      .query(async ({ ctx }) => {
        return db.getAllAffluentiWithFiume(ctx.user.id);
      }),
    
    listByFiume: protectedProcedure
      .input(z.object({
        fiumeId: z.number().int().positive(),
      }))
      .query(async ({ input }) => {
        return db.getAffluentiByFiumeId(input.fiumeId);
      }),
    
    create: protectedProcedure
      .input(z.object({
        fiumeId: z.number().int().positive(),
        importo: z.number().int().positive(),
        mese: z.number().int().min(0).max(240),
        dataAffluente: z.date().optional(),
        descrizione: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createAffluente({
          fiumeId: input.fiumeId,
          importo: input.importo,
          mese: input.mese,
          dataAffluente: input.dataAffluente,
          descrizione: input.descrizione,
        });
      }),
    
    createRicorrente: protectedProcedure
      .input(z.object({
        fiumeId: z.number().int().positive(),
        importo: z.number().int().positive(),
        meseInizio: z.number().int().min(0).max(240),
        dataInizio: z.coerce.date(),
        periodicita: z.enum(["mensile", "trimestrale", "semestrale", "annuale"]),
        durataMesi: z.number().int().min(1).max(240),
        descrizione: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const periodicityMap = {
          mensile: 1,
          trimestrale: 3,
          semestrale: 6,
          annuale: 12,
        };

        const impostazioni = await db.getImpostazioniByUserId(ctx.user.id);

        return db.createAffluentiRicorrenti({
          fiumeId: input.fiumeId,
          importo: input.importo,
          meseInizio: input.meseInizio,
          dataAffluente: input.dataInizio,
          periodicita: periodicityMap[input.periodicita],
          durataMesi: input.durataMesi,
          descrizione: input.descrizione,
          orizzonteTemporale: impostazioni.orizzonteTemporale,
        });
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
        fiumeId: z.number().int().positive(),
        importo: z.number().int().positive().optional(),
        mese: z.number().int().min(0).max(240).optional(),
        dataAffluente: z.date().optional(),
        descrizione: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, fiumeId: _fiumeId, ...updates } = input;
        return db.updateAffluente(id, ctx.user.id, updates);
      }),

    delete: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
        fiumeId: z.number().int().positive(),
      }))
      .mutation(async ({ input, ctx }) => {
        await db.deleteAffluente(input.id, ctx.user.id);
        return { success: true };
      }),
    
    // Gestione gruppo affluenti ricorrenti
    listByGroup: protectedProcedure
      .input(z.object({
        groupId: z.string(),
      }))
      .query(async ({ input }) => {
        return db.getAffluentiByGroupId(input.groupId);
      }),
    
    deleteGroup: protectedProcedure
      .input(z.object({
        groupId: z.string(),
        fiumeId: z.number().int().positive(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.deleteAffluentiGroup(input.groupId, ctx.user.id);
        return { success: true, count: result.count };
      }),

    updateGroup: protectedProcedure
      .input(z.object({
        groupId: z.string(),
        fiumeId: z.number().int().positive(),
        importo: z.number().int().positive().optional(),
        descrizione: z.string().optional(),
        periodicita: z.enum(["mensile", "trimestrale", "semestrale", "annuale"]).optional(),
        durataMesi: z.number().int().positive().optional(),
        dataInizio: z.coerce.date().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { groupId, fiumeId: _fiumeId, periodicita, ...otherUpdates } = input;

        const updates: any = { ...otherUpdates };
        if (periodicita) {
          const periodicityMap: Record<string, number> = {
            mensile: 1,
            trimestrale: 3,
            semestrale: 6,
            annuale: 12,
          };
          updates.periodicita = periodicityMap[periodicita];
        }

        const updated = await db.updateAffluentiGroup(groupId, ctx.user.id, updates);
        return { success: true, count: updated };
      }),
    
    // Budget tracking: get monthly affluenti allocation
    getBudgetMensile: protectedProcedure
      .query(async ({ ctx }) => {
        const impostazioni = await db.getImpostazioniByUserId(ctx.user.id);
        const orizzonteTemporale = impostazioni?.orizzonteTemporale || 60;
        return db.getAffluentiMensiliAggregati(ctx.user.id, orizzonteTemporale);
      }),
  }),
  
  impostazioni: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return db.getImpostazioniByUserId(ctx.user.id);
    }),
    
    update: protectedProcedure
      .input(z.object({
        obiettivoMensile: z.number().int().positive().optional(),
        orizzonteTemporale: z.number().int().min(1).max(240).optional(), // Max 240 mesi = 20 anni
        dataInizio: z.coerce.date().optional(),
        budgetMensileAffluenti: z.number().int().positive().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const updates: any = {};
        if (input.obiettivoMensile !== undefined) updates.obiettivoMensile = input.obiettivoMensile;
        if (input.orizzonteTemporale !== undefined) updates.orizzonteTemporale = input.orizzonteTemporale;
        if (input.dataInizio !== undefined) updates.dataInizio = input.dataInizio;
        if (input.budgetMensileAffluenti !== undefined) updates.budgetMensileAffluenti = input.budgetMensileAffluenti;
        
        return db.updateImpostazioni(ctx.user.id, updates);
      }),
    
    ricalcolaMesi: protectedProcedure
      .mutation(async ({ ctx }) => {
        // ricalcolaMesiAffluenti non implementato
        return { success: true, count: 0 };
      }),
  }),
  
  fiumi: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getFiumiByUserId(ctx.user.id);
    }),
    
    create: protectedProcedure
      .input(z.object({
        nome: z.string().min(1).max(255),
        sorgente: z.number().int().positive(),
        rendimento: z.number().int().min(0).max(100000),
        meseCreazione: z.number().int().min(0).max(240).default(0),
        dataCreazione: z.date().optional(),
        percentualeReinvestimento: z.number().int().min(0).max(100).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createFiume({
          userId: ctx.user.id,
          ...input,
        });
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
        nome: z.string().min(1).max(255).optional(),
        sorgente: z.number().int().positive().optional(),
        rendimento: z.number().int().min(0).max(100000).optional(),
        meseCreazione: z.number().int().min(0).max(240).optional(),
        dataCreazione: z.date().optional(),
        percentualeReinvestimento: z.number().int().min(0).max(100).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...updates } = input;
        return db.updateFiume(id, ctx.user.id, updates);
      }),
    
    delete: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteFiume(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  calcoli: router({
    simulazioneQuinquennale: protectedProcedure
      .input(z.object({
        fiumiIds: z.array(z.number().int()).optional(),
      }))
      .query(async ({ ctx, input }) => {
        const allFiumi = await db.getFiumiByUserId(ctx.user.id);
        const impostazioni = await db.getImpostazioniByUserId(ctx.user.id);
        const orizzonteTemporale = impostazioni.orizzonteTemporale;
        const reinvestimenti = await db.getReinvestimentiByUserId(ctx.user.id);
        
        // Map to track fiume states (capitale accumulato) by year
        const fiumiStates = new Map<number, Map<number, number>>(); // fiumeId -> mese -> capitale
        const fiumiData = new Map<number, typeof allFiumi[0]>(); // fiumeId -> fiume data
        const fiumiCreatiDaReinvestimento = new Map<number, { nome: string; rendimento: number; meseCreazione: number }>(); // fiumeId -> new fiume info
        
        // Initialize existing fiumi
        allFiumi.forEach(f => {
          fiumiData.set(f.id, f);
          fiumiStates.set(f.id, new Map());
        });
        
        // Load apporti for all fiumi
        const affluentiByFiume = new Map<number, Map<number, number>>(); // fiumeId -> mese -> importo
        for (const fiume of allFiumi) {
          const affluenti = await db.getAffluentiByFiumeId(fiume.id);
          const affluentiMap = new Map<number, number>();
          affluenti.forEach(a => {
            const existing = affluentiMap.get(a.mese) || 0;
            affluentiMap.set(a.mese, existing + (a.importo / 100));
          });
          affluentiByFiume.set(fiume.id, affluentiMap);
        }
        
        // Group reinvestimenti by year
        const reinvestimentiByMese = new Map<number, typeof reinvestimenti>();
        reinvestimenti.forEach(r => {
          const mese = r.reinvestimento.meseReinvestimento;
          if (!reinvestimentiByMese.has(mese)) {
            reinvestimentiByMese.set(mese, []);
          }
          reinvestimentiByMese.get(mese)!.push(r);
        });
        
        let nextNewFiumeId = -1; // Temporary IDs for new fiumi created by reinvestimenti
        
        // Simulate mese per mese
        for (let mese = 0; mese <= orizzonteTemporale; mese++) {
          // Process each fiume for questo mese
          for (const [fiumeId, stateMap] of Array.from(fiumiStates.entries())) {
            const fiume = fiumiData.get(fiumeId) || fiumiCreatiDaReinvestimento.get(fiumeId);
            if (!fiume) continue;
            
            const sorgenteEuro = 'sorgente' in fiume ? (fiume.sorgente as number) / 100 : 0;
            const rendimentoAnnualeDecimale = fiume.rendimento / 10000;
            // Formula corretta per tasso composto mensile: (1 + r_annuale)^(1/12) - 1
            const rendimentoMensileDecimale = Math.pow(1 + rendimentoAnnualeDecimale, 1/12) - 1;
            const meseInizio = fiume.meseCreazione;
            
            if (mese < meseInizio) {
              stateMap.set(mese, 0);
              continue;
            }

            if (mese === meseInizio) {
              // Mese di creazione: capitale iniziale, nessun interesse ancora
              const affluentiMap = affluentiByFiume.get(fiumeId) || new Map();
              stateMap.set(mese, sorgenteEuro + (affluentiMap.get(mese) || 0));
              continue;
            }
            
            // Calculate questo mese's value
            const valorePrecedente = stateMap.get(mese - 1) || 0;
            const rendita = valorePrecedente * rendimentoMensileDecimale;
            
            // Reinvestimento automatico del cash flow
            // percentualeReinvestimento: NULL/undefined = 100% (default), 0% = tutto prelevato, 100% = tutto reinvestito
            const percentualeReinv = (fiume as any).percentualeReinvestimento != null ? (fiume as any).percentualeReinvestimento : 100;
            const importoReinvestito = rendita * (percentualeReinv / 100);
            const cashFlowPrelevabile = rendita - importoReinvestito;
            
            // Il capitale cresce solo con la parte reinvestita della rendita
            let capitaleAccumulato = valorePrecedente + importoReinvestito;
            
            // Add apporti
            const affluentiMap = affluentiByFiume.get(fiumeId) || new Map();
            const affluenteMese = affluentiMap.get(mese) || 0;
            capitaleAccumulato += affluenteMese;
            
            stateMap.set(mese, capitaleAccumulato);
          }
          
          // Process reinvestimenti for questo mese
          const reinvestimentiMese = reinvestimentiByMese.get(mese) || [];
          for (const reinvWrapper of reinvestimentiMese) {
            const reinv = reinvWrapper.reinvestimento;
            const sorgenteState = fiumiStates.get(reinv.fiumeOrigineId);
            if (!sorgenteState) continue;

            const capitaleSorgente = sorgenteState.get(mese) || 0;
            let importoReinvestimento = 0;

            if (reinv.importoFisso) {
              importoReinvestimento = reinv.importoFisso / 100;
            } else if (reinv.percentuale) {
              importoReinvestimento = capitaleSorgente * (reinv.percentuale / 10000);
            }

            // Subtract from source (floor a 0: il capitale non può essere negativo)
            importoReinvestimento = Math.min(importoReinvestimento, Math.max(0, capitaleSorgente));
            sorgenteState.set(mese, capitaleSorgente - importoReinvestimento);

            // Add to destination
            if (reinv.fiumeDestinazioneId) {
              // Existing fiume
              const destState = fiumiStates.get(reinv.fiumeDestinazioneId);
              if (destState) {
                const currentDest = destState.get(mese) || 0;
                destState.set(mese, currentDest + importoReinvestimento);
              }
            } else if (reinv.nuovoFiumeNome && reinv.nuovoFiumeRendimento !== null) {
              // Create new fiume
              const newFiumeId = nextNewFiumeId--;
              fiumiCreatiDaReinvestimento.set(newFiumeId, {
                nome: reinv.nuovoFiumeNome,
                rendimento: reinv.nuovoFiumeRendimento,
                meseCreazione: mese,
              });
              const newStateMap = new Map<number, number>();
              newStateMap.set(mese, importoReinvestimento);
              fiumiStates.set(newFiumeId, newStateMap);
              affluentiByFiume.set(newFiumeId, new Map());
            }
          }
        }
        
        // Build results
        const risultati = [];
        for (const [fiumeId, stateMap] of Array.from(fiumiStates.entries())) {
          const fiume = fiumiData.get(fiumeId) || fiumiCreatiDaReinvestimento.get(fiumeId);
          if (!fiume) continue;
          
          const sorgenteEuro = 'sorgente' in fiume ? (fiume.sorgente as number) / 100 : 0;
          const rendimentoAnnualeDecimale = fiume.rendimento / 10000;
          // Formula corretta per tasso composto mensile: (1 + r_annuale)^(1/12) - 1
          const rendimentoMensileDecimale = Math.pow(1 + rendimentoAnnualeDecimale, 1/12) - 1;
          const meseInizio = fiume.meseCreazione;
          const affluentiMap = affluentiByFiume.get(fiumeId) || new Map();
          
          const percentualeReinv = 'percentualeReinvestimento' in fiume ? (fiume.percentualeReinvestimento as number) : 100;
          
          const mesi = [];
          for (let mese = 1; mese <= orizzonteTemporale; mese++) {
            const valore = stateMap.get(mese) || 0;
            const valorePrecedente = stateMap.get(mese - 1) || 0;
            const rendita = mese >= meseInizio ? valorePrecedente * rendimentoMensileDecimale : 0;
            const affluenteMese = affluentiMap.get(mese) || 0;
            
            // Cash flow mensile = rendita - parte reinvestita
            const importoReinvestito = rendita * (percentualeReinv / 100);
            const cashFlowMensile = rendita - importoReinvestito;
            
            // Calculate reinvestimento for this fiume in questo mese
            let reinvestimentoUscita = 0;
            let reinvestimentoEntrata = 0;
            const reinvMese = reinvestimentiByMese.get(mese) || [];
            for (const reinvWrapper of reinvMese) {
              const reinv = reinvWrapper.reinvestimento;
              if (reinv.fiumeOrigineId === fiumeId) {
                if (reinv.importoFisso) {
                  reinvestimentoUscita += reinv.importoFisso / 100;
                } else if (reinv.percentuale) {
                  reinvestimentoUscita += valorePrecedente * (reinv.percentuale / 10000);
                }
              }
              if (reinv.fiumeDestinazioneId === fiumeId) {
                const sorgenteState = fiumiStates.get(reinv.fiumeOrigineId);
                const capitaleSorgente = sorgenteState?.get(mese - 1) || 0;
                if (reinv.importoFisso) {
                  reinvestimentoEntrata += reinv.importoFisso / 100;
                } else if (reinv.percentuale) {
                  reinvestimentoEntrata += capitaleSorgente * (reinv.percentuale / 10000);
                }
              }
            }
            
            mesi.push({
              mese,
              valore: Math.round(valore * 100) / 100,
              rendita: Math.round(rendita * 100) / 100,
              cashFlowMensile: Math.round(cashFlowMensile * 100) / 100,
              affluenteMese: Math.round(affluenteMese * 100) / 100,
              reinvestimentoUscita: Math.round(reinvestimentoUscita * 100) / 100,
              reinvestimentoEntrata: Math.round(reinvestimentoEntrata * 100) / 100,
            });
          }
          
          risultati.push({
            fiumeId,
            nome: fiume.nome,
            sorgente: sorgenteEuro,
            rendimento: fiume.rendimento / 100,
            meseCreazione: meseInizio,
            mesi,
          });
        }
        
        // Filter by requested fiumi if specified
        if (input.fiumiIds) {
          return risultati.filter(r => input.fiumiIds!.includes(r.fiumeId));
        }
        
        return risultati;
      }),
    
    flussiReinvestimenti: protectedProcedure
      .input(z.object({
        mese: z.number().int().min(1).optional(),
      }))
      .query(async ({ ctx, input }) => {
        const fiumi = await db.getFiumiByUserId(ctx.user.id);
        const reinvestimenti = await db.getReinvestimentiByUserId(ctx.user.id);
        const impostazioni = await db.getImpostazioniByUserId(ctx.user.id);
        const affluenti = [];

        for (const fiume of fiumi) {
          const fiumeAffluenti = await db.getAffluentiByFiumeId(fiume.id);
          affluenti.push(...fiumeAffluenti.map(a => ({ ...a, fiumeId: fiume.id })));
        }

        // Esegui simulazione per calcolare il capitale di ogni fiume ad ogni mese
        // (necessario per convertire le percentuali reinvestimento in importi reali)
        const { fiumiStates } = await runSimulazione(ctx.user.id, impostazioni.orizzonteTemporale);
        
        // Build nodes and links for Sankey diagram
        const nodes: Array<{ id: string; label: string; type: string }> = [];
        const links: Array<{ source: string; target: string; value: number; mese: number; tipo: string }> = [];
        
        // Add fiume nodes
        fiumi.forEach(fiume => {
          nodes.push({
            id: `fiume-${fiume.id}`,
            label: fiume.nome,
            type: 'fiume',
          });
        });
        
        // Add external source node for initial capital and apporti
        nodes.push({
          id: 'source-external',
          label: 'Capitale Esterno',
          type: 'external',
        });
        
        // Add links for initial capital
        fiumi.forEach(fiume => {
          if (fiume.sorgente > 0) {
            links.push({
              source: 'source-external',
              target: `fiume-${fiume.id}`,
              value: fiume.sorgente / 100,
              mese: 0,
              tipo: 'iniziale',
            });
          }
        });
        
        // Add links for affluenti
        affluenti.forEach(affluente => {
          if (!input.mese || affluente.mese === input.mese) {
            links.push({
              source: 'source-external',
              target: `fiume-${affluente.fiumeId}`,
              value: affluente.importo / 100,
              mese: affluente.mese,
              tipo: 'affluente',
            });
          }
        });
        
        // Add links for reinvestimenti
        reinvestimenti.forEach(reinv => {
          const r = reinv.reinvestimento;
          if (!input.mese || r.meseReinvestimento === input.mese) {
            let targetId: string;
            let value: number;

            if (r.fiumeDestinazioneId) {
              targetId = `fiume-${r.fiumeDestinazioneId}`;
            } else if (r.nuovoFiumeNome) {
              // Create node for new fiume if not exists
              const newNodeId = `fiume-new-${r.id}`;
              if (!nodes.find(n => n.id === newNodeId)) {
                nodes.push({
                  id: newNodeId,
                  label: r.nuovoFiumeNome,
                  type: 'fiume-nuovo',
                });
              }
              targetId = newNodeId;
            } else {
              return;
            }

            if (r.importoFisso) {
              value = r.importoFisso / 100;
            } else if (r.percentuale) {
              // Usa il capitale simulato della sorgente al mese del reinvestimento
              const capSorgente = fiumiStates.get(r.fiumeOrigineId)?.get(r.meseReinvestimento) || 0;
              value = capSorgente * (r.percentuale / 10000);
            } else {
              return;
            }

            links.push({
              source: `fiume-${r.fiumeOrigineId}`,
              target: targetId,
              value,
              mese: r.meseReinvestimento,
              tipo: 'reinvestimento',
            });
          }
        });
        
        return {
          nodes,
          links,
        };
      }),
    
    riepilogo: protectedProcedure.query(async ({ ctx }) => {
      const impostazioni = await db.getImpostazioniByUserId(ctx.user.id);
      const orizzonteTemporale = impostazioni.orizzonteTemporale;
      const obiettivoEuro = impostazioni.obiettivoMensile / 100;

      const { fiumiStates, fiumiRendite, allFiumi } = await runSimulazione(ctx.user.id, orizzonteTemporale);

      let capitaleTotale = 0;
      let cashFlowMensileUltimoMese = 0;

      for (const [, stateMap] of Array.from(fiumiStates.entries())) {
        capitaleTotale += stateMap.get(orizzonteTemporale) || 0;
      }
      for (const [, renditeMap] of Array.from(fiumiRendite.entries())) {
        cashFlowMensileUltimoMese += renditeMap.get(orizzonteTemporale) || 0;
      }

      const percentualeRaggiunta = obiettivoEuro > 0 ? (cashFlowMensileUltimoMese / obiettivoEuro) * 100 : 0;

      return {
        numeroFiumi: allFiumi.length,
        capitaleTotale: Math.round(capitaleTotale * 100) / 100,
        cashFlowMensile: Math.round(cashFlowMensileUltimoMese * 100) / 100,
        obiettivo: obiettivoEuro,
        orizzonteTemporale,
        percentualeRaggiunta: Math.round(percentualeRaggiunta * 100) / 100,
      };
    }),
    
    // Performance per ogni fiume (per Analytics)
    fiumiPerformance: protectedProcedure.query(async ({ ctx }) => {
      const allFiumi = await db.getFiumiByUserId(ctx.user.id);
      const impostazioni = await db.getImpostazioniByUserId(ctx.user.id);
      const orizzonteTemporale = impostazioni.orizzonteTemporale;
      
      const performances = await Promise.all(allFiumi.map(async fiume => {
        const sorgenteEuro = fiume.sorgente / 100;
        const rendimentoAnnualeDecimale = fiume.rendimento / 10000;
        const rendimentoMensileDecimale = Math.pow(1 + rendimentoAnnualeDecimale, 1/12) - 1;
        const meseInizio = fiume.meseCreazione;
        
        let capitaleFinale = 0;
        let renditaFinale = 0;
        
        if (orizzonteTemporale >= meseInizio) {
          const affluenti = await db.getAffluentiByFiumeId(fiume.id);
          const affluentiMap = new Map<number, number>();
          affluenti.forEach(a => {
            const existing = affluentiMap.get(a.mese) || 0;
            affluentiMap.set(a.mese, existing + (a.importo / 100));
          });
          
          let capitaleAccumulato = 0;
          
          for (let mese = 0; mese <= orizzonteTemporale; mese++) {
            if (mese === meseInizio) {
              capitaleAccumulato += sorgenteEuro;
            }
            
            if (mese >= meseInizio) {
              const affluenteMese = affluentiMap.get(mese) || 0;
              capitaleAccumulato += affluenteMese;
              
              const rendita = capitaleAccumulato * rendimentoMensileDecimale;
              capitaleAccumulato += rendita;
              
              if (mese === orizzonteTemporale) {
                renditaFinale = rendita;
              }
            }
          }
          
          capitaleFinale = capitaleAccumulato;
        }
        
        const roi = sorgenteEuro > 0 ? ((capitaleFinale - sorgenteEuro) / sorgenteEuro) * 100 : 0;
        
        return {
          fiumeId: fiume.id,
          nome: fiume.nome,
          valoreIniziale: fiume.sorgente, // in centesimi
          valoreFinale: Math.round(capitaleFinale * 100), // euro → centesimi
          rendimento: fiume.rendimento,
          roi: Math.round(roi * 100) / 100,
          renditaMensile: Math.round(renditaFinale * 100), // euro → centesimi
        };
      }));
      
      return performances.sort((a, b) => b.roi - a.roi);
    }),
    
    // Evoluzione patrimonio mese per mese (per grafico Analytics)
    evoluzionePatrimonio: protectedProcedure.query(async ({ ctx }) => {
      const impostazioni = await db.getImpostazioniByUserId(ctx.user.id);
      const orizzonteTemporale = impostazioni.orizzonteTemporale;

      const { fiumiStates, fiumiRendite, fiumiInfo, allFiumi, affluentiByFiume } =
        await runSimulazione(ctx.user.id, orizzonteTemporale);

      const evoluzione: Array<{ mese: number; valore: number; rendita: number; apporti: number }> = [];

      for (let mese = 0; mese <= orizzonteTemporale; mese++) {
        let valoreTotale = 0;
        let renditaTotale = 0;
        let apportiTotale = 0;

        for (const [, stateMap] of Array.from(fiumiStates.entries())) {
          valoreTotale += stateMap.get(mese) || 0;
        }
        for (const [, renditeMap] of Array.from(fiumiRendite.entries())) {
          renditaTotale += renditeMap.get(mese) || 0;
        }
        // Apporti = sorgenti al meseCreazione + affluenti
        for (const fiume of allFiumi) {
          if (mese === fiume.meseCreazione) apportiTotale += fiume.sorgente / 100;
          apportiTotale += affluentiByFiume.get(fiume.id)?.get(mese) || 0;
        }

        evoluzione.push({
          mese,
          valore: Math.round(valoreTotale * 100),
          rendita: Math.round(renditaTotale * 100),
          apporti: Math.round(apportiTotale * 100),
        });
      }

      return evoluzione;
    }),
  }),
  
  scenari: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getScenariByUserId(ctx.user.id);
    }),
    
    create: protectedProcedure
      .input(z.object({
        nome: z.string().min(1).max(255),
        descrizione: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Create scenario
        const scenario = await db.createScenario({
          userId: ctx.user.id,
          nome: input.nome,
          descrizione: input.descrizione || null,
          attivo: 0,
        });
        
        // Create snapshot of current configuration
        const fiumi = await db.getFiumiByUserId(ctx.user.id);
        const affluenti: any[] = [];
        for (const fiume of fiumi) {
          const fiumeAffluenti = await db.getAffluentiByFiumeId(fiume.id);
          affluenti.push(...fiumeAffluenti.map(a => ({ ...a, fiumeId: fiume.id })));
        }
        const reinvestimenti = await db.getReinvestimentiByUserId(ctx.user.id);
        const impostazioni = await db.getImpostazioniByUserId(ctx.user.id);
        
        await db.createScenarioSnapshot({
          scenarioId: scenario.id,
          fiumiData: JSON.stringify(fiumi),
          affluentiData: JSON.stringify(affluenti),
          reinvestimentiData: JSON.stringify(reinvestimenti),
          impostazioniData: JSON.stringify(impostazioni),
        });
        
        return scenario;
      }),
    
    delete: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
      }))
      .mutation(async ({ input }) => {
        await db.deleteScenario(input.id);
        return { success: true };
      }),
    
    setAttivo: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
      }))
      .mutation(async ({ ctx, input }) => {
        await db.setScenarioAttivo(ctx.user.id, input.id);
        return { success: true };
      }),
    
    getSnapshot: protectedProcedure
      .input(z.object({
        scenarioId: z.number().int().positive(),
      }))
      .query(async ({ input }) => {
        const snapshot = await db.getScenarioSnapshotByScenarioId(input.scenarioId);
        if (!snapshot) return null;
        
        return {
          fiumi: JSON.parse(snapshot.fiumiData),
          affluenti: JSON.parse(snapshot.affluentiData),
          reinvestimenti: JSON.parse(snapshot.reinvestimentiData),
          impostazioni: JSON.parse(snapshot.impostazioniData),
        };
      }),
    
    compare: protectedProcedure
      .input(z.object({
        scenarioIds: z.array(z.number().int().positive()).min(2).max(3),
      }))
      .query(async ({ input }) => {
        const results = [];
        
        for (const scenarioId of input.scenarioIds) {
          const scenario = await db.getScenarioById(scenarioId);
          const snapshot = await db.getScenarioSnapshotByScenarioId(scenarioId);
          
          if (!scenario || !snapshot) continue;
          
          const fiumi = JSON.parse(snapshot.fiumiData);
          const affluenti = JSON.parse(snapshot.affluentiData);
          const reinvestimenti = JSON.parse(snapshot.reinvestimentiData);
          const impostazioni = JSON.parse(snapshot.impostazioniData);
          
          // Calculate final values for this scenario
          let capitaleTotale = 0;
          let cashFlowMensile = 0;
          
          fiumi.forEach((fiume: any) => {
            const orizzonteTemporale = impostazioni?.orizzonteTemporale || 5;
            let capitale = fiume.sorgente / 100;
            
            for (let mese = 1; mese <= orizzonteTemporale; mese++) {
              const rendimentoAnnuale = fiume.rendimento / 10000;
              const rendimentoMensile = Math.pow(1 + rendimentoAnnuale, 1/12) - 1;
              const rendita = capitale * rendimentoMensile;
              capitale += rendita;
              
              // Add affluenti for questo mese
              const affluentiAnno = affluenti.filter((a: any) => a.fiumeId === fiume.id && a.mese === mese);
              affluentiAnno.forEach((a: any) => {
                capitale += a.importo / 100;
              });
            }
            
            capitaleTotale += capitale;
            const rendimentoAnnuale = fiume.rendimento / 10000;
            const rendimentoMensile = Math.pow(1 + rendimentoAnnuale, 1/12) - 1;
            cashFlowMensile += capitale * rendimentoMensile;
          });
          
          results.push({
            scenario,
            capitaleTotale: Math.round(capitaleTotale * 100),
            cashFlowMensile: Math.round(cashFlowMensile * 100),
            numeroFiumi: fiumi.length,
          });
        }
        
        return results;
      }),
  }),

  // Notifiche router
  notifiche: router({
    list: protectedProcedure
      .query(async ({ ctx }) => {
        const dbNotifiche = await import("./db-notifiche");
        return dbNotifiche.getNotificheByUserId(ctx.user.id);
      }),
    
    unreadCount: protectedProcedure
      .query(async ({ ctx }) => {
        const dbNotifiche = await import("./db-notifiche");
        return dbNotifiche.getUnreadNotificheCount(ctx.user.id);
      }),
    
    markAsRead: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbNotifiche = await import("./db-notifiche");
        await dbNotifiche.markNotificaAsRead(input.id, ctx.user.id);
        return { success: true };
      }),
    
    markAllAsRead: protectedProcedure
      .mutation(async ({ ctx }) => {
        const dbNotifiche = await import("./db-notifiche");
        await dbNotifiche.markAllNotificheAsRead(ctx.user.id);
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbNotifiche = await import("./db-notifiche");
        await dbNotifiche.deleteNotifica(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // Alert Configuration router
  alertConfig: router({
    list: protectedProcedure
      .query(async ({ ctx }) => {
        const dbNotifiche = await import("./db-notifiche");
        return dbNotifiche.getAlertConfigByUserId(ctx.user.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        tipo: z.enum(["roi_threshold", "value_milestone", "rendita_threshold"]),
        nome: z.string().min(1).max(255),
        soglia: z.number().int(),
        fiumeId: z.number().int().positive().optional(),
        operatore: z.enum(["gt", "lt", "gte", "lte", "eq"]).default("gte"),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbNotifiche = await import("./db-notifiche");
        return dbNotifiche.createAlertConfig({
          userId: ctx.user.id,
          ...input,
        });
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
        nome: z.string().min(1).max(255).optional(),
        soglia: z.number().int().optional(),
        operatore: z.enum(["gt", "lt", "gte", "lte", "eq"]).optional(),
        attivo: z.number().int().min(0).max(1).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        const dbNotifiche = await import("./db-notifiche");
        return dbNotifiche.updateAlertConfig(id, ctx.user.id, data);
      }),
    
    delete: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbNotifiche = await import("./db-notifiche");
        await dbNotifiche.deleteAlertConfig(input.id, ctx.user.id);
        return { success: true };
      }),
    
    toggle: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbNotifiche = await import("./db-notifiche");
        return dbNotifiche.toggleAlertConfig(input.id, ctx.user.id);
      }),
    
    createAlertAutomatico: protectedProcedure
      .input(z.object({
        affluenteId: z.number().int().positive(),
        dataAffluente: z.date(),
        importo: z.number().int(),
        descrizione: z.string().optional(),
        giorniPreavviso: z.number().int().min(1).max(30).default(7),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbNotifiche = await import("./db-notifiche");
        
        // Calcola data alert sottraendo giorni preavviso
        const dataAlert = new Date(input.dataAffluente);
        dataAlert.setDate(dataAlert.getDate() - input.giorniPreavviso);
        
        return dbNotifiche.createAlertConfig({
          userId: ctx.user.id,
          tipo: "affluente_programmato",
          nome: `Alert affluente ${input.descrizione || 'programmato'}`,
          attivo: 1,
          dataAlert,
          giorniPreavviso: input.giorniPreavviso,
          affluenteId: input.affluenteId,
          // Campi nullable per alert temporali
          soglia: null,
          operatore: null,
          fiumeId: undefined,
        });
      }),
    
    createAlertGruppo: protectedProcedure
      .input(z.object({
        groupId: z.string(),
        fiumeId: z.number().int().positive(),
        giorniPreavviso: z.number().int().min(1).max(30).default(7),
      }))
      .mutation(async ({ ctx, input }) => {
        const dbNotifiche = await import("./db-notifiche");
        
        // Get all affluenti in group that don't have alerts yet
        const affluentiGruppo = await db.getAffluentiByGroupId(input.groupId);
        
        // Get existing alerts for these affluenti
        const existingAlerts = await dbNotifiche.getAlertConfigByUserId(ctx.user.id);
        const affluenteIdsWithAlerts = new Set(
          existingAlerts
            .filter((a: any) => a.affluenteId)
            .map((a: any) => a.affluenteId)
        );
        
        // Filter affluenti without alerts and in the future
        const now = new Date();
        const affluentiSenzaAlert = affluentiGruppo.filter((a: any) => {
          if (!a.dataAffluente) return false;
          if (affluenteIdsWithAlerts.has(a.id)) return false;
          return new Date(a.dataAffluente) > now;
        });
        
        // Get fiume name for better alert text
        const fiume = await db.getFiumeById(input.fiumeId);
        const fiumeNome = fiume?.nome || 'Fiume';
        
        // Create alerts for each affluente
        const createdAlerts = [];
        for (const affluente of affluentiSenzaAlert) {
          const dataAlert = new Date(affluente.dataAffluente!);
          dataAlert.setDate(dataAlert.getDate() - input.giorniPreavviso);
          
          // Format date as "gennaio 2026"
          const dataFormatted = new Date(affluente.dataAffluente!).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
          const importoFormatted = (affluente.importo / 100).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          
          const alert = await dbNotifiche.createAlertConfig({
            userId: ctx.user.id,
            tipo: "affluente_programmato",
            nome: `${fiumeNome}: ${importoFormatted}€ - ${dataFormatted}${affluente.descrizione ? ` (${affluente.descrizione})` : ''}`,
            attivo: 1,
            dataAlert,
            giorniPreavviso: input.giorniPreavviso,
            affluenteId: affluente.id,
            soglia: null,
            operatore: null,
            fiumeId: undefined,
          });
          createdAlerts.push(alert);
        }
        
        return { success: true, count: createdAlerts.length, alerts: createdAlerts };
      }),
  }),
  
  // Data Management: Import/Export
  dataManagement: router({
    // Export all user data
    export: protectedProcedure
      .query(async ({ ctx }) => {
        try {
          console.log('[EXPORT] Starting export for user:', ctx.user.id);
          const fiumi = await db.getFiumiByUserId(ctx.user.id);
          console.log('[EXPORT] Fiumi retrieved:', fiumi.length);
          const affluenti: any[] = [];
          for (const fiume of fiumi) {
            const fiumeAffluenti = await db.getAffluentiByFiumeId(fiume.id);
            affluenti.push(...fiumeAffluenti);
          }
          console.log('[EXPORT] Affluenti retrieved:', affluenti.length);
          const reinvestimenti = await db.getReinvestimentiByUserId(ctx.user.id);
          console.log('[EXPORT] Reinvestimenti retrieved:', reinvestimenti.length);
          const impostazioni = await db.getImpostazioniByUserId(ctx.user.id);
          console.log('[EXPORT] Impostazioni retrieved:', impostazioni);
        
          return {
            version: "1.0",
            exportDate: new Date().toISOString(),
            data: {
              fiumi: fiumi.map(f => ({
                nome: f.nome,
                sorgente: f.sorgente,
                rendimento: f.rendimento,
                meseCreazione: f.meseCreazione,
                dataCreazione: f.dataCreazione,
              })),
              affluenti: affluenti.map(a => ({
                fiumeNome: fiumi.find(f => f.id === a.fiumeId)?.nome,
                importo: a.importo,
                mese: a.mese,
                dataAffluente: a.dataAffluente,
                descrizione: a.descrizione,
                periodicita: a.periodicita,
                groupId: a.groupId,
              })),
              reinvestimenti: reinvestimenti.map(r => ({
                fiumeSorgenteNome: r.fiumeOrigineNome,
                fiumeDestinazioneNome: r.fiumeDestinazioneNome,
                nuovoFiumeNome: r.reinvestimento.nuovoFiumeNome,
                nuovoFiumeRendimento: r.reinvestimento.nuovoFiumeRendimento,
                importoFisso: r.reinvestimento.importoFisso,
                percentuale: r.reinvestimento.percentuale,
                mese: r.reinvestimento.meseReinvestimento,
                dataReinvestimento: r.reinvestimento.dataReinvestimento,
              })),
              impostazioni: {
                obiettivoMensile: impostazioni.obiettivoMensile,
                orizzonteTemporale: impostazioni.orizzonteTemporale,
                dataInizio: impostazioni.dataInizio,
                budgetMensileAffluenti: impostazioni.budgetMensileAffluenti,
              },
            },
          };
        } catch (error) {
          console.error('[EXPORT] Error during export:', error);
          throw error;
        }
      }),
    
    // Import user data
    import: protectedProcedure
      .input(z.object({
        data: z.any(), // Will validate structure inside
      }))
      .mutation(async ({ ctx, input }) => {
        const importData = input.data;
        
        // Validate version
        if (importData.version !== "1.0") {
          throw new Error("Versione file non supportata");
        }
        
        const { fiumi, affluenti, reinvestimenti, impostazioni } = importData.data;
        
        // Map to store old fiume names to new fiume IDs
        const fiumeNameToId = new Map<string, number>();
        
        // Import fiumi
        for (const fiume of fiumi) {
          const newFiume = await db.createFiume({
            userId: ctx.user.id,
            nome: fiume.nome,
            sorgente: fiume.sorgente,
            rendimento: fiume.rendimento,
            meseCreazione: fiume.meseCreazione || 0,
            dataCreazione: fiume.dataCreazione ? new Date(fiume.dataCreazione) : null,
          });
          fiumeNameToId.set(fiume.nome, newFiume.id);
        }
        
        // Import affluenti
        for (const affluente of affluenti) {
          const fiumeId = fiumeNameToId.get(affluente.fiumeNome);
          if (!fiumeId) continue;
          
          await db.createAffluente({
            fiumeId,
            importo: affluente.importo,
            mese: affluente.mese,
            dataAffluente: affluente.dataAffluente ? new Date(affluente.dataAffluente) : null,
            descrizione: affluente.descrizione,
          });
        }
        
        // Import reinvestimenti
        for (const reinv of reinvestimenti) {
          const fiumeSorgenteId = fiumeNameToId.get(reinv.fiumeSorgenteNome);
          if (!fiumeSorgenteId) continue;
          
          const fiumeDestinazioneId = reinv.fiumeDestinazioneNome 
            ? fiumeNameToId.get(reinv.fiumeDestinazioneNome)
            : null;
          
          await db.createReinvestimento({
            fiumeOrigineId: fiumeSorgenteId, // Fix: use correct parameter name
            fiumeDestinazioneId: fiumeDestinazioneId || null,
            nuovoFiumeNome: reinv.nuovoFiumeNome,
            nuovoFiumeRendimento: reinv.nuovoFiumeRendimento,
            importoFisso: reinv.importoFisso,
            percentuale: reinv.percentuale,
            meseReinvestimento: reinv.mese, // Fix: use correct parameter name
            dataReinvestimento: reinv.dataReinvestimento ? new Date(reinv.dataReinvestimento) : null,
          });
        }
        
        // Import impostazioni
        await db.updateImpostazioni(ctx.user.id, {
          obiettivoMensile: impostazioni.obiettivoMensile,
          orizzonteTemporale: impostazioni.orizzonteTemporale,
          dataInizio: impostazioni.dataInizio ? new Date(impostazioni.dataInizio) : undefined,
          budgetMensileAffluenti: impostazioni.budgetMensileAffluenti,
        });
        
        return {
          success: true,
          imported: {
            fiumi: fiumi.length,
            affluenti: affluenti.length,
            reinvestimenti: reinvestimenti.length,
          },
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
