import assert from "node:assert/strict";
import { test } from "node:test";
import { Effect } from "effect";
import {
  BoundaryError,
  applyEvent,
  protectBoundary,
  readCell,
  replay,
  set,
  transact,
  type Store,
} from "../src/index.ts";
import { fixtureSource, instanceM0 } from "./fixtures.ts";

const actual = { entity: "Employee", rowId: "alice", field: "actualHours" } as const;
const expected = { entity: "Employee", rowId: "alice", field: "expectedHours" } as const;

test("replay distributes over log concatenation", () => {
  const initial = instanceM0();
  const xs = [set(actual, 7, fixtureSource)];
  const ys = [set(expected, 7, fixtureSource)];
  assert.deepEqual(replay([...xs, ...ys], initial), replay(ys, replay(xs, initial)));
});

test("SET events on distinct cells commute at the state level", () => {
  const initial = instanceM0();
  const x = set(actual, 7, fixtureSource);
  const y = set(expected, 7, fixtureSource);
  assert.deepEqual(replay([x, y], initial), replay([y, x], initial));
});

test("SET uses last-write-wins on the same cell", () => {
  const result = replay(
    [set(actual, 7, fixtureSource), set(actual, 9, fixtureSource)],
    instanceM0(),
  );
  assert.equal(readCell(result, actual)?.value, 9);
});

test("a valid transaction publishes its candidate and log", async () => {
  const store: Store = { instance: instanceM0(), log: [] };
  const event = set(actual, 8, fixtureSource);
  const result = await Effect.runPromise(transact(store, [event]));
  assert.equal(result.log.length, 1);
  assert.equal(readCell(result.instance, actual)?.value, 8);
});

test("an invalid transaction leaves the original store untouched", async () => {
  const store: Store = { instance: instanceM0(), log: [] };
  const event = set(
    { entity: "Employee", rowId: "root", field: "manager" },
    "alice",
    fixtureSource,
  );
  const exit = await Effect.runPromiseExit(transact(store, [event]));
  assert.equal(exit._tag, "Failure");
  assert.equal(store.log.length, 0);
  assert.equal(store.instance.tables.Employee?.root?.manager, "root");
});

test("SET records cell-level provenance", () => {
  const event = set(actual, 10, { system: "manual", reference: "case-10" });
  const result = applyEvent(instanceM0(), event);
  assert.deepEqual(readCell(result, actual)?.source, event.source);
});

test("a synchronous exception is explicit at the Effect boundary", async () => {
  const exit = await Effect.runPromiseExit(
    protectBoundary(() => {
      throw new Error("boom");
    }),
  );
  assert.equal(exit._tag, "Failure");
  if (exit._tag === "Failure") {
    assert.match(String(exit.cause), new RegExp(BoundaryError.name));
  }
});
