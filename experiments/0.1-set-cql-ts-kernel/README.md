# Experiment 0.1 — SET-CQL/TS kernel

**Executed:** 17 July 2026<br>
**Repository reproduction:** 19 July 2026<br>
**Environment:** Node.js/TypeScript, Effect, fast-check, and normalized output
from the official Java CQL release dated 31 March 2026.

## Research question

Can a compact and testable TypeScript CQL kernel provide executable categorical
schema and instance semantics, form higher operations by composition, use
`SET` as its only application-level write primitive, agree with an independent
CQL implementation on a shared fragment, and preserve explicit failures and
data provenance?

The null hypothesis is that the implementation violates a composition law or
disagrees with Java CQL on the shared fixture fragment.

## Exact fragment

A schema contains a finite set of entities, typed foreign keys, scalar
attributes, and parallel path equations. A finite instance assigns rows to
entities and total field interpretations that satisfy those equations.

A direct mapping `F : S -> T` assigns:

- a target entity to every source entity;
- one typed target foreign key to every source foreign key;
- one compatible target attribute to every source attribute.

Experiment 0.1 implements precomposition `Delta_F`. It implements `Sigma_F`
only when `F` is a bijective direct renaming. General `Sigma` requires a left
Kan extension and is outside this experiment.

The write language contains one instruction:

```text
SET(entity, rowId, field, value, source)
```

Compilation yields an ordered append-only log. Replay is a left fold. Writes to
the same cell use last-write-wins; writes to distinct cells commute at the state
level. A transaction publishes only when its final candidate instance is valid.

## Laws under test

```text
Delta_id(I) = I

Delta_(G ∘ F)(I) = Delta_F(Delta_G(I))

Delta_F(Sigma_F(I)) ≅ I        when F is a bijective direct renaming

replay(xs ++ ys, s) = replay(ys, replay(xs, s))
```

Atomicity is constructive: `transact` first creates an immutable local
candidate, validates every constraint, and only then returns a store whose log
is extended. Failure cannot mutate the input store.

## Protocol

1. Define three isomorphic schemas `M0`, `M1`, and `M2`, with mappings
   `F : M0 -> M1` and `G : M1 -> M2`.
2. Evaluate source data, direct `Sigma`, identity `Delta`, composite `Delta`,
   sequential `Delta`, round-trip migration, and an anomaly query.
3. Normalize the Java CQL finite outputs into stable JSON that does not rely on
   generated row identifiers.
4. Compare the TypeScript outputs with those fixtures.
5. Generate 250 scalar instances for mapping laws and 250 value sequences for
   last-write-wins.
6. Exercise malformed schemas, missing fields, dangling foreign keys,
   incomplete mappings, unsupported `Sigma`, invalid transactions, and an
   exception at the Effect boundary.

## Reproduced result

| Evidence | Result |
| --- | ---: |
| Strict TypeScript check | Pass |
| Node tests | 22/22 |
| Property cases | 500/500 |
| Differential groups | 3/3 |
| Negative scenarios | Rejected as expected |

The machine-readable record is [`results.json`](results.json). The checked-in
numbers describe the repository verification run, not an unrestricted proof.

## What this confirms

- TypeScript can host a compact executable kernel for the stated fragment.
- Mapping composition expresses the contravariant `Delta` law directly.
- `SET` is sufficient as the public write primitive of this event-sourced
  layer.
- Path equations are executable constraints, not only documentation.
- Cell provenance survives `SET`, direct `Sigma`, `Delta`, and the anomaly
  query.
- TypeScript and normalized Java CQL fixtures agree on the checked fragment.

The null hypothesis is rejected for this finite fragment.

## What this does not confirm

This experiment does not establish correctness of the entire planned research
program or a complete CQL port. It does not provide general `Sigma` or `Pi`, Kan
extensions, chase and repairs, a general query language, a Java CQL parser,
arbitrary equation preservation, large-scale performance evidence, or complete
canonicalization of graphs with automorphisms.

## Reproduction

```bash
npm install --cache /tmp/npm-cache-set-cql
npm run verify
```

The TypeScript suite requires no Java runtime. To independently regenerate the
CQL side, obtain the official March 31, 2026 CQL release and follow
[`cql/README.md`](../../cql/README.md). The binary is intentionally not vendored.

## Next falsifiable boundary

Experiment 0.2 will specify finite non-trivial `Sigma` and `Pi`, compare small
generated cases with Java CQL, and test the unit/counit triangle identities for
`Sigma ⊣ Delta ⊣ Pi` wherever the required finiteness assumptions hold.
