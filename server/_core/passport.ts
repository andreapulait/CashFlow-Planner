import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import crypto from "crypto";
import * as db from "../db";
import { ENV } from "./env";

// ─── CookieStateStore ─────────────────────────────────────────────────────────
// Salva lo state OAuth in un cookie httpOnly invece che in req.session.
// Questo è necessario per funzionare su Vercel (serverless) dove ogni richiesta
// è una nuova istanza: la sessione in memoria non sopravvive tra i due step OAuth.
// Il cookie viaggia nel browser dell'utente tra step 1 (redirect a Google)
// e step 2 (callback da Google), funzionando sia su server persistente che serverless.

const OAUTH_STATE_COOKIE = "_oastate";
const OAUTH_STATE_MAX_AGE = 600; // 10 minuti

// Helper cookie minimali — evitano problemi di risoluzione tipi con il package "cookie"
function cookieSet(res: any, name: string, value: string, maxAge: number): void {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`);
}
function cookieGet(header: string, name: string): string | undefined {
  const m = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : undefined;
}

class CookieStateStore {
  store(req: any, callback: (err: Error | null, state: string) => void): void {
    const state = crypto.randomBytes(16).toString("hex");
    try {
      const res = req.res ?? req;
      if (typeof res.setHeader === "function") {
        cookieSet(res, OAUTH_STATE_COOKIE, state, OAUTH_STATE_MAX_AGE);
      }
    } catch { /* non bloccare il flusso */ }
    callback(null, state);
  }

  verify(
    req: any,
    providedState: string,
    callback: (err: Error | null, valid: boolean, state?: any) => void
  ): void {
    const storedState = cookieGet(req.headers?.cookie ?? "", OAUTH_STATE_COOKIE);

    if (!storedState) return callback(null, false);

    const valid = storedState === providedState;

    // Cancella il cookie una volta usato
    try {
      const res = req.res ?? req;
      if (typeof res.setHeader === "function") {
        cookieSet(res, OAUTH_STATE_COOKIE, "", 0);
      }
    } catch {}

    callback(null, valid, providedState);
  }
}

// ─── Google Strategy ──────────────────────────────────────────────────────────

if (ENV.googleClientId && ENV.googleClientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: ENV.googleClientId,
        clientSecret: ENV.googleClientSecret,
        callbackURL: "/api/oauth/google/callback",
        store: new CookieStateStore() as any,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value ?? null;

          let user = email ? await db.getUserByEmail(email) : null;
          if (!user) user = await db.getUserByOAuthProvider("google", profile.id);

          if (!user) {
            user = await db.createOAuthUser({
              email,
              name: profile.displayName ?? null,
              authProvider: "google",
              oauthProviderId: profile.id,
            });
          } else if (user.oauthProviderId !== profile.id) {
            await db.updateUserOAuthInfo(user.id, "google", profile.id);
          }

          await db.updateUserLastSignedIn(user!.id);
          return done(null, user!);
        } catch (err) {
          return done(err as Error);
        }
      }
    )
  );
}

passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser(async (id: number, done) => {
  try {
    done(null, await db.getUserById(id));
  } catch (err) {
    done(err);
  }
});

export default passport;
