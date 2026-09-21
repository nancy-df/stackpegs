export function faviconUrl(website: string): string {
  const host = new URL(website).hostname;
  return `https://www.google.com/s2/favicons?domain=${host}&sz=128`;
}

export function hueFor(name: string): number {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
  return hash;
}

export function initials(name: string): string {
  const parts = name.replace(/[^\w\s]/g, " ").split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const second = parts[1]?.[0] ?? "";
  return (first + second).toUpperCase();
}
