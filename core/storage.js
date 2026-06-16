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
