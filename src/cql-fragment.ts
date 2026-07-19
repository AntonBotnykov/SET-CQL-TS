import type { Instance, Provenance, Row, Schema, Source, Table } from "./schema.ts";
import { cellKey, validateInstance, validateSchema } from "./schema.ts";

export interface DirectMapping {
  readonly name: string;
  readonly source: Schema;
  readonly target: Schema;
  readonly entities: Readonly<Record<string, string>>;
  readonly attributes: Readonly<Record<string, Readonly<Record<string, string>>>>;
  readonly foreignKeys: Readonly<Record<string, Readonly<Record<string, string>>>>;
}

export class MappingError extends Error {
  readonly _tag = "MappingError";
}

const mappedFields = (
  mapping: DirectMapping,
  sourceEntity: string,
): Readonly<Record<string, string>> => ({
  ...(mapping.attributes[sourceEntity] ?? {}),
  ...(mapping.foreignKeys[sourceEntity] ?? {}),
});

export const validateMapping = (mapping: DirectMapping): readonly string[] => {
  const issues = [
    ...validateSchema(mapping.source).map((issue) => `source: ${issue.message}`),
    ...validateSchema(mapping.target).map((issue) => `target: ${issue.message}`),
  ];

  for (const [sourceName, sourceEntity] of Object.entries(mapping.source.entities)) {
    const targetName = mapping.entities[sourceName];
    const targetEntity = targetName === undefined ? undefined : mapping.target.entities[targetName];
    if (targetEntity === undefined) {
      issues.push(`Missing entity image for ${sourceName}`);
      continue;
    }

    for (const attribute of Object.keys(sourceEntity.attributes)) {
      const targetAttribute = mapping.attributes[sourceName]?.[attribute];
      if (
        targetAttribute === undefined ||
        targetEntity.attributes[targetAttribute] !== sourceEntity.attributes[attribute]
      ) {
        issues.push(`Invalid attribute image for ${sourceName}.${attribute}`);
      }
    }

    for (const [foreignKey, definition] of Object.entries(sourceEntity.foreignKeys)) {
      const targetForeignKey = mapping.foreignKeys[sourceName]?.[foreignKey];
      const targetDefinition =
        targetForeignKey === undefined ? undefined : targetEntity.foreignKeys[targetForeignKey];
      if (
        targetDefinition === undefined ||
        targetDefinition.target !== mapping.entities[definition.target]
      ) {
        issues.push(`Invalid foreign-key image for ${sourceName}.${foreignKey}`);
      }
    }
  }
  return issues;
};

const requireMapping = (mapping: DirectMapping): void => {
  const issues = validateMapping(mapping);
  if (issues.length > 0) throw new MappingError(issues.join("; "));
};

export const identityMapping = (schema: Schema): DirectMapping => {
  const entities: Record<string, string> = {};
  const attributes: Record<string, Record<string, string>> = {};
  const foreignKeys: Record<string, Record<string, string>> = {};
  for (const [entityName, entity] of Object.entries(schema.entities)) {
    entities[entityName] = entityName;
    attributes[entityName] = Object.fromEntries(
      Object.keys(entity.attributes).map((field) => [field, field]),
    );
    foreignKeys[entityName] = Object.fromEntries(
      Object.keys(entity.foreignKeys).map((field) => [field, field]),
    );
  }
  return { name: `id_${schema.name}`, source: schema, target: schema, entities, attributes, foreignKeys };
};

export const composeMappings = (
  first: DirectMapping,
  second: DirectMapping,
): DirectMapping => {
  requireMapping(first);
  requireMapping(second);
  if (first.target.name !== second.source.name) {
    throw new MappingError(`Cannot compose ${first.name} with ${second.name}`);
  }

  const entities: Record<string, string> = {};
  const attributes: Record<string, Record<string, string>> = {};
  const foreignKeys: Record<string, Record<string, string>> = {};
  for (const entityName of Object.keys(first.source.entities)) {
    const middleEntity = first.entities[entityName];
    if (middleEntity === undefined) throw new MappingError(`Missing image for ${entityName}`);
    const finalEntity = second.entities[middleEntity];
    if (finalEntity === undefined) throw new MappingError(`Missing image for ${middleEntity}`);
    entities[entityName] = finalEntity;
    attributes[entityName] = {};
    foreignKeys[entityName] = {};

    for (const [field, middleField] of Object.entries(first.attributes[entityName] ?? {})) {
      const finalField = second.attributes[middleEntity]?.[middleField];
      if (finalField === undefined) throw new MappingError(`Missing image for ${middleEntity}.${middleField}`);
      attributes[entityName][field] = finalField;
    }
    for (const [field, middleField] of Object.entries(first.foreignKeys[entityName] ?? {})) {
      const finalField = second.foreignKeys[middleEntity]?.[middleField];
      if (finalField === undefined) throw new MappingError(`Missing image for ${middleEntity}.${middleField}`);
      foreignKeys[entityName][field] = finalField;
    }
  }

  return {
    name: `${second.name}_o_${first.name}`,
    source: first.source,
    target: second.target,
    entities,
    attributes,
    foreignKeys,
  };
};

