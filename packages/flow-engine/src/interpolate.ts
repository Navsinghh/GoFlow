const VARIABLE = /\{\{\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\}\}/g;

/** Unique `{{name}}` variables in order of first appearance. */
export function extractVariables(text: string): string[] {
  const seen = new Set<string>();
  for (const match of text.matchAll(VARIABLE)) seen.add(match[1]!);
  return [...seen];
}

/** Replaces `{{name}}` with `values[name]`; unknown variables are left as-is. */
export function interpolate(text: string, values: Record<string, unknown>): string {
  return text.replace(VARIABLE, (whole, name: string) => {
    if (!(name in values)) return whole;
    const value = values[name];
    return typeof value === "string" ? value : JSON.stringify(value);
  });
}
