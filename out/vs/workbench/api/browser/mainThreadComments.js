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
import { Emitter } from '../../../base/common/event.js';
import { Disposable, DisposableMap, DisposableStore, MutableDisposable, } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { Range } from '../../../editor/common/core/range.js';
import * as languages from '../../../editor/common/languages.js';
import { Registry } from '../../../platform/registry/common/platform.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
import { ICommentService, } from '../../contrib/comments/browser/commentService.js';
import { CommentsPanel } from '../../contrib/comments/browser/commentsView.js';
import { ExtHostContext, MainContext, } from '../common/extHost.protocol.js';
import { COMMENTS_VIEW_ID, COMMENTS_VIEW_STORAGE_ID, COMMENTS_VIEW_TITLE, } from '../../contrib/comments/browser/commentsTreeViewer.js';
import { Extensions as ViewExtensions, IViewDescriptorService, } from '../../common/views.js';
import { SyncDescriptor } from '../../../platform/instantiation/common/descriptors.js';
import { ViewPaneContainer } from '../../browser/parts/views/viewPaneContainer.js';
import { Codicon } from '../../../base/common/codicons.js';
import { registerIcon } from '../../../platform/theme/common/iconRegistry.js';
import { localize } from '../../../nls.js';
import { Schemas } from '../../../base/common/network.js';
import { IViewsService } from '../../services/views/common/viewsService.js';
import { revealCommentThread } from '../../contrib/comments/browser/commentsController.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
import { IUriIdentityService } from '../../../platform/uriIdentity/common/uriIdentity.js';
export class MainThreadCommentThread {
    get input() {
        return this._input;
    }
    set input(value) {
        this._input = value;
        this._onDidChangeInput.fire(value);
    }
    get onDidChangeInput() {
        return this._onDidChangeInput.event;
    }
    get label() {
        return this._label;
    }
    set label(label) {
        this._label = label;
        this._onDidChangeLabel.fire(this._label);
    }
    get contextValue() {
        return this._contextValue;
    }
    set contextValue(context) {
        this._contextValue = context;
    }
    get comments() {
        return this._comments;
    }
    set comments(newComments) {
        this._comments = newComments;
        this._onDidChangeComments.fire(this._comments);
    }
    get onDidChangeComments() {
        return this._onDidChangeComments.event;
    }
    set range(range) {
        this._range = range;
    }
    get range() {
        return this._range;
    }
    get onDidChangeCanReply() {
        return this._onDidChangeCanReply.event;
    }
    set canReply(state) {
        this._canReply = state;
        this._onDidChangeCanReply.fire(this._canReply);
    }
    get canReply() {
        return this._canReply;
    }
    get collapsibleState() {
        return this._collapsibleState;
    }
    set collapsibleState(newState) {
        if (this.initialCollapsibleState === undefined) {
            this.initialCollapsibleState = newState;
        }
        if (newState !== this._collapsibleState) {
            this._collapsibleState = newState;
            this._onDidChangeCollapsibleState.fire(this._collapsibleState);
        }
    }
    get initialCollapsibleState() {
        return this._initialCollapsibleState;
    }
    set initialCollapsibleState(initialCollapsibleState) {
        this._initialCollapsibleState = initialCollapsibleState;
        this._onDidChangeInitialCollapsibleState.fire(initialCollapsibleState);
    }
    get isDisposed() {
        return this._isDisposed;
    }
    isDocumentCommentThread() {
        return this._range === undefined || Range.isIRange(this._range);
    }
    get state() {
        return this._state;
    }
    set state(newState) {
        this._state = newState;
        this._onDidChangeState.fire(this._state);
    }
    get applicability() {
        return this._applicability;
    }
    set applicability(value) {
        this._applicability = value;
        this._onDidChangeApplicability.fire(value);
    }
    get isTemplate() {
        return this._isTemplate;
    }
    constructor(commentThreadHandle, controllerHandle, extensionId, threadId, resource, _range, comments, _canReply, _isTemplate, editorId) {
        this.commentThreadHandle = commentThreadHandle;
        this.controllerHandle = controllerHandle;
        this.extensionId = extensionId;
        this.threadId = threadId;
        this.resource = resource;
        this._range = _range;
        this._canReply = _canReply;
        this._isTemplate = _isTemplate;
        this.editorId = editorId;
        this._onDidChangeInput = new Emitter();
        this._onDidChangeLabel = new Emitter();
        this.onDidChangeLabel = this._onDidChangeLabel.event;
        this._onDidChangeComments = new Emitter();
        this._onDidChangeCanReply = new Emitter();
        this._collapsibleState = languages.CommentThreadCollapsibleState.Collapsed;
        this._onDidChangeCollapsibleState = new Emitter();
        this.onDidChangeCollapsibleState = this._onDidChangeCollapsibleState.event;
        this._onDidChangeInitialCollapsibleState = new Emitter();
        this.onDidChangeInitialCollapsibleState = this._onDidChangeInitialCollapsibleState.event;
        this._onDidChangeApplicability = new Emitter();
        this.onDidChangeApplicability = this._onDidChangeApplicability.event;
        this._onDidChangeState = new Emitter();
        this.onDidChangeState = this._onDidChangeState.event;
        this._isDisposed = false;
        if (_isTemplate) {
            this.comments = [];
        }
        else if (comments) {
            this._comments = comments;
        }
    }
    batchUpdate(changes) {
        const modified = (value) => Object.prototype.hasOwnProperty.call(changes, value);
        if (modified('range')) {
            this._range = changes.range;
        }
        if (modified('label')) {
            this._label = changes.label;
        }
        if (modified('contextValue')) {
            this._contextValue = changes.contextValue === null ? undefined : changes.contextValue;
        }
        if (modified('comments')) {
            this.comments = changes.comments;
        }
        if (modified('collapseState')) {
            this.collapsibleState = changes.collapseState;
        }
        if (modified('canReply')) {
            this.canReply = changes.canReply;
        }
        if (modified('state')) {
            this.state = changes.state;
        }
        if (modified('applicability')) {
            this.applicability = changes.applicability;
        }
        if (modified('isTemplate')) {
            this._isTemplate = changes.isTemplate;
        }
    }
    hasComments() {
        return !!this.comments && this.comments.length > 0;
    }
    dispose() {
        this._isDisposed = true;
        this._onDidChangeCollapsibleState.dispose();
        this._onDidChangeComments.dispose();
        this._onDidChangeInput.dispose();
        this._onDidChangeLabel.dispose();
        this._onDidChangeState.dispose();
    }
    toJSON() {
        return {
            $mid: 7 /* MarshalledId.CommentThread */,
            commentControlHandle: this.controllerHandle,
            commentThreadHandle: this.commentThreadHandle,
        };
    }
}
class CommentThreadWithDisposable {
    constructor(thread) {
        this.thread = thread;
        this.disposableStore = new DisposableStore();
    }
    dispose() {
        this.disposableStore.dispose();
    }
}
export class MainThreadCommentController {
    get handle() {
        return this._handle;
    }
    get id() {
        return this._id;
    }
    get contextValue() {
        return this._id;
    }
    get proxy() {
        return this._proxy;
    }
    get label() {
        return this._label;
    }
    get reactions() {
        return this._reactions;
    }
    set reactions(reactions) {
        this._reactions = reactions;
    }
    get options() {
        return this._features.options;
    }
    get features() {
        return this._features;
    }
    get owner() {
        return this._id;
    }
    constructor(_proxy, _commentService, _handle, _uniqueId, _id, _label, _features) {
        this._proxy = _proxy;
        this._commentService = _commentService;
        this._handle = _handle;
        this._uniqueId = _uniqueId;
        this._id = _id;
        this._label = _label;
        this._features = _features;
        this._threads = new DisposableMap();
    }
    get activeComment() {
        return this._activeComment;
    }
    async setActiveCommentAndThread(commentInfo) {
        this._activeComment = commentInfo;
        return this._proxy.$setActiveComment(this._handle, commentInfo
            ? {
                commentThreadHandle: commentInfo.thread.commentThreadHandle,
                uniqueIdInThread: commentInfo.comment?.uniqueIdInThread,
            }
            : undefined);
    }
    updateFeatures(features) {
        this._features = features;
    }
    createCommentThread(extensionId, commentThreadHandle, threadId, resource, range, comments, isTemplate, editorId) {
        const thread = new MainThreadCommentThread(commentThreadHandle, this.handle, extensionId, threadId, URI.revive(resource).toString(), range, comments, true, isTemplate, editorId);
        const threadWithDisposable = new CommentThreadWithDisposable(thread);
        this._threads.set(commentThreadHandle, threadWithDisposable);
        threadWithDisposable.disposableStore.add(thread.onDidChangeCollapsibleState(() => {
            this.proxy.$updateCommentThread(this.handle, thread.commentThreadHandle, {
                collapseState: thread.collapsibleState,
            });
        }));
        if (thread.isDocumentCommentThread()) {
            this._commentService.updateComments(this._uniqueId, {
                added: [thread],
                removed: [],
                changed: [],
                pending: [],
            });
        }
        else {
            this._commentService.updateNotebookComments(this._uniqueId, {
                added: [thread],
                removed: [],
                changed: [],
                pending: [],
            });
        }
        return thread;
    }
    updateCommentThread(commentThreadHandle, threadId, resource, changes) {
        const thread = this.getKnownThread(commentThreadHandle);
        thread.batchUpdate(changes);
        if (thread.isDocumentCommentThread()) {
            this._commentService.updateComments(this._uniqueId, {
                added: [],
                removed: [],
                changed: [thread],
                pending: [],
            });
        }
        else {
            this._commentService.updateNotebookComments(this._uniqueId, {
                added: [],
                removed: [],
                changed: [thread],
                pending: [],
            });
        }
    }
    deleteCommentThread(commentThreadHandle) {
        const thread = this.getKnownThread(commentThreadHandle);
        this._threads.deleteAndDispose(commentThreadHandle);
        thread.dispose();
        if (thread.isDocumentCommentThread()) {
            this._commentService.updateComments(this._uniqueId, {
                added: [],
                removed: [thread],
                changed: [],
                pending: [],
            });
        }
        else {
            this._commentService.updateNotebookComments(this._uniqueId, {
                added: [],
                removed: [thread],
                changed: [],
                pending: [],
            });
        }
    }
    deleteCommentThreadMain(commentThreadId) {
        for (const { thread } of this._threads.values()) {
            if (thread.threadId === commentThreadId) {
                this._proxy.$deleteCommentThread(this._handle, thread.commentThreadHandle);
            }
        }
    }
    updateInput(input) {
        const thread = this.activeEditingCommentThread;
        if (thread && thread.input) {
            const commentInput = thread.input;
            commentInput.value = input;
            thread.input = commentInput;
        }
    }
    updateCommentingRanges(resourceHints) {
        this._commentService.updateCommentingRanges(this._uniqueId, resourceHints);
    }
    getKnownThread(commentThreadHandle) {
        const thread = this._threads.get(commentThreadHandle);
        if (!thread) {
            throw new Error('unknown thread');
        }
        return thread.thread;
    }
    async getDocumentComments(resource, token) {
        if (resource.scheme === Schemas.vscodeNotebookCell) {
            return {
                uniqueOwner: this._uniqueId,
                label: this.label,
                threads: [],
                commentingRanges: {
                    resource: resource,
                    ranges: [],
                    fileComments: false,
                },
            };
        }
        const ret = [];
        for (const thread of [...this._threads.keys()]) {
            const commentThread = this._threads.get(thread);
            if (commentThread.thread.resource === resource.toString()) {
                if (commentThread.thread.isDocumentCommentThread()) {
                    ret.push(commentThread.thread);
                }
            }
        }
        const commentingRanges = await this._proxy.$provideCommentingRanges(this.handle, resource, token);
        return {
            uniqueOwner: this._uniqueId,
            label: this.label,
            threads: ret,
            commentingRanges: {
                resource: resource,
                ranges: commentingRanges?.ranges || [],
                fileComments: !!commentingRanges?.fileComments,
            },
        };
    }
    async getNotebookComments(resource, token) {
        if (resource.scheme !== Schemas.vscodeNotebookCell) {
            return {
                uniqueOwner: this._uniqueId,
                label: this.label,
                threads: [],
            };
        }
        const ret = [];
        for (const thread of [...this._threads.keys()]) {
            const commentThread = this._threads.get(thread);
            if (commentThread.thread.resource === resource.toString()) {
                if (!commentThread.thread.isDocumentCommentThread()) {
                    ret.push(commentThread.thread);
                }
            }
        }
        return {
            uniqueOwner: this._uniqueId,
            label: this.label,
            threads: ret,
        };
    }
    async toggleReaction(uri, thread, comment, reaction, token) {
        return this._proxy.$toggleReaction(this._handle, thread.commentThreadHandle, uri, comment, reaction);
    }
    getAllComments() {
        const ret = [];
        for (const thread of [...this._threads.keys()]) {
            ret.push(this._threads.get(thread).thread);
        }
        return ret;
    }
    createCommentThreadTemplate(resource, range, editorId) {
        return this._proxy.$createCommentThreadTemplate(this.handle, resource, range, editorId);
    }
    async updateCommentThreadTemplate(threadHandle, range) {
        await this._proxy.$updateCommentThreadTemplate(this.handle, threadHandle, range);
    }
    toJSON() {
        return {
            $mid: 6 /* MarshalledId.CommentController */,
            handle: this.handle,
        };
    }
}
const commentsViewIcon = registerIcon('comments-view-icon', Codicon.commentDiscussion, localize('commentsViewIcon', 'View icon of the comments view.'));
let MainThreadComments = class MainThreadComments extends Disposable {
    constructor(extHostContext, _commentService, _viewsService, _viewDescriptorService, _uriIdentityService, _editorService) {
        super();
        this._commentService = _commentService;
        this._viewsService = _viewsService;
        this._viewDescriptorService = _viewDescriptorService;
        this._uriIdentityService = _uriIdentityService;
        this._editorService = _editorService;
        this._handlers = new Map();
        this._commentControllers = new Map();
        this._activeEditingCommentThreadDisposables = this._register(new DisposableStore());
        this._openViewListener = this._register(new MutableDisposable());
        this._onChangeContainerListener = this._register(new MutableDisposable());
        this._onChangeContainerLocationListener = this._register(new MutableDisposable());
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostComments);
        this._commentService.unregisterCommentController();
        this._register(this._commentService.onDidChangeActiveEditingCommentThread(async (thread) => {
            const handle = thread.controllerHandle;
            const controller = this._commentControllers.get(handle);
            if (!controller) {
                return;
            }
            this._activeEditingCommentThreadDisposables.clear();
            this._activeEditingCommentThread = thread;
            controller.activeEditingCommentThread = this._activeEditingCommentThread;
        }));
    }
    $registerCommentController(handle, id, label, extensionId) {
        const providerId = `${id}-${extensionId}`;
        this._handlers.set(handle, providerId);
        const provider = new MainThreadCommentController(this._proxy, this._commentService, handle, providerId, id, label, {});
        this._commentService.registerCommentController(providerId, provider);
        this._commentControllers.set(handle, provider);
        this._register(this._commentService.onResourceHasCommentingRanges((e) => {
            this.registerView();
        }));
        this._register(this._commentService.onDidUpdateCommentThreads((e) => {
            this.registerView();
        }));
        this._commentService.setWorkspaceComments(String(handle), []);
    }
    $unregisterCommentController(handle) {
        const providerId = this._handlers.get(handle);
        this._handlers.delete(handle);
        this._commentControllers.delete(handle);
        if (typeof providerId !== 'string') {
            return;
            // throw new Error('unknown handler');
        }
        else {
            this._commentService.unregisterCommentController(providerId);
        }
    }
    $updateCommentControllerFeatures(handle, features) {
        const provider = this._commentControllers.get(handle);
        if (!provider) {
            return undefined;
        }
        provider.updateFeatures(features);
    }
    $createCommentThread(handle, commentThreadHandle, threadId, resource, range, comments, extensionId, isTemplate, editorId) {
        const provider = this._commentControllers.get(handle);
        if (!provider) {
            return undefined;
        }
        return provider.createCommentThread(extensionId.value, commentThreadHandle, threadId, resource, range, comments, isTemplate, editorId);
    }
    $updateCommentThread(handle, commentThreadHandle, threadId, resource, changes) {
        const provider = this._commentControllers.get(handle);
        if (!provider) {
            return undefined;
        }
        return provider.updateCommentThread(commentThreadHandle, threadId, resource, changes);
    }
    $deleteCommentThread(handle, commentThreadHandle) {
        const provider = this._commentControllers.get(handle);
        if (!provider) {
            return;
        }
        return provider.deleteCommentThread(commentThreadHandle);
    }
    $updateCommentingRanges(handle, resourceHints) {
        const provider = this._commentControllers.get(handle);
        if (!provider) {
            return;
        }
        provider.updateCommentingRanges(resourceHints);
    }
    async $revealCommentThread(handle, commentThreadHandle, commentUniqueIdInThread, options) {
        const provider = this._commentControllers.get(handle);
        if (!provider) {
            return Promise.resolve();
        }
        const thread = provider
            .getAllComments()
            .find((thread) => thread.commentThreadHandle === commentThreadHandle);
        if (!thread || !thread.isDocumentCommentThread()) {
            return Promise.resolve();
        }
        const comment = thread.comments?.find((comment) => comment.uniqueIdInThread === commentUniqueIdInThread);
        revealCommentThread(this._commentService, this._editorService, this._uriIdentityService, thread, comment, options.focusReply, undefined, options.preserveFocus);
    }
    async $hideCommentThread(handle, commentThreadHandle) {
        const provider = this._commentControllers.get(handle);
        if (!provider) {
            return Promise.resolve();
        }
        const thread = provider
            .getAllComments()
            .find((thread) => thread.commentThreadHandle === commentThreadHandle);
        if (!thread || !thread.isDocumentCommentThread()) {
            return Promise.resolve();
        }
        thread.collapsibleState = languages.CommentThreadCollapsibleState.Collapsed;
    }
    registerView() {
        const commentsPanelAlreadyConstructed = !!this._viewDescriptorService.getViewDescriptorById(COMMENTS_VIEW_ID);
        if (!commentsPanelAlreadyConstructed) {
            const VIEW_CONTAINER = Registry.as(ViewExtensions.ViewContainersRegistry).registerViewContainer({
                id: COMMENTS_VIEW_ID,
                title: COMMENTS_VIEW_TITLE,
                ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [
                    COMMENTS_VIEW_ID,
                    { mergeViewWithContainerWhenSingleView: true },
                ]),
                storageId: COMMENTS_VIEW_STORAGE_ID,
                hideIfEmpty: true,
                icon: commentsViewIcon,
                order: 10,
            }, 1 /* ViewContainerLocation.Panel */);
            Registry.as(ViewExtensions.ViewsRegistry).registerViews([
                {
                    id: COMMENTS_VIEW_ID,
                    name: COMMENTS_VIEW_TITLE,
                    canToggleVisibility: false,
                    ctorDescriptor: new SyncDescriptor(CommentsPanel),
                    canMoveView: true,
                    containerIcon: commentsViewIcon,
                    focusCommand: {
                        id: 'workbench.action.focusCommentsPanel',
                    },
                },
            ], VIEW_CONTAINER);
        }
        this.registerViewListeners(commentsPanelAlreadyConstructed);
    }
    setComments() {
        ;
        [...this._commentControllers.keys()].forEach((handle) => {
            const threads = this._commentControllers.get(handle).getAllComments();
            if (threads.length) {
                const providerId = this.getHandler(handle);
                this._commentService.setWorkspaceComments(providerId, threads);
            }
        });
    }
    registerViewOpenedListener() {
        if (!this._openViewListener.value) {
            this._openViewListener.value = this._viewsService.onDidChangeViewVisibility((e) => {
                if (e.id === COMMENTS_VIEW_ID && e.visible) {
                    this.setComments();
                    if (this._openViewListener) {
                        this._openViewListener.dispose();
                    }
                }
            });
        }
    }
    /**
     * If the comments view has never been opened, the constructor for it has not yet run so it has
     * no listeners for comment threads being set or updated. Listen for the view opening for the
     * first time and send it comments then.
     */
    registerViewListeners(commentsPanelAlreadyConstructed) {
        if (!commentsPanelAlreadyConstructed) {
            this.registerViewOpenedListener();
        }
        if (!this._onChangeContainerListener.value) {
            this._onChangeContainerListener.value = this._viewDescriptorService.onDidChangeContainer((e) => {
                if (e.views.find((view) => view.id === COMMENTS_VIEW_ID)) {
                    this.setComments();
                    this.registerViewOpenedListener();
                }
            });
        }
        if (!this._onChangeContainerLocationListener.value) {
            this._onChangeContainerLocationListener.value =
                this._viewDescriptorService.onDidChangeContainerLocation((e) => {
                    const commentsContainer = this._viewDescriptorService.getViewContainerByViewId(COMMENTS_VIEW_ID);
                    if (e.viewContainer.id === commentsContainer?.id) {
                        this.setComments();
                        this.registerViewOpenedListener();
                    }
                });
        }
    }
    getHandler(handle) {
        if (!this._handlers.has(handle)) {
            throw new Error('Unknown handler');
        }
        return this._handlers.get(handle);
    }
};
MainThreadComments = __decorate([
    extHostNamedCustomer(MainContext.MainThreadComments),
    __param(1, ICommentService),
    __param(2, IViewsService),
    __param(3, IViewDescriptorService),
    __param(4, IUriIdentityService),
    __param(5, IEditorService)
], MainThreadComments);
export { MainThreadComments };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZENvbW1lbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRDb21tZW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sK0JBQStCLENBQUE7QUFDOUQsT0FBTyxFQUNOLFVBQVUsRUFDVixhQUFhLEVBQ2IsZUFBZSxFQUVmLGlCQUFpQixHQUNqQixNQUFNLG1DQUFtQyxDQUFBO0FBQzFDLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUE7QUFDaEUsT0FBTyxFQUFVLEtBQUssRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3BFLE9BQU8sS0FBSyxTQUFTLE1BQU0scUNBQXFDLENBQUE7QUFFaEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ3hFLE9BQU8sRUFDTixvQkFBb0IsR0FFcEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBRU4sZUFBZSxHQUNmLE1BQU0sa0RBQWtELENBQUE7QUFDekQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzlFLE9BQU8sRUFHTixjQUFjLEVBQ2QsV0FBVyxHQUdYLE1BQU0sK0JBQStCLENBQUE7QUFDdEMsT0FBTyxFQUNOLGdCQUFnQixFQUNoQix3QkFBd0IsRUFDeEIsbUJBQW1CLEdBQ25CLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUdOLFVBQVUsSUFBSSxjQUFjLEVBRzVCLHNCQUFzQixHQUN0QixNQUFNLHVCQUF1QixDQUFBO0FBQzlCLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN0RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxn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