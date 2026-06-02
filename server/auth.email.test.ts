import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import type { Request, Response } from "express";
import * as db from "./db";

// Mock context for testing
function createMockContext(): TrpcContext {
  return {
    req: {
      headers: {
        "x-forwarded-proto": "https",
      },
      protocol: "https",
    } as Request,
    res: {
      cookie: () => {},
      clearCookie: () => {},
    } as unknown as Response,
    user: null,
  };
}

describe("Email/Password Authentication", () => {
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = "TestPassword123!";
  const testName = "Test User";

  describe("auth.register", () => {
    it("should successfully register a new user with valid credentials", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.register({
        email: testEmail,
        password: testPassword,
        name: testName,
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(testEmail);
      expect(result.user.name).toBe(testName);
      expect(result.user.authProvider).toBe("email");
      expect(result.user.passwordHash).toBeDefined();
    });

    it("should reject registration with duplicate email", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.auth.register({
          email: testEmail, // Same email as previous test
          password: testPassword,
          name: "Another User",
        })
      ).rejects.toThrow();
    });

    it("should reject registration with weak password (less than 8 characters)", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.auth.register({
          email: `test-weak-${Date.now()}@example.com`,
          password: "weak", // Too short
          name: "Weak Password User",
        })
      ).rejects.toThrow(/password.*8/i);
    });

    it("should reject registration with invalid email format", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.auth.register({
          email: "invalid-email", // Invalid format
          password: testPassword,
          name: "Invalid Email User",
        })
      ).rejects.toThrow();
    });
  });

  describe("auth.loginWithEmail", () => {
    it("should successfully login with correct credentials", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.loginWithEmail({
        email: testEmail,
        password: testPassword,
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(testEmail);
    });

    it("should reject login with incorrect password", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.auth.loginWithEmail({
          email: testEmail,
          password: "WrongPassword123!",
        })
      ).rejects.toThrow(/credenziali/i);
    });

    it("should reject login with non-existent email", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.auth.loginWithEmail({
          email: "nonexistent@example.com",
          password: testPassword,
        })
      ).rejects.toThrow();
    });
  });

  describe("auth.requestPasswordReset", () => {
    it("should successfully request password reset for existing email", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.requestPasswordReset({
        email: testEmail,
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain("email");
    });

    it("should not reveal if email does not exist (security)", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.auth.requestPasswordReset({
        email: "nonexistent@example.com",
      });

      // Should still return success to not reveal user existence
      expect(result.success).toBe(true);
    });
  });

  describe("Password Security", () => {
    it("should hash passwords (not store plain text)", async () => {
      const user = await db.getUserByEmail(testEmail);
      
      expect(user).toBeDefined();
      expect(user!.passwordHash).toBeDefined();
      expect(user!.passwordHash).not.toBe(testPassword);
      expect(user!.passwordHash).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt format
    });
  });

  // Cleanup: Delete test user after all tests
  afterAll(async () => {
    try {
      const user = await db.getUserByEmail(testEmail);
      if (user) {
        const dbInstance = await db.getDb();
        if (dbInstance) {
          const { users } = await import("../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          await dbInstance.delete(users).where(eq(users.id, user.id));
        }
      }
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  });
});
