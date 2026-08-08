import fs from "node:fs";
import path from "node:path";
import { PAKBStorageRepository } from "@aiet/storage";
import { DEFAULT_CONFIG, DEFAULT_CONFIG_FILENAME } from "./config";

export interface InitOptions {
  readonly force?: boolean | undefined;
}

export function initializeProject(targetDir = ".", options: InitOptions = {}): string {
  const rootPath = path.resolve(targetDir);

  if (!fs.existsSync(rootPath)) {
    fs.mkdirSync(rootPath, { recursive: true });
  }

  // 1. Create .aiet directory structure
  const aietDir = path.join(rootPath, ".aiet");
  const primitivesDir = path.join(aietDir, "primitives");
  const entitiesDir = path.join(primitivesDir, "entities");
  const directivesDir = path.join(primitivesDir, "directives");
  const assertionsDir = path.join(primitivesDir, "assertions");
  const outputsDir = path.join(aietDir, "outputs");

  fs.mkdirSync(entitiesDir, { recursive: true });
  fs.mkdirSync(directivesDir, { recursive: true });
  fs.mkdirSync(assertionsDir, { recursive: true });
  fs.mkdirSync(outputsDir, { recursive: true });

  // Also create root primitives folder for backward compatibility
  const rootPrimitivesDir = path.join(rootPath, "primitives");
  fs.mkdirSync(path.join(rootPrimitivesDir, "entities"), { recursive: true });
  fs.mkdirSync(path.join(rootPrimitivesDir, "directives"), { recursive: true });
  fs.mkdirSync(path.join(rootPrimitivesDir, "assertions"), { recursive: true });

  // 2. Initialize .aiet/config.json and root config
  const configPath = path.join(rootPath, DEFAULT_CONFIG_FILENAME);
  const aietConfigPath = path.join(aietDir, "config.json");

  if (fs.existsSync(configPath) && !options.force) {
    throw new Error(
      `Configuration file '${DEFAULT_CONFIG_FILENAME}' already exists in ${rootPath}. Use --force to overwrite.`,
    );
  }

  const configContent = JSON.stringify(DEFAULT_CONFIG, null, 2);
  fs.writeFileSync(configPath, configContent, "utf8");
  fs.writeFileSync(aietConfigPath, configContent, "utf8");

  // 3. Initialize .aiet/memory.db SQLite database
  const dbPath = path.join(aietDir, "memory.db");
  const repo = new PAKBStorageRepository({ db_path: dbPath });
  repo.close();

  const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

  // Sample Entity
  const sampleEntity = {
    schema_version: "1.0.0",
    id: "ent_01H00000000000000000000001",
    created_at: now,
    updated_at: now,
    last_verified: now,
    sensitivity: "public",
    volatility: "low",
    activation: "always_on",
    name: "AI Engineering System",
    type: "workstream",
    status: "active",
    description: "Root AI system entity for deterministic context management.",
  };
  fs.writeFileSync(
    path.join(path.join(rootPrimitivesDir, "entities"), "system.json"),
    JSON.stringify(sampleEntity, null, 2),
    "utf8",
  );
  fs.writeFileSync(
    path.join(entitiesDir, "system.json"),
    JSON.stringify(sampleEntity, null, 2),
    "utf8",
  );

  // Sample Directive
  const sampleDirective = {
    schema_version: "1.0.0",
    id: "dir_01H00000000000000000000002",
    created_at: now,
    updated_at: now,
    last_verified: now,
    sensitivity: "public",
    volatility: "low",
    activation: "always_on",
    statement:
      "Never output raw API keys, bearer tokens, or sensitive credentials in prompt outputs.",
    enforcement: "hard",
    domain: "safety",
  };
  fs.writeFileSync(
    path.join(path.join(rootPrimitivesDir, "directives"), "rules.json"),
    JSON.stringify(sampleDirective, null, 2),
    "utf8",
  );
  fs.writeFileSync(
    path.join(directivesDir, "rules.json"),
    JSON.stringify(sampleDirective, null, 2),
    "utf8",
  );

  // Sample Assertion
  const sampleAssertion = {
    schema_version: "1.0.0",
    id: "ast_01H00000000000000000000003",
    created_at: now,
    updated_at: now,
    last_verified: now,
    sensitivity: "public",
    volatility: "low",
    activation: "always_on",
    claim: "AIET context compilation is deterministic under 500 token budgets.",
    evidence_type: "stated",
    type: "fact",
    status: "accepted",
  };
  fs.writeFileSync(
    path.join(path.join(rootPrimitivesDir, "assertions"), "facts.json"),
    JSON.stringify(sampleAssertion, null, 2),
    "utf8",
  );
  fs.writeFileSync(
    path.join(assertionsDir, "facts.json"),
    JSON.stringify(sampleAssertion, null, 2),
    "utf8",
  );

  return rootPath;
}
