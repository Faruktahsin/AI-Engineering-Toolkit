import {
  ActivationClass,
  PAKBErrorCode,
  PrimitiveNotFoundError,
  SchemaValidationError,
  SecurityRedactionError,
  SensitivityTier,
} from "@aiet/schema";
import type { PAKBStorageRepository } from "@aiet/storage";

export class PAKBResourceProvider {
  constructor(private readonly storage: PAKBStorageRepository) {}

  public async readResource(uri: string) {
    if (typeof uri !== "string") {
      throw new SchemaValidationError(
        "Resource URI must be a string.",
        PAKBErrorCode.SCHEMA_VALIDATION_ERROR,
      );
    }

    if (uri === "pakb://preamble/tier0") {
      const text = `# PAKB Tier 0 System Preamble

PAKB Tier 0 System Preamble content. This resource is intended for generating the system-level context used by the MCP server.`;
      return {
        uri,
        mimeType: "text/plain",
        text,
      };
    }

    const entityMatch = uri.match(
      /^pakb:\/\/(entities|directives|assertions|events|relations)\/(.+)$/,
    );
    if (entityMatch) {
      const primitiveId = typeof entityMatch[2] === "string" ? entityMatch[2] : undefined;
      if (!primitiveId) {
        throw new PrimitiveNotFoundError(
          `Resource not found: ${uri}`,
          PAKBErrorCode.PRIMITIVE_NOT_FOUND_ERROR,
        );
      }

      const primitive = await this.storage.getPrimitive(primitiveId);
      if (!primitive) {
        throw new PrimitiveNotFoundError(
          `Resource not found: ${uri}`,
          PAKBErrorCode.PRIMITIVE_NOT_FOUND_ERROR,
          primitiveId,
        );
      }

      if (
        primitive.sensitivity === SensitivityTier.RESTRICTED ||
        primitive.activation === ActivationClass.RESTRICTED
      ) {
        throw new SecurityRedactionError(
          `Access to restricted primitive '${primitiveId}' is denied.`,
          PAKBErrorCode.SECURITY_REDACTION_ERROR,
          primitiveId,
        );
      }

      return {
        uri,
        mimeType: "text/plain",
        text: JSON.stringify(primitive, null, 2),
      };
    }

    throw new SchemaValidationError(
      `Unsupported resource URI: ${uri}`,
      PAKBErrorCode.SCHEMA_VALIDATION_ERROR,
    );
  }
}
