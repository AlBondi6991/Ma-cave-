/** Clé API Anthropic de l'utilisateur, gardée sur cet appareil uniquement (app installée hors claude.ai). */
const KEY = "ma-cave:anthropic-key";

export function getApiKey(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setApiKey(key: string | null) {
  try {
    if (key) localStorage.setItem(KEY, key.trim());
    else localStorage.removeItem(KEY);
  } catch {
    // stockage indisponible : la clé ne sera pas mémorisée
  }
}
