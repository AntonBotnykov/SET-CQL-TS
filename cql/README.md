# Java CQL oracle fixture

`delta-reference.cql` encodes the finite source schema, its direct renaming, and
the `Sigma`/`Delta` round trip used by Experiment 0.1. Its syntax follows the
official Java CQL examples.

The CQL JAR is not committed. Download the official release dated March 31,
2026 from the [CategoricalData/CQL releases](https://github.com/CategoricalData/CQL/releases),
then run:

```bash
java -Xmx3g \
  -Dpolyglot.engine.WarnInterpreterOnly=false \
  -cp /path/to/cql-latest.jar \
  catdata.cql.AqlCmdLine cql/delta-reference.cql
```

The normalized finite result checked by TypeScript lives at
`test/fixtures/cql/oracle.json`. Regeneration is deliberately separate from
`npm run verify`, so the normal test suite is deterministic and does not require
a 3 GB Java process or a downloaded binary.

The fixture is an oracle only for the direct-renaming fragment. It does not make
Java CQL an oracle for the SET log, transaction, Effect, or provenance semantics.
