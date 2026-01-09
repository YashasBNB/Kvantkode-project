/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
export class CommentNode {
    constructor(uniqueOwner, owner, resource, comment, thread) {
        this.uniqueOwner = uniqueOwner;
        this.owner = owner;
        this.resource = resource;
        this.comment = comment;
        this.thread = thread;
        this.isRoot = false;
        this.replies = [];
        this.threadId = thread.threadId;
        this.range = thread.range;
        this.threadState = thread.state;
        this.threadRelevance = thread.applicability;
        this.contextValue = thread.contextValue;
        this.controllerHandle = thread.controllerHandle;
        this.threadHandle = thread.commentThreadHandle;
    }
    hasReply() {
        return this.replies && this.replies.length !== 0;
    }
    get lastUpdatedAt() {
        if (this._lastUpdatedAt === undefined) {
            let updatedAt = this.comment.timestamp || '';
            if (this.replies.length) {
                const reply = this.replies[this.replies.length - 1];
                const replyUpdatedAt = reply.lastUpdatedAt;
                if (replyUpdatedAt > updatedAt) {
                    updatedAt = replyUpdatedAt;
                }
            }
            this._lastUpdatedAt = updatedAt;
        }
        return this._lastUpdatedAt;
    }
}
export class ResourceWithCommentThreads {
    constructor(uniqueOwner, owner, resource, commentThreads) {
        this.uniqueOwner = uniqueOwner;
        this.owner = owner;
        this.id = resource.toString();
        this.resource = resource;
        this.commentThreads = commentThreads
            .filter((thread) => thread.comments && thread.comments.length)
            .map((thread) => ResourceWithCommentThreads.createCommentNode(uniqueOwner, owner, resource, thread));
    }
    static createCommentNode(uniqueOwner, owner, resource, commentThread) {
        const { comments } = commentThread;
        const commentNodes = comments.map((comment) => new CommentNode(uniqueOwner, owner, resource, comment, commentThread));
        if (commentNodes.length > 1) {
            commentNodes[0].replies = commentNodes.slice(1, commentNodes.length);
        }
        commentNodes[0].isRoot = true;
        return commentNodes[0];
    }
    get lastUpdatedAt() {
        if (this._lastUpdatedAt === undefined) {
            let updatedAt = '';
            // Return result without cahcing as we expect data to arrive later
            if (!this.commentThreads.length) {
                return updatedAt;
            }
            for (const thread of this.commentThreads) {
                const threadUpdatedAt = thread.lastUpdatedAt;
                if (threadUpdatedAt && threadUpdatedAt > updatedAt) {
                    updatedAt = threadUpdatedAt;
                }
            }
            this._lastUpdatedAt = updatedAt;
        }
        return this._lastUpdatedAt;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudE1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb21tZW50cy9jb21tb24vY29tbWVudE1vZGVsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBa0JoRyxNQUFNLE9BQU8sV0FBVztJQVd2QixZQUNpQixXQUFtQixFQUNuQixLQUFhLEVBQ2IsUUFBYSxFQUNiLE9BQWdCLEVBQ2hCLE1BQXFCO1FBSnJCLGdCQUFXLEdBQVgsV0FBVyxDQUFRO1FBQ25CLFVBQUssR0FBTCxLQUFLLENBQVE7UUFDYixhQUFRLEdBQVIsUUFBUSxDQUFLO1FBQ2IsWUFBTyxHQUFQLE9BQU8sQ0FBUztRQUNoQixXQUFNLEdBQU4sTUFBTSxDQUFlO1FBZnRDLFdBQU0sR0FBWSxLQUFLLENBQUE7UUFDdkIsWUFBTyxHQUFrQixFQUFFLENBQUE7UUFnQjFCLElBQUksQ0FBQyxRQUFRLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQTtRQUMvQixJQUFJLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUE7UUFDekIsSUFBSSxDQUFDLFdBQVcsR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFBO1FBQy9CLElBQUksQ0FBQyxlQUFlLEdBQUcsTUFBTSxDQUFDLGFBQWEsQ0FBQTtRQUMzQyxJQUFJLENBQUMsWUFBWSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUE7UUFDdkMsSUFBSSxDQUFDLGdCQUFnQixHQUFHLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQTtRQUMvQyxJQUFJLENBQUMsWUFBWSxHQUFHLE1BQU0sQ0FBQyxtQkFBbUIsQ0FBQTtJQUMvQyxDQUFDO0lBRUQsUUFBUTtRQUNQLE9BQU8sSUFBSSxDQUFDLE9BQU8sSUFBSSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sS0FB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