import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


export function generateTitle(query: string): string {
  // Remove any trailing punctuation
  const cleanQuery = query.trim().replace(/[?.!,;:]$/, '');
  
  // Split the query into words
  const words = cleanQuery.split(/\s+/);
  
  // For shorter queries, use the whole query as title
  if (words.length <= 10) {
    return words
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
  
  // For longer queries, truncate and add ellipsis
  return words
    .slice(0, 10)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') + '...';
}

/**
 * Formats a number to a human-readable string with K, M, B, etc.
 */
export function formatNumber(num: number): string {
  if (num >= 1000000000) {
    return (num / 1000000000).toFixed(1) + 'B';
  }
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Truncates text to a specified length and adds ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}
