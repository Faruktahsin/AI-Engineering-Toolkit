export class ManifestEmitter {
  emit(_input: unknown) {
    const content = `${JSON.stringify({ generated: true }, null, 2)}\n`;
    return {
      target: "manifest.json",
      content,
      bytes: Buffer.byteLength(content, "utf8"),
      sha256: "",
      line_count: content.split("\n").length,
    };
  }
}