const remapProvenance = (
  input: Instance,
  mapping: DirectMapping,
  direction: "delta" | "sigma",
): Provenance => {
  const provenance: Record<string, Source> = {};
  for (const [sourceEntity, targetEntity] of Object.entries(mapping.entities)) {
    const fields = mappedFields(mapping, sourceEntity);
    const sourceTable = direction === "delta" ? input.tables[targetEntity] : input.tables[sourceEntity];
    for (const rowId of Object.keys(sourceTable ?? {})) {
      for (const [sourceField, targetField] of Object.entries(fields)) {
        const inputKey =
          direction === "delta"
            ? cellKey(targetEntity, rowId, targetField)
            : cellKey(sourceEntity, rowId, sourceField);
        const source = input.provenance[inputKey];
        if (source !== undefined) {
          const outputKey =
            direction === "delta"
              ? cellKey(sourceEntity, rowId, sourceField)
              : cellKey(targetEntity, rowId, targetField);
          provenance[outputKey] = source;
        }
      }
    }
  }
  return provenance;
};

export const delta = (mapping: DirectMapping, target: Instance): Instance => {
  requireMapping(mapping);
  if (target.schema.name !== mapping.target.name) {
    throw new MappingError(`Delta expected an instance of ${mapping.target.name}`);
  }
  const tables: Record<string, Table> = {};
  for (const [sourceEntity, targetEntity] of Object.entries(mapping.entities)) {
    const fields = mappedFields(mapping, sourceEntity);
    const output: Record<string, Row> = {};
    for (const [rowId, row] of Object.entries(target.tables[targetEntity] ?? {})) {
      output[rowId] = Object.fromEntries(
        Object.entries(fields).map(([sourceField, targetField]) => [sourceField, row[targetField] ?? null]),
      );
    }
    tables[sourceEntity] = output;
  }
  const result: Instance = {
    schema: mapping.source,
    tables,
    provenance: remapProvenance(target, mapping, "delta"),
  };
  const issues = validateInstance(result);
  if (issues.length > 0) throw new MappingError(issues.map((issue) => issue.message).join("; "));
  return result;
};

const assertBijectiveRenaming = (mapping: DirectMapping): void => {
  requireMapping(mapping);
  const images = Object.values(mapping.entities);
  if (new Set(images).size !== images.length || images.length !== Object.keys(mapping.target.entities).length) {
    throw new MappingError("Sigma 0.1 supports only bijective direct renaming");
  }
  for (const sourceEntity of Object.keys(mapping.source.entities)) {
    const targetEntityName = mapping.entities[sourceEntity];
    const sourceFields = mappedFields(mapping, sourceEntity);
    const targetEntity = targetEntityName === undefined ? undefined : mapping.target.entities[targetEntityName];
    const targetFieldCount =
      Object.keys(targetEntity?.attributes ?? {}).length + Object.keys(targetEntity?.foreignKeys ?? {}).length;
    if (new Set(Object.values(sourceFields)).size !== targetFieldCount) {
      throw new MappingError("Sigma 0.1 supports only bijective direct renaming");
    }
  }
};

export const sigma = (mapping: DirectMapping, source: Instance): Instance => {
  assertBijectiveRenaming(mapping);
  if (source.schema.name !== mapping.source.name) {
    throw new MappingError(`Sigma expected an instance of ${mapping.source.name}`);
  }
  const tables: Record<string, Table> = {};
  for (const [sourceEntity, targetEntity] of Object.entries(mapping.entities)) {
    const fields = mappedFields(mapping, sourceEntity);
    const output: Record<string, Row> = {};
    for (const [rowId, row] of Object.entries(source.tables[sourceEntity] ?? {})) {
      output[rowId] = Object.fromEntries(
        Object.entries(fields).map(([sourceField, targetField]) => [targetField, row[sourceField] ?? null]),
      );
    }
    tables[targetEntity] = output;
  }
  const result: Instance = {
    schema: mapping.target,
    tables,
    provenance: remapProvenance(source, mapping, "sigma"),
  };
  const issues = validateInstance(result);
  if (issues.length > 0) throw new MappingError(issues.map((issue) => issue.message).join("; "));
  return result;
};
