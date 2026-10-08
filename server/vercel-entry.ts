// Entry point serverless (Vercel) — Express senza .listen(). I file statici sono serviti dalla CDN.
import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./_core/oauth";
import { appRouter } from "./routers";
import { createContext } from "./_core/context";

const app = express();
app.set("trust proxy", true);
app.use(express.json({ limit: "4mb" }));
app.use(express.urlencoded({ limit: "4mb", extended: true }));

registerOAuthRoutes(app);

app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));

export default app;
