import { ChRISEmbeddedResourceGroup } from "./chrisEmbeddedResourceGroup";
import { FileBrowserFolder, Plugin, Feed } from "@fnndsc/chrisapi";

type ChRISResourceType = FileBrowserFolder | Plugin | Feed;

interface ObjContextConfig {
  name: string;
  getMethod: string;
  contextType: "folder" | "plugin" | "feed";
}

class ObjContextCreationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ObjContextCreationError";
  }
}

class ChRISObjContextFactory {
  private config: ObjContextConfig;
  private cache: Map<string, ChRISEmbeddedResourceGroup<ChRISResourceType>> =
    new Map();

  constructor(config: ObjContextConfig) {
    this.config = config;
  }

  async create(
    context: string
  ): Promise<ChRISEmbeddedResourceGroup<ChRISResourceType>> {
    const cacheKey: string = `${this.config.name}:${context}`;

    if (this.cache.has(cacheKey)) {
      console.log(`Returning cached object context for ${cacheKey}`);
      return this.cache.get(cacheKey)!;
    }

    try {
      //   console.log(`Creating new object context for ${cacheKey}`);

      const objContext: ChRISEmbeddedResourceGroup<ChRISResourceType> =
        await ChRISEmbeddedResourceGroup.create<ChRISResourceType>(
          this.config.name,
          this.config.getMethod,
          context
        );

      this.cache.set(cacheKey, objContext);
      return objContext;
    } catch (error: unknown) {
      const errorMessage: string =
        error instanceof Error ? error.message : String(error);
      console.error(`Failed to create ${this.config.name}: ${errorMessage}`);
      throw new ObjContextCreationError(
        `Failed to create ${this.config.name}: ${errorMessage}`
      );
    }
  }
}

const ObjContexts: { [key: string]: ObjContextConfig } = {
  PluginComputeResources: {
    name: "Compute Resources",
    getMethod: "getPluginComputeResources",
    contextType: "plugin",
  },
  PluginInstances: {
    name: "Plugin Instances",
    getMethod: "getPluginInstances",
    contextType: "plugin",
  },
  PluginParameters: {
    name: "Plugin Parameters",
    getMethod: "getPluginParameters",
    contextType: "plugin",
  },
  ChRISFilesContext: {
    name: "Files",
    getMethod: "getFiles",
    contextType: "folder",
  },
  ChRISLinksContext: {
    name: "Links",
    getMethod: "getLinkFiles",
    contextType: "folder",
  },
  ChRISDirsContext: {
    name: "Directories",
    getMethod: "getChildren",
    contextType: "folder",
  },
};

const objContextFactories: { [key: string]: ChRISObjContextFactory } = {};

for (const [key, config] of Object.entries(ObjContexts)) {
  objContextFactories[key] = new ChRISObjContextFactory(config);
}

export async function createObjContext(
  type: string,
  context: string
): Promise<ChRISEmbeddedResourceGroup<ChRISResourceType>> {
  const factory: ChRISObjContextFactory | undefined = objContextFactories[type];
  if (!factory) {
    console.error(`Unknown object context type: ${type}`);
    throw new ObjContextCreationError(`Unknown object context type: ${type}`);
  }
  return factory.create(context);
}

// Usage examples:
// const pluginComputeResources: ChRISEmbeddedResourceGroup<Plugin> = await createObjContext('PluginComputeResources', 'plugin:123') as ChRISEmbeddedResourceGroup<Plugin>;
// const filesContext: ChRISEmbeddedResourceGroup<FileBrowserFolder> = await createObjContext('ChRISFilesContext', 'folder:/path/to/folder') as ChRISEmbeddedResourceGroup<FileBrowserFolder>;
