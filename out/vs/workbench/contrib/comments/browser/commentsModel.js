/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { groupBy } from '../../../../base/common/arrays.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { ResourceWithCommentThreads } from '../common/commentModel.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { isMarkdownString } from '../../../../base/common/htmlContent.js';
export function threadHasMeaningfulComments(thread) {
    return (!!thread.comments &&
        !!thread.comments.length &&
        thread.comments.some((comment) => isMarkdownString(comment.body) ? comment.body.value.length > 0 : comment.body.length > 0));
}
export class CommentsModel extends Disposable {
    get resourceCommentThreads() {
        return this._resourceCommentThreads;
    }
    constructor() {
        super();
        this._resourceCommentThreads = [];
        this.commentThreadsMap = new Map();
    }
    updateResourceCommentThreads() {
        const includeLabel = this.commentThreadsMap.size > 1;
        this._resourceCommentThreads = [...this.commentThreadsMap.values()]
            .map((value) => {
            return value.resourceWithCommentThreads
                .map((resource) => {
                resource.ownerLabel = includeLabel ? value.ownerLabel : undefined;
                return resource;
            })
                .flat();
        })
            .flat();
    }
    setCommentThreads(uniqueOwner, owner, ownerLabel, commentThreads) {
        this.commentThreadsMap.set(uniqueOwner, {
            ownerLabel,
            resourceWithCommentThreads: this.groupByResource(uniqueOwner, owner, commentThreads),
        });
        this.updateResourceCommentThreads();
    }
    deleteCommentsByOwner(uniqueOwner) {
        if (uniqueOwner) {
            const existingOwner = this.commentThreadsMap.get(uniqueOwner);
            this.commentThreadsMap.set(uniqueOwner, {
                ownerLabel: existingOwner?.ownerLabel,
                resourceWithCommentThreads: [],
            });
        }
        else {
            this.commentThreadsMap.clear();
        }
        this.updateResourceCommentThreads();
    }
    updateCommentThreads(event) {
        const { uniqueOwner, owner, ownerLabel, removed, changed, added } = event;
        const threadsForOwner = this.commentThreadsMap.get(uniqueOwner)?.resourceWithCommentThreads || [];
        removed.forEach((thread) => {
            // Find resource that has the comment thread
            const matchingResourceIndex = threadsForOwner.findIndex((resourceData) => resourceData.id === thread.resource);
            const matchingResourceData = matchingResourceIndex >= 0 ? threadsForOwner[matchingResourceIndex] : undefined;
            // Find comment node on resource that is that thread and remove it
            const index = matchingResourceData?.commentThreads.findIndex((commentThread) => commentThread.threadId === thread.threadId) ?? 0;
            if (index >= 0) {
                matchingResourceData?.commentThreads.splice(index, 1);
            }
            // If the comment thread was the last thread for a resource, remove that resource from the list
            if (matchingResourceData?.commentThreads.length === 0) {
                threadsForOwner.splice(matchingResourceIndex, 1);
            }
        });
        changed.forEach((thread) => {
            // Find resource that has the comment thread
            const matchingResourceIndex = threadsForOwner.findIndex((resourceData) => resourceData.id === thread.resource);
            const matchingResourceData = matchingResourceIndex >= 0 ? threadsForOwner[matchingResourceIndex] : undefined;
            if (!matchingResourceData) {
                return;
            }
            // Find comment node on resource that is that thread and replace it
            const index = matchingResourceData.commentThreads.findIndex((commentThread) => commentThread.threadId === thread.threadId);
            if (index >= 0) {
                matchingResourceData.commentThreads[index] = ResourceWithCommentThreads.createCommentNode(uniqueOwner, owner, URI.parse(matchingResourceData.id), thread);
            }
            else if (thread.comments && thread.comments.length) {
                matchingResourceData.commentThreads.push(ResourceWithCommentThreads.createCommentNode(uniqueOwner, owner, URI.parse(matchingResourceData.id), thread));
            }
        });
        added.forEach((thread) => {
            const existingResource = threadsForOwner.filter((resourceWithThreads) => resourceWithThreads.resource.toString() === thread.resource);
            if (existingResource.length) {
                const resource = existingResource[0];
                if (thread.comments && thread.comments.length) {
                    resource.commentThreads.push(ResourceWithCommentThreads.createCommentNode(uniqueOwner, owner, resource.resource, thread));
                }
            }
            else {
                threadsForOwner.push(new ResourceWithCommentThreads(uniqueOwner, owner, URI.parse(thread.resource), [thread]));
            }
        });
        this.commentThreadsMap.set(uniqueOwner, {
            ownerLabel,
            resourceWithCommentThreads: threadsForOwner,
        });
        this.updateResourceCommentThreads();
        return removed.length > 0 || changed.length > 0 || added.length > 0;
    }
    hasCommentThreads() {
        // There's a resource with at least one thread
        return (!!this._resourceCommentThreads.length &&
            this._resourceCommentThreads.some((resource) => {
                // At least one of the threads in the resource has comments
                return (resource.commentThreads.length > 0 &&
                    resource.commentThreads.some((thread) => {
                        // At least one of the comments in the thread is not empty
                        return threadHasMeaningfulComments(thread.thread);
                    }));
            }));
    }
    getMessage() {
        if (!this._resourceCommentThreads.length) {
            return localize('noComments', 'There are no comments in this workspace yet.');
        }
        else {
            return '';
        }
    }
    groupByResource(uniqueOwner, owner, commentThreads) {
        const resourceCommentThreads = [];
        const commentThreadsByResource = new Map();
        for (const group of groupBy(commentThreads, CommentsModel._compareURIs)) {
            commentThreadsByResource.set(group[0].resource, new ResourceWithCommentThreads(uniqueOwner, owner, URI.parse(group[0].resource), group));
        }
        commentThreadsByResource.forEach((v, i, m) => {
            resourceCommentThreads.push(v);
        });
        return resourceCommentThreads;
    }
    static _compareURIs(a, b) {
        const resourceA = a.resource.toString();
        const resourceB = b.resource.toString();
        if (resourceA < resourceB) {
            return -1;
        }
        else if (resourceA > resourceB) {
            return 1;
        }
        else {
            return 0;
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudHNNb2RlbC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvbW1lbnRzL2Jyb3dzZXIvY29tbWVudHNNb2RlbC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDM0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRXBELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsMEJBQTBCLEVBQThCLE1BQU0sMkJBQTJCLENBQUE7QUFDbEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRXpFLE1BQU0sVUFBVSwyQkFBMkIsQ0FBQyxNQUFxQjtJQUNoRSxPQUFPLENBQ04sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRO1FBQ2pCLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU07UUFDeEIsTUFBTSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUNoQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FDeEYsQ0FDRCxDQUFBO0FBQ0YsQ0FBQztBQVlELE1BQU0sT0FBTyxhQUFjLFNBQVEsVUFBVTtJQUc1QyxJQUFJLHNCQUFzQjtRQUN6QixPQUFPLElBQUksQ0FBQyx1QkFBdUIsQ0FBQTtJQUNw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