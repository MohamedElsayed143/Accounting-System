export async function generateDeviceId() {
  if (typeof window === "undefined") return "";
  const data = `${navigator.userAgent}-${window.screen.width}x${window.screen.height}-${navigator.language}-${navigator.hardwareConcurrency || ''}`;
  const buffer = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
