export interface IStorageProvider {
    read(path: string): Promise<string | null>;
    write(path: string, data: string): Promise<void>;
    remove(path: string): Promise<void>;
    mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
    exists(path: string): Promise<boolean>;
    readdir(path: string): Promise<string[]>;
    isDirectory(path: string): Promise<boolean>;
}