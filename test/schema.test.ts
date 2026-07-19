import assert from "node:assert/strict";
import { test } from "node:test";
import type { Instance, Schema } from "../src/index.ts";
import { validateInstance, validateSchema } from "../src/index.ts";
import { instanceM0, m0 } from "./fixtures.ts";

test("a well-typed finite schema is accepted", () => {
  assert.deepEqual(validateSchema(m0), []);
});

test("an ill-typed path equation is rejected", () => {
  const invalid: Schema = {
    ...m0,
    equations: [{ entity: "Employee", left: ["manager", "missing"], right: ["manager"] }],
  };
  assert.equal(validateSchema(invalid)[0]?.code, "ILL_TYPED_PATH");
});

test("a missing attribute or invalid scalar is rejected", () => {
  const base = instanceM0();
  const invalid: Instance = {
    ...base,
    tables: {
      Employee: {
        ...base.tables.Employee,
        alice: { name: 42, actualHours: 6, manager: "root" },
      },
    },
  };
  const codes = validateInstance(invalid).map((issue) => issue.code);
  assert.ok(codes.includes("MISSING_FIELD"));
  assert.ok(codes.includes("INVALID_SCALAR"));
});

test("a dangling foreign key is rejected", () => {
  const base = instanceM0();
  const invalid: Instance = {
    ...base,
    tables: {
      Employee: {
        ...base.tables.Employee,
        alice: { ...base.tables.Employee?.alice, manager: "nobody" },
      },
    },
  };
  assert.ok(validateInstance(invalid).some((issue) => issue.code === "DANGLING_FOREIGN_KEY"));
});

test("an instance that violates a path equation is rejected", () => {
  const base = instanceM0();
  const invalid: Instance = {
    ...base,
    tables: {
      Employee: {
        ...base.tables.Employee,
        root: { ...base.tables.Employee?.root, manager: "alice" },
      },
    },
  };
  assert.ok(validateInstance(invalid).some((issue) => issue.code === "PATH_EQUATION_VIOLATION"));
});
