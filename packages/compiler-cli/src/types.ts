export interface PAKBConfig {
  readonly input: string;
  readonly output: string;
  readonly targets: readonly string[];
  readonly budget: number;
  readonly strict_mode: boolean;
  readonly dry_run?: boolean;
}

export interface CLIOptions {
  readonly input?: string;
  readonly output?: string;
  readonly config?: string;
  readonly format?: boolean;
  readonly dryRun?: boolean;
  readonly verbose?: boolean;
  readonly failOnWarning?: boolean;
}

export interface CLIResult {
  readonly exitCode: number;
  readonly message: string;
  readonly artifactsWritten?: readonly string[];
  readonly primitivesProcessed?: number;
}
