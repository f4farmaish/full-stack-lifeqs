// Utility for managing anonymous user numbering in posts
export class AnonymousNumberManager {
  private static postMappings: Record<string, Record<string, number>> = {};
  private static postCounters: Record<string, number> = {};

  /**
   * Get the anonymous number for a user in a specific post
   * @param postId - The ID of the post
   * @param userId - The ID of the user (hidden but used for consistent numbering)
   * @returns The anonymous number for this user in this post
   */
  static getAnonymousNumber(postId: string, userId: string): number {
    // Initialize post mappings if they don't exist
    if (!this.postMappings[postId]) {
      this.postMappings[postId] = {};
      this.postCounters[postId] = 0;
    }

    // If this user already has a number for this post, return it
    if (this.postMappings[postId][userId]) {
      return this.postMappings[postId][userId];
    }

    // Assign a new number to this user for this post
    this.postCounters[postId] += 1;
    this.postMappings[postId][userId] = this.postCounters[postId];

    return this.postCounters[postId];
  }

  /**
   * Get the display name for an anonymous user
   * @param postId - The ID of the post
   * @param userId - The ID of the user
   * @returns The formatted anonymous display name (e.g., "Anonymous1", "Anonymous2")
   */
  static getAnonymousDisplayName(postId: string, userId: string): string {
    const number = this.getAnonymousNumber(postId, userId);
    return `Anonymous${number}`;
  }

  /**
   * Clear mappings for a specific post (useful for memory management)
   * @param postId - The ID of the post to clear
   */
  static clearPostMappings(postId: string): void {
    delete this.postMappings[postId];
    delete this.postCounters[postId];
  }

  /**
   * Initialize mappings for a post based on existing comments
   * This ensures consistent numbering when comments are loaded
   * @param postId - The ID of the post
   * @param comments - Array of comments to process
   */
  static initializeFromComments(postId: string, comments: any[]): void {
    // Clear existing mappings for this post
    this.clearPostMappings(postId);

    // Sort comments by creation date to ensure consistent numbering
    const sortedComments = comments
      .filter(comment => comment.isAnonymous)
      .sort((a, b) => new Date(a.$createdAt).getTime() - new Date(b.$createdAt).getTime());

    // Process each anonymous comment to build the mapping
    sortedComments.forEach(comment => {
      this.getAnonymousNumber(postId, comment.userIdString);
    });
  }
}