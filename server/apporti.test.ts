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

describe("apporti API", () => {
  it("should create an apporto successfully", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // First create a fiume
    const fiume = await caller.fiumi.create({
      nome: "Test Fiume for Apporti",
      sorgente: 1000000, // 10000 euro in cents
      rendimento: 1000, // 10% in basis points
      annoCreazione: 0,
    });

    // Create an apporto
    const affluente = await caller.affluenti.create({
      fiumeId: fiume.id,
      importo: 500000, // 5000 euro in cents
      mese: 1,
      descrizione: "Test apporto anno 1",
    });

    expect(affluente).toBeDefined();
    expect(affluente.fiumeId).toBe(fiume.id);
    expect(affluente.importo).toBe(500000);
    expect(affluente.mese).toBe(1);
    expect(affluente.descrizione).toBe("Test apporto anno 1");
  });

  it("should list apporti for a fiume", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const fiume = await caller.fiumi.create({
      nome: "Test Fiume List Apporti",
      sorgente: 1000000,
      rendimento: 800,
      annoCreazione: 0,
    });

    await caller.affluenti.create({
      fiumeId: fiume.id,
      importo: 200000,
      mese: 1,
    });

    await caller.affluenti.create({
      fiumeId: fiume.id,
      importo: 300000,
      mese: 2,
    });

    const apporti = await caller.affluenti.listByFiume({ fiumeId: fiume.id });

    expect(apporti).toHaveLength(2);
    expect(apporti[0]?.mese).toBe(1);
    expect(apporti[1]?.mese).toBe(2);
  });

  it("should update an apporto", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const fiume = await caller.fiumi.create({
      nome: "Test Fiume Update Apporto",
      sorgente: 1000000,
      rendimento: 600,
      annoCreazione: 0,
    });

    const affluente = await caller.affluenti.create({
      fiumeId: fiume.id,
      importo: 100000,
      mese: 1,
      descrizione: "Original",
    });

    const updated = await caller.affluenti.update({
      id: affluente.id,
      fiumeId: fiume.id,
      importo: 150000,
      descrizione: "Updated",
    });

    expect(updated.importo).toBe(150000);
    expect(updated.descrizione).toBe("Updated");
  });

  it("should delete an apporto", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const fiume = await caller.fiumi.create({
      nome: "Test Fiume Delete Apporto",
      sorgente: 1000000,
      rendimento: 500,
      annoCreazione: 0,
    });

    const affluente = await caller.affluenti.create({
      fiumeId: fiume.id,
      importo: 100000,
      mese: 1,
    });

    const result = await caller.affluenti.delete({
      id: affluente.id,
      fiumeId: fiume.id,
    });

    expect(result.success).toBe(true);

    const apporti = await caller.affluenti.listByFiume({ fiumeId: fiume.id });
    expect(apporti).toHaveLength(0);
  });
});

describe("calcoli with apporti", () => {
  it("should calculate simulation correctly with multiple apporti", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create fiume with 10000 initial
    const fiume = await caller.fiumi.create({
      nome: "Test Fiume Calcoli Apporti",
      sorgente: 1000000, // 10000 euro
      rendimento: 1000, // 10%
      annoCreazione: 0,
    });

    // Add apporto of 5000 in year 1
    await caller.affluenti.create({
      fiumeId: fiume.id,
      importo: 500000, // 5000 euro
      mese: 1,
    });

    // Add apporto of 3000 in year 2
    await caller.affluenti.create({
      fiumeId: fiume.id,
      importo: 300000, // 3000 euro
      mese: 2,
    });

    const simulazione = await caller.calcoli.simulazioneQuinquennale({});

    const testFiume = simulazione.find(f => f.fiumeId === fiume.id);
    expect(testFiume).toBeDefined();

    // Mese 1: 10000 * (1 + 0.1/12) + 5000 ≈ 15083.33
    const mese1 = testFiume?.mesi.find(a => a.mese === 1);
    expect(mese1?.affluenteMese).toBe(5000);
    expect(mese1?.valore).toBeCloseTo(15083.33, 0);

    // Mese 2: 15083.33 * (1 + 0.1/12) + 3000 ≈ 18209.03
    const mese2 = testFiume?.mesi.find(a => a.mese === 2);
    expect(mese2?.affluenteMese).toBe(3000);
    expect(mese2?.valore).toBeCloseTo(18209.03, 0);
  });
});
