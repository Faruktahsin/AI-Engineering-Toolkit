export class AgentsEmitter {
  emit(_input: unknown) {
    const content = "# Agents\n\nGenerated deterministic agents artifact.\n";
    return {
      target: "AGENTS.md",
      content,
      bytes: Buffer.byteLength(content, "utf8"),
      sha256: "",
      line_count: content.split("\n").length,
    };
  }
}
