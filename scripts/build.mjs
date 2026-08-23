import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

function run(command) {
  const result = spawnSync(command, {
    encoding: "utf8",
    shell: true,
    env: process.env,
  });
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  return result;
}

function fail(result) {
  process.exit(result.status ?? 1);
}

function chmodPrismaEngines() {
  const dir = join(process.cwd(), "node_modules", "@prisma", "engines");
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (!name.startsWith("schema-engine")) continue;
    try {
      chmodSync(join(dir, name), 0o755);
    } catch {
      // Hostinger may also block chmod; migrate will then be skipped.
    }
  }
}

function combinedOutput(result) {
  return [
    result.stdout,
    result.stderr,
    result.error?.message,
    result.error?.code,
  ]
    .filter(Boolean)
    .join("\n");
}

function engineNotExecutable(result) {
  const text = combinedOutput(result);
  return (
    result.error?.code === "EACCES" ||
    result.error?.code === "EPERM" ||
    /EACCES|EPERM|schema engine exited/i.test(text)
  );
}

const generate = run("prisma generate");
if (generate.status !== 0) fail(generate);

chmodPrismaEngines();

const migrate = run("prisma migrate deploy");
if (migrate.status !== 0) {
  if (engineNotExecutable(migrate)) {
    console.warn(
      "Skipping prisma migrate deploy: Prisma schema-engine is not executable in this environment (Hostinger). Apply migrations locally against Neon.",
    );
  } else {
    fail(migrate);
  }
}

const nextBuild = run("next build");
if (nextBuild.status !== 0) fail(nextBuild);
