export class CursorEmitter {
  emit(_input: unknown) {
    const content = "# Cursor Rules\n\nGenerated deterministic cursor rules artifact.\n";
    return {
      target: ".cursorrules",
      content,
      bytes: Buffer.byteLength(content, "utf8"),
      sha256: "",
      line_count: content.split("\n").length,
    };
  }
}
