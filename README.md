# SET-CQL/TS

[![Verify](https://github.com/AntonBotnykov/SET-CQL-TS/actions/workflows/verify.yml/badge.svg)](https://github.com/AntonBotnykov/SET-CQL-TS/actions/workflows/verify.yml)

SET-CQL/TS is a clean-room research program for a small, executable TypeScript
fragment inspired by the Categorical Query Language and functorial data
migration. It starts from one public write instruction:

```text
SET(entity, rowId, field, value, source)
```

The operational core is deliberately compact:

```text
state = fold(log)
```

Every claim in this repository is scoped to a named experiment and backed by
tests, bounded exploration, or differential oracle evidence. Bounded evidence
is never presented as an unrestricted proof.

## Quick start

Requirements: Node.js 22.18 or newer.

```bash
npm install
npm run verify
```

`verify` runs strict TypeScript checking and the complete test suite.

## Experiments

Experiments are added one at a time. The detailed report, implementation, test
evidence, limitations, and reproduction instructions remain traceable from this
index.

| Experiment | Title | Status | Report | Evidence |
| --- | --- | --- | --- | --- |
| 0.1 | SET-CQL/TS kernel | Implemented | [Report](experiments/0.1-set-cql-ts-kernel/README.md) | [Source](src/) · [Tests](test/) · [CQL fixture](cql/) |
| 0.2 | Finite Sigma, Delta, Pi, and adjunctions | Planned | — | — |

See the [experiment index](experiments/README.md) for the growth convention and
the phase-level roadmap.

## Experiment 0.1 at a glance

The first experiment provides:

- finite schemas with entities, attributes, foreign keys, and typed path
  equations;
- finite instances with executable validation;
- schema mappings, identity, composition, and `Delta`;
- `Sigma` restricted to bijective direct renaming;
- append-only `SET` logs and deterministic replay;
- explicit last-write-wins semantics for one cell;
- atomic, validated transactions through Effect;
- cell-level provenance through writes and migrations;
- property tests and normalized Java CQL differential fixtures.

The public API is exported from [`src/index.ts`](src/index.ts). The separation is
intentional: schema semantics live in `schema.ts`, event semantics in
`kernel.ts`, cell access in `optic.ts`, the bounded migration fragment in
`cql-fragment.ts`, and the first provenance-aware query in `query.ts`.

## Research principles

1. `SET` remains the only public write primitive.
2. Higher constructions compose verified lower layers.
3. Mathematical claims require executable evidence or a clearly stated proof
   obligation.
4. Java CQL is an independent oracle only on a shared, explicitly bounded
   fragment.
5. Failures, provenance, assumptions, and non-claims remain visible.
6. New experiments extend the corpus without rewriting earlier evidence.

## Non-claims

Experiment 0.1 is not a complete CQL implementation. It does not implement
general Kan extensions, general `Sigma`, `Pi`, chase, repairs, a parser, a
general query language, arbitrary graph canonicalization, or the full planned
catalog. Passing tests establish the behavior of this repository's finite
fragment; they do not prove those omitted constructions.

## Clean-room and references

The TypeScript implementation was written from the mathematical specification
and observable fixture behavior. No Java or Haskell implementation code was
copied.

- David Spivak and Ryan Wisnesky, [Relational Foundations for Functorial Data
  Migration](https://arxiv.org/abs/1212.5303)
- [Official Java CQL implementation](https://github.com/CategoricalData/CQL)
- [Effect documentation](https://effect.website/docs/)
- [fast-check documentation](https://fast-check.dev/)

This repository currently has no software license. Copyright law therefore
reserves reuse rights unless a license is added later.
