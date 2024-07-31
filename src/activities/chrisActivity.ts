import Client from "@fnndsc/chrisapi";
import { chrisConnection } from "../connect/chrisConnection.js";


export class Activity {
  private _client: Client | null = null;

  public constructor() {
    this._client = chrisConnection.getClient();
    if(!this._client) {
      console.error("Could not access ChRIS. Have you connected with the 'connect' command?");
      process.exit(1);
    }
    
  }

  public get client(): Client | null{
    return this._client;
  }


}


