/**
 * @file ChRIS Feed Management
 *
 * This module provides classes for managing ChRIS feeds.
 * It includes the `ChRISFeedGroup` for collection operations and `ChRISFeed` for individual feed operations,
 * particularly creation from directories using the 'pl-dircopy' plugin.
 *
 * @module
 */

import Client from "@fnndsc/chrisapi";
import { PluginInstance } from "@fnndsc/chrisapi";
import { Feed } from "@fnndsc/chrisapi";
import { CommentList } from "@fnndsc/chrisapi";
import { chrisConnection } from "../connect/chrisConnection.js";
import {
  SimpleRecord,
  resourceFields_get,
} from "../resources/chrisResources.js";
import { ChRISResourceGroup } from "../resources/chrisResourceGroup.js";
import { ChRISPlugin } from "../plugins/chrisPlugins.js";
import {
  QueryHits,
  keyPairParams_apply,
  ChRISObjectParams,
} from "../utils/keypair.js";
import { errorStack } from "../error/errorStack.js";
import { Result, Ok, Err } from "../utils/result.js";

/**
 * Group handler for ChRIS feeds.
 */
export class ChRISFeedGroup extends ChRISResourceGroup {
  constructor() {
    super("Feeds", "getFeeds");
  }
}

/**
 * Class for managing individual ChRIS feeds.
 */
export class ChRISFeed {
  private _client: Client | null = null;

  constructor() {
    // Client is fetched lazily
  }

  /**
   * Retrieves the ChRIS client instance asynchronously.
   * @returns A Promise resolving to the Client instance or null.
   */
  async client_get(): Promise<Client | null> {
    if (!this._client) {
      this._client = await chrisConnection.client_get();
    }
    return this._client;
  }

  error_parse(error: unknown, activity?: string): null {
    if (error instanceof Error) {
      errorStack.stack_push("error", `Error ${activity}: ${error.message}`);
    } else {
      errorStack.stack_push("error", `An unknown error occurred while ${activity}`);
    }
    return null;
  }

  async feedDetail_getFromPluginInstance(
    pluginInstance: PluginInstance | null,
    detailSpec: string[]
  ): Promise<SimpleRecord | null> {
    if (!pluginInstance) {
      return null;
    }
    const feed: Feed | null = await pluginInstance.getFeed();
    if (!feed) {
      return null;
    }
    const feedDetail: SimpleRecord | null = resourceFields_get(
      feed,
      detailSpec
    );
    if (!feedDetail) {
      return null;
    }
    feedDetail.pluginInstance = pluginInstance;
    return feedDetail;
  }

  async createFromDirs(
    dirs: string,
    feedParams: ChRISObjectParams
  ): Promise<SimpleRecord | null> {
    const client = await this.client_get();
    if (!client) {
      console.error(
        "Could not access ChRIS. Have you connected with the 'connect' command?"
      );
      return null;
    }
    let pluginInstance: PluginInstance;
    try {
      const chrisPlugin: ChRISPlugin = new ChRISPlugin();
      const pluginList: QueryHits | null = await chrisPlugin.pluginIDs_get(
        "pl-dircopy"
      );
      if (!pluginList) {
        errorStack.stack_push(
          "error",
          "pl-dircopy was not found! No feeds can be created."
        );
        return null;
      }
      const pluginID: number = pluginList.hits[0] as number;
      const createParams: Record<string, string> = keyPairParams_apply(
        { dir: dirs },
        feedParams.params as string
      );
      pluginInstance = await client.createPluginInstance(
        pluginID,
        createParams as ChRISObjectParams & { previous_id: 0 }
      );
    } catch (error: unknown) {
      return this.error_parse(error, "creating feed");
    }
    return await this.feedDetail_getFromPluginInstance(pluginInstance, [
      "id",
      "name",
      "owner_username",
    ]);
  }
}

/**
 * Makes a feed public by feed ID.
 *
 * Retrieves the feed resource and calls its makePublic() method to change
 * the feed's visibility to public.
 *
 * @param feedId - The numeric ID of the feed to make public.
 * @returns A Result containing true on success, or an error.
 *
 * @example
 * ```typescript
 * const result = await feed_makePublic(123);
 * if (result.ok) {
 *   console.log("Feed is now public");
 * }
 * ```
 */
export async function feed_makePublic(feedId: number): Promise<Result<boolean>> {
  const client: Client | null = await chrisConnection.client_get();
  if (!client) {
    errorStack.stack_push("error", "Not connected to ChRIS. Cannot make feed public.");
    return Err();
  }

  try {
    const feed: Feed | null = await client.getFeed(feedId);
    if (!feed) {
      errorStack.stack_push("error", `Feed with ID ${feedId} not found.`);
      return Err();
    }

    await feed.makePublic();
    return Ok(true);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    errorStack.stack_push("error", `Failed to make feed ${feedId} public: ${msg}`);
    return Err();
  }
}

