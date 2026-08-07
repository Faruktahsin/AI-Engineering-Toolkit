export type HealthState = "healthy" | "degraded" | "unhealthy";

export interface HealthCheckResult {
  readonly status: HealthState;
  readonly message?: string;
  readonly details?: Record<string, unknown>;
  readonly timestamp: string;
}

export interface Initialize {
  initialize(options?: Record<string, unknown>): Promise<void>;
}

export interface Start {
  start(): Promise<void>;
}

export interface Stop {
  stop(): Promise<void>;
}

export interface Dispose {
  dispose(): Promise<void>;
}

export interface HealthCheck {
  checkHealth(): Promise<HealthCheckResult>;
}

export interface Version {
  readonly version: string;
}

export interface ILifecycle extends Initialize, Start, Stop, Dispose, HealthCheck, Version {}
