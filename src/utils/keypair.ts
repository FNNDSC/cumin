import { ListOptions } from "../resources/chrisResources";

export interface ChRISObjectDesc {
  limit?: number;
  offset?: number;
  page?: string;
  returnFilter?: string;
  [key: string]: any;
}

export interface ChRISElementsGet extends ChRISObjectDesc {
  search?: string;
  params?: string;
}

export interface QueryHits {
  hits: Array<any>;
}

export function parseKeyPairString(
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

export function applyKeyPairParams<T extends Record<string, any>>(
  params: T,
  searchString?: string
): T {
  if (searchString) {
    const searchParams = parseKeyPairString(searchString);
    return { ...params, ...searchParams };
  }
  return params;
}

function optionsReduce(options: ChRISElementsGet): ListOptions {
  if (options.returnFilter && typeof options.returnFilter === "string") {
    try {
      const fieldsToReturn = options.returnFilter
        .split(",")
        .map((field) => field.trim());
      const filteredObj: Partial<ChRISObjectDesc> = {};
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

export function optionsToParams(
  options: ChRISElementsGet,
  keyPairField: keyof ChRISElementsGet = "search"
): ListOptions {
  const keyPairValue = options[keyPairField];

  options.limit = options.page ? parseInt(options.page, 10) : 20;
  options.offset = options.offset ? options.offset : 0;

  if (typeof keyPairValue === "string") {
    options = applyKeyPairParams(options, keyPairValue);
  }

  if (options.returnFilter && typeof options.returnFilter === "string") {
    options = optionsReduce(options);
  }

  return options;
}

export function extractRecordToQueryHits(
  arrayList: Array<any>,
  record: string
): QueryHits {
  const queryHits: QueryHits = {
    hits: arrayList.map((item) => item[record]),
  };
  return queryHits;
}
