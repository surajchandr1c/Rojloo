/**
 * Shared string utilities for formatting, slug generation, and unique identifiers.
 */

/**
 * Converts a string into a URL-safe, lowercase kebab-case slug.
 * Trims whitespace, replaces non-alphanumeric characters with hyphens,
 * and removes leading/trailing hyphens.
 */
export function slugify(value: string): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Generates a lightweight, pseudo-unique identifier suitable for dynamic form blocks,
 * list keys, and client-side UI tracking.
 */
export function uid(prefix = "b"): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
