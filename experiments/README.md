# Experiment index

This directory is the durable navigation layer for the SET-CQL/TS research
program. Each implemented experiment receives a numbered directory containing
an English report and machine-readable results. Source and tests may be shared
when a later experiment extends an earlier verified layer.

## Status

| Version | Experiment | Status |
| --- | --- | --- |
| [0.1](0.1-set-cql-ts-kernel/README.md) | SET-CQL/TS kernel | Implemented |
| 0.2 | Finite Sigma, Delta, Pi, and adjunctions | Next |

## Roadmap

| Phase | Research boundary |
| --- | --- |
| 0.x | Finite categorical data migration, Kan extensions, and compilers |
| 1.x | Coherence, natural transformations, provenance, and audit algebra |
| 2.x | Temporal policy, atomic logs, delivery, and topology migration |
| 3.x | Replication, isolation, SSI, consensus, and snapshots |
| 4.x | Client adapters, codecs, and replicated upgrade orchestration |

## Addition rule

To add an experiment:

1. create `experiments/<version>-<slug>/README.md`;
2. state the question, exact fragment, protocol, evidence, limitations, and next
   falsifiable boundary;
3. add or extend code and tests;
4. record actual verification results in `results.json`;
5. add one row here and in the root README.
