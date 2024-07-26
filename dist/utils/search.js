"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSearchString = parseSearchString;
exports.applySearchParams = applySearchParams;
function parseSearchString(searchString) {
    const searchParams = {};
    const pairs = searchString.match(/(\w+):\s*([^,]+)(?:,|$)/g) || [];
    pairs.forEach(pair => {
        const [key, value] = pair.split(':').map(s => s.trim());
        searchParams[key] = value;
    });
    return searchParams;
}
function applySearchParams(params, searchString) {
    if (searchString) {
        const searchParams = parseSearchString(searchString);
        return { ...params, ...searchParams };
    }
    return params;
}
//# sourceMappingURL=search.js.map