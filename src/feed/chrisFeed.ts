// feed.ts

// import { Command } from "commander";
import { chrisConnection } from "chrisConnection.js";
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
  constructor() {}

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

  async listFeeds(options: ListFeedsOptions): Promise<void> {
    const client = chrisConnection.getClient();
    if (!client) {
      console.log(
        "Not connected to ChRIS. Please connect first using the connect command.",
      );
      return;
    }

    try {
      let params = {
        limit: options.page ? parseInt(options.page, 10) : 20,
        offset: 0,
      };
      const feeds = await client.getFeeds(params);

      if (feeds && feeds.collection && feeds.collection.items) {
        const fields = options.fields
          ? options.fields.split(",").map((f) => f.trim())
          : undefined;
        this.printFeedsTable(feeds.collection.items, fields);
      } else {
        console.log("No feeds found or unexpected data structure.");
      }
    } catch (error) {
      console.error("Error listing feeds:", error);
    }
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

// export function setupFeedCommand(program: Command): void {
//   const feedCommand = program
//     .command("feed")
//     .description("Interact with ChRIS feeds");
//
//   feedCommand
//     .command("list")
//     .description("List feeds")
//     .option("-p, --page <size>", "Page size (default 20)")
//     .option(
//       "-f, --fields <fields>",
//       "Comma-separated list of fields to display",
//     )
//     .action(async (options) => {
//       await listFeeds(options);
//     });
//
//   feedCommand
//     .command("new")
//     .description("Create a new feed")
//     .option("-n, --name <FeedName>", "the name for the feed")
//     .option("-p, --path <ChRISpath>", "a path inside the ChRIS FS")
//     .action(async (options) => {
//       await createFeed(options);
//     });
// }
