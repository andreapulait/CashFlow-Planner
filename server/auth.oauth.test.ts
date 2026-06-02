import { describe, it, expect } from "vitest";
import { ENV } from "./_core/env";

describe("OAuth Configuration", () => {
  it("should have Google OAuth credentials configured", () => {
    expect(ENV.googleClientId).toBeDefined();
    expect(ENV.googleClientId).not.toBe("");
    expect(ENV.googleClientSecret).toBeDefined();
    expect(ENV.googleClientSecret).not.toBe("");
  });

  it("should have GitHub OAuth credentials configured", () => {
    expect(ENV.githubClientId).toBeDefined();
    expect(ENV.githubClientId).not.toBe("");
    expect(ENV.githubClientSecret).toBeDefined();
    expect(ENV.githubClientSecret).not.toBe("");
  });

  it("should have valid Google Client ID format", () => {
    // Google Client IDs typically end with .apps.googleusercontent.com
    expect(ENV.googleClientId).toMatch(/\.apps\.googleusercontent\.com$/);
  });

  it("should have valid GitHub Client ID format", () => {
    // GitHub Client IDs are alphanumeric strings (new format starts with Ov)
    expect(ENV.githubClientId).toMatch(/^[a-zA-Z0-9]{20}$/);
  });
});
