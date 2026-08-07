export class ClaudeEmitter {
  emit(_input: unknown) {
    const content = "# Claude\n\nGenerated deterministic Claude artifact.\n";
    return {
      target: "CLAUDE.md",
      content,
      bytes: Buffer.byteLength(content, "utf8"),
      sha256: "",
      line_count: content.split("\n").length,
    };
  }
}
