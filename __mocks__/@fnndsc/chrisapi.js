// cumin/__mocks__/@fnndsc/chrisapi.js

const chrisapi = jest.createMockFromModule('@fnndsc/chrisapi');

const getAuthToken = jest.fn(async (url, username, password) => {
  if (password === 'fail') {
    throw new Error('Authentication failed');
  }
  return 'test-token';
});

class MockClient {
  constructor(url, options) {
    // you can add constructor logic if needed
  }
  static getAuthToken = getAuthToken;
  
  // Mock other methods as needed
  async getFileBrowserFolderByPath(path) {
    return {
        path: path,
        // ... other properties of FileBrowserFolder
    };
  }
}

chrisapi.default = MockClient;
chrisapi.Client = MockClient;

module.exports = chrisapi;
