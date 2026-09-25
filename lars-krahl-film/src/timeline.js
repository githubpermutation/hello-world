'use strict';
/* =====================================================================
 *  timeline.js - musical grid, scene times, voice-over + sfx cue sheet
 * ===================================================================== */
const BPM = 104, BEAT = 60 / BPM, BAR = BEAT * 4;
const SC = {
  dresden: 0, c64: BAR * 2, hooked: BAR * 4, boots: BAR * 6, cert: BAR * 8,
  puppet: BAR * 10, pipes: BAR * 12, python: BAR * 15, curious: BAR * 17, outro: BAR * 20,
};
const DURATION = BAR * 23 + 0.25;   // ~53.3 s

/** narration clips: [file key, absolute start time] */
const VO = [
  ['dresden', 0.9],
  ['c64', SC.c64 + 0.1],
  ['hooked1', SC.hooked + 0.12], ['hooked2', SC.hooked + 1.22], ['hooked3', SC.hooked + 2.27], ['hooked4', SC.hooked + 3.62],
  ['boots', SC.boots + 0.1],
  ['certified', SC.cert + 0.1],
  ['puppet', SC.puppet + 0.1],
  ['pipes', SC.pipes + 0.1],
  ['python', SC.python + 0.1],
  ['cur1', SC.curious + 0.07], ['cur2', SC.curious + 0.97], ['cur3', SC.curious + 2.07],
  ['cur4', SC.curious + 2.97], ['cur5', SC.curious + 3.72], ['cur6', SC.curious + 4.62],
  ['outro', SC.outro + 0.35],
];

/** sound-effect cue sheet, filled by the scenes: {t, type, ...params} */
const CUES = [];
function cue(t, type, o = {}) { CUES.push(Object.assign({ t, type }, o)); }

/** camera shakes: [t0, amplitude] */
const SHAKES = [];
function shake(t0, amp = 10, dur = .45) { SHAKES.push([t0, amp, dur]); }