/**
 * Makes a feed private by feed ID.
 *
 * Retrieves the feed resource and calls its makeUnpublic() method to change
 * the feed's visibility to private (unpublish it).
 *
 * @param feedId - The numeric ID of the feed to make private.
 * @returns A Result containing true on success, or an error.
 *
 * @example
 * ```typescript
 * const result = await feed_makePrivate(123);
 * if (result.ok) {
 *   console.log("Feed is now private");
 * }
 * ```
 */
export async function feed_makePrivate(feedId: number): Promise<Result<boolean>> {
  const client: Client | null = await chrisConnection.client_get();
  if (!client) {
    errorStack.stack_push("error", "Not connected to ChRIS. Cannot make feed private.");
    return Err();
  }

  try {
    const feed: Feed | null = await client.getFeed(feedId);
    if (!feed) {
      errorStack.stack_push("error", `Feed with ID ${feedId} not found.`);
      return Err();
    }

    await feed.makeUnpublic();
    return Ok(true);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    errorStack.stack_push("error", `Failed to make feed ${feedId} private: ${msg}`);
    return Err();
  }
}

/**
 * Deletes a feed by feed ID.
 *
 * Retrieves the feed resource and calls its delete() method to permanently
 * remove the feed from ChRIS.
 *
 * @param feedId - The numeric ID of the feed to delete.
 * @returns A Result containing true on success, or an error.
 *
 * @example
 * ```typescript
 * const result = await feed_delete(123);
 * if (result.ok) {
 *   console.log("Feed deleted successfully");
 * }
 * ```
 */
export async function feed_delete(feedId: number): Promise<Result<boolean>> {
  const client: Client | null = await chrisConnection.client_get();
  if (!client) {
    errorStack.stack_push("error", "Not connected to ChRIS. Cannot delete feed.");
    return Err();
  }

  try {
    const feed: Feed | null = await client.getFeed(feedId);
    if (!feed) {
      errorStack.stack_push("error", `Feed with ID ${feedId} not found.`);
      return Err();
    }

    await feed.delete();
    return Ok(true);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    errorStack.stack_push("error", `Failed to delete feed ${feedId}: ${msg}`);
    return Err();
  }
}

/**
 * Retrieves a feed resource by feed ID.
 *
 * Returns the raw Feed object from chrisapi for advanced operations that
 * are not covered by the other cumin feed functions.
 *
 * @param feedId - The numeric ID of the feed to retrieve.
 * @returns A Result containing the Feed resource, or an error.
 *
 * @example
 * ```typescript
 * const result = await feed_get(123);
 * if (result.ok) {
 *   const feed: Feed = result.value;
 *   // Perform advanced operations with the feed
 * }
 * ```
 */
/**
 * Represents a feed's note (singleton per feed).
 */
export interface FeedNote {
  title: string;
  content: string;
}

/**
 * Represents a single feed comment.
 */
export interface FeedComment {
  id: number;
  title: string;
  content: string;
  owner_username: string;
}

/**
 * Fetches the note for a feed.
 *
 * @param feedId - Feed ID.
 * @returns Result containing the note's title and content.
 */
