import { describe, it, expect, beforeEach } from "vitest";
import { db } from "./db.config";
import { fiumi, affluenti, impostazioni } from "../drizzle/schema";
import { getAffluentiMensiliAggregati, getImpostazioni, updateImpostazioni } from "./db";

describe("Budget Tracker - getAffluentiMensiliAggregati", () => {
  beforeEach(async () => {
    // Clean database
    await db.delete(affluenti);
    await db.delete(fiumi);
    
    // Set up test settings
    await updateImpostazioni({
      dataInizio: new Date('2026-01-01'),
      orizzonteTemporale: 60,
      budgetMensileAffluenti: 5000,
    });
  });

  it("should correctly calculate monthly allocation for recurring semestral affluenti", async () => {
    // Create test fiume
    const [fiume] = await db.insert(fiumi).values({
      nome: "Test Dividendi",
      sorgente: 50000,
      rendimento: 8,
      meseInizio: 0,
      dataCreazione: new Date('2026-01-01'),
    }).returning();

    // Create recurring semestral affluenti (12,000€ every 6 months)
    // Starting July 2026 (month 6), ending July 2030 (month 54)
    // Should create 9 affluenti: months 6, 12, 18, 24, 30, 36, 42, 48, 54
    const groupId = `test_group_${Date.now()}`;
    const affluentiData = [];
    
    for (let i = 0; i < 9; i++) {
      const mese = 6 + (i * 6); // 6, 12, 18, 24, 30, 36, 42, 48, 54
      const date = new Date('2026-01-01');
      date.setMonth(date.getMonth() + mese);
      
      affluentiData.push({
        fiumeId: fiume.id,
        importo: 12000,
        mese,
        dataAffluente: date,
        descrizione: `Semestral ${i + 1}`,
        ricorrente: true,
        periodicita: 6,
        durataMesi: 60,
        groupId,
      });
    }
    
    await db.insert(affluenti).values(affluentiData);

    // Get monthly aggregated data
    const result = await getAffluentiMensiliAggregati();

    // Expected behavior:
    // - Semestral 12,000€ → 2,000€/month (12,000 / 6)
    // - Distribute from month 0 (6 - 6) to month 54
    // - Months 0-54 should have 2,000€
    // - Months 55-59 should have 0€

    expect(result).toHaveLength(60); // All 60 months

    // Check months 0-54 (should have 2,000€)
    for (let mese = 0; mese <= 54; mese++) {
      expect(result[mese].totale).toBe(2000);
    }

    // Check months 55-59 (should have 0€)
    for (let mese = 55; mese < 60; mese++) {
      expect(result[mese].totale).toBe(0);
    }
  });

  it("should correctly calculate monthly allocation for one-time affluente", async () => {
    // Create test fiume
    const [fiume] = await db.insert(fiumi).values({
      nome: "Test Gestito",
      sorgente: 30000,
      rendimento: 6,
      meseInizio: 0,
      dataCreazione: new Date('2026-01-01'),
    }).returning();

    // Create one-time affluente in July 2026 (month 6)
    await db.insert(affluenti).values({
      fiumeId: fiume.id,
      importo: 5000,
      mese: 6,
      dataAffluente: new Date('2026-07-01'),
      descrizione: "Una tantum",
      ricorrente: false,
      periodicita: null,
      durataMesi: null,
      groupId: null,
    });

    // Get monthly aggregated data
    const result = await getAffluentiMensiliAggregati();

    expect(result).toHaveLength(60);

    // Only month 6 should have 5,000€
    expect(result[6].totale).toBe(5000);

    // All other months should have 0€
    for (let mese = 0; mese < 60; mese++) {
      if (mese !== 6) {
        expect(result[mese].totale).toBe(0);
      }
    }
  });

  it("should correctly combine recurring and one-time affluenti", async () => {
    // Create test fiume
    const [fiume] = await db.insert(fiumi).values({
      nome: "Test Combined",
      sorgente: 50000,
      rendimento: 8,
      meseInizio: 0,
      dataCreazione: new Date('2026-01-01'),
    }).returning();

    // Create recurring semestral affluenti (12,000€ every 6 months)
    const groupId = `test_group_${Date.now()}`;
    const affluentiData = [];
    
    for (let i = 0; i < 9; i++) {
      const mese = 6 + (i * 6);
      const date = new Date('2026-01-01');
      date.setMonth(date.getMonth() + mese);
      
      affluentiData.push({
        fiumeId: fiume.id,
        importo: 12000,
        mese,
        dataAffluente: date,
        descrizione: `Semestral ${i + 1}`,
        ricorrente: true,
        periodicita: 6,
        durataMesi: 60,
        groupId,
      });
    }
    
    await db.insert(affluenti).values(affluentiData);

    // Add one-time affluente in July 2026 (month 6)
    await db.insert(affluenti).values({
      fiumeId: fiume.id,
      importo: 5000,
      mese: 6,
      dataAffluente: new Date('2026-07-01'),
      descrizione: "Una tantum",
      ricorrente: false,
      periodicita: null,
      durataMesi: null,
      groupId: null,
    });

    // Get monthly aggregated data
    const result = await getAffluentiMensiliAggregati();

    expect(result).toHaveLength(60);

    // Month 6 should have 2,000€ (recurring) + 5,000€ (one-time) = 7,000€
    expect(result[6].totale).toBe(7000);

    // Months 0-5 and 7-54 should have 2,000€ (recurring only)
    for (let mese = 0; mese <= 54; mese++) {
      if (mese !== 6) {
        expect(result[mese].totale).toBe(2000);
      }
    }

    // Months 55-59 should have 0€
    for (let mese = 55; mese < 60; mese++) {
      expect(result[mese].totale).toBe(0);
    }
  });

  it("should handle monthly recurring affluenti correctly", async () => {
    // Create test fiume
    const [fiume] = await db.insert(fiumi).values({
      nome: "Test Monthly",
      sorgente: 10000,
      rendimento: 5,
      meseInizio: 0,
      dataCreazione: new Date('2026-01-01'),
    }).returning();

    // Create monthly recurring affluenti (1,000€ every month for 12 months)
    const groupId = `test_group_${Date.now()}`;
    const affluentiData = [];
    
    for (let i = 0; i < 12; i++) {
      const mese = 1 + i; // months 1-12
      const date = new Date('2026-01-01');
      date.setMonth(date.getMonth() + mese);
      
      affluentiData.push({
        fiumeId: fiume.id,
        importo: 1000,
        mese,
        dataAffluente: date,
        descrizione: `Monthly ${i + 1}`,
        ricorrente: true,
        periodicita: 1,
        durataMesi: 12,
        groupId,
      });
    }
    
    await db.insert(affluenti).values(affluentiData);

    // Get monthly aggregated data
    const result = await getAffluentiMensiliAggregati();

    expect(result).toHaveLength(60);

    // Months 1-12 should have 1,000€ each (full amount for monthly)
    for (let mese = 1; mese <= 12; mese++) {
      expect(result[mese].totale).toBe(1000);
    }

    // All other months should have 0€
    for (let mese = 0; mese < 60; mese++) {
      if (mese < 1 || mese > 12) {
        expect(result[mese].totale).toBe(0);
      }
    }
  });
});
