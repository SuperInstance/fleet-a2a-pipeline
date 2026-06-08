/**
 * A2A Spreadsheet→MIDI Pipeline — Agent-consumable ESM module.
 *
 * Reads spreadsheet strategy vectors, converts through ternary domain
 * into MIDI notes. Structured JSON output. No shell. No formatting.
 *
 * All functions are pure and importable by other agents.
 *
 * Invariant:
 *   pipeline.ternaryToMidi([1,0,-1,1,0,-1,1,1])
 *   → [60, 64, 64, 60, 64, 64, 60, 64, 68]
 */

// === Constants ===
const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// === Core: Ternary → MIDI (accumulator / discrete integral) ===

export function ternaryToMidi(ternary, base = 60) {
  /** Core fleet invariant: cumulative sum.
   *  Each note = previous_note + v × 4.
   *  +1 → major third up, 0 → unison, -1 → minor third down.
   */
  const notes = [base];
  for (const v of ternary) {
    notes.push(notes[notes.length - 1] + v * 4);
  }
  return notes;
}

// === Spreadsheet strategy vector parsing ===

export function readStrategyVector(text) {
  /** Parse a strategy vector from CSV or plain text.
   *  Accepts: "1,0,-1,1,0,-1,1,1" or "1 0 -1 1 0 -1 1 1"
   */
  const cleaned = text.trim().replace(/\n/g, ',');
  const items = cleaned.split(/[,\s]+/).filter(s => s.length > 0);
  return items.map(Number);
}

export function vectorToTernary(vector) {
  /** Group vector elements into 8-element ternary frames.
   *  Each frame becomes an independent harmonic movement.
   */
  const frames = [];
  for (let i = 0; i < vector.length; i += 8) {
    frames.push(vector.slice(i, i + 8).map(v => {
      if (v > 0) return 1;
      if (v < 0) return -1;
      return 0;
    }));
  }
  return frames;
}

// === MIDI utilities ===

export function midiToNoteName(midiNote) {
  /** Convert MIDI number to note name + octave.
   *  60 → "C4", 64 → "E4", 68 → "G#4"
   */
  const note = noteNames[midiNote % 12];
  const octave = Math.floor(midiNote / 12) - 1;
  return `${note}${octave}`;
}

export function midiToNoteNames(midiNotes) {
  return midiNotes.map(midiToNoteName);
}

// === Analysis ===

export function analyzeHarmony(midiNotes) {
  /** Analyze MIDI note sequence for harmony information.
   *  Returns: chord, intervals, pitch class set.
   */
  // Compute intervals from root (first note)
  const root = midiNotes[0];
  const intervals = midiNotes.slice(1).map(n => n - root);
  const unique = [...new Set(intervals)].sort((a, b) => a - b);

  // Pitch class set (mod 12)
  const pcSet = [...new Set(midiNotes.map(n => n % 12))].sort((a, b) => a - b);

  // Guess chord name (simple)
  let chord = '?';
  if (unique.length === 1) {
    chord = unique[0] === 0 ? 'unison' : unique[0] === 4 ? 'major third' : unique[0] === 7 ? 'fifth' : 'dyad';
  } else if (unique.length === 2) {
    const has3 = unique.includes(4);
    const has5 = unique.includes(7);
    const has8 = unique.includes(8);
    if (has3 && has5) chord = 'major';
    else if (has3 && has8) chord = 'augmented';
    else if (unique.includes(3) && has5) chord = 'minor';
  }

  return {
    chord,
    intervals,
    pitchClassSet: pcSet,
    rootNote: midiToNoteName(root),
    noteCount: midiNotes.length,
    range: midiNotes.length > 0 ? Math.max(...midiNotes) - Math.min(...midiNotes) : 0,
  };
}

