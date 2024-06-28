// feed.ts

// import { Command } from "commander";
import { Feed, FeedList } from "@fnndsc/chrisapi";
import { chrisConnection } from "../connect/chrisConnection.js";
// import Client from "@fnndsc/chrisapi";

interface ListFeedsOptions {
  page?: string;
  fields?: string;
  [key: string]: any;
}

interface CreateFeedOptions {
  name?: string;
  path?: string;
  [key: string]: any;
}

interface FeedItem {
  data: Array<{ name: string; value: any }>;
  href: string;
  links: Array<any>;
}

export class ChRISFeed {
  private feeds: FeedItem[];

  constructor() {
    this.feeds = [];
  }

  printFeedsTable(feeds: FeedItem[], fields?: string[]): void {
    if (feeds.length === 0) {
      console.log("No feeds found.");
      return;
    }

    const allFields = ["id", ...feeds[0].data.map((item) => item.name)];
    const selectedFields = fields && fields.length > 0 ? fields : allFields;

    const tableData = feeds.map((feed) => {
      const rowData: Record<string, any> = {
        id: feed.href.split("/").slice(-2)[0],
      };
      feed.data.forEach((item) => {
        if (selectedFields.includes(item.name)) {
          rowData[item.name] = item.value;
        }
      });
      return rowData;
    });

    console.table(tableData, selectedFields);
  }

  printFeedTable(feed: FeedItem, index: number): void {
    console.log(`Feed ${index + 1}:`);
    if (feed.data && Array.isArray(feed.data)) {
      const tableData = feed.data.reduce(
        (acc, dataItem) => {
          if (dataItem.name && dataItem.value !== undefined) {
            acc[dataItem.name] = dataItem.value;
          }
          return acc;
        },
        {} as Record<string, any>,
      );
      console.table(tableData);
    } else {
      console.log("No data available for this feed.");
    }
    console.log("\n"); // Add a newline for better separation between feeds
  }

  async feeds_get(options: ListFeedsOptions): Promise<FeedList | null> {
    const client = chrisConnection.getClient();
    if (!client) {
      console.log(
        "Not connected to ChRIS. Please connect first using the connect command.",
      );
      return null;
    }

    try {
      let params = {
        limit: options.page ? parseInt(options.page, 10) : 20,
        offset: 0,
      };
      const feeds = await client.getFeeds(params);
      const fields = options.fields
        ? options.fields.split(",").map((f) => f.trim())
        : undefined;
      if (feeds && feeds.collection && feeds.collection.items) {
      } else {
        console.log("No feeds found or unexpected data structure");
      }
    } catch (error) {
      console.error("Error accessing feeds in ChRIS: ", error);
    }
    return null;
  }

  async createFeed(options: CreateFeedOptions): Promise<void> {
    const authToken = chrisConnection.getAuthToken();
    if (!authToken) {
      console.log(
        "Not connected to ChRIS. Please connect first using the connect command.",
      );
      return;
    }
  }

  async addDataToFeed(data: string): Promise<void> {
    const authToken = chrisConnection.getAuthToken();
    if (!authToken) {
      console.log(
        "Not connected to ChRIS. Please connect first using the connect command.",
      );
      return;
    }

    // try {
    //   const client = new Client(authToken);
    //   const updatedFeed = await client.addDataToLatestFeed(data);
    //   console.log("Data added to feed:", updatedFeed);
    // } catch (error) {
    //   console.error("Error adding data to feed:", error);
    // }
  }
}

export const chrisFeed = new ChRISFeed();
