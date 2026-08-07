import { describe, expect, it } from "vitest";
import {
  PluginRegistryImpl,
  ProviderRegistry,
  Registry,
  ToolRegistryImpl,
  WorkflowRegistry,
} from "../src/index";

describe("@aiet/contracts Package Unit Tests", () => {
  it("should register, retrieve, list, and unregister items in generic Registry", () => {
    const registry = new Registry<{ readonly id: string; readonly name: string }>();

    registry.register({ id: "item_1", name: "First Item" });
    registry.register({ id: "item_2", name: "Second Item" });

    expect(registry.has("item_1")).toBe(true);
    expect(registry.get("item_1")?.name).toBe("First Item");
    expect(registry.list()).toHaveLength(2);

    expect(registry.unregister("item_1")).toBe(true);
    expect(registry.has("item_1")).toBe(false);
    expect(registry.list()).toHaveLength(1);
  });

  it("should support typed ProviderRegistry, ToolRegistry, PluginRegistry, and WorkflowRegistry", () => {
    const providerReg = new ProviderRegistry();
    providerReg.register({
      id: "mock_provider",
      name: "Mock Provider",
      capabilities: {
        supportsStreaming: true,
        supportsTools: true,
        supportsVision: false,
        supportsJSONOutput: true,
        maxContextTokens: 128000,
        maxOutputTokens: 4096,
      },
    });

    expect(providerReg.get("mock_provider")?.name).toBe("Mock Provider");

    const toolReg = new ToolRegistryImpl();
    toolReg.register({
      definition: {
        name: "test_tool",
        description: "A test tool",
        inputSchema: { type: "object" },
      },
      executor: {
        execute: async () => ({ success: true, data: "ok" }),
      },
    });

    expect(toolReg.listDefinitions()).toHaveLength(1);
    expect(toolReg.listDefinitions()[0]?.name).toBe("test_tool");

    const pluginReg = new PluginRegistryImpl();
    const workflowReg = new WorkflowRegistry();

    expect(pluginReg.list()).toHaveLength(0);
    expect(workflowReg.list()).toHaveLength(0);
  });
});
