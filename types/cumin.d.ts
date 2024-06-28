declare module "@fnndsc/cumin" {
  export interface ConnectOptions {
    user: string;
    password: string;
    url: string;
  }

  class ChRISConnection {
    connect(options: ConnectOptions): Promise<string | null>;
    getAuthToken(): string | null;
    getChRISurl(): string | null;
    getClient(): any | null; // Replace 'any' with the correct type for Client if available
    isConnected(): boolean;
    logout(): void;
  }

  export interface ListFeedsOptions {
    page?: string;
    fields?: string;
    [key: string]: any;
  }

  export interface CreateFeedOptions {
    name?: string;
    path?: string;
    [key: string]: any;
  }

  export interface FeedItem {
    data: Array<{ name: string; value: any }>;
    href: string;
    links: Array<any>;
  }

  class ChRISFeed {
    private feeds: FeedItem[];
    constructor();
    printFeedsTable(feeds: FeedItem[], fields?: string[]): void;
    printFeedTable(feed: FeedItem, index: number): void;
    feeds_get(options: ListFeedsOptions): Promise<any | null>;
    createFeed(options: CreateFeedOptions): Promise<void>;
    addDataToFeed(data: string): Promise<void>;
  }

  export const chrisConnection: ChRISConnection;
  export const chrisFeed: ChRISFeed;
}
