import type { Instance, Scalar, Source } from "./schema.ts";
import { cellKey } from "./schema.ts";

export interface Mismatch {
  readonly entity: string;
  readonly rowId: string;
  readonly expected: Scalar;
  readonly actual: Scalar;
  readonly sources: readonly Source[];
}

export const findMismatches = (
  instance: Instance,
  entity: string,
  expectedField: string,
  actualField: string,
): readonly Mismatch[] => {
  const result: Mismatch[] = [];
  for (const [rowId, row] of Object.entries(instance.tables[entity] ?? {})) {
    const expected = row[expectedField] ?? null;
    const actual = row[actualField] ?? null;
    if (expected !== actual) {
      const sources = [
        instance.provenance[cellKey(entity, rowId, expectedField)],
        instance.provenance[cellKey(entity, rowId, actualField)],
      ].filter((source): source is Source => source !== undefined);
      result.push({ entity, rowId, expected, actual, sources });
    }
  }
  return result;
};
