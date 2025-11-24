import { ListOptions } from "../resources/chrisResources";

/**
 * Base parameters for ChRIS object operations.
 */
export interface ChRISObjectParams {
  limit?: number;
  offset?: number;
  page?: string;
  returnFilter?: string;
  [key: string]: unknown;
}

/**
 * Parameters for getting ChRIS elements, including search query.
 */
export interface ChRISElementsGet extends ChRISObjectParams {
  search?: string;
  params?: string;
}

/**
 * Represents hits from a query.
 */
export interface QueryHits {
  hits: Array<unknown>;
}

/**
 * Represents parsed CLI arguments.
 */
export interface ClIarguments {
  [key: string]: string | boolean | number;
}

/**
 * Parse a CLI string into a dictionary of arguments.
 *
 * @param cliString - The CLI argument string.
 * @returns A dictionary of parsed arguments.
 */
export function dictionary_fromCLI(cliString: string): ClIarguments {
  const result: ClIarguments = {};
  // Split the string by spaces, but keep quoted sections together
  const args = cliString.match(/('.*?'|".*?"|\S+)/g) || [];
  let key = "";

  for (let i = 0; i < args.length; i++) {
    let arg = args[i].replace(/^['"]|['"]$/g, ""); // Remove surrounding quotes

    if (arg.startsWith("-")) {
      // This is a key
      key = arg.replace(/^-+/, "");
      result[key] = true; // Default to true, will be overwritten if there's a value
    } else if (key) {
      // This is a value
      const numValue = Number(arg);
      result[key] = isNaN(numValue) ? arg : numValue;
      key = "";
    }
  }

  return result;
}

/**
 * Parse a key-pair string (e.g., "key:value,key2:value2") into an object.
 *
 * @param searchString - The string containing key-value pairs.
 * @returns A record of parsed key-value pairs.
 */
export function keyPairString_parse(
  searchString: string
): Record<string, string> {
  const searchParams: Record<string, string> = {};
  const pairs = searchString.split(",").map((pair) => pair.trim());
  pairs.forEach((pair) => {
    const [key, ...valueParts] = pair.split(":").map((s) => s.trim());
    const value = valueParts.join(":").trim(); // Rejoin in case the value contains colons
    if (key && value) {
      searchParams[key] = value;
    }
  });
  return searchParams;
}

/**
 * Apply key-pair parameters from a search string to an existing params object.
 *
 * @param params - The base parameters object.
 * @param searchString - Optional search string to parse and merge.
 * @returns The merged parameters object.
 */
export function keyPairParams_apply<T extends Record<string, any>>(
  params: T,
  searchString?: string
): T {
  if (searchString) {
    const searchParams = keyPairString_parse(searchString);
    return { ...params, ...searchParams };
  }
  return params;
}

function options_reduce(options: ChRISElementsGet): ListOptions {
  if (options.returnFilter && typeof options.returnFilter === "string") {
    try {
      const fieldsToReturn = options.returnFilter
        .split(",")
        .map((field) => field.trim());
      const filteredObj: Partial<ChRISObjectParams> = {};
      for (const field of fieldsToReturn) {
        if (field in options && field !== "returnFilter") {
          filteredObj[field] = options[field];
        }
      }
      return filteredObj;
    } catch (error) {
      console.error("Error parsing returnFilter field");
    }
  }
  return options;
}

/**
 * Convert options object to ChRIS list parameters.
 * Handles pagination, offset, and key-pair filtering.
 *
 * @param options - The raw options object.
 * @param keyPairField - The field name containing the key-pair string.
 * @returns Formatted ListOptions.
 */
export function params_fromOptions(
  options: ChRISElementsGet,
  keyPairField: keyof ChRISElementsGet = "search"
): ListOptions {
  const keyPairValue = options[keyPairField];

  options.limit = options.page ? parseInt(options.page, 10) : 20;
  options.offset = options.offset ? options.offset : 0;

  if (typeof keyPairValue === "string") {
    options = keyPairParams_apply(options as Record<string, unknown>, keyPairValue) as ChRISElementsGet;
  }

  if (options.returnFilter && typeof options.returnFilter === "string") {
    options = options_reduce(options) as ChRISElementsGet;
  }

  return options;
}

/**
 * Extract a specific field from a list of records into a QueryHits object.
 *
 * @param arrayList - The list of records.
 * @param record - The field name to extract from each record.
 * @returns A QueryHits object containing the extracted values.
 */
export function record_extract(
  arrayList: Array<Record<string, unknown>>,
  record: string
): QueryHits {
  const queryHits: QueryHits = {
    hits: arrayList.map((item) => item[record]),
  };
  return queryHits;
}
