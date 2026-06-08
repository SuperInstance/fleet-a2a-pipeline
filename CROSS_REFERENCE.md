# CROSS_REFERENCE.md — fleet-a2a-pipeline in the SuperInstance Ecosystem

*Where this module lives, what it feeds, and what feeds it.*

---

## Primary Reference

| Property | Value |
|----------|-------|
| **Repository** | [SuperInstance/fleet-a2a-pipeline](https://github.com/SuperInstance/fleet-a2a-pipeline) |
| **Core file** | `pipeline.mjs` (7.0 KB, ESM, zero dependencies) |
| **Version** | `2.0` (reported in `runPipeline` output) |
| **Language** | JavaScript (ESM — `import`/`export`) |
| **Entry point** | `node pipeline.mjs` → self-test (8 assertions) |
| **License** | MIT (implied, see cmidi-core pattern) |

## Related Repositories

### Direct MIDI Ecosystem

| Repo | Relationship | Direction |
|------|-------------|-----------|
| [**cmidi-core**](https://github.com/SuperInstance/cmidi-core) | Conversational MIDI Protocol in Rust — maps agent speech acts to MIDI notes, paralinguistic features to MIDI CC, agent identity to channels/instruments. **This pipeline provides the spreadsheet→MIDI half; cmidi provides the conversation→MIDI half.** Every CMIDI file is a valid SMF Format 0. | ⬌ Complementary |
| [**construct-coordination**](https://github.com/SuperInstance/construct-coordination) | Fleet-wide coordination surface — where agents log decisions, proposals, and experiments. Tagged `[CONSENSUS]`, `[PROPOSAL]`, `[DISPUTE]`. **Pipeline output flows into coordination notes for fleet-level strategy analysis.** | ⬆ Pipeline → Coordination |

### Fleet Infrastructure

| Repo | Relationship |
|------|-------------|
| [**construct-coordination**](https://github.com/SuperInstance/construct-coordination) | Shared coordination surface between all OpenClaw instances building the Construct ecosystem. Topics: `gpu`, `oxide-stack`, `rust`, `ternary`. **The `ternary` topic directly relates to this pipeline's ternary domain.** |
| [**fleet-harness**](https://github.com/SuperInstance/fleet-harness) | CI backbone for the entire SuperInstance fleet ecosystem. Pipeline self-tests are designed to run in this harness. |
| [**lighthouse**](https://github.com/SuperInstance/lighthouse) | Fleet Lighthouse — unified health dashboard, monitoring, alerting, diagnostics for the Pelagic fleet infrastructure. Pipeline health metrics can feed here. |
| [**iron-to-iron**](https://github.com/SuperInstance/iron-to-iron) | Agent-to-agent communication via Git ("we don't talk, we commit"). The pipeline's JSON output is designed for this kind of commit-based message passing. |

### Constraint Theory & Ternary Ecosystem

| Repo | Relationship |
|------|-------------|
| [**constraint-theory-core**](https://github.com/SuperInstance/constraint-theory-core) | Deterministic manifold snapping — maps continuous vectors to exact Pythagorean coordinates via O(log n) KD-tree. The pipeline's `vectorToTernary` performs a similar quantization (float→{-1,0,+1}), making **ternary the discrete constraint domain**. |
| [**conservation-spectral-vulkan**](https://github.com/SuperInstance/conservation-spectral-vulkan) | Conservation law verification, potentially using GPU compute (Vulkan). The pipeline's `summary.conservation` field feeds conservation invariants that could be verified at scale here. |

### Spreadsheet Sources

The `readStrategyVector` function accepts CSV that typically originates from:

| Source | Format |
|--------|--------|
| Google Sheets CSV export | Comma-separated, one row of numbers |
| Excel `.csv` | Same; spaces in cells are stripped |
| A2A agent task payload | Direct string in A2A card input |
| Any agent producing `number[]` | Array serialized as comma-separated text |

## Architecture Data Flow

```
 ┌──────────────┐     ┌─────────────────┐     ┌─────────────────────┐
 │  Spreadsheet  │────▶│ fleet-a2a-      │────▶│ cmidi-core          │
 │  (CSV)        │     │ pipeline        │     │ (Rust conversation  │
 │               │     │ (midi numbers)  │     │  → MIDI file)       │
 └──────────────┘     └──────┬──────────┘     └─────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐     ┌─────────────────────┐
                    │ analyzeHarmony   │────▶│ construct-          │
                    │ detectMirrors    │     │ coordination        │
                    │ → structured     │     │ (fleet decision     │
                    │   JSON           │     │  log)               │
                    └─────────────────┘     └─────────────────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │ A2A agents       │
                    │ consume          │
                    │ .sequences.midi  │
                    │ .mirrors         │
                    └─────────────────┘
```

## Conservation Invariant Chain

The conservation law propagates across multiple repos:

```
fleet-a2a-pipeline:  sum(Δmidi) = 4 × sum(ternary)
         │
         ▼
constraint-theory-core:  ternary frame state = snapped manifold point
         │
         ▼
conservation-spectral-vulkan:  verify conservation at GPU scale
         │
         ▼
cmidi-core:  CC#104 = ConservationRatio — encoded in every CMIDI track
```

## API Surface Summary

### Exported by this module

| Function | Called by | Returns |
|----------|-----------|---------|
| `readStrategyVector` | Spreadsheet agent, A2A task parser | `number[]` |
| `vectorToTernary` | Downstream quantization agent | `number[][]` |
| `ternaryToMidi` | Core music pipeline | `number[]` |
| `midiToNoteName` | Display/reporting agent | `string` |
| `midiToNoteNames` | Display/reporting agent | `string[]` |
| `analyzeHarmony` | Analysis agent, coordination logger | `object` |
| `detectMirrors` | Conservation verifier, fleet reporter | `{mirrors, count}` |
| `runPipeline` | Primary A2A entry point | `{input, frames, sequences, mirrors, summary, version}` |

### Consumed from other repos

| What we consume | Source |
|-----------------|--------|
| CSV string input | Spreadsheet agents / `readStrategyVector` |
| Ternary frames | Self-produced via `vectorToTernary` |

### Produced for other repos

| What we produce | Consumer |
|-----------------|----------|
| Structured MIDI JSON | A2A agents, cmidi-core, coordinators |
| Harmony analysis | Fleet coordination notes |
| Mirror pair detection | Conservation verification pipeline |
| Self-test results | fleet-harness CI |

## Type Flow (Input → Output)

```
string (CSV)
  → number[] (readStrategyVector)
    → number[][8] (vectorToTernary — 8-element frames)
      → number[] each frame (ternaryToMidi)
        → note names (midiToNoteNames)
        → harmony object (analyzeHarmony)
        → mirror pairs (detectMirrors)
          → structured JSON (runPipeline)
```

## Related A2A Standards

This module follows the [A2A (Agent-to-Agent) Protocol](https://github.com/a2aproject/A2A) — an open standard for agent interoperability. The pipeline acts as a **task processor card**:

1. **Input card**: `{ strategyText: string }`
2. **Processing**: `runPipeline(strategyText)`
3. **Output card**: `{ midi: number[], frames: number[][], harmony: {...}, mirrors: {...} }`

See also the [Awesome A2A](https://github.com/ai-boost/awesome-a2a) resource list for broader agent-to-agent tooling.
