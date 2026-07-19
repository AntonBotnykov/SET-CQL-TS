import { Effect } from "effect";
import type { CellAddress } from "./optic.ts";
import { writeCell } from "./optic.ts";
import type { Instance, Scalar, Source, ValidationIssue } from "./schema.ts";
import { validateInstance } from "./schema.ts";

export interface SetEvent extends CellAddress {
  readonly type: "SET";
  readonly value: Scalar;
  readonly source: Source;
}

export interface Store {
  readonly instance: Instance;
  readonly log: readonly SetEvent[];
}

export class TransactionError extends Error {
  readonly _tag = "TransactionError";
  readonly issues: readonly ValidationIssue[];

  constructor(issues: readonly ValidationIssue[]) {
    super(issues.map((issue) => issue.message).join("; "));
    this.name = "TransactionError";
    this.issues = issues;
  }
}

export class BoundaryError extends Error {
  readonly _tag = "BoundaryError";
  readonly originalCause: unknown;

  constructor(originalCause: unknown) {
    super("The transaction boundary raised an exception", { cause: originalCause });
    this.name = "BoundaryError";
    this.originalCause = originalCause;
  }
}

export const set = (
  address: CellAddress,
  value: Scalar,
  source: Source,
): SetEvent => ({ type: "SET", ...address, value, source });

export const applyEvent = (instance: Instance, event: SetEvent): Instance =>
  writeCell(instance, event, event.value, event.source);

export const replay = (
  events: readonly SetEvent[],
  initial: Instance,
): Instance => events.reduce(applyEvent, initial);

export const transact = (
  store: Store,
  events: readonly SetEvent[],
): Effect.Effect<Store, TransactionError> =>
  Effect.suspend(() => {
    const candidate = replay(events, store.instance);
    const issues = validateInstance(candidate);
    return issues.length > 0
      ? Effect.fail(new TransactionError(issues))
      : Effect.succeed({ instance: candidate, log: [...store.log, ...events] });
  });

export const protectBoundary = <A, E>(
  operation: () => Effect.Effect<A, E>,
): Effect.Effect<A, E | BoundaryError> =>
  Effect.flatten(
    Effect.try({
      try: operation,
      catch: (cause) => new BoundaryError(cause),
    }),
  );
