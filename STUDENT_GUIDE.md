# STUDENT_GUIDE.md — "I Have a CSV of Ternary Values. How Do I Make Music?"

*You have numbers. You want notes. Here's how.*

---

## Step 0: What You Have

You've got a spreadsheet column — maybe from a strategy grid, a game theory payoff matrix, or some experimental data. It looks like:

```
1, 0, -1, 1, 0, -1, 1, 1
```

Or maybe with decimals:

```
-0.5, 1.5, 0.1, -2.0, 0.7, 0.0, -1.0, 0.3
```

## Step 1: Load the Pipeline

```js
// In Node.js:
import { runPipeline } from './pipeline.mjs';

// Run it on your data:
const music = runPipeline('1, 0, -1, 1, 0, -1, 1, 1');
```

That's it for the one-liner. But let's understand what just happened.

## Step 2: What the Pipeline Does (Four Magic Steps)

### 2a. Read — `readStrategyVector`

Takes your messy text and turns it into clean numbers.

```
"1, 0, -1, 1, 0, -1, 1, 1"  →  [1, 0, -1, 1, 0, -1, 1, 1]
"-0.5, 1.5, 0.1, -2.0"      →  [-0.5, 1.5, 0.1, -2.0]
```

It accepts commas, spaces, newlines — anything non-numeric as a separator.

### 2b. Quantize — `vectorToTernary`

Takes your floating-point numbers and snaps each to one of three values:

- **Anything positive** → `+1` (up!)
- **Anything negative** → `-1` (down!)
- **Exactly zero** → `0` (stay!)

It also groups them into **frames of 8**. Each frame becomes a complete musical phrase.

```js
// Input: [ -0.5, 1.5, 0.1, -2.0, 0.7, 0.0, -1.0, 0.3 ]
// Frame: [   -1,   1,   0,   -1,   1,   0,   -1,   1 ]
```

### 2c. Accumulate — `ternaryToMidi`

Here's where the music happens. We start at a base note (C4 = MIDI 60) and for each ternary value, we move:

- **`+1`** → **up 4 semitones** (a major third — sounds bright)
- **`0`** → **stay** (unison — holds the note)
- **`-1`** → **down 4 semitones** (a minor third down — sounds dark)

It's like walking up and down stairs where each step is exactly 4 half-steps.

```
Start: C4 (60)
  +1 → 64 (E4)   — major third up
   0 → 64 (E4)   — stay
  -1 → 60 (C4)   — minor third down
  +1 → 64 (E4)   — up again
   0 → 64 (E4)
  -1 → 60 (C4)
  +1 → 64 (E4)
  +1 → 68 (G#4)  — up again!
```

Result: `[60, 64, 64, 60, 64, 64, 60, 64, 68]`

That's a repeating C-E-E pattern that resolves to an augmented chord (C, E, G#). 

### 2d. Analyze — `analyzeHarmony`

Now we look at what we made:

```js
{
  chord: "augmented",
  intervals: [0, 4, 8],    // root, major third, augmented fifth
  pitchClassSet: [0, 4, 8], // C, E, G#
  rootNote: "C4",
  noteCount: 9,
  range: 8                  // from C4 (60) to G#4 (68)
}
```

### Bonus: Mirror Detection — `detectMirrors`

If you have multiple frames, `detectMirrors` finds pairs that are perfect opposites.

```
Frame 1: [ 1, -1, 0]
Frame 2: [-1,  1, 0]
→ MIRROR! v1[i] + v2[i] = 0 for all i
```

Mirror frames produce inverted melodies — one goes up where the other goes down. This is the conservation law in action.

## Step 3: Hear It

Take the MIDI numbers and play them:

```js
// Option A: Pipe to a MIDI player
import { runPipeline } from './pipeline.mjs';
const result = runPipeline('1,0,-1,1,0,-1,1,1');
console.log(result.sequences[0].midi);
// → [60, 64, 64, 60, 64, 64, 60, 64, 68]
```

