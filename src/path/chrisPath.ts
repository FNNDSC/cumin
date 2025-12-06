/**
 * @file ChRIS Path Analysis
 *
 * This module provides utilities for analyzing ChRIS filesystem paths.
 * It determines execution context based on directory structure and extracts
 * metadata from path components.
 *
 * @module
 */

import * as path from 'path';

/**
 * Determines if a path is within a ChRIS feed directory.
 *
 * Checks if the path contains the pattern: /feeds/feed_<numeric-id>/
 *
 * @param dirPath - The directory path to check.
 * @returns True if the path is within a feed directory, false otherwise.
 *
 * @example
 * ```typescript
 * path_isInFeed('/home/chris/feeds/feed_123/pl-dircopy_456/data/')  // true
 * path_isInFeed('/home/chris/uploads/data/')                         // false
 * ```
 */
export function path_isInFeed(dirPath: string): boolean {
  // Pattern: /feeds/feed_<digits>/
  const feedPattern: RegExp = /\/feeds\/feed_\d+\//;
  return feedPattern.test(dirPath);
}

/**
 * Extracts the plugin instance ID from a path by finding the nearest
 * ancestor directory matching the pattern: <plugin-name>_<instanceID>
 *
 * Walks up the directory tree from the given path until finding a directory
 * that matches the plugin instance naming pattern.
 *
 * @param dirPath - The directory path to analyze.
 * @returns The plugin instance ID as a number, or null if not found.
 *
 * @example
 * ```typescript
 * // From deep subdirectory
 * path_extractPluginInstanceID('/home/chris/feeds/feed_123/pl-dircopy_456/data/sub/dir/')
 * // Returns: 456
 *
 * // From data directory
 * path_extractPluginInstanceID('/home/chris/feeds/feed_123/pl-dcm2niix_789/data/')
 * // Returns: 789
 * ```
 */
export function path_extractPluginInstanceID(dirPath: string): number | null {
  // Pattern: <plugin-name>_<digits>
  const instancePattern: RegExp = /^(.+)_(\d+)$/;

  // Walk up the directory tree
  let currentPath: string = path.normalize(dirPath);
  const root: string = path.parse(currentPath).root;

  while (currentPath !== root) {
    const dirname: string = path.basename(currentPath);
    const match: RegExpMatchArray | null = dirname.match(instancePattern);

    if (match) {
      // Found a match: extract the instance ID
      const instanceID: number = parseInt(match[2], 10);
      return instanceID;
    }

    // Move up one directory
    const parent: string = path.dirname(currentPath);
    if (parent === currentPath) {
      // Reached root without finding a match
      break;
    }
    currentPath = parent;
  }

  return null;
}

/**
 * Extracts the feed ID from a path.
 *
 * Looks for the pattern: /feeds/feed_<numeric-id>/ in the path.
 *
 * @param dirPath - The directory path to analyze.
 * @returns The feed ID as a number, or null if not found.
 *
 * @example
 * ```typescript
 * path_extractFeedID('/home/chris/feeds/feed_123/pl-dircopy_456/data/')
 * // Returns: 123
 * ```
 */
export function path_extractFeedID(dirPath: string): number | null {
  // Pattern: /feeds/feed_<digits>/
  const feedPattern: RegExp = /\/feeds\/feed_(\d+)\//;
  const match: RegExpMatchArray | null = dirPath.match(feedPattern);

  if (match) {
    return parseInt(match[1], 10);
  }

  return null;
}

/**
 * Finds the highest version of pl-dircopy in a bin listing.
 *
 * If multiple pl-dircopy versions exist (e.g., pl-dircopy-v1.0.0, pl-dircopy-v2.1.0),
 * returns the one with the highest version number.
 *
 * @param binListing - Array of plugin names from /bin directory.
 * @returns The full name of the latest pl-dircopy plugin, or null if not found.
 *
 * @example
 * ```typescript
 * const plugins = ['pl-dircopy-v1.0.0', 'pl-dircopy-v2.1.0', 'pl-other-v1.0.0'];
 * path_findLatestDircopy(plugins);
 * // Returns: 'pl-dircopy-v2.1.0'
 * ```
 */
export function path_findLatestDircopy(binListing: string[]): string | null {
  // Filter for pl-dircopy plugins
  const dircopyPlugins: string[] = binListing.filter((name: string) => name.startsWith('pl-dircopy-v'));

  if (dircopyPlugins.length === 0) {
    return null;
  }

  if (dircopyPlugins.length === 1) {
    return dircopyPlugins[0];
  }

  // Multiple versions - parse and find highest
  // Pattern: pl-dircopy-vX.Y.Z
  const versionPattern: RegExp = /^pl-dircopy-v(\d+)\.(\d+)\.(\d+)$/;

  interface VersionedPlugin {
    name: string;
    major: number;
    minor: number;
    patch: number;
  }

  const versioned: VersionedPlugin[] = dircopyPlugins
    .map((name: string) => {
      const match: RegExpMatchArray | null = name.match(versionPattern);
      if (!match) return null;
      return {
        name,
        major: parseInt(match[1], 10),
        minor: parseInt(match[2], 10),
        patch: parseInt(match[3], 10),
      };
    })
    .filter((v): v is VersionedPlugin => v !== null);

  if (versioned.length === 0) {
    // Fallback: return first if version parsing failed
    return dircopyPlugins[0];
  }

  // Sort by version (highest first)
  versioned.sort((a: VersionedPlugin, b: VersionedPlugin) => {
    if (a.major !== b.major) return b.major - a.major;
    if (a.minor !== b.minor) return b.minor - a.minor;
    return b.patch - a.patch;
  });

  return versioned[0].name;
}
