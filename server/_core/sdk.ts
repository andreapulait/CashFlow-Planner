import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

export type SessionPayload = {
  sub: string; // "email:<id>" | "google:<id>"
  name: string;
};

class SDKServer {
  private getSecret() {
    if (!ENV.cookieSecret) throw new Error("JWT_SECRET is not configured");
    return new TextEncoder().encode(ENV.cookieSecret);
  }

  private parseCookies(cookieHeader: string | undefined): Map<string, string> {
    if (!cookieHeader) return new Map();
    return new Map(Object.entries(parseCookieHeader(cookieHeader)));
  }

  async createSessionToken(
    sub: string,
    options: { name?: string; expiresInMs?: number } = {}
  ): Promise<string> {
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((Date.now() + expiresInMs) / 1000);
    return new SignJWT({ sub, name: options.name ?? "" })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(this.getSecret());
  }

  async verifySession(
    cookieValue: string | undefined | null
  ): Promise<SessionPayload | null> {
    if (!cookieValue) return null;
    try {
      const { payload } = await jwtVerify(cookieValue, this.getSecret(), {
        algorithms: ["HS256"],
      });
      const sub = payload.sub as string;
      const name = (payload.name as string) ?? "";
      if (!sub) return null;
      return { sub, name };
    } catch {
      return null;
    }
  }

  async authenticateRequest(req: Request): Promise<User> {
    const cookies = this.parseCookies(req.headers.cookie);
    const session = await this.verifySession(cookies.get(COOKIE_NAME));

    if (!session) throw ForbiddenError("Invalid or missing session");

    const { sub } = session;

    // email:<userId>
    if (sub.startsWith("email:")) {
      const userId = parseInt(sub.slice(6), 10);
      const user = await db.getUserById(userId);
      if (!user) throw ForbiddenError("User not found");
      await db.updateUserLastSignedIn(user.id);
      return user;
    }

    // google:<userId>
    if (sub.startsWith("google:")) {
      const userId = parseInt(sub.slice(7), 10);
      const user = await db.getUserById(userId);
      if (!user) throw ForbiddenError("User not found");
      await db.updateUserLastSignedIn(user.id);
      return user;
    }

    throw ForbiddenError("Unknown session format");
  }
}

export const sdk = new SDKServer();