```js
// Option B: Use note names for display
console.log(result.sequences[0].notes);
// → ["C4", "E4", "E4", "C4", "E4", "E4", "C4", "E4", "G#4"]
```

```js
// Option C: Chain to a MIDI writer for a .mid file
// (requires midi-writer-js, not included in this module)
```

## Step 4: Understanding the Conservation Law

Here's the cool math. If you sum all your ternary values:

```
ternary =  1 + 0 + (-1) + 1 + 0 + (-1) + 1 + 1 = 2
```

And you sum all the MIDI *deltas* (the steps between consecutive notes):

```
deltas = (64-60) + (64-64) + (60-64) + (64-60) + (64-64) + (60-64) + (64-60) + (68-64)
      =    4    +    0    +   (-4)   +    4    +    0    +   (-4)   +    4    +    4
      = 8
```

They're related: **sum(deltas) = 4 × sum(ternary)**

```
8 = 4 × 2  ✓
```

This never breaks. It's baked into the math. If your data has mirror pairs (v₁[i] + v₂[i] = 0), those pairs contribute zero to the sum — they are *conserved*.

## Step 5: Making Your Own Music

### Try simple patterns

```js
// Ascending: every step goes up
runPipeline('1,1,1,1,1,1,1,1');
// → [60, 64, 68, 72, 76, 80, 84, 88, 92]
//    C4  E4  G#4 C5  E5  G#5 C6  E6  G#6
// (augmented arpeggio climbing higher and higher!)

// Descending: every step goes down
runPipeline('-1,-1,-1,-1,-1,-1,-1,-1');
// → [60, 56, 52, 48, 44, 40, 36, 32, 28]

// Alternating: up, down, up, down...
runPipeline('1,-1,1,-1,1,-1,1,-1');
// → [60, 64, 60, 64, 60, 64, 60, 64, 60]
// (oscillates between C4 and E4)

// Silence
runPipeline('0,0,0,0,0,0,0,0');
// → [60, 60, 60, 60, 60, 60, 60, 60, 60]
// (notes stay the same)
```

### Use a different root

```js
// Start on E3 (MIDI 52) instead of C4
import { ternaryToMidi } from './pipeline.mjs';
const lowNotes = ternaryToMidi([1, 0, -1], 52);
// → [52, 56, 56]  →  E3, G#3, G#3
```

### Multi-frame data

```js
// 16 values = 2 frames of 8
runPipeline('1,-1,1,-1,1,-1,1,-1, -1,1,-1,1,-1,1,-1,1');
// Frame 1: oscillates C4↔E4
// Frame 2: oscillates C4↔G#3 (mirror!)
```

## Step 6: Beyond Music — What This Is *Really* For

This pipeline is an **A2A agent component**. It converts structured numerical data (strategy vectors from spreadsheets) into a symbolic representation (MIDI) that other agents can analyze, transform, and reason about.

**Use cases:**
- **Strategy sonification**: Hear your spreadsheet data as patterns
- **Conservation verification**: Check if your strategy vectors are balanced
- **Agent communication**: Pass MIDI sequences between agents as a universal symbolic language
- **Educational**: Understand the relationship between discrete integrals and music

## Quick Reference

| Your data | What happens | Output |
|-----------|-------------|--------|
| `"1,0,-1"` | Parse, quantize, accumulate | `[60, 64, 64]` |
| `"-0.5, 1.5, 0.0"` | Snap to ternary | `[-1, 1, 0]` |
| `"1,-1,1,-1"` | Oscillation | `[60, 64, 60, 64, 60]` |
| All `+1` | Ascending arpeggio | Unlimited climb |
| All `-1` | Descending arpeggio | Unlimited drop |
| All `0` | Drone | All same note |
| Mirror frames | Inverted patterns | `detectMirrors` finds them |
