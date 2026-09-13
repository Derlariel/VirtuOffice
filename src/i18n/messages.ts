type Messages = { [key: string]: string | Messages };

export function withFallback(fallback: Messages, translated: Messages): Messages {
  const result = { ...fallback };
  for (const [key, value] of Object.entries(translated)) {
    const base = fallback[key];
    result[key] = typeof value === "object" && typeof base === "object"
      ? withFallback(base, value) : value;
  }
  return result;
}
