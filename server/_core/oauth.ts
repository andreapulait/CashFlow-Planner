import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import passport from "./passport";
import * as db from "../db";

export function registerOAuthRoutes(app: Express) {
  app.use(passport.initialize());

  // ── Google OAuth ─────────────────────────────────────────────────────────
  app.get("/api/oauth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

  app.get(
    "/api/oauth/google/callback",
    passport.authenticate("google", { session: false, failureRedirect: "/?error=google_auth_failed" }),
    async (req: Request, res: Response) => {
      try {
        const user = req.user as Awaited<ReturnType<typeof db.getUserById>>;
        if (!user) { res.redirect("/?error=no_user"); return; }

        const token = await sdk.createSessionToken(`google:${user.id}`, {
          name: user.name ?? "",
          expiresInMs: ONE_YEAR_MS,
        });
        res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });
        res.redirect(302, "/");
      } catch (err) {
        console.error("[OAuth] Google callback failed", err);
        res.redirect("/?error=google_callback_failed");
      }
    }
  );
}
