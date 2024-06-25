declare module "@fnndsc/cumin" {
  interface ConnectOptions {
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

  export const chrisConnection: ChRISConnection;
}
