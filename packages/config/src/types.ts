export type ConfigValidator<T> = (config: unknown) => T;

export interface ConfigLoaderOptions<T> {
  readonly defaults?: T;
  readonly jsonPath?: string;
  readonly envPrefix?: string;
  readonly envMap?: Record<string, keyof T>;
  readonly validator?: ConfigValidator<T>;
}

export interface ConfigLoadResult<T> {
  readonly config: T;
  readonly sourcesLoaded: readonly string[];
}
