import type { Instance, Scalar, Source } from "./schema.ts";
import { cellKey } from "./schema.ts";

export interface CellAddress {
  readonly entity: string;
  readonly rowId: string;
  readonly field: string;
}

export interface CellValue {
  readonly value: Scalar;
  readonly source?: Source;
}

export const readCell = (
  instance: Instance,
  address: CellAddress,
): CellValue | undefined => {
  const row = instance.tables[address.entity]?.[address.rowId];
  if (row === undefined || !(address.field in row)) return undefined;
  const source = instance.provenance[cellKey(address.entity, address.rowId, address.field)];
  const result: { value: Scalar; source?: Source } = { value: row[address.field] ?? null };
  if (source !== undefined) result.source = source;
  return result;
};

export const writeCell = (
  instance: Instance,
  address: CellAddress,
  value: Scalar,
  source: Source,
): Instance => {
  const table = instance.tables[address.entity] ?? {};
  const row = table[address.rowId] ?? {};
  return {
    ...instance,
    tables: {
      ...instance.tables,
      [address.entity]: {
        ...table,
        [address.rowId]: { ...row, [address.field]: value },
      },
    },
    provenance: {
      ...instance.provenance,
      [cellKey(address.entity, address.rowId, address.field)]: source,
    },
  };
};