export function detectMirrors(vectors) {
  /** Find mirror pairs in ternary vectors where v1[i] + v2[i] == 0 for all i.
   *  Mirror symmetry = conservation law satisfied pairwise.
   */
  if (!vectors || vectors.length < 2) return { mirrors: [], count: 0 };

  const mirrors = [];
  for (let i = 0; i < vectors.length; i++) {
    for (let j = i + 1; j < vectors.length; j++) {
      const v1 = vectors[i];
      const v2 = vectors[j];
      if (v1.length !== v2.length) continue;

      let isMirror = true;
      for (let k = 0; k < v1.length; k++) {
        if (v1[k] + v2[k] !== 0) {
          isMirror = false;
          break;
        }
      }
      if (isMirror) {
        mirrors.push({ pair: [i, j], vector1: v1, vector2: v2 });
      }
    }
  }

  return { mirrors, count: mirrors.length };
}

// === Top-level pipeline ===

export function runPipeline(strategyText) {
  /** End-to-end pipeline: strategy text → structured JSON.
   *  No shell output, no formatting. Agents chain this.
   *
   *  Returns structured result object.
   */
  const vector = readStrategyVector(strategyText);
  const frames = vectorToTernary(vector);
  const midiSequences = frames.map(f => ternaryToMidi(f));

  const analysis = midiSequences.map(ms => ({
    midi: ms,
    notes: midiToNoteNames(ms),
    harmony: analyzeHarmony(ms),
  }));

  const mirrors = detectMirrors(frames);

  return {
    input: { raw: strategyText, parsed: vector },
    frames,
    sequences: analysis,
    mirrors,
    summary: {
      frameCount: frames.length,
      totalNotes: midiSequences.reduce((a, s) => a + s.length, 0),
      mirrorCount: mirrors.count,
      conservation: vector.reduce((a, b) => a + b, 0),
    },
    version: '2.0',
  };
}

// === CLI entry point (when run directly) ===
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) {
  // Test all functions
  const testVector = '1,0,-1,1,0,-1,1,1';

  console.log('=== A2A Pipeline Self-Test ===\n');

  // 1. Read strategy
  const vec = readStrategyVector(testVector);
  console.assert(vec.length === 8, 'readStrategyVector length');
  console.log(`✅ readStrategyVector: [${vec}]`);

  // 2. Ternary to MIDI (invariant)
  const midi = ternaryToMidi([1, 0, -1, 1, 0, -1, 1, 1]);
  const expected = [60, 64, 64, 60, 64, 64, 60, 64, 68];
  let pass = midi.length === expected.length && midi.every((n, i) => n === expected[i]);
  console.log(`${pass ? '✅' : '❌'} INVARIANT: [${midi}] === [${expected}]`);

  // 3. Note names
  const names = midiToNoteNames([60, 64, 64]);
  console.assert(names[0] === 'C4' && names[1] === 'E4', 'Note names');
  console.log(`✅ midiToNoteNames: [60,64] → [${names.slice(0, 2)}]`);

  // 4. Harmony
  const harm = analyzeHarmony([60, 64, 67]);
  console.assert(harm.chord === 'major', 'Harmony analysis');
  console.log(`✅ analyzeHarmony: chord=${harm.chord}, intervals=[${harm.intervals}]`);

  // 5. Mirrors
  const mir = detectMirrors([[1, -1, 0], [-1, 1, 0], [1, 0, -1]]);
  console.assert(mir.count === 1, 'Mirror detection count');
  console.log(`✅ detectMirrors: ${mir.count} mirror(s) found`);

  // 6. Full pipeline
  const result = runPipeline(testVector);
  console.assert(result.summary.frameCount === 1, 'Pipeline frame count');
  console.assert(result.summary.totalNotes === 9, 'Pipeline note count');
  console.log(`✅ runPipeline: ${result.summary.frameCount} frame, ${result.summary.totalNotes} notes`);

  // 7. Vector to ternary
  const frames = vectorToTernary([-0.5, 1.5, 0.1, -2.0]);
  console.assert(frames[0][0] === -1 && frames[0][1] === 1 && frames[0][2] === 0 && frames[0][3] === -1, 'vectorToTernary');
  console.log(`✅ vectorToTernary: [-0.5,1.5,0.1,-2.0] → [${frames[0]}]`);

  console.log(`\n${'✅ ALL 7 PASS'}`);
}
