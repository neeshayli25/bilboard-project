const API_BASE_URL = (import.meta.env.VITE_API_URL || "/api").trim();

export function getMediaBaseUrl() {
  const withoutTrailingSlash = API_BASE_URL.replace(/\/+$/, "");
  return withoutTrailingSlash.replace(/\/api$/, "");
}

export function buildMediaUrl(url = "") {
  const value = String(url || "").trim();
  if (!value) return "";

  if (/^(https?:|data:|blob:|\/\/)/i.test(value)) {
    return value;
  }

  const path = value.startsWith("/") ? value : `/${value}`;
  const mediaBase = getMediaBaseUrl();
  return mediaBase ? `${mediaBase}${path}` : path;
}
