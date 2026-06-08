# fleet-a2a-pipeline

CSV in, structured JSON out. An ESM module that converts spreadsheet strategy vectors through the ternary domain into MIDI sequences with harmony analysis — designed for agents to chain directly.

## The Problem

Agents receive strategy data as raw text: `"1,0,-1,1,0,-1,1,1"` — a CSV row, a space-separated string, a cell value. This needs to become structured output: MIDI notes, note names, chord analysis, mirror detection, conservation checks. The pipeline must:

1. Parse messy input (CSV, spaces, newlines)
2. Convert to the fleet's ternary representation {-1, 0, +1}
3. Run the discrete integral to produce MIDI notes
4. Analyze the harmonic content
5. Detect structural symmetries (mirrors)
6. Return everything as a JSON object — no stdout, no formatting, no shell

And agents need to call individual steps or the full pipeline. Not a script. A library.

## The Insight

The pipeline is a **funnel**: each step reduces degrees of freedom while adding structure.

```
raw text → number[] → number[][] (8-frame chunks) → MIDI[] → analysis
any format  clean    ternary {-1,0,+1}            discrete  chord, mirrors,
            numbers  grouped by harmonic frame     integral  conservation
```

At each stage, information is either preserved (raw numbers survive as `parsed`) or deliberately reduced (continuous values snap to ternary). The conservation sum is tracked so agents can verify that `Σ(ternary)` matches the original data's algebraic balance.

The 8-element frame grouping is deliberate: it matches the fleet's standard ternary vector length, producing a single harmonic gesture per frame. A 16-element input becomes two independent frames, each analyzed separately.

## How It Works

### Step 1: Parse — `readStrategyVector`

```js
readStrategyVector("1,0,-1,1,0,-1,1,1")
// → [1, 0, -1, 1, 0, -1, 1, 1]

readStrategyVector("1 0 -1\n1 0 -1 1 1")
// → [1, 0, -1, 1, 0, -1, 1, 1]
```

Handles commas, spaces, and newlines. Filters empty strings. Returns clean numbers.

### Step 2: Ternary framing — `vectorToTernary`

```js
vectorToTernary([-0.5, 1.5, 0.1, -2.0])
// → [[-1, 1, 0, -1]]
```

Groups into 8-element frames (padded if needed). Snaps continuous values to ternary: positive → +1, negative → -1, zero → 0.

### Step 3: Accumulator — `ternaryToMidi`

```js
ternaryToMidi([1, 0, -1, 1, 0, -1, 1, 1])
// → [60, 64, 64, 60, 64, 64, 60, 64, 68]
```

The fleet's core invariant: discrete integral starting at MIDI 60 (C4), stepping by `v × 4` semitones. Same algorithm as the 514-byte WASM kernel and the spectral evaluator.

### Step 4: Analysis — `analyzeHarmony` + `detectMirrors`

```js
analyzeHarmony([60, 64, 67])
// → { chord: 'major', intervals: [4, 7], pitchClassSet: [0, 4, 7], ... }

detectMirrors([[1, -1, 0], [-1, 1, 0], [1, 0, -1]])
// → { mirrors: [{ pair: [0, 1], ... }], count: 1 }
```

Harmony analysis extracts chord quality, intervals from root, and pitch class set. Mirror detection finds ternary vector pairs where `v₁[i] + v₂[i] = 0` for all `i` — the conservation law satisfied pairwise.

### Step 5: Pipeline — `runPipeline`

One function does everything:

```js
runPipeline("1,0,-1,1,0,-1,1,1")
```

Returns structured JSON (see below).

## Code Example

### One-call pipeline

```js
import { runPipeline } from './pipeline.mjs';

const result = runPipeline('1,0,-1,1,0,-1,1,1');
```

Output:

```json
{
  "input": { "raw": "1,0,-1,1,0,-1,1,1", "parsed": [1,0,-1,1,0,-1,1,1] },
  "frames": [[1,0,-1,1,0,-1,1,1]],
  "sequences": [{
    "midi": [60,64,64,60,64,64,60,64,68],
    "notes": ["C4","E4","E4","C4","E4","E4","C4","E4","G#4"],
    "harmony": {
      "chord": "?",
      "intervals": [4,4,0,4,4,0,4,8],
      "pitchClassSet": [0,4,8],
      "rootNote": "C4",
      "noteCount": 9,
      "range": 8
    }
  }],
  "mirrors": { "mirrors": [], "count": 0 },
  "summary": {
    "frameCount": 1,
    "totalNotes": 9,
    "mirrorCount": 0,
    "conservation": 2
  },
  "version": "2.0"
}
```

### Individual functions

