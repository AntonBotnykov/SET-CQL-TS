import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { composeMappings, delta, findMismatches, sigma } from "../src/index.ts";
import { f, g, instanceM0 } from "./fixtures.ts";

interface Oracle {
  readonly sourceM0: unknown;
  readonly sigmaF: unknown;
  readonly deltaComposite: unknown;
  readonly anomalies: unknown;
}

const oracle = async (): Promise<Oracle> =>
  JSON.parse(
    await readFile(new URL("./fixtures/cql/oracle.json", import.meta.url), "utf8"),
  ) as Oracle;

const finiteData = (instance: ReturnType<typeof instanceM0>): unknown => instance.tables;

test("the TypeScript source agrees with the normalized CQL fixture", async () => {
  assert.deepEqual(finiteData(instanceM0()), (await oracle()).sourceM0);
});

test("direct Sigma agrees with the normalized CQL fixture", async () => {
  assert.deepEqual(sigma(f, instanceM0()).tables, (await oracle()).sigmaF);
});

test("composite Delta and anomaly query agree with the CQL fixture", async () => {
  const atM2 = sigma(g, sigma(f, instanceM0()));
  const restored = delta(composeMappings(f, g), atM2);
  assert.deepEqual(restored.tables, (await oracle()).deltaComposite);
  assert.deepEqual(
    findMismatches(restored, "Employee", "expectedHours", "actualHours").map(
      ({ rowId, expected, actual }) => ({ rowId, expected, actual }),
    ),
    (await oracle()).anomalies,
  );
});
