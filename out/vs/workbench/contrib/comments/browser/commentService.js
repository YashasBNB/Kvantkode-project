/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { createDecorator, IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { Event, Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { Range } from '../../../../editor/common/core/range.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { CommentMenus } from './commentMenus.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { COMMENTS_SECTION } from '../common/commentsConfiguration.js';
import { IContextKeyService, } from '../../../../platform/contextkey/common/contextkey.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { CommentContextKeys } from '../common/commentContextKeys.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { CommentsModel } from './commentsModel.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { Schemas } from '../../../../base/common/network.js';
export const ICommentService = createDecorator('commentService');
const CONTINUE_ON_COMMENTS = 'comments.continueOnComments';
let CommentService = class CommentService extends Disposable {
    constructor(instantiationService, layoutService, configurationService, contextKeyService, storageService, logService, modelService) {
        super();
        this.instantiationService = instantiationService;
        this.layoutService = layoutService;
        this.configurationService = configurationService;
        this.storageService = storageService;
        this.logService = logService;
        this.modelService = modelService;
        this._onDidSetDataProvider = this._register(new Emitter());
        this.onDidSetDataProvider = this._onDidSetDataProvider.event;
        this._onDidDeleteDataProvider = this._register(new Emitter());
        this.onDidDeleteDataProvider = this._onDidDeleteDataProvider.event;
        this._onDidSetResourceCommentInfos = this._register(new Emitter());
        this.onDidSetResourceCommentInfos = this._onDidSetResourceCommentInfos.event;
        this._onDidSetAllCommentThreads = this._register(new Emitter());
        this.onDidSetAllCommentThreads = this._onDidSetAllCommentThreads.event;
        this._onDidUpdateCommentThreads = this._register(new Emitter());
        this.onDidUpdateCommentThreads = this._onDidUpdateCommentThreads.event;
        this._onDidUpdateNotebookCommentThreads = this._register(new Emitter());
        this.onDidUpdateNotebookCommentThreads = this._onDidUpdateNotebookCommentThreads.event;
        this._onDidUpdateCommentingRanges = this._register(new Emitter());
        this.onDidUpdateCommentingRanges = this._onDidUpdateCommentingRanges.event;
        this._onDidChangeActiveEditingCommentThread = this._register(new Emitter());
        this.onDidChangeActiveEditingCommentThread = this._onDidChangeActiveEditingCommentThread.event;
        this._onDidChangeCurrentCommentThread = this._register(new Emitter());
        this.onDidChangeCurrentCommentThread = this._onDidChangeCurrentCommentThread.event;
        this._onDidChangeCommentingEnabled = this._register(new Emitter());
        this.onDidChangeCommentingEnabled = this._onDidChangeCommentingEnabled.event;
        this._onResourceHasCommentingRanges = this._register(new Emitter());
        this.onResourceHasCommentingRanges = this._onResourceHasCommentingRanges.event;
        this._onDidChangeActiveCommentingRange = this._register(new Emitter());
        this.onDidChangeActiveCommentingRange = this._onDidChangeActiveCommentingRange.event;
        this._commentControls = new Map();
        this._commentMenus = new Map();
        this._isCommentingEnabled = true;
        this._continueOnComments = new Map(); // uniqueOwner -> PendingCommentThread[]
        this._continueOnCommentProviders = new Set();
        this._commentsModel = this._register(new CommentsModel());
        this.commentsModel = this._commentsModel;
        this._commentingRangeResources = new Set(); // URIs
        this._commentingRangeResourceHintSchemes = new Set(); // schemes
        this._handleConfiguration();
        this._handleZenMode();
        this._workspaceHasCommenting =
            CommentContextKeys.WorkspaceHasCommenting.bindTo(contextKeyService);
        this._commentingEnabled = CommentContextKeys.commentingEnabled.bindTo(contextKeyService);
        const storageListener = this._register(new DisposableStore());
        const storageEvent = Event.debounce(this.storageService.onDidChangeValue(1 /* StorageScope.WORKSPACE */, CONTINUE_ON_COMMENTS, storageListener), (last, event) => (last?.external ? last : event), 500);
        storageListener.add(storageEvent((v) => {
            if (!v.external) {
                return;
            }
            const commentsToRestore = this.storageService.getObject(CONTINUE_ON_COMMENTS, 1 /* StorageScope.WORKSPACE */);
            if (!commentsToRestore) {
                return;
            }
            this.logService.debug(`Comments: URIs of continue on comments from storage ${commentsToRestore.map((thread) => thread.uri.toString()).join(', ')}.`);
            const changedOwners = this._addContinueOnComments(commentsToRestore, this._continueOnComments);
            for (const uniqueOwner of changedOwners) {
                const control = this._commentControls.get(uniqueOwner);
                if (!control) {
                    continue;
                }
                const evt = {
                    uniqueOwner: uniqueOwner,
                    owner: control.owner,
                    ownerLabel: control.label,
                    pending: this._continueOnComments.get(uniqueOwner) || [],
                    added: [],
                    removed: [],
                    changed: [],
                };
                this.updateModelThreads(evt);
            }
        }));
        this._register(storageService.onWillSaveState(() => {
            const map = new Map();
            for (const provider of this._continueOnCommentProviders) {
                const pendingComments = provider.provideContinueOnComments();
                this._addContinueOnComments(pendingComments, map);
            }
            this._saveContinueOnComments(map);
        }));
        this._register(this.modelService.onModelAdded((model) => {
            // Excluded schemes
            if (model.uri.scheme === Schemas.vscodeSourceControl) {
                return;
            }
            // Allows comment providers to cause their commenting ranges to be prefetched by opening text documents in the background.
            if (!this._commentingRangeResources.has(model.uri.toString())) {
                this.getDocumentComments(model.uri);
            }
        }));
    }
    _updateResourcesWithCommentingRanges(resource, commentInfos) {
        let addedResources = false;
        for (const comments of commentInfos) {
            if (comments &&
                (comments.commentingRanges.ranges.length > 0 || comments.threads.length > 0)) {
                this._commentingRangeResources.add(resource.toString());
                addedResources = true;
            }
        }
        if (addedResources) {
            this._onResourceHasCommentingRanges.fire();
        }
    }
    _handleConfiguration() {
        this._isCommentingEnabled = this._defaultCommentingEnablement;
        this._register(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('comments.visible')) {
                this.enableCommenting(this._defaultCommentingEnablement);
            }
        }));
    }
    _handleZenMode() {
        let preZenModeValue = this._isCommentingEnabled;
        this._register(this.layoutService.onDidChangeZenMode((e) => {
            if (e) {
                preZenModeValue = this._isCommentingEnabled;
                this.enableCommenting(false);
            }
            else {
                this.enableCommenting(preZenModeValue);
            }
        }));
    }
    get _defaultCommentingEnablement() {
        return !!this.configurationService.getValue(COMMENTS_SECTION)?.visible;
    }
    get isCommentingEnabled() {
        return this._isCommentingEnabled;
    }
    enableCommenting(enable) {
        if (enable !== this._isCommentingEnabled) {
            this._isCommentingEnabled = enable;
            this._commentingEnabled.set(enable);
            this._onDidChangeCommentingEnabled.fire(enable);
        }
    }
    /**
     * The current comment thread is the thread that has focus or is being hovered.
     * @param commentThread
     */
    setCurrentCommentThread(commentThread) {
        this._onDidChangeCurrentCommentThread.fire(commentThread);
    }
    /**
     * The active comment thread is the thread that is currently being edited.
     * @param commentThread
     */
    setActiveEditingCommentThread(commentThread) {
        this._onDidChangeActiveEditingCommentThread.fire(commentThread);
    }
    get lastActiveCommentcontroller() {
        return this._lastActiveCommentController;
    }
    async setActiveCommentAndThread(uniqueOwner, commentInfo) {
        const commentController = this._commentControls.get(uniqueOwner);
        if (!commentController) {
            return;
        }
        if (commentController !== this._lastActiveCommentController) {
            await this._lastActiveCommentController?.setActiveCommentAndThread(undefined);
        }
        this._lastActiveCommentController = commentController;
        return commentController.setActiveCommentAndThread(commentInfo);
    }
    setDocumentComments(resource, commentInfos) {
        this._onDidSetResourceCommentInfos.fire({ resource, commentInfos });
    }
    setModelThreads(ownerId, owner, ownerLabel, commentThreads) {
        this._commentsModel.setCommentThreads(ownerId, owner, ownerLabel, commentThreads);
        this._onDidSetAllCommentThreads.fire({ ownerId, ownerLabel, commentThreads });
    }
    updateModelThreads(event) {
        this._commentsModel.updateCommentThreads(event);
        this._onDidUpdateCommentThreads.fire(event);
    }
    setWorkspaceComments(uniqueOwner, commentsByResource) {
        if (commentsByResource.length) {
            this._workspaceHasCommenting.set(true);
        }
        const control = this._commentControls.get(uniqueOwner);
        if (control) {
            this.setModelThreads(uniqueOwner, control.owner, control.label, commentsByResource);
        }
    }
    removeWorkspaceComments(uniqueOwner) {
        const control = this._commentControls.get(uniqueOwner);
        if (control) {
            this.setModelThreads(uniqueOwner, control.owner, control.label, []);
        }
    }
    registerCommentController(uniqueOwner, commentControl) {
        this._commentControls.set(uniqueOwner, commentControl);
        this._onDidSetDataProvider.fire();
    }
    unregisterCommentController(uniqueOwner) {
        if (uniqueOwner) {
            this._commentControls.delete(uniqueOwner);
        }
        else {
            this._commentControls.clear();
        }
        this._commentsModel.deleteCommentsByOwner(uniqueOwner);
        this._onDidDeleteDataProvider.fire(uniqueOwner);
    }
    getCommentController(uniqueOwner) {
        return this._commentControls.get(uniqueOwner);
    }
    async createCommentThreadTemplate(uniqueOwner, resource, range, editorId) {
        const commentController = this._commentControls.get(uniqueOwner);
        if (!commentController) {
            return;
        }
        return commentController.createCommentThreadTemplate(resource, range, editorId);
    }
    async updateCommentThreadTemplate(uniqueOwner, threadHandle, range) {
        const commentController = this._commentControls.get(uniqueOwner);
        if (!commentController) {
            return;
        }
        await commentController.updateCommentThreadTemplate(threadHandle, range);
    }
    disposeCommentThread(uniqueOwner, threadId) {
        const controller = this.getCommentController(uniqueOwner);
        controller?.deleteCommentThreadMain(threadId);
    }
    getCommentMenus(uniqueOwner) {
        if (this._commentMenus.get(uniqueOwner)) {
            return this._commentMenus.get(uniqueOwner);
        }
        const menu = this.instantiationService.createInstance(CommentMenus);
        this._commentMenus.set(uniqueOwner, menu);
        return menu;
    }
    updateComments(ownerId, event) {
        const control = this._commentControls.get(ownerId);
        if (control) {
            const evt = Object.assign({}, event, {
                uniqueOwner: ownerId,
                ownerLabel: control.label,
                owner: control.owner,
            });
            this.updateModelThreads(evt);
        }
    }
    updateNotebookComments(ownerId, event) {
        const evt = Object.assign({}, event, {
            uniqueOwner: ownerId,
        });
        this._onDidUpdateNotebookCommentThreads.fire(evt);
    }
    updateCommentingRanges(ownerId, resourceHints) {
        if (resourceHints?.schemes && resourceHints.schemes.length > 0) {
            for (const scheme of resourceHints.schemes) {
                this._commentingRangeResourceHintSchemes.add(scheme);
            }
        }
        this._workspaceHasCommenting.set(true);
        this._onDidUpdateCommentingRanges.fire({ uniqueOwner: ownerId });
    }
    async toggleReaction(uniqueOwner, resource, thread, comment, reaction) {
        const commentController = this._commentControls.get(uniqueOwner);
        if (commentController) {
            return commentController.toggleReaction(resource, thread, comment, reaction, CancellationToken.None);
        }
        else {
            throw new Error('Not supported');
        }
    }
    hasReactionHandler(uniqueOwner) {
        const commentProvider = this._commentControls.get(uniqueOwner);
        if (commentProvider) {
            return !!commentProvider.features.reactionHandler;
        }
        return false;
    }
    async getDocumentComments(resource) {
        const commentControlResult = [];
        for (const control of this._commentControls.values()) {
            commentControlResult.push(control
                .getDocumentComments(resource, CancellationToken.None)
                .then((documentComments) => {
                // Check that there aren't any continue on comments in the provided comments
                // This can happen because continue on comments are stored separately from local un-submitted comments.
                for (const documentCommentThread of documentComments.threads) {
                    if (documentCommentThread.comments?.length === 0 && documentCommentThread.range) {
                        this.removeContinueOnComment({
                            range: documentCommentThread.range,
                            uri: resource,
                            uniqueOwner: documentComments.uniqueOwner,
                        });
                    }
                }
                const pendingComments = this._continueOnComments.get(documentComments.uniqueOwner);
                documentComments.pendingCommentThreads = pendingComments?.filter((pendingComment) => pendingComment.uri.toString() === resource.toString());
                return documentComments;
            })
                .catch((_) => {
                return null;
            }));
        }
        const commentInfos = await Promise.all(commentControlResult);
        this._updateResourcesWithCommentingRanges(resource, commentInfos);
        return commentInfos;
    }
    async getNotebookComments(resource) {
        const commentControlResult = [];
        this._commentControls.forEach((control) => {
            commentControlResult.push(control.getNotebookComments(resource, CancellationToken.None).catch((_) => {
                return null;
            }));
        });
        return Promise.all(commentControlResult);
    }
    registerContinueOnCommentProvider(provider) {
        this._continueOnCommentProviders.add(provider);
        return {
            dispose: () => {
                this._continueOnCommentProviders.delete(provider);
            },
        };
    }
    _saveContinueOnComments(map) {
        const commentsToSave = [];
        for (const pendingComments of map.values()) {
            commentsToSave.push(...pendingComments);
        }
        this.logService.debug(`Comments: URIs of continue on comments to add to storage ${commentsToSave.map((thread) => thread.uri.toString()).join(', ')}.`);
        this.storageService.store(CONTINUE_ON_COMMENTS, commentsToSave, 1 /* StorageScope.WORKSPACE */, 0 /* StorageTarget.USER */);
    }
    removeContinueOnComment(pendingComment) {
        const pendingComments = this._continueOnComments.get(pendingComment.uniqueOwner);
        if (pendingComments) {
            const commentIndex = pendingComments.findIndex((comment) => comment.uri.toString() === pendingComment.uri.toString() &&
                Range.equalsRange(comment.range, pendingComment.range) &&
                (pendingComment.isReply === undefined || comment.isReply === pendingComment.isReply));
            if (commentIndex > -1) {
                return pendingComments.splice(commentIndex, 1)[0];
            }
        }
        return undefined;
    }
    _addContinueOnComments(pendingComments, map) {
        const changedOwners = new Set();
        for (const pendingComment of pendingComments) {
            if (!map.has(pendingComment.uniqueOwner)) {
                map.set(pendingComment.uniqueOwner, [pendingComment]);
                changedOwners.add(pendingComment.uniqueOwner);
            }
            else {
                const commentsForOwner = map.get(pendingComment.uniqueOwner);
                if (commentsForOwner.every((comment) => comment.uri.toString() !== pendingComment.uri.toString() ||
                    !Range.equalsRange(comment.range, pendingComment.range))) {
                    commentsForOwner.push(pendingComment);
                    changedOwners.add(pendingComment.uniqueOwner);
                }
            }
        }
        return changedOwners;
    }
    resourceHasCommentingRanges(resource) {
        return (this._commentingRangeResourceHintSchemes.has(resource.scheme) ||
            this._commentingRangeResources.has(resource.toString()));
    }
};
CommentService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IWorkbenchLayoutService),
    __param(2, IConfigurationService),
    __param(3, IContextKeyService),
    __param(4, IStorageService),
    __param(5, ILogService),
    __param(6, IModelService)
], CommentService);
export { CommentService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jb21tZW50cy9icm93c2VyL2NvbW1lbnRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBYWhHLE9BQU8sRUFDTixlQUFlLEVBQ2YscUJBQXFCLEdBQ3JCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBZSxNQUFNLHNDQUFzQyxDQUFBO0FBRS9GLE9BQU8sRUFBRSxLQUFLLEVBQVUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUUzRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFFaEQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDM0YsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGdCQUFnQixFQUEwQixNQUFNLG9DQUFvQyxDQUFBO0FBQzdGLE9BQU8sRUFFTixrQkFBa0IsR0FDbEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDcEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxhQUFhLEVBQWtCLE1BQU0sb0JBQW9CLENBQUE7QUFDbEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZD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