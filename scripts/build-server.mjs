import esbuild from "esbuild";

await esbuild.build({
  entryPoints: ["src/server/index.ts"],
  outfile: "dist/server/index.cjs",
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node18",
  sourcemap: true,
  logLevel: "info",
  // Node builtins are external; all @devvit packages get bundled
  external: ["node:*"],
});

console.log("✅ Built dist/server/index.cjs");