export async function feedNote_get(feedId: number): Promise<Result<FeedNote>> {
  const client: Client | null = await chrisConnection.client_get();
  if (!client) {
    errorStack.stack_push('error', 'Not connected to ChRIS.');
    return Err();
  }
  try {
    const feed: Feed | null = await client.getFeed(feedId);
    if (!feed) {
      errorStack.stack_push('error', `Feed ${feedId} not found.`);
      return Err();
    }
    const note = await feed.getNote();
    const data = note.data as unknown as FeedNote;
    return Ok({ title: data?.title ?? '', content: data?.content ?? '' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    errorStack.stack_push('error', `Failed to get note for feed ${feedId}: ${msg}`);
    return Err();
  }
}

/**
 * Updates the note for a feed.
 *
 * @param feedId - Feed ID.
 * @param data - Partial note data to update (title and/or content).
 * @returns Result containing true on success.
 */
export async function feedNote_update(
  feedId: number,
  data: { title?: string; content?: string }
): Promise<Result<boolean>> {
  const client: Client | null = await chrisConnection.client_get();
  if (!client) {
    errorStack.stack_push('error', 'Not connected to ChRIS.');
    return Err();
  }
  try {
    const feed: Feed | null = await client.getFeed(feedId);
    if (!feed) {
      errorStack.stack_push('error', `Feed ${feedId} not found.`);
      return Err();
    }
    const note = await feed.getNote();
    await note.put(data);
    return Ok(true);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    errorStack.stack_push('error', `Failed to update note for feed ${feedId}: ${msg}`);
    return Err();
  }
}

/**
 * Lists all comments on a feed.
 *
 * @param feedId - Feed ID.
 * @returns Result containing array of comments.
 */
export async function feedComments_list(feedId: number): Promise<Result<FeedComment[]>> {
  const client: Client | null = await chrisConnection.client_get();
  if (!client) {
    errorStack.stack_push('error', 'Not connected to ChRIS.');
    return Err();
  }
  try {
    const feed: Feed | null = await client.getFeed(feedId);
    if (!feed) {
      errorStack.stack_push('error', `Feed ${feedId} not found.`);
      return Err();
    }
    const commentList: CommentList = await feed.getComments({ limit: 1000 });
    const comments: FeedComment[] = (commentList.data as unknown as FeedComment[]) || [];
    return Ok(comments);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    errorStack.stack_push('error', `Failed to list comments for feed ${feedId}: ${msg}`);
    return Err();
  }
}

/**
 * Creates a new comment on a feed.
 *
 * @param feedId - Feed ID.
 * @param data - Comment title and content.
 * @returns Result containing the created comment.
 */
export async function feedComment_create(
  feedId: number,
  data: { title?: string; content?: string }
): Promise<Result<FeedComment>> {
  const client: Client | null = await chrisConnection.client_get();
  if (!client) {
    errorStack.stack_push('error', 'Not connected to ChRIS.');
    return Err();
  }
  try {
    const feed: Feed | null = await client.getFeed(feedId);
    if (!feed) {
      errorStack.stack_push('error', `Feed ${feedId} not found.`);
      return Err();
    }
    const commentList: CommentList = await feed.getComments({ limit: 1 });
    const created = await commentList.post(data);
    const createdData = (created.data as unknown as FeedComment[])?.[0];
    return Ok(createdData ?? { id: 0, title: data.title ?? '', content: data.content ?? '', owner_username: '' });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    errorStack.stack_push('error', `Failed to create comment on feed ${feedId}: ${msg}`);
    return Err();
  }
}

/**
 * Deletes a comment from a feed.
 *
 * @param feedId - Feed ID.
 * @param commentId - Comment ID to delete.
 * @returns Result containing true on success.
 */
export async function feedComment_delete(feedId: number, commentId: number): Promise<Result<boolean>> {
  const client: Client | null = await chrisConnection.client_get();
  if (!client) {
    errorStack.stack_push('error', 'Not connected to ChRIS.');
    return Err();
  }
  try {
    const feed: Feed | null = await client.getFeed(feedId);
    if (!feed) {
      errorStack.stack_push('error', `Feed ${feedId} not found.`);
      return Err();
    }
    const comment = await feed.getComment(commentId);
    if (!comment) {
      errorStack.stack_push('error', `Comment ${commentId} not found on feed ${feedId}.`);
      return Err();
    }
    await comment.delete();
    return Ok(true);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    errorStack.stack_push('error', `Failed to delete comment ${commentId}: ${msg}`);
    return Err();
  }
}

/**
 * Updates a comment on a feed.
 *
 * @param feedId - Feed ID.
 * @param commentId - Comment ID to update.
 * @param data - Partial comment data to update.
 * @returns Result containing true on success.
 */
export async function feedComment_update(
  feedId: number,
  commentId: number,
  data: { title?: string; content?: string }
): Promise<Result<boolean>> {
  const client: Client | null = await chrisConnection.client_get();
  if (!client) {
    errorStack.stack_push('error', 'Not connected to ChRIS.');
    return Err();
  }
  try {
    const feed: Feed | null = await client.getFeed(feedId);
    if (!feed) {
      errorStack.stack_push('error', `Feed ${feedId} not found.`);
      return Err();
    }
    const comment = await feed.getComment(commentId);
    if (!comment) {
      errorStack.stack_push('error', `Comment ${commentId} not found on feed ${feedId}.`);
      return Err();
    }
    await comment.put(data);
    return Ok(true);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    errorStack.stack_push('error', `Failed to update comment ${commentId}: ${msg}`);
    return Err();
  }
}

export async function feed_get(feedId: number): Promise<Result<Feed>> {
  const client: Client | null = await chrisConnection.client_get();
  if (!client) {
    errorStack.stack_push("error", "Not connected to ChRIS. Cannot retrieve feed.");
    return Err();
  }

  try {
    const feed: Feed | null = await client.getFeed(feedId);
    if (!feed) {
      errorStack.stack_push("error", `Feed with ID ${feedId} not found.`);
      return Err();
    }

    return Ok(feed);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    errorStack.stack_push("error", `Failed to retrieve feed ${feedId}: ${msg}`);
    return Err();
  }
}
