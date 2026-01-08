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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvbW1lbnRzL2Jyb3dzZXIvY29tbWVudFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFhaEcsT0FBTyxFQUNOLGVBQWUsRUFDZixxQkFBcUIsR0FDckIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFlLE1BQU0sc0NBQXNDLENBQUE7QUFFL0YsT0FBTyxFQUFFLEtBQUssRUFBVSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRTNFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUVoRCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUMzRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQTBCLE1BQU0sb0NBQW9DLENBQUE7QUFDN0YsT0FBTyxFQUVOLGtCQUFrQixHQUNsQixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLGFBQWEsRUFBa0IsTUFBTSxvQkFBb0IsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1B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