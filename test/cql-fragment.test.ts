import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MappingError,
  composeMappings,
  delta,
  findMismatches,
  identityMapping,
  sigma,
  type DirectMapping,
  type Schema,
} from "../src/index.ts";
import { f, fixtureSource, instanceM0, m0 } from "./fixtures.ts";

test("Delta along identity preserves an instance", () => {
  const instance = instanceM0();
  assert.deepEqual(delta(identityMapping(m0), instance), instance);
});

test("Sigma followed by Delta preserves a direct-renaming instance", () => {
  const instance = instanceM0();
  assert.deepEqual(delta(f, sigma(f, instance)), instance);
});

test("an incomplete mapping is rejected", () => {
  const incomplete: DirectMapping = { ...f, attributes: { Employee: { name: "label" } } };
  assert.throws(() => delta(incomplete, sigma(f, instanceM0())), MappingError);
});

test("Sigma rejects a non-bijective mapping", () => {
  const source: Schema = {
    name: "Two",
    entities: {
      Left: { attributes: { value: "string" }, foreignKeys: {} },
      Right: { attributes: { value: "string" }, foreignKeys: {} },
    },
    equations: [],
  };
  const target: Schema = {
    name: "One",
    entities: { Value: { attributes: { text: "string" }, foreignKeys: {} } },
    equations: [],
  };
  const mapping: DirectMapping = {
    name: "collapse",
    source,
    target,
    entities: { Left: "Value", Right: "Value" },
    attributes: { Left: { value: "text" }, Right: { value: "text" } },
    foreignKeys: { Left: {}, Right: {} },
  };
  assert.throws(
    () =>
      sigma(mapping, {
        schema: source,
        tables: { Left: { l: { value: "l" } }, Right: { r: { value: "r" } } },
        provenance: {},
      }),
    /bijective direct renaming/,
  );
});

test("the anomaly query returns both source cells", () => {
  const result = findMismatches(instanceM0(), "Employee", "expectedHours", "actualHours");
  assert.equal(result.length, 1);
  assert.equal(result[0]?.rowId, "alice");
  assert.deepEqual(result[0]?.sources, [fixtureSource, fixtureSource]);
});
