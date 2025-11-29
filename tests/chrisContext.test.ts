import { chrisContextURL_parse, SingleContext } from '../src/context/chrisContext';

// Mock the ChRIS Plugin to avoid API calls
jest.mock('../src/plugins/chrisPlugins', () => ({
  ChRISPlugin: jest.fn().mockImplementation(() => ({
    pluginIDs_getFromSearchable: jest.fn().mockResolvedValue({
      hits: [123]
    })
  }))
}));

describe('chrisContextURL_parse()', () => {
  it('should parse simple URL', async () => {
    const result = await chrisContextURL_parse('http://localhost:8000');

    expect(result.URL).toBe('http://localhost:8000');
    expect(result.user).toBeNull();
    expect(result.folder).toBeNull();
    expect(result.feed).toBeNull();
    expect(result.plugin).toBeNull();
  });

  it('should parse URL with user', async () => {
    const result = await chrisContextURL_parse('chris@http://localhost:8000');

    expect(result.user).toBe('chris');
    expect(result.URL).toBe('http://localhost:8000');
  });

  it('should parse HTTPS URL', async () => {
    const result = await chrisContextURL_parse('https://chrisstore.co');

    expect(result.URL).toBe('https://chrisstore.co');
  });

  it('should parse URL with folder query parameter', async () => {
    const result = await chrisContextURL_parse('http://localhost:8000?folder=/home/chris');

    expect(result.URL).toBe('http://localhost:8000');
    expect(result.folder).toBe('/home/chris');
  });

  it('should parse URL with feed query parameter', async () => {
    const result = await chrisContextURL_parse('http://localhost:8000?feed=123');

    expect(result.URL).toBe('http://localhost:8000');
    expect(result.feed).toBe('123');
  });

  it('should parse URL with plugin query parameter', async () => {
    const result = await chrisContextURL_parse('http://localhost:8000?plugin=456');

    expect(result.URL).toBe('http://localhost:8000');
    expect(result.plugin).toBe('456');
  });

  it('should parse URL with multiple query parameters', async () => {
    const result = await chrisContextURL_parse(
      'http://localhost:8000?folder=/data&feed=789&plugin=456'
    );

    expect(result.URL).toBe('http://localhost:8000');
    expect(result.folder).toBe('/data');
    expect(result.feed).toBe('789');
    expect(result.plugin).toBe('456');
  });

  it('should parse URL with user and query parameters', async () => {
    const result = await chrisContextURL_parse(
      'chris@http://localhost:8000?folder=/home/chris&feed=123'
    );

    expect(result.user).toBe('chris');
    expect(result.URL).toBe('http://localhost:8000');
    expect(result.folder).toBe('/home/chris');
    expect(result.feed).toBe('123');
  });

  it('should handle URL without protocol', async () => {
    const result = await chrisContextURL_parse('localhost:8000');

    // Without http:// or https://, the URL match will fail
    expect(result.URL).toBeNull();
  });

  it('should handle empty URL', async () => {
    const result = await chrisContextURL_parse('');

    expect(result.URL).toBeNull();
    expect(result.user).toBeNull();
    expect(result.folder).toBeNull();
  });

  it('should parse user with special characters', async () => {
    const result = await chrisContextURL_parse('user.name@http://localhost:8000');

    expect(result.user).toBe('user.name');
  });

  it('should handle plugin with colon (searchable format)', async () => {
    const result = await chrisContextURL_parse('http://localhost:8000?plugin=name:dircopy');

    // The searchable_toID function should be called and return 123
    expect(result.plugin).toBe('123');
  });

  it('should handle plugin_id parameter', async () => {
    const result = await chrisContextURL_parse('http://localhost:8000?plugin_id=789');

    expect(result.plugin).toBe('789');
  });

  it('should handle folder with encoded characters', async () => {
    const result = await chrisContextURL_parse('http://localhost:8000?folder=%2Fhome%2Fchris');

    expect(result.folder).toBe('/home/chris');
  });

  it('should preserve URL port number', async () => {
    const result = await chrisContextURL_parse('http://localhost:8000');

    expect(result.URL).toBe('http://localhost:8000');
  });

  it('should handle URL with path', async () => {
    const result = await chrisContextURL_parse('http://localhost:8000/api/v1?folder=/data');

    expect(result.URL).toBe('http://localhost:8000/api/v1');
    expect(result.folder).toBe('/data');
  });
});
