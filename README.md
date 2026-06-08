# fleet-a2a-pipeline: Spreadsheet → MIDI Pipeline 📊🎵

**CSV in, structured JSON out — agents chain this directly.**

```
Strategy CSV ──▶ readStrategyVector ──▶ vectorToTernary ──▶ ternaryToMidi ──▶ analyzeHarmony
                     │                     │                    │              detectMirrors
                     │                     │                    │                    │
                     ▼                     ▼                    ▼                    ▼
                number[]            number[][8]           number[]             structured JSON
```

A zero-dependency ESM module that converts spreadsheet strategy vectors through a ternary domain into MIDI sequences. Pure functions, no shell formatting, no UI, no HTML, no DOM — built for agent-to-agent consumption.

## The Conservation Law

The pipeline enforces a structural invariant: **every ternary step maps to a MIDI interval of ±4 semitones (a major third)**.

```
Noteₙ = Noteₙ₋₁ + ternary[n] × 4

  ternary:   +1  →  major third up   (4 semitones)
              0  →  unison           (0 semitones)
             -1  →  minor third down  (4 semitones down)
```

This means the sum of intervals across a sequence follows a strict relationship:

> **Σ(Δₘᵢ₊ᵢ) = 4 · Σ(ternary)**

The pipeline doesn't just *allow* this check — it *defines* its output around it. `analyzeHarmony` surfaces the harmonic structure. `detectMirrors` finds zero-sum pairs. The conservation property is embedded at every level.

---

## Exports

| # | Export | Signature | Purpose |
|---|--------|-----------|---------|
| 1 | `readStrategyVector` | `(text: string) → number[]` | Parse `"1,0,-1,1,0,-1,1,1"` → `[1,0,-1,1,0,-1,1,1]` — accepts comma or whitespace delimiters |
| 2 | `vectorToTernary` | `(vector: number[]) → number[][]` | Group into 8-element frames, snap to `{-1, 0, +1}` |
| 3 | `ternaryToMidi` | `(ternary: number[], base=60) → number[]` | Core accumulator. Each `v` → `prev + v × 4`. `base` = starting MIDI note (default C4). |
| 4 | `midiToNoteName` | `(midiNote: number) → string` | `60 → "C4"`, `64 → "E4"`, `68 → "G#4"` |
| 5 | `midiToNoteNames` | `(midiNotes: number[]) → string[]` | Bulk `midiToNoteName` |
| 6 | `analyzeHarmony` | `(midiNotes: number[]) → object` | Chord detection, intervals, pitch class set, range |
| 7 | `detectMirrors` | `(vectors: number[][]) → {mirrors, count}` | Find pairs where `v₁[i] + v₂[i] == 0` for all `i` — conservation law satisfied pairwise |
| 8 | `runPipeline` | `(strategyText: string) → object` | End-to-end: text → JSON. One call does everything. |

### Wait, show me

```js
import { runPipeline, ternaryToMidi } from './pipeline.mjs';

// One-liner: CSV text → structured JSON
const result = runPipeline('1,0,-1,1,0,-1,1,1');
// → {
//     input: { raw: '1,0,-1,1,0,-1,1,1', parsed: [1,0,-1,1,0,-1,1,1] },
//     frames: [[1,0,-1,1,0,-1,1,1]],
//     sequences: [{ midi: [60,64,64,60,64,64,60,64,68], notes: ["C4","E4","E4",...], harmony: {...} }],
//     mirrors: { mirrors: [], count: 0 },
//     summary: { frameCount: 1, totalNotes: 9, mirrorCount: 0, conservation: 2 },
//     version: '2.0'
//   }

// Or use the core invariant directly:
const midi = ternaryToMidi([1, 0, -1, 1, 0, -1, 1, 1]);
// → [60, 64, 64, 60, 64, 64, 60, 64, 68]
//   C4  E4  E4   C4  E4  E4   C4  E4  G#4
```

## Output Structure

```json
{
  "input": {
    "raw": "1,0,-1,1,0,-1,1,1",
    "parsed": [1, 0, -1, 1, 0, -1, 1, 1]
  },
  "frames": [
    [1, 0, -1, 1, 0, -1, 1, 1]
  ],
  "sequences": [
    {
      "midi": [60, 64, 64, 60, 64, 64, 60, 64, 68],
      "notes": ["C4", "E4", "E4", "C4", "E4", "E4", "C4", "E4", "G#4"],
      "harmony": {
        "chord": "augmented",
        "intervals": [0, 4, 8],
        "pitchClassSet": [0, 4, 8],
        "rootNote": "C4",
        "noteCount": 3,
        "range": 8
      }
    }
  ],
  "mirrors": {
    "mirrors": [],
    "count": 0
  },
  "summary": {
    "frameCount": 1,
    "totalNotes": 9,
    "mirrorCount": 0,
    "conservation": 2
  },
  "version": "2.0"
}
```

## Build & Self-Test

```bash
node pipeline.mjs

# === A2A Pipeline Self-Test ===
# ✅ readStrategyVector: [1,0,-1,1,0,-1,1,1]
# ✅ INVARIANT: [60,64,64,60,64,64,60,64,68] === [60,64,64,60,64,64,60,64,68]
# ✅ midiToNoteNames: [60,64] → [C4,E4]
# ✅ analyzeHarmony: chord=major, intervals=[0,4,7]
# ✅ detectMirrors: 1 mirror(s) found
# ✅ runPipeline: 1 frame, 9 notes
# ✅ vectorToTernary: [-0.5,1.5,0.1,-2.0] → [-1,1,0,-1]
#
# ✅ ALL 8 PASS
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  INPUT                    PROCESSING                      OUTPUT   │
│                                                                     │
│  "1,0,-1,1,0,..."                                                 │
│       │                                                            │
│       ▼                                                            │
│  readStrategyVector                                                 │
│  ────────────────    vectorToTernary    ternaryToMidi                │
│  CSV/plain text ──▶  [-1,0,+1] frames ──▶ accumulator ×4 ──▶ MIDI  │
│  → clean + split     [8-element groups]   each v → prev+v×4  notes │
│       │                                                            │
│       ▼                                                            │
│  analyzeHarmony                                                     │
│  ────────────────    detectMirrors                                  │
│  chord, intervals,   ────────────────                               │
│  pitch class set     v₁[i] + v₂[i] = 0                             │
│       │                                                            │
│       ▼                                                            │
│  runPipeline ──▶ structured JSON ──▶ agents consume .sequences.midi │
│                                                                     │
│  NO UI. NO HTML. NO DOM. NO SHELL FORMATTING.                     │
│  PURE FUNCTIONS. CHAINABLE BY AGENTS.                              │
└─────────────────────────────────────────────────────────────────────┘
```

## Raw JSON vs MIDI File

This pipeline outputs **structured JSON**, not `.mid` files. The JSON contains raw MIDI note numbers, note names, harmony analysis, and mirror detection — designed to be consumed programmatically by A2A agents. If you need actual SMF binary output, chain this with an SMF encoder like `midi-writer-js` or `easymidi`.

## Ecosystem

- **[cmidi-core](https://github.com/SuperInstance/cmidi-core)** — Conversational MIDI Protocol (Rust). Encodes multi-agent discourse as symbolic music. Every CMIDI file is a valid Standard MIDI File. This pipeline provides the *ternary-to-MIDI bridge* that feeds into the broader MIDI agent infrastructure.
- **[construct-coordination](https://github.com/SuperInstance/construct-coordination)** — Shared coordination surface for the SuperInstance fleet. Agents write decisions here.

## License

MIT
