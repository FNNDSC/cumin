declare module "@fnndsc/chrisapi" {
  class Client {
    constructor(url: string, options?: { token: string });

    static getAuthToken(
      authUrl: string,
      username: string,
      password: string,
      timeout?: number,
    ): Promise<string>;
  }

  export default Client;

  export class Feed {
    tagFeed(tag_id: number, timeout?: number): Promise<any>;
  }

  export const Tagging: any;
}
