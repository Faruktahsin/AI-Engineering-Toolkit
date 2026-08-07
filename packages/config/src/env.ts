/**
  Parses environment variables with an optional prefix or key mapping dictionary.
 */
export function parseEnvVariables<T extends Record<string, unknown>>(
  env: Record<string, string | undefined>,
  prefix?: string,
  envMap?: Record<string, keyof T>,
): Partial<T> {
  const parsed: Record<string, unknown> = {};

  if (envMap) {
    for (const [envKey, configKey] of Object.entries(envMap)) {
      const val = env[envKey];
      if (val !== undefined) {
        parsed[String(configKey)] = parseEnvValue(val);
      }
    }
  }

  if (prefix) {
    const pfx = prefix.toUpperCase().endsWith("_")
      ? prefix.toUpperCase()
      : `${prefix.toUpperCase()}_`;

    for (const [key, val] of Object.entries(env)) {
      if (key.toUpperCase().startsWith(pfx) && val !== undefined) {
        const rawProp = key.slice(pfx.length).toLowerCase();
        parsed[rawProp] = parseEnvValue(val);
      }
    }
  }

  return parsed as Partial<T>;
}

function parseEnvValue(val: string): unknown {
  if (val === "true") return true;
  if (val === "false") return false;
  if (val === "null") return null;

  if (!Number.isNaN(Number(val)) && val.trim() !== "") {
    return Number(val);
  }

  try {
    if ((val.startsWith("{") && val.endsWith("}")) || (val.startsWith("[") && val.endsWith("]"))) {
      return JSON.parse(val);
    }
  } catch {
    // fallback to string
  }

  return val;
}
