// Genera .vercel/output (Build Output API): statici da dist/public + una funzione Express bundlata.
import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const out = path.join(root, ".vercel", "output");
const fn = path.join(out, "functions", "api.func");

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(fn, { recursive: true });

fs.cpSync(path.join(root, "dist", "public"), path.join(out, "static"), { recursive: true });

await build({
  entryPoints: [path.join(root, "server", "vercel-entry.ts")],
  outfile: path.join(fn, "index.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  external: ["pg-native"],
  banner: {
    js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);",
  },
  alias: { "@shared": path.join(root, "shared") },
  logLevel: "info",
});

fs.writeFileSync(
  path.join(fn, ".vc-config.json"),
  JSON.stringify({ runtime: "nodejs22.x", handler: "index.mjs", launcherType: "Nodejs", maxDuration: 30 }, null, 2)
);
fs.writeFileSync(path.join(fn, "package.json"), JSON.stringify({ type: "module" }));

fs.writeFileSync(
  path.join(out, "config.json"),
  JSON.stringify(
    {
      version: 3,
      routes: [
        { src: "/api/(.*)", dest: "/api" },
        { handle: "filesystem" },
        { src: "/(.*)", dest: "/index.html" },
      ],
    },
    null,
    2
  )
);
console.log("[build-vercel] .vercel/output pronto");
