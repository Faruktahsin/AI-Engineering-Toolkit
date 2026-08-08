import { z } from "zod";

export const PAKBConfigSchema = z.object({
  input: z.string().min(1, "Input directory path must be specified").default("./primitives"),
  output: z.string().min(1, "Output directory path must be specified").default("./dist"),
  targets: z.array(z.string()).default(["AGENTS.md", "CLAUDE.md", ".cursorrules", "manifest.json"]),
  budget: z.number().int().positive("Budget must be a positive integer").default(500),
  strict_mode: z.boolean().default(true),
  dry_run: z.boolean().optional(),
});

export type PAKBConfig = z.infer<typeof PAKBConfigSchema>;

export function validatePAKBConfig(data: unknown): PAKBConfig {
  const result = PAKBConfigSchema.safeParse(data);
  if (!result.success) {
    const formattedErrors = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`PAKB Configuration Validation Error: ${formattedErrors}`);
  }
  return result.data;
}
