// JSON.parse with a reviver that strips prototype-pollution vectors.
// The reviver runs on every key at every depth, so nested `__proto__` is
// also dropped. Use this anywhere we parse files under ~/.claude or any
// other path we don't fully control.
export function safeParse<T = unknown>(raw: string): T {
  return JSON.parse(raw, (key, value) => {
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      return undefined;
    }
    return value;
  }) as T;
}
