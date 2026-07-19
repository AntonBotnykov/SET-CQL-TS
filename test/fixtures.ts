import type { DirectMapping, Instance, Schema, Source } from "../src/index.ts";
import { cellKey } from "../src/index.ts";

export const fixtureSource: Source = { system: "fixture", reference: "experiment-0.1" };

const employeeShape = {
  attributes: { name: "string", expectedHours: "number", actualHours: "number" },
  foreignKeys: { manager: { target: "Employee" } },
} as const;

export const m0: Schema = {
  name: "M0",
  entities: { Employee: employeeShape },
  equations: [{ entity: "Employee", left: ["manager", "manager"], right: ["manager"] }],
};

export const m1: Schema = {
  name: "M1",
  entities: {
    Record: {
      attributes: { label: "string", planned: "number", observed: "number" },
      foreignKeys: { supervisor: { target: "Record" } },
    },
  },
  equations: [{ entity: "Record", left: ["supervisor", "supervisor"], right: ["supervisor"] }],
};

export const m2: Schema = {
  name: "M2",
  entities: {
    Node: {
      attributes: { title: "string", budget: "number", consumed: "number" },
      foreignKeys: { parent: { target: "Node" } },
    },
  },
  equations: [{ entity: "Node", left: ["parent", "parent"], right: ["parent"] }],
};

export const f: DirectMapping = {
  name: "F",
  source: m0,
  target: m1,
  entities: { Employee: "Record" },
  attributes: {
    Employee: { name: "label", expectedHours: "planned", actualHours: "observed" },
  },
  foreignKeys: { Employee: { manager: "supervisor" } },
};

export const g: DirectMapping = {
  name: "G",
  source: m1,
  target: m2,
  entities: { Record: "Node" },
  attributes: { Record: { label: "title", planned: "budget", observed: "consumed" } },
  foreignKeys: { Record: { supervisor: "parent" } },
};

export const instanceM0 = (): Instance => {
  const tables = {
    Employee: {
      root: { name: "Ada", expectedHours: 8, actualHours: 8, manager: "root" },
      alice: { name: "Alice", expectedHours: 8, actualHours: 6, manager: "root" },
    },
  } as const;
  const provenance = Object.fromEntries(
    Object.entries(tables.Employee).flatMap(([rowId, row]) =>
      Object.keys(row).map((field) => [cellKey("Employee", rowId, field), fixtureSource]),
    ),
  );
  return { schema: m0, tables, provenance };
};
