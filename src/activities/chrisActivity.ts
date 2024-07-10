import { Feed, FeedList } from "@fnndsc/chrisapi";
import { chrisConnection } from "../connect/chrisConnection.js";

interface FeedItem {
  data: Array<{ name: string; value: any }>;
  href: string;
  links: Array<any>;
}

export class ChRISWorkflow {
  private feeds: FeedItem[];

  constructor() {
    this.feeds = [];
  }
}

export const chrisWorkflow = new ChRISWorkflow();
