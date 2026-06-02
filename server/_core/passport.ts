import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import * as db from "../db";
import { ENV } from "./env";

if (ENV.googleClientId && ENV.googleClientSecret) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: ENV.googleClientId,
        clientSecret: ENV.googleClientSecret,
        callbackURL: "/api/oauth/google/callback",
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value ?? null;

          // Cerca per email o per provider ID
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
