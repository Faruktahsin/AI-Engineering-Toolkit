import type { ILifecycle } from "./lifecycle";

export interface PluginMetadata {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  readonly dependencies?: readonly string[];
}

export interface PluginLifecycle extends ILifecycle {}

export interface Plugin {
  readonly metadata: PluginMetadata;
  readonly lifecycle: PluginLifecycle;
}

export interface PluginRegistry {
  register(plugin: Plugin): Promise<void>;
  unregister(id: string): Promise<boolean>;
  get(id: string): Plugin | undefined;
  list(): readonly PluginMetadata[];
}
