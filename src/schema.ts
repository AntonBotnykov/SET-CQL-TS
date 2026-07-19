export type Scalar = string | number | boolean | null;
export type ScalarType = "string" | "number" | "boolean";

export interface ForeignKey {
  readonly target: string;
}

export interface Entity {
  readonly attributes: Readonly<Record<string, ScalarType>>;
  readonly foreignKeys: Readonly<Record<string, ForeignKey>>;
}

export interface PathEquation {
  readonly entity: string;
  readonly left: readonly string[];
  readonly right: readonly string[];
}

export interface Schema {
  readonly name: string;
  readonly entities: Readonly<Record<string, Entity>>;
  readonly equations: readonly PathEquation[];
}

export type Row = Readonly<Record<string, Scalar>>;
export type Table = Readonly<Record<string, Row>>;

export interface Source {
  readonly system: string;
  readonly reference: string;
}

export interface Provenance {
  readonly [cell: string]: Source;
}

export interface Instance {
  readonly schema: Schema;
  readonly tables: Readonly<Record<string, Table>>;
  readonly provenance: Provenance;
}

export interface ValidationIssue {
  readonly code:
    | "UNKNOWN_ENTITY"
    | "UNKNOWN_FIELD"
    | "ILL_TYPED_PATH"
    | "MISSING_TABLE"
    | "MISSING_FIELD"
    | "INVALID_SCALAR"
    | "DANGLING_FOREIGN_KEY"
    | "PATH_EQUATION_VIOLATION";
  readonly message: string;
}

export const cellKey = (entity: string, rowId: string, field: string): string =>
  `${entity}/${rowId}/${field}`;

export const pathTarget = (
  schema: Schema,
  startEntity: string,
  path: readonly string[],
): string | undefined => {
  let current = startEntity;
  for (const segment of path) {
    const entity = schema.entities[current];
    const foreignKey = entity?.foreignKeys[segment];
    if (foreignKey === undefined) return undefined;
    current = foreignKey.target;
  }
  return current;
};

export const validateSchema = (schema: Schema): readonly ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  for (const [entityName, entity] of Object.entries(schema.entities)) {
    for (const [field, foreignKey] of Object.entries(entity.foreignKeys)) {
      if (schema.entities[foreignKey.target] === undefined) {
        issues.push({
          code: "UNKNOWN_ENTITY",
          message: `${entityName}.${field} targets unknown entity ${foreignKey.target}`,
        });
      }
    }
  }

  for (const equation of schema.equations) {
    if (schema.entities[equation.entity] === undefined) {
      issues.push({
        code: "UNKNOWN_ENTITY",
        message: `Equation starts at unknown entity ${equation.entity}`,
      });
      continue;
    }
    const left = pathTarget(schema, equation.entity, equation.left);
    const right = pathTarget(schema, equation.entity, equation.right);
    if (left === undefined || right === undefined || left !== right) {
      issues.push({
        code: "ILL_TYPED_PATH",
        message: `Equation paths from ${equation.entity} are not parallel`,
      });
    }
  }
  return issues;
};

const scalarMatches = (value: Scalar, type: ScalarType): boolean =>
  value === null || typeof value === type;

export const followPath = (
  instance: Instance,
  entityName: string,
  rowId: string,
  path: readonly string[],
): string | undefined => {
  let currentEntity = entityName;
  let currentRow = rowId;
  for (const segment of path) {
    const foreignKey = instance.schema.entities[currentEntity]?.foreignKeys[segment];
    const value = instance.tables[currentEntity]?.[currentRow]?.[segment];
    if (foreignKey === undefined || typeof value !== "string") return undefined;
    currentEntity = foreignKey.target;
    currentRow = value;
  }
  return currentRow;
};

export const validateInstance = (instance: Instance): readonly ValidationIssue[] => {
  const issues: ValidationIssue[] = [...validateSchema(instance.schema)];

  for (const [entityName, entity] of Object.entries(instance.schema.entities)) {
    const table = instance.tables[entityName];
    if (table === undefined) {
      issues.push({ code: "MISSING_TABLE", message: `Missing table ${entityName}` });
      continue;
    }

    for (const [rowId, row] of Object.entries(table)) {
      for (const [field, type] of Object.entries(entity.attributes)) {
        if (!(field in row)) {
          issues.push({
            code: "MISSING_FIELD",
            message: `Missing ${entityName}.${rowId}.${field}`,
          });
        } else if (!scalarMatches(row[field] ?? null, type)) {
          issues.push({
            code: "INVALID_SCALAR",
            message: `Invalid ${type} at ${entityName}.${rowId}.${field}`,
          });
        }
      }

      for (const [field, foreignKey] of Object.entries(entity.foreignKeys)) {
        const targetId = row[field];
        if (typeof targetId !== "string") {
          issues.push({
            code: "MISSING_FIELD",
            message: `Missing foreign key ${entityName}.${rowId}.${field}`,
          });
        } else if (instance.tables[foreignKey.target]?.[targetId] === undefined) {
          issues.push({
            code: "DANGLING_FOREIGN_KEY",
            message: `${entityName}.${rowId}.${field} points to missing ${foreignKey.target}.${targetId}`,
          });
        }
      }

      for (const equation of instance.schema.equations.filter(
        (candidate) => candidate.entity === entityName,
      )) {
        const left = followPath(instance, entityName, rowId, equation.left);
        const right = followPath(instance, entityName, rowId, equation.right);
        if (left !== undefined && right !== undefined && left !== right) {
          issues.push({
            code: "PATH_EQUATION_VIOLATION",
            message: `Path equation fails at ${entityName}.${rowId}`,
          });
        }
      }
    }
  }

  return issues;
};
