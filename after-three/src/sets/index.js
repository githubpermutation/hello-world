// Lazily built, cached sets. Each builder returns { scene, ...handles, reset?, update? }.
import { buildApartment } from './apartment.js';
import { buildStudio } from './studio.js';
import { buildShower } from './shower.js';
import { buildVoid } from './void.js';

const builders = {
  apartment: buildApartment,
  studio: buildStudio,
  shower: buildShower,
  void: buildVoid,
};
const cache = {};
export function getSet(name) {
  if (!cache[name]) cache[name] = builders[name]();
  return cache[name];
}
