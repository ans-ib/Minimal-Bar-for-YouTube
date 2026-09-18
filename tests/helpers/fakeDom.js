/*
 * Minimal Bar for YouTube
 * Copyright (C) 2026 Anas Ibn Bari
 *
 * This program is free software: you can redistribute it and/or modify it
 * under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or (at your
 * option) any later version. See the LICENSE file for details.
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
/**
 * Minimal fake DOM for unit tests. Only what the extension touches is modelled.
 */
export function fakeEl(overrides = {}) {
  const el = {
    id: '',
    className: '',
    textContent: '',
    style: {},
    children: [],
    listeners: {},
    parentNode: null,
    isConnected: true,
    _classes: new Set(),
    classList: {
      add: (c) => el._classes.add(c),
      remove: (c) => el._classes.delete(c),
      toggle: (c, on) => (on ? el._classes.add(c) : el._classes.delete(c)),
      contains: (c) => el._classes.has(c)
    },
    appendChild(child) {
      child.parentNode = el;
      el.children.push(child);
      return child;
    },
    remove() {
      if (el.parentNode) el.parentNode.children = el.parentNode.children.filter((c) => c !== el);
      el.parentNode = null;
    },
    addEventListener(type, fn) { el.listeners[type] = fn; },
    removeEventListener(type) { delete el.listeners[type]; },
    setAttribute() {},
    getAttribute() { return null; },
    matches() { return true; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    getBoundingClientRect() { return { left: 0, width: 100 }; }
  };
  return Object.assign(el, overrides);
}

/** A stand-in for chrome.storage with a working onChanged. */
export function fakeChromeStorage() {
  let store = {};
  const listeners = [];
  return {
    storage: {
      sync: {
        get: async (defaults) => Object.assign({}, defaults, store),
        set: async (obj) => {
          store = Object.assign({}, store, obj);
          for (const l of listeners) l({}, 'sync');
        }
      },
      onChanged: { addListener: (l) => listeners.push(l) }
    }
  };
}

export const tick = () => new Promise((resolve) => setImmediate(resolve));
