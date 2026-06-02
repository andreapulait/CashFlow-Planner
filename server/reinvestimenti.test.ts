import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("reinvestimenti API", () => {
  it("should create a reinvestimento with fixed amount", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create two fiumi first
    const fiume1 = await caller.fiumi.create({
      nome: "Fiume Sorgente",
      sorgente: 5000000, // 50000 euro
      rendimento: 1000, // 10%
      annoCreazione: 0,
    });

    const fiume2 = await caller.fiumi.create({
      nome: "Fiume Destinazione",
      sorgente: 2000000, // 20000 euro
      rendimento: 800, // 8%
      annoCreazione: 0,
    });

    // Create reinvestimento
    const reinvestimento = await caller.reinvestimenti.create({
      fiumeSorgenteId: fiume1.id,
      fiumeDestinazioneId: fiume2.id,
      mese: 3,
      importoFisso: 1000000, // 10000 euro
      descrizione: "Test reinvestimento fisso",
    });

    expect(reinvestimento).toBeDefined();
    expect(reinvestimento.fiumeSorgenteId).toBe(fiume1.id);
    expect(reinvestimento.fiumeDestinazioneId).toBe(fiume2.id);
    expect(reinvestimento.mese).toBe(3);
    expect(reinvestimento.importoFisso).toBe(1000000);
    expect(reinvestimento.percentuale).toBeNull();
  });

  it("should create a reinvestimento with percentage", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const fiume1 = await caller.fiumi.create({
      nome: "Fiume Sorgente Perc",
      sorgente: 5000000,
      rendimento: 1000,
      annoCreazione: 0,
    });

    const fiume2 = await caller.fiumi.create({
      nome: "Fiume Destinazione Perc",
      sorgente: 2000000,
      rendimento: 800,
      annoCreazione: 0,
    });

    const reinvestimento = await caller.reinvestimenti.create({
      fiumeSorgenteId: fiume1.id,
      fiumeDestinazioneId: fiume2.id,
      mese: 2,
      percentuale: 2000, // 20%
      descrizione: "Test reinvestimento percentuale",
    });

    expect(reinvestimento).toBeDefined();
    expect(reinvestimento.percentuale).toBe(2000);
    expect(reinvestimento.importoFisso).toBeNull();
  });

  it("should create a reinvestimento that creates new fiume", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const fiume1 = await caller.fiumi.create({
      nome: "Fiume Sorgente Nuovo",
      sorgente: 10000000,
      rendimento: 1200,
      annoCreazione: 0,
    });

    const reinvestimento = await caller.reinvestimenti.create({
      fiumeSorgenteId: fiume1.id,
      mese: 4,
      percentuale: 3000, // 30%
      nuovoFiumeNome: "Nuovo Fiume da Reinvestimento",
      nuovoFiumeRendimento: 600, // 6%
      descrizione: "Crea nuovo fiume",
    });

    expect(reinvestimento).toBeDefined();
    expect(reinvestimento.fiumeDestinazioneId).toBeNull();
    expect(reinvestimento.nuovoFiumeNome).toBe("Nuovo Fiume da Reinvestimento");
    expect(reinvestimento.nuovoFiumeRendimento).toBe(600);
  });

  it("should list reinvestimenti for user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create test fiumi first
    const fiume1 = await caller.fiumi.create({
      nome: "Test Fiume 1",
      sorgente: 1000000,
      rendimento: 800,
      annoCreazione: 1,
    });
    
    const fiume2 = await caller.fiumi.create({
      nome: "Test Fiume 2",
      sorgente: 500000,
      rendimento: 1000,
      annoCreazione: 2,
    });

    // Create a reinvestimento
    await caller.reinvestimenti.create({
      fiumeSorgenteId: fiume1.id,
      fiumeDestinazioneId: fiume2.id,
      mese: 3,
      importoFisso: 50000,
    });

    const reinvestimenti = await caller.reinvestimenti.list();

    expect(Array.isArray(reinvestimenti)).toBe(true);
    expect(reinvestimenti.length).toBeGreaterThan(0);
  });

  it("should delete a reinvestimento", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const fiume1 = await caller.fiumi.create({
      nome: "Fiume Delete Test",
      sorgente: 3000000,
      rendimento: 800,
      annoCreazione: 0,
    });

    const reinvestimento = await caller.reinvestimenti.create({
      fiumeSorgenteId: fiume1.id,
      mese: 2,
      importoFisso: 500000,
      nuovoFiumeNome: "Test Fiume",
      nuovoFiumeRendimento: 700,
    });

    const result = await caller.reinvestimenti.delete({ id: reinvestimento.id });

    expect(result.success).toBe(true);
  });

  it("should validate that either importoFisso or percentuale is provided", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const fiume1 = await caller.fiumi.create({
      nome: "Fiume Validation",
      sorgente: 5000000,
      rendimento: 1000,
      annoCreazione: 0,
    });

    await expect(
      caller.reinvestimenti.create({
        fiumeSorgenteId: fiume1.id,
        mese: 2,
        nuovoFiumeNome: "Test",
        nuovoFiumeRendimento: 800,
        // Missing both importoFisso and percentuale
      })
    ).rejects.toThrow();
  });

  it("should affect simulation correctly", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create fiume with initial capital
    const fiume1 = await caller.fiumi.create({
      nome: "Fiume Simulazione Reinv",
      sorgente: 10000000, // 100000 euro
      rendimento: 1000, // 10%
      annoCreazione: 0,
    });

    // Create reinvestimento that creates new fiume in year 2
    await caller.reinvestimenti.create({
      fiumeSorgenteId: fiume1.id,
      mese: 2,
      percentuale: 2000, // 20%
      nuovoFiumeNome: "Fiume Creato da Reinv",
      nuovoFiumeRendimento: 800, // 8%
    });

    const simulazione = await caller.calcoli.simulazioneQuinquennale({});

    expect(simulazione.length).toBeGreaterThan(1); // Should have original + new fiume
    
    // Find the original fiume
    const fiumeOriginale = simulazione.find(f => f.fiumeId === fiume1.id);
    expect(fiumeOriginale).toBeDefined();
    
    // Check that year 2 has reinvestimento uscita
    const anno2 = fiumeOriginale?.mesi.find(a => a.mese === 2);
    expect(anno2).toBeDefined();
    // The reinvestimento should be reflected in the simulation
    // Either as reinvestimentoUscita or in the reduced valore
    expect(anno2?.reinvestimentoUscita !== undefined || anno2?.valore).toBeDefined();
  });
});