```js
import { ternaryToMidi, analyzeHarmony, detectMirrors } from './pipeline.mjs';

// Just the MIDI conversion
const midi = ternaryToMidi([1, 0, -1]);
// → [60, 64, 64, 60]

// Just the harmony analysis
const harmony = analyzeHarmony([60, 64, 68]);
// → { chord: 'augmented', intervals: [4, 8], pitchClassSet: [0, 4, 8], ... }

// Just the mirror detection
const mirrors = detectMirrors([[1, -1, 0], [-1, 1, 0]]);
// → { mirrors: [{ pair: [0, 1], ... }], count: 1 }
```

### Run the self-test

```bash
node pipeline.mjs
```

```
✅ readStrategyVector: [1,0,-1,1,0,-1,1,1]
✅ INVARIANT: [60,64,64,60,64,64,60,64,68] === [60,64,64,60,64,64,60,64,68]
✅ midiToNoteNames: [60,64] → [C4,E4]
✅ analyzeHarmony: chord=major, intervals=[0,4,7]
✅ detectMirrors: 1 mirror(s) found
✅ runPipeline: 1 frame, 9 notes
✅ vectorToTernary: [-0.5,1.5,0.1,-2.0] → [-1,1,0,-1]
✅ ALL 7 PASS
```

## Module Map

```
pipeline.mjs — single file, zero dependencies, ESM
├── readStrategyVector(text)     # parse CSV/space/newline → number[]
├── vectorToTernary(vector)     # group into 8-frames, snap to {-1,0,+1}
├── ternaryToMidi(ternary, base) # discrete integral: note[n] = note[n-1] + v×4
├── midiToNoteName(midiNote)    # 60 → "C4"
├── midiToNoteNames(notes)      # bulk conversion
├── analyzeHarmony(midiNotes)   # chord, intervals, pitch class set
├── detectMirrors(vectors)      # find v₁[i] + v₂[i] = 0 pairs
└── runPipeline(strategyText)   # end-to-end: text → structured JSON
```

### The shared invariant

`ternaryToMidi` implements the same discrete integral as:
- **[fleet-a2a-wasm](https://github.com/SuperInstance/fleet-a2a-wasm)** — the 514-byte WASM kernel
- **[fleet-a2a-spectral](https://github.com/SuperInstance/fleet-a2a-spectral)** — the Python evaluator

All three produce identical output for the same input: `[1,0,-1,1,0,-1,1,1]` → `[60,64,64,60,64,64,60,64,68]` in every runtime. This is the fleet's invariant.

## Design Decisions

**Why 8-element frames?** The fleet's ternary vectors are designed around 8-element sequences — long enough to express a complete harmonic gesture, short enough to fit in a single spreadsheet row or MIDI bar. `vectorToTernary` chunks at 8 so a 16-element input becomes two independent harmonic movements.

**Why structured JSON instead of MIDI files?** Agents consume JSON, not binary MIDI. The JSON carries MIDI note numbers, human-readable note names, harmony analysis, and structural metadata — everything an agent needs to reason about the music without a MIDI parser. If you need `.mid` files, chain the output with an SMF encoder.

**Why not compute the Cheeger constant or Fiedler vector here?** Those require a graph and a linear algebra library. This pipeline starts *after* spectral analysis — it takes the ternary vector (or the raw numbers that produce one) and handles everything downstream. The spectral computation lives in [fleet-a2a-spectral](https://github.com/SuperInstance/fleet-a2a-spectral).

**Why is `detectMirrors` in the pipeline?** Mirror pairs — vectors where `v₁ + v₂ = 0` — represent conservation-law symmetry. If you have two strategy vectors that are mirrors, they're algebraically opposite: one's "up" is the other's "down." This is structurally important for fleet coordination. Detecting it at the pipeline level means agents don't need a separate symmetry analysis step.

**Why `conservation` in the summary?** The conservation sum (`Σ(ternary)`) tells you whether the harmonic gesture is closed (sum = 0, returns to starting note) or open (sum ≠ 0, drifts away). The pipeline surfaces this immediately because it affects how agents interpret the output — a closed gesture is a statement, an open gesture is a question.

## Status

7/7 tests pass. Single file (`pipeline.mjs`), zero dependencies, ESM. No build step, no npm install.

### Fleet

| Module | Role |
|--------|------|
| [fleet-a2a-bridge](https://github.com/SuperInstance/fleet-a2a-bridge) | I2I bottle ↔ spreadsheet formula translation |
| [fleet-a2a-wasm](https://github.com/SuperInstance/fleet-a2a-wasm) | 514-byte WASM ternary→MIDI kernel (same accumulator) |
| [fleet-a2a-spectral](https://github.com/SuperInstance/fleet-a2a-spectral) | Graph spectral analysis → ternary → MIDI |
| **fleet-a2a-pipeline** | You are here — CSV → ternary → MIDI → analysis |

MIT.
