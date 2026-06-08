# A2A Spreadsheet→MIDI Pipeline

Agent-consumable ESM module. CSV in, structured JSON out. No shell, no formatting — agents chain this directly.

## Exports

| Function | Signature | Purpose |
|----------|-----------|---------|
| `readStrategyVector(text)` | `string → number[]` | Parse "1,0,-1" → [1,0,-1] |
| `vectorToTernary(vector)` | `number[] → number[][]` | Group into [-1,0,+1] frames |
| `ternaryToMidi(ternary, base=60)` | `number[], number → number[]` | Core invariant: accumulator ×4 |
| `midiToNoteName(midiNote)` | `number → string` | 60 → "C4" |
| `midiToNoteNames(midiNotes)` | `number[] → string[]` | Bulk convert |
| `analyzeHarmony(midiNotes)` | `number[] → object` | Chord, intervals, pitch set |
| `detectMirrors(vectors)` | `number[][] → object` | Find v + v' = 0 pairs |
| `runPipeline(strategyText)` | `string → object` | Full pipeline → structured JSON |

## Agent Usage

```js
import { runPipeline, ternaryToMidi } from './pipeline.mjs';

// Single call: strategy text → structured result
const result = runPipeline('1,0,-1,1,0,-1,1,1');
// result.sequences[0].midi → [60, 64, 64, 60, 64, 64, 60, 64, 68]

// Or use individual functions
const midi = ternaryToMidi([1, 0, -1]);
// → [60, 64, 64]
```

## Output Structure

```json
{
  "input": { "raw": "1,0,-1,…", "parsed": [1,0,-1,…] },
  "frames": [[1,0,-1,1,0,-1,1,1]],
  "sequences": [{
    "midi": [60,64,64,60,64,64,60,64,68],
    "notes": ["C4","E4","E4","C4","E4","E4","C4","E4","G#4"],
    "harmony": { "chord": "augmented", "intervals": [0,4,8], "pitchClassSet": [0,4,8], "noteCount": 3 }
  }],
  "mirrors": { "mirrors": [], "count": 0 },
  "summary": { "frameCount": 1, "totalNotes": 9, "mirrorCount": 0, "conservation": 2 },
  "version": "2.0"
}
```

## Build & Test

```bash
node pipeline.mjs
# Self-test: 7 tests, all pass
```

## Architecture

```
spreadsheet CSV ─▶ readStrategyVector ─▶ vectorToTernary ─▶ ternaryToMidi
                    number[]             number[][]
                                                         │
                                                         ▼
                                          analyzeHarmony ─▶ structured JSON
                                          detectMirrors ─▶ mirror pairs
                                                agents consume .sequences.midi
                                            no UI, no HTML, no shell formatting
```
