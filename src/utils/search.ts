export function parseSearchString(searchString: string): Record<string, string> {
    const searchParams: Record<string, string> = {};
    const pairs = searchString.match(/(\w+):\s*([^,]+)(?:,|$)/g) || [];
    pairs.forEach(pair => {
      const [key, value] = pair.split(':').map(s => s.trim());
      searchParams[key] = value;
    });
    return searchParams;
  }
  
export function applySearchParams<T extends Record<string, any>>(params: T, searchString?: string): T {
  if (searchString) {
    const searchParams = parseSearchString(searchString);
    return { ...params, ...searchParams };
  }
  return params;
}
