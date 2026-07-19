import assert from "node:assert/strict";
import { test } from "node:test";
import fc from "fast-check";
import { composeMappings, delta, readCell, replay, set, sigma } from "../src/index.ts";
import { f, fixtureSource, g, instanceM0 } from "./fixtures.ts";

test("Delta is contravariant for 250 generated scalar instances", () => {
  fc.assert(
    fc.property(fc.string(), fc.integer(), fc.integer(), (name, expected, actual) => {
      const source = instanceM0();
      const changed = {
        ...source,
        tables: {
          Employee: {
            ...source.tables.Employee,
            alice: { name, expectedHours: expected, actualHours: actual, manager: "root" },
          },
        },
      };
      const atM2 = sigma(g, sigma(f, changed));
      assert.deepEqual(delta(composeMappings(f, g), atM2), delta(f, delta(g, atM2)));
    }),
    { numRuns: 250, seed: 101 },
  );
});

test("last-write-wins holds for 250 generated non-empty value sequences", () => {
  fc.assert(
    fc.property(fc.array(fc.integer(), { minLength: 1, maxLength: 50 }), (values) => {
      const address = { entity: "Employee", rowId: "alice", field: "actualHours" };
      const events = values.map((value) => set(address, value, fixtureSource));
      const result = replay(events, instanceM0());
      assert.equal(readCell(result, address)?.value, values.at(-1));
    }),
    { numRuns: 250, seed: 102 },
  );
});
