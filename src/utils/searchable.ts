/**
 * @file Searchable String Management
 *
 * This module provides a unified interface for working with ChRIS "searchable" strings.
 * A searchable is a flexible identifier format used to locate ChRIS resources (plugins, feeds, files).
 *
 * Searchable formats:
 * - Simple: "pl-dircopy" → converted to "name: pl-dircopy"
 * - Compound: "name: pl-dircopy, version: 1.3.2" → multiple key:value pairs
 * - Batch: "id:77++id:33++name:pl-test" → multiple searchables for batch operations
 *
 * @module
 */

import { keyPairString_parse } from './keypair.js';

/**
 * Represents the type of searchable string.
 */
export type SearchableType = 'simple' | 'compound' | 'batch';

/**
 * Internal data structure for a searchable.
 */
export interface SearchableData {
  /** Original input string */
  raw: string;
  /** Parsed key-value pairs */
  parsed: Record<string, string>;
  /** Type of searchable */
  type: SearchableType;
}

/**
 * Represents a searchable string for ChRIS resource queries.
 *
 * A Searchable encapsulates the logic for parsing, validating, and converting
 * search strings into formats usable by the ChRIS API.
 *
 * @example
 * // Simple name search
 * const s1 = Searchable.from("pl-dircopy");
 * s1.toQueryParams(); // { name: "pl-dircopy" }
 *
 * @example
 * // Compound search
 * const s2 = Searchable.from("name: pl-dircopy, version: 1.3.2");
 * s2.toQueryParams(); // { name: "pl-dircopy", version: "1.3.2" }
 *
 * @example
 * // Batch operations
 * const s3 = Searchable.from("id:77++id:33");
 * s3.toBatchSearchables(); // [Searchable("id:77"), Searchable("id:33")]
 */
export class Searchable {
  private constructor(private data: SearchableData) {}

  /**
   * Creates a Searchable from any input string.
   * Automatically detects the type (simple, compound, or batch).
   *
   * @param input - The searchable string to parse.
   * @returns A Searchable instance.
   */
  static from(input: string): Searchable {
    const trimmed = input.trim();

    // Batch: contains ++
    if (trimmed.includes('++')) {
      return Searchable.batch(trimmed);
    }

    // Compound: contains : (key:value format)
    if (trimmed.includes(':')) {
      return Searchable.compound(trimmed);
    }

    // Simple: plain name
    return Searchable.simple(trimmed);
  }

  /**
   * Creates a simple searchable from a plain name.
   * Converts "pl-dircopy" → "name: pl-dircopy"
   *
   * @param name - The resource name.
   * @returns A Searchable instance.
   */
  static simple(name: string): Searchable {
    const trimmed = name.trim();
    const normalized = `name: ${trimmed}`;

    return new Searchable({
      raw: trimmed,
      parsed: { name: trimmed },
      type: 'simple',
    });
  }

  /**
   * Creates a compound searchable from key:value pairs.
   * Parses "name: pl-dircopy, version: 1.3.2" → { name: "pl-dircopy", version: "1.3.2" }
   *
   * @param keyValueString - Comma-separated key:value pairs.
   * @returns A Searchable instance.
   */
  static compound(keyValueString: string): Searchable {
    const trimmed = keyValueString.trim();
    const parsed = keyPairString_parse(trimmed);

    return new Searchable({
      raw: trimmed,
      parsed,
      type: 'compound',
    });
  }

  /**
   * Creates a batch searchable containing multiple searchables separated by ++.
   * The parsed result is a placeholder; use toBatchSearchables() to get individual items.
   *
   * @param batchString - Multiple searchables separated by ++.
   * @returns A Searchable instance.
   */
  static batch(batchString: string): Searchable {
    const trimmed = batchString.trim();

    return new Searchable({
      raw: trimmed,
      parsed: { _batch: trimmed }, // Placeholder
      type: 'batch',
    });
  }

  /**
   * Returns the original raw input string.
   */
  get raw(): string {
    return this.data.raw;
  }

  /**
   * Returns the searchable type.
   */
  get type(): SearchableType {
    return this.data.type;
  }

  /**
   * Checks if this is a simple searchable (plain name).
   */
  isSimple(): boolean {
    return this.data.type === 'simple';
  }

  /**
   * Checks if this is a compound searchable (multiple key:value pairs).
   */
  isCompound(): boolean {
    return this.data.type === 'compound';
  }

  /**
   * Checks if this is a batch searchable (contains ++).
   */
  isBatch(): boolean {
    return this.data.type === 'batch';
  }

  /**
   * Converts the searchable to query parameters suitable for the ChRIS API.
   * For batch searchables, this returns a placeholder. Use toBatchSearchables() instead.
   *
   * @returns A record of key-value pairs.
   */
  toQueryParams(): Record<string, string> {
    return { ...this.data.parsed };
  }

  /**
   * Splits a batch searchable into individual searchables.
   * Only applicable for batch searchables (containing ++).
   *
   * @returns An array of Searchable instances, or a single-item array if not a batch.
   */
  toBatchSearchables(): Searchable[] {
    if (!this.isBatch()) {
      return [this];
    }

    const parts = this.data.raw.split('++').map((part) => part.trim());
    return parts.map((part) => Searchable.from(part));
  }

  /**
   * Converts the searchable to a normalized string format suitable for API queries.
   * For simple searchables, this adds the "name:" prefix.
   * For compound searchables, returns the original key:value format.
   * For batch searchables, returns the original ++ separated format.
   *
   * @returns A normalized searchable string.
   */
  toNormalizedString(): string {
    if (this.isSimple()) {
      return `name: ${this.data.parsed.name}`;
    }
    return this.data.raw;
  }

  /**
   * Validates the searchable format.
   * Checks for empty strings and invalid formats.
   *
   * @returns True if valid, false otherwise.
   */
  validate(): boolean {
    if (!this.data.raw || this.data.raw.trim().length === 0) {
      return false;
    }

    if (this.isBatch()) {
      // Ensure all batch parts are valid
      const parts = this.toBatchSearchables();
      return parts.every((s) => s.validate());
    }

    if (this.isCompound()) {
      // Ensure at least one key-value pair was parsed
      return Object.keys(this.data.parsed).length > 0;
    }

    // Simple searchables are valid if they have a name
    return !!this.data.parsed.name;
  }

  /**
   * Returns a string representation of the searchable.
   */
  toString(): string {
    return `Searchable(type=${this.data.type}, raw="${this.data.raw}")`;
  }

  /**
   * Returns a JSON representation of the searchable.
   */
  toJSON(): SearchableData {
    return { ...this.data };
  }
}
