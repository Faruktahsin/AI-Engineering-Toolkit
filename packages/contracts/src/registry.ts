import type { Plugin, PluginMetadata } from "./plugin";
import type { AIProvider } from "./provider";
import type { Tool, ToolDefinition } from "./tool";
import type { Workflow } from "./workflow";

export class Registry<T extends object = object> {
  private readonly items = new Map<string, T>();

  protected getKey(item: T): string | undefined {
    const candidate = item as { readonly id?: string; readonly name?: string };
    return candidate.id || candidate.name;
  }

  public register(item: T, key?: string): void {
    const registryKey = key ?? this.getKey(item);
    if (!registryKey) {
      throw new Error("Registry item must have an identifier or explicit registration key.");
    }
    this.items.set(registryKey, item);
  }

  public unregister(key: string): boolean {
    return this.items.delete(key);
  }

  public get(key: string): T | undefined {
    return this.items.get(key);
  }

  public has(key: string): boolean {
    return this.items.has(key);
  }

  public list(): readonly T[] {
    return Array.from(this.items.values());
  }

  public clear(): void {
    this.items.clear();
  }
}

export class ProviderRegistry extends Registry<AIProvider> {
  protected override getKey(provider: AIProvider): string | undefined {
    return provider.id || provider.name;
  }
}

export class ToolRegistryImpl extends Registry<Tool> {
  protected override getKey(tool: Tool): string | undefined {
    return tool.definition.name;
  }

  public listDefinitions(): readonly ToolDefinition[] {
    return this.list().map((t) => t.definition);
  }
}

export class PluginRegistryImpl extends Registry<Plugin> {
  protected override getKey(plugin: Plugin): string | undefined {
    return plugin.metadata.id || plugin.metadata.name;
  }

  public listMetadata(): readonly PluginMetadata[] {
    return this.list().map((p) => p.metadata);
  }
}

export class WorkflowRegistry extends Registry<Workflow> {
  protected override getKey(workflow: Workflow): string | undefined {
    return workflow.id || workflow.name;
  }
}
