# AGENT.md — Agent Onboarding: Consuming fleet-a2a-pipeline

*For ESM-consumer agents that want to chain this pipeline into their workflow.*

---

## What This Module Does

This is a **pure-function ESM module** (`pipeline.mjs`, 7.0 KB, zero dependencies) that transforms spreadsheet strategy vectors into structured MIDI JSON. It lives at:

```
https://github.com/SuperInstance/fleet-a2a-pipeline
```

## Import

```js
// Local import (cloned repo or symlinked node_modules)
import { runPipeline } from './pipeline.mjs';

// Or as a node_module if published:
// import { runPipeline } from '@superinstance/fleet-a2a-pipeline';
```

## Quick Chain

```js
// Step 1: Get CSV from spreadsheet agent
const csv = '1,0,-1,1,0,-1,1,1,0,-1,1,-1,1,1,0,-1';

// Step 2: Run pipeline
const { sequences, mirrors, summary } = runPipeline(csv);

// Step 3: Use the MIDI data
sequences.forEach((seq, i) => {
  console.log(`Frame ${i}: chord=${seq.harmony.chord}, notes=${seq.notes.join(' ')}`);
});
// Frame 0: chord=augmented, notes=C4 E4 E4 C4 E4 E4 C4 E4 G#4
```

## When to Import Which Function

| Goal | Import |
|------|--------|
| "I have a CSV string, give me everything" | `runPipeline` |
| "I already parsed my numbers, give me MIDI" | `ternaryToMidi` |
| "I need to quantize floats to {-1,0,+1}" | `vectorToTernary` |
| "MIDI numbers → C4, E4..." | `midiToNoteName` / `midiToNoteNames` |
| "What chord is this?" | `analyzeHarmony` |
| "Do any frames cancel out?" | `detectMirrors` |
| "Parse arbitrary delimited text" | `readStrategyVector` |

## The Invariant You Must Know

**`ternaryToMidi` implements a discrete integral:**

```
midi[0] = base
midi[n] = midi[n-1] + ternary[n-1] × 4
```

This means:
- `+1` in the ternary domain → up a major third (4 semitones)
- `0` → repeat (unison)
- `-1` → down a minor third (4 semitones)

The output MIDI notes are **not** normalized to any octave — they accumulate freely. If you need to constrain to a range (e.g., 0–127 for standard MIDI), clamp or wrap after calling `ternaryToMidi`.

## Mirror Detection: Why It Matters

```js
detectMirrors([[1, -1, 0], [-1, 1, 0], [1, 0, -1]]);
// → { mirrors: [{ pair: [0, 1], vector1: [1,-1,0], vector2: [-1,1,0] }], count: 1 }
```

A mirror pair `(v₁, v₂)` satisfies `v₁[i] + v₂[i] === 0` for every element `i`. This is the **conservation law satisfied pairwise**: mirror frames produce mirrored MIDI sequences. Agents can use this to detect structural symmetry in strategy data, or to verify that a strategy is "balanced."

## Harmony Analysis: Chord Detection

`analyzeHarmony` looks at intervals from the root (first note) and classifies:

| Interval Set | Chord Name |
|-------------|------------|
| `[0]`       | unison |
| `[0,4]`     | major third dyad |
| `[0,7]`     | fifth |
| `[0,4,7]`   | major triad |
| `[0,3,7]`   | minor triad |
| `[0,4,8]`   | augmented triad |
| `[0,3,6]`   | diminished triad (not explicitly listed but intervals include 3) |

## Conservation Law

The pipeline's `summary.conservation` field gives Σ(parsed vector). The relationship:

> **sum of all MIDI deltas = 4 × conservation**

```js
const { sequences, summary } = runPipeline('1,0,-1,1,0,-1,1,1');
// conservation = 1 + 0 + (-1) + 1 + 0 + (-1) + 1 + 1 = 2

// Sum of MIDI deltas:
const deltaSum = sequences[0].midi.reduce((a, b, i, arr) =>
  i === 0 ? 0 : a + (b - arr[i - 1]), 0);
// = 4 + 0 + (-4) + 4 + 0 + (-4) + 4 + 4 = 8

// 8 === 4 × 2 ✓
```

## Error Handling

All functions are pure and do **not** throw on malformed input. Instead:

- `readStrategyVector` on empty string → `[NaN]` (the empty string after split produces `['']` which `Number('') = 0` when mapped, but whitespace-only produces empty filter → `[]`)
- `ternaryToMidi` with empty array → `[base]` (just the root)
- `analyzeHarmony` with empty array → intervals: `[]`, chord: `?`, range: `0`
- `detectMirrors` with fewer than 2 vectors → `{mirrors: [], count: 0}`

**Recommendation:** Validate your input before chaining, or handle edge cases downstream.

## A2A Protocol Integration

This module is an A2A *task processor* — it accepts a strategy text and returns structured JSON. To integrate with an A2A agent:

1. Your agent receives a task with `strategyText` in the input
2. Call `runPipeline(strategyText)`
3. Return the result as the task output

The JSON structure is designed to be consumed by other A2A agents downstream (e.g., a MIDI playback agent, a harmony analysis agent, a mirror-detection reporting agent).

## Related Repos

| Repo | Relationship |
|------|-------------|
| [cmidi-core](https://github.com/SuperInstance/cmidi-core) | CMIDI protocol (Rust) — conversation→MIDI. This pipeline provides the converse: spreadsheet→MIDI. |
| [construct-coordination](https://github.com/SuperInstance/construct-coordination) | Fleet coordination surface — agents using this pipeline log results there. |
| [fleet-harness](https://github.com/SuperInstance/fleet-harness) | CI backbone for the SuperInstance fleet ecosystem. |

## Version

Current: `v2.0` (returned in `result.version`)

## Changelog

| Version | Changes |
|---------|---------|
| 1.0 | Initial: `ternaryToMidi`, `readStrategyVector`, basic test |
| 2.0 | Added `vectorToTernary`, `midiToNoteName`, `midiToNoteNames`, `analyzeHarmony`, `detectMirrors`, `runPipeline` — complete pipeline |
