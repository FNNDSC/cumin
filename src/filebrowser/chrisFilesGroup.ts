import { ChRISFileSystemGroup } from "./chrisFileSystemGroup";
import { FileBrowserFolder } from "@fnndsc/chrisapi";

export class ChRISFilesGroup extends ChRISFileSystemGroup {
  constructor(fileBrowserFolder: FileBrowserFolder, path: string) {
    super("Files", "getFiles", fileBrowserFolder, path);
  }

  static async create(path: string): Promise<ChRISFilesGroup> {
    const fileBrowserFolder =
      await ChRISFileSystemGroup.initializeFileBrowserFolder(path);
    return new ChRISFilesGroup(fileBrowserFolder, path);
  }
}

export class ChRISLinksGroup extends ChRISFileSystemGroup {
  constructor(fileBrowserFolder: FileBrowserFolder, path: string) {
    super("Links", "getLinkFiles", fileBrowserFolder, path);
  }

  static async create(path: string): Promise<ChRISLinksGroup> {
    const fileBrowserFolder =
      await ChRISFileSystemGroup.initializeFileBrowserFolder(path);
    return new ChRISLinksGroup(fileBrowserFolder, path);
  }
}

export class ChRISDirsGroup extends ChRISFileSystemGroup {
  constructor(fileBrowserFolder: FileBrowserFolder, path: string) {
    super("Directories", "getChildren", fileBrowserFolder, path);
  }

  static async create(path: string): Promise<ChRISDirsGroup> {
    const fileBrowserFolder =
      await ChRISFileSystemGroup.initializeFileBrowserFolder(path);
    return new ChRISDirsGroup(fileBrowserFolder, path);
  }
}
