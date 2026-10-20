import { z } from "zod";

/**
 * Zod → JSON Schema conversion for providers that want a raw schema
 * (Gemini's `response_format.schema`).
 *
 * OpenAI takes a Zod schema directly through `zodTextFormat`, so it does not
 * need this module.
 */

type Json = Record<string, unknown>;

function isObject(value: unknown): value is Json {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Resolve every `$ref` by inlining the referenced definition. */
function inlineRefs(node: unknown, defs: Json, seen: Set<string> = new Set()): unknown {
  if (Array.isArray(node)) return node.map((item) => inlineRefs(item, defs, seen));
  if (!isObject(node)) return node;

  if (typeof node.$ref === "string") {
    const name = node.$ref.split("/").pop() ?? "";
    if (seen.has(name) || !defs[name]) return {};
    const nextSeen = new Set(seen);
    nextSeen.add(name);
    return inlineRefs(defs[name], defs, nextSeen);
  }

  const output: Json = {};
  for (const [key, value] of Object.entries(node)) {
    output[key] = inlineRefs(value, defs, seen);
  }
  return output;
}

/**
 * Convert a Zod schema into a plain JSON Schema object.
 *
 * - `$schema` and `$defs` are removed.
 * - `$ref` pointers are inlined so the result is self-contained.
 * - `additionalProperties: false` is added to objects, matching the strict
 *   behaviour both providers expect.
 */
export function zodToJsonSchema(schema: z.ZodType): Json {
  const raw = z.toJSONSchema(schema, { target: "draft-7", io: "output" }) as Json;
  const defs = {
    ...(isObject(raw.$defs) ? raw.$defs : {}),
    ...(isObject(raw.definitions) ? raw.definitions : {}),
  };

  const { $schema, $defs: _defs, definitions: _definitions, ...rest } = raw;
  void $schema;
  void _defs;
  void _definitions;

  const inlined = inlineRefs(rest, defs) as Json;

  const addAdditionalPropertiesFalse = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(addAdditionalPropertiesFalse);
    if (!isObject(node)) return node;
    const output: Json = {};
    for (const [key, value] of Object.entries(node)) {
      output[key] = addAdditionalPropertiesFalse(value);
    }
    if (output.type === "object" && output.properties && output.additionalProperties === undefined) {
      output.additionalProperties = false;
    }
    return output;
  };

  return addAdditionalPropertiesFalse(inlined) as Json;
}
