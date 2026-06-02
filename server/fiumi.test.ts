import { describe, expect, it, beforeEach } from "vitest";
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

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("fiumi API", () => {
  it("should create a fiume successfully", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const fiume = await caller.fiumi.create({
      nome: "Test Dividendi",
      sorgente: 5000000, // 50000 euro in cents
      rendimento: 1000, // 10% in basis points
      annoCreazione: 0,
    });

    expect(fiume).toBeDefined();
    expect(fiume.nome).toBe("Test Dividendi");
    expect(fiume.sorgente).toBe(5000000);
    expect(fiume.rendimento).toBe(1000);
    expect(fiume.userId).toBe(1);
  });

  it("should list fiumi for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a fiume first
    await caller.fiumi.create({
      nome: "Test Fiume",
      sorgente: 2000000,
      rendimento: 800,
      annoCreazione: 0,
    });

    const fiumi = await caller.fiumi.list();
    
    expect(Array.isArray(fiumi)).toBe(true);
    expect(fiumi.length).toBeGreaterThan(0);
  });

  it("should update a fiume", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a fiume
    const created = await caller.fiumi.create({
      nome: "Original Name",
      sorgente: 1000000,
      rendimento: 500,
      annoCreazione: 0,
    });

    // Update it
    const updated = await caller.fiumi.update({
      id: created.id,
      nome: "Updated Name",
      rendimento: 600,
    });

    expect(updated.nome).toBe("Updated Name");
    expect(updated.rendimento).toBe(600);
    expect(updated.sorgente).toBe(1000000); // Should remain unchanged
  });

  it("should delete a fiume", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a fiume
    const created = await caller.fiumi.create({
      nome: "To Delete",
      sorgente: 500000,
      rendimento: 400,
      annoCreazione: 0,
    });

    // Delete it
    const result = await caller.fiumi.delete({ id: created.id });
    
    expect(result.success).toBe(true);
  });
});

describe("calcoli API", () => {
  it("should calculate quinquennial simulation correctly", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Update settings to ensure 60 months horizon
    await caller.impostazioni.update({
      orizzonteTemporale: 60,
    });

    // Create a test fiume
    await caller.fiumi.create({
      nome: "Test Certificato",
      sorgente: 2000000, // 20000 euro
      rendimento: 800, // 8%
      meseCreazione: 0,
    });

    const simulazione = await caller.calcoli.simulazioneQuinquennale({});

    expect(Array.isArray(simulazione)).toBe(true);
    expect(simulazione.length).toBeGreaterThan(0);

    const firstFiume = simulazione[0];
    expect(firstFiume).toBeDefined();
    expect(firstFiume?.mesi).toBeDefined();
    expect(firstFiume?.mesi.length).toBeGreaterThan(0);

    // Verify compound interest calculation
    const mese1 = firstFiume?.mesi[0];
    expect(mese1?.mese).toBe(1);
    // Mese 1: 20000 * (1 + 0.08/12) ≈ 20133.33
    expect(mese1?.valore).toBeGreaterThan(20000); // Should be more than initial
    expect(mese1?.rendita).toBeGreaterThan(0); // Should have rendita
    
    // Last month should be greater than first month
    const lastMese = firstFiume?.mesi[firstFiume.mesi.length - 1];
    expect(lastMese?.valore).toBeGreaterThan(mese1?.valore || 0);
  });

  it("should calculate riepilogo correctly", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const riepilogo = await caller.calcoli.riepilogo();

    expect(riepilogo).toBeDefined();
    expect(riepilogo.numeroFiumi).toBeGreaterThanOrEqual(0);
    expect(riepilogo.capitaleTotale).toBeGreaterThanOrEqual(0);
    expect(riepilogo.cashFlowMensile).toBeGreaterThanOrEqual(0);
    expect(riepilogo.obiettivo).toBeGreaterThan(0); // Obiettivo configurato dall'utente
    expect(typeof riepilogo.percentualeRaggiunta).toBe("number");
  });

  it("should calculate compound interest correctly for 10% return", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Update settings to ensure 60 months horizon
    await caller.impostazioni.update({
      orizzonteTemporale: 60,
    });

    // Create fiume with known values for verification
    await caller.fiumi.create({
      nome: "Math Test",
      sorgente: 10000000, // 100000 euro
      rendimento: 1000, // 10%
      annoCreazione: 0,
    });

    const simulazione = await caller.calcoli.simulazioneQuinquennale({});
    const mathTestFiume = simulazione.find(f => f.nome === "Math Test");

    expect(mathTestFiume).toBeDefined();
    expect(mathTestFiume?.mesi.length).toBeGreaterThanOrEqual(12);
    
    // Mese 1: 100000 * (1 + 0.1/12) ≈ 100833.33
    const mese1 = mathTestFiume?.mesi[0];
    expect(mese1?.valore).toBeCloseTo(100833.33, 0);
    
    // Mese 12 (1 anno): 100000 * (1 + 0.1/12)^12 ≈ 110471.31
    const mese12 = mathTestFiume?.mesi[11];
    expect(mese12?.valore).toBeCloseTo(110471.31, 0);
  });
});
