/**
 * Cache mémoire à durée de vie limitée (TTL), avec « déduplication » des requêtes en cours :
 * si 10 visiteurs ouvrent la même fiche en même temps, le site source n'est interrogé QU'UNE fois.
 */
export class TtlCache {
  #ttlMs;
  #store = new Map();
  #inflight = new Map();
  #now;

  constructor(ttlMs, now = () => Date.now()) {
    this.#ttlMs = ttlMs;
    this.#now = now;
  }

  async getOrLoad(key, loader) {
    const hit = this.#store.get(key);
    if (hit && hit.expiresAt > this.#now()) return { value: hit.value, cached: true };

    let pending = this.#inflight.get(key);
    if (!pending) {
      pending = loader()
        .then((value) => {
          this.#store.set(key, { value, expiresAt: this.#now() + this.#ttlMs });
          return value;
        })
        .finally(() => this.#inflight.delete(key));
      this.#inflight.set(key, pending);
    }
    return { value: await pending, cached: false };
  }
}
