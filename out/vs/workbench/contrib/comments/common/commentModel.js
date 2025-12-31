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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudE1vZGVsLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29tbWVudHMvY29tbW9uL2NvbW1lbnRNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQWtCaEcsTUFBTSxPQUFPLFdBQVc7SUFXdkIsWUFDaUIsV0FBbUIsRUFDbkIsS0FBYSxFQUNiLFFBQWEsRUFDYixPQUFnQixFQUNoQixNQUFxQjtRQUpyQixnQkFBVyxHQUFYLFdBQVcsQ0FBUTtRQUNuQixVQUFLLEdBQUwsS0FBSyxDQUFRO1FBQ2IsYUFBUSxHQUFSLFFBQVEsQ0FBSztRQUNiLFlBQU8sR0FBUCxPQUFPLENBQVM7UUFDaEIsV0FBTSxHQUFOLE1BQU0sQ0FBZTtRQWZ0QyxXQUFNLEdBQVksS0FBSyxDQUFBO1FBQ3ZCLFlBQU8sR0FBa0IsRUFBRSxDQUFBO1FBZ0IxQixJQUFJLENBQUMsUUFBUSxHQUFHLE1BQU0sQ0FBQyxRQUFRLENBQUE7UUFDL0IsSUFBSSxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFBO1FBQ3pCLElBQUksQ0FBQyxXQUFXLEdBQUcsTUFBTSxDQUFDLEtBQUssQ0FBQTtRQUMvQixJQUFJLENBQUMsZUFBZSxHQUFHLE1BQU0sQ0FBQyxhQUFhLENBQUE7UUFDM0MsSUFBSSxDQUFDLFlBQVksR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFBO1FBQ3ZDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxNQUFNLENBQUMsZ0JBQWdCLENBQUE7UUFDL0MsSUFBSSxDQUFDLFlBQVksR0FBRyxNQUFNLENBQUMsbUJBQW1CLENBQUE7SUFDL0MsQ0FBQztJQUVELFFBQVE7UUFDUCxPQUFPLElBQUksQ0FBQyxPQUFPLElBQUksSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEtBQUssQ0FBQyxDQUFBO0lBQ2pELENBQUM7SUFJRCxJQUFJLGFBQWE7UUFDaEIsSUFBSSxJQUFJLENBQUMsY0FBYyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3ZDLElBQUksU0FBUyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxJQUFJLEVBQUUsQ0FBQTtZQUM1QyxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ3pCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUE7Z0JBQ25ELE1BQU0sY0FBYyxHQUFHLEtBQUssQ0FBQyxhQUFhLENBQUE7Z0JBQzFDLElBQUksY0FBYyxHQUFHLFNBQVMsRUFBRSxDQUFDO29CQUNoQyxTQUFTLEdBQUcsY0FBYyxDQUFBO2dCQUMzQixDQUFDO1lBQ0YsQ0FBQztZQUNELElBQUksQ0FBQyxjQUFjLEdBQUcsU0FBUyxDQUFBO1FBQ2hDLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUE7SUFDM0IsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLDBCQUEwQjtJQVF0QyxZQUFZLFdBQW1CLEVBQUUsS0FBYSxFQUFFLFFBQWEsRUFBRSxjQUErQjtRQUM3RixJQUFJLENBQUMsV0FBVyxHQUFHLFdBQVcsQ0FBQTtRQUM5QixJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQTtRQUNsQixJQUFJLENBQUMsRUFBRSxHQUFHLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUM3QixJQUFJLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQTtRQUN4QixJQUFJLENBQUMsY0FBYyxHQUFHLGNBQWM7YUFDbEMsTUFBTSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsUUFBUSxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDO2FBQzdELEdBQUcsQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQ2YsMEJBQTBCLENBQUMsaUJBQWlCLENBQUMsV0FBVyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQ2xGLENBQUE7SUFDSCxDQUFDO0lBRU0sTUFBTSxDQUFDLGlCQUFpQixDQUM5QixXQUFtQixFQUNuQixLQUFhLEVBQ2IsUUFBYSxFQUNiLGFBQTRCO1FBRTVCLE1BQU0sRUFBRSxRQUFRLEVBQUUsR0FBRyxhQUFhLENBQUE7UUFDbEMsTUFBTSxZQUFZLEdBQWtCLFFBQVMsQ0FBQyxHQUFHLENBQ2hELENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxJQUFJLFdBQVcsQ0FBQyxXQUFXLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsYUFBYSxDQUFDLENBQ2xGLENBQUE7UUFDRCxJQUFJLFlBQVksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDN0IsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sR0FBRyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDckUsQ0FBQztRQUVELFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsSUFBSSxDQUFBO1FBRTdCLE9BQU8sWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3ZCLENBQUM7SUFJRCxJQUFJLGFBQWE7UUFDaEIsSUFBSSxJQUFJLENBQUMsY0FBYyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ3ZDLElBQUksU0FBUyxHQUFHLEVBQUUsQ0FBQTtZQUNsQixrRUFBa0U7WUFDbEUsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUM7Z0JBQ2pDLE9BQU8sU0FBUyxDQUFBO1lBQ2pCLENBQUM7WUFDRCxLQUFLLE1BQU0sTUFBTSxJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztnQkFDMUMsTUFBTSxlQUFlLEdBQUcsTUFBTSxDQUFDLGFBQWEsQ0FBQTtnQkFDNUMsSUFBSSxlQUFlLElBQUksZUFBZSxHQUFHLFNBQVMsRUFBRSxDQUFDO29CQUNwRCxTQUFTLEdBQUcsZUFBZSxDQUFBO2dCQUM1QixDQUFDO1lBQ0YsQ0FBQztZQUNELElBQUksQ0FBQyxjQUFjLEdBQUcsU0FBUyxDQUFBO1FBQ2hDLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUE7SUFDM0IsQ0FBQztDQUNEIn0=