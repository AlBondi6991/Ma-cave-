import { useSyncExternalStore } from "react";
import { emptyState } from "./cellar";
import type { CellarState } from "./types";

const STORAGE_KEY = "ma-cave:v1";

function load(): CellarState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...emptyState(), ...JSON.parse(raw) };
  } catch {
    // stockage indisponible ou corrompu : on repart d'une cave vide
  }
  return emptyState();
}

let state: CellarState = load();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getState(): CellarState {
  return state;
}

export function setState(next: CellarState) {
  if (next === state) return;
  state = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // quota dépassé ou navigation privée : l'état reste en mémoire
  }
  listeners.forEach((l) => l());
}

/** Applique une opération pure de `cellar.ts` à l'état courant. */
export function update<A extends unknown[]>(op: (s: CellarState, ...args: A) => CellarState, ...args: A) {
  setState(op(state, ...args));
}

export function useCellar(): CellarState {
  return useSyncExternalStore(subscribe, getState, getState);
}

// Synchronise les onglets ouverts en même temps.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return;
    state = load();
    listeners.forEach((l) => l());
  });
}
