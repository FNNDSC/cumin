declare module '@fnndsc/chrisapi' {
  const Client: any;
  export default Client;

  // Explicitly declare the Feed class with any type
  export class Feed {
    tagFeed(tag_id: number, timeout?: number): Promise<any>;
    // Add other methods if needed, all returning 'any'
  }

  // Declare any other exports from the module as 'any'
  export const Tagging: any;
  // Add any other exports you're using from the module
}
