import { sessionConfig } from "../config/config";

enum Context {
  ChRISURL,
  ChRISuser,
  ChRISfilepath,
  ChRISfeed,
}

export class chrisContext {
  private URLlist: string[] | null = null;
  private URL: string[] | null = null;
  private userlist: string[] | null = null;
  private user: string = "";
  private filepath: string = "";
  private feed: string = "";

  constructor() {}

  ChRISURL_get(): string | null {
    return sessionConfig.connection.loadChrisURL();
  }

  ChRISuser_get(): string | null {
    return sessionConfig.connection.loadLastUser();
  }

  getCurrent(context: Context): string | null {
    let current: string | null = null;
    switch (context) {
      case Context.ChRISURL:
        current = this.ChRISURL_get();
        break;
    }
    return current;
  }
}
