// Shared persistence layer for all BeatLab apps.
// Keys are namespaced as: beatlab:<appId>:<name>
// All values are JSON-serialised plain objects.

const PREFIX = 'beatlab';

function key(appId, name) {
  return `${PREFIX}:${appId}:${name}`;
}

export function savePattern(appId, name, data) {
  localStorage.setItem(key(appId, name), JSON.stringify(data));
}

export function loadPattern(appId, name) {
  const raw = localStorage.getItem(key(appId, name));
  return raw ? JSON.parse(raw) : null;
}

export function listPatterns(appId) {
  const prefix = `${PREFIX}:${appId}:`;
  const names = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k.startsWith(prefix)) names.push(k.slice(prefix.length));
  }
  return names.sort();
}

export function deletePattern(appId, name) {
  localStorage.removeItem(key(appId, name));
}

// Shared master volume across all BeatLab apps (0–1).
const VOL_KEY = 'beatlab:settings:volume';
export function getVolume(fallback = 0.5) {
  const v = parseFloat(localStorage.getItem(VOL_KEY));
  return isNaN(v) ? fallback : Math.max(0, Math.min(1, v));
}
export function setVolume(v) {
  localStorage.setItem(VOL_KEY, String(v));
}
