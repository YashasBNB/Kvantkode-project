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
import { asPromise } from '../../../base/common/async.js';
import { debounce } from '../../../base/common/decorators.js';
import { Emitter } from '../../../base/common/event.js';
import { DisposableStore, MutableDisposable } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import * as languages from '../../../editor/common/languages.js';
import { ExtensionIdentifierMap, } from '../../../platform/extensions/common/extensions.js';
import * as extHostTypeConverter from './extHostTypeConverters.js';
import * as types from './extHostTypes.js';
import { MainContext, } from './extHost.protocol.js';
import { checkProposedApiEnabled } from '../../services/extensions/common/extensions.js';
export function createExtHostComments(mainContext, commands, documents) {
    const proxy = mainContext.getProxy(MainContext.MainThreadComments);
    class ExtHostCommentsImpl {
        static { this.handlePool = 0; }
        constructor() {
            this._commentControllers = new Map();
            this._commentControllersByExtension = new ExtensionIdentifierMap();
            commands.registerArgumentProcessor({
                processArgument: (arg) => {
                    if (arg && arg.$mid === 6 /* MarshalledId.CommentController */) {
                        const commentController = this._commentControllers.get(arg.handle);
                        if (!commentController) {
                            return arg;
                        }
                        return commentController.value;
                    }
                    else if (arg && arg.$mid === 7 /* MarshalledId.CommentThread */) {
                        const marshalledCommentThread = arg;
                        const commentController = this._commentControllers.get(marshalledCommentThread.commentControlHandle);
                        if (!commentController) {
                            return marshalledCommentThread;
                        }
                        const commentThread = commentController.getCommentThread(marshalledCommentThread.commentThreadHandle);
                        if (!commentThread) {
                            return marshalledCommentThread;
                        }
                        return commentThread.value;
                    }
                    else if (arg &&
                        (arg.$mid === 9 /* MarshalledId.CommentThreadReply */ ||
                            arg.$mid === 8 /* MarshalledId.CommentThreadInstance */)) {
                        const commentController = this._commentControllers.get(arg.thread.commentControlHandle);
                        if (!commentController) {
                            return arg;
                        }
                        const commentThread = commentController.getCommentThread(arg.thread.commentThreadHandle);
                        if (!commentThread) {
                            return arg;
                        }
                        if (arg.$mid === 8 /* MarshalledId.CommentThreadInstance */) {
                            return commentThread.value;
                        }
                        return {
                            thread: commentThread.value,
                            text: arg.text,
                        };
                    }
                    else if (arg && arg.$mid === 10 /* MarshalledId.CommentNode */) {
                        const commentController = this._commentControllers.get(arg.thread.commentControlHandle);
                        if (!commentController) {
                            return arg;
                        }
                        const commentThread = commentController.getCommentThread(arg.thread.commentThreadHandle);
                        if (!commentThread) {
                            return arg;
                        }
                        const commentUniqueId = arg.commentUniqueId;
                        const comment = commentThread.getCommentByUniqueId(commentUniqueId);
                        if (!comment) {
                            return arg;
                        }
                        return comment;
                    }
                    else if (arg && arg.$mid === 11 /* MarshalledId.CommentThreadNode */) {
                        const commentController = this._commentControllers.get(arg.thread.commentControlHandle);
                        if (!commentController) {
                            return arg;
                        }
                        const commentThread = commentController.getCommentThread(arg.thread.commentThreadHandle);
                        if (!commentThread) {
                            return arg;
                        }
                        const body = arg.text;
                        const commentUniqueId = arg.commentUniqueId;
                        const comment = commentThread.getCommentByUniqueId(commentUniqueId);
                        if (!comment) {
                            return arg;
                        }
                        // If the old comment body was a markdown string, use a markdown string here too.
                        if (typeof comment.body === 'string') {
                            comment.body = body;
                        }
                        else {
                            comment.body = new types.MarkdownString(body);
                        }
                        return comment;
                    }
                    return arg;
                },
            });
        }
        createCommentController(extension, id, label) {
            const handle = ExtHostCommentsImpl.handlePool++;
            const commentController = new ExtHostCommentController(extension, handle, id, label);
            this._commentControllers.set(commentController.handle, commentController);
            const commentControllers = this._commentControllersByExtension.get(extension.identifier) || [];
            commentControllers.push(commentController);
            this._commentControllersByExtension.set(extension.identifier, commentControllers);
            return commentController.value;
        }
        async $createCommentThreadTemplate(commentControllerHandle, uriComponents, range, editorId) {
            const commentController = this._commentControllers.get(commentControllerHandle);
            if (!commentController) {
                return;
            }
            commentController.$createCommentThreadTemplate(uriComponents, range, editorId);
        }
        async $setActiveComment(controllerHandle, commentInfo) {
            const commentController = this._commentControllers.get(controllerHandle);
            if (!commentController) {
                return;
            }
            commentController.$setActiveComment(commentInfo ?? undefined);
        }
        async $updateCommentThreadTemplate(commentControllerHandle, threadHandle, range) {
            const commentController = this._commentControllers.get(commentControllerHandle);
            if (!commentController) {
                return;
            }
            commentController.$updateCommentThreadTemplate(threadHandle, range);
        }
        $deleteCommentThread(commentControllerHandle, commentThreadHandle) {
            const commentController = this._commentControllers.get(commentControllerHandle);
            commentController?.$deleteCommentThread(commentThreadHandle);
        }
        async $updateCommentThread(commentControllerHandle, commentThreadHandle, changes) {
            const commentController = this._commentControllers.get(commentControllerHandle);
            commentController?.$updateCommentThread(commentThreadHandle, changes);
        }
        async $provideCommentingRanges(commentControllerHandle, uriComponents, token) {
            const commentController = this._commentControllers.get(commentControllerHandle);
            if (!commentController || !commentController.commentingRangeProvider) {
                return Promise.resolve(undefined);
            }
            const document = await documents.ensureDocumentData(URI.revive(uriComponents));
            return asPromise(async () => {
                const rangesResult = await commentController.commentingRangeProvider?.provideCommentingRanges(document.document, token);
                let ranges;
                if (Array.isArray(rangesResult)) {
                    ranges = {
                        ranges: rangesResult,
                        fileComments: false,
                    };
                }
                else if (rangesResult) {
                    ranges = {
                        ranges: rangesResult.ranges || [],
                        fileComments: rangesResult.enableFileComments || false,
                    };
                }
                else {
                    ranges = rangesResult ?? undefined;
                }
                return ranges;
            }).then((ranges) => {
                let convertedResult = undefined;
                if (ranges) {
                    convertedResult = {
                        ranges: ranges.ranges.map((x) => extHostTypeConverter.Range.from(x)),
                        fileComments: ranges.fileComments,
                    };
                }
                return convertedResult;
            });
        }
        $toggleReaction(commentControllerHandle, threadHandle, uri, comment, reaction) {
            const commentController = this._commentControllers.get(commentControllerHandle);
            if (!commentController || !commentController.reactionHandler) {
                return Promise.resolve(undefined);
            }
            return asPromise(() => {
                const commentThread = commentController.getCommentThread(threadHandle);
                if (commentThread) {
                    const vscodeComment = commentThread.getCommentByUniqueId(comment.uniqueIdInThread);
                    if (commentController !== undefined && vscodeComment) {
                        if (commentController.reactionHandler) {
                            return commentController.reactionHandler(vscodeComment, convertFromReaction(reaction));
                        }
                    }
                }
                return Promise.resolve(undefined);
            });
        }
    }
    class ExtHostCommentThread {
        static { this._handlePool = 0; }
        set threadId(id) {
            this._id = id;
        }
        get threadId() {
            return this._id;
        }
        get id() {
            return this._id;
        }
        get resource() {
            return this._uri;
        }
        get uri() {
            return this._uri;
        }
        set range(range) {
            if ((range === undefined) !== (this._range === undefined) ||
                !range ||
                !this._range ||
                !range.isEqual(this._range)) {
                this._range = range;
                this.modifications.range = range;
                this._onDidUpdateCommentThread.fire();
            }
        }
        get range() {
            return this._range;
        }
        set canReply(state) {
            if (this._canReply !== state) {
                this._canReply = state;
                this.modifications.canReply = state;
                this._onDidUpdateCommentThread.fire();
            }
        }
        get canReply() {
            return this._canReply;
        }
        get label() {
            return this._label;
        }
        set label(label) {
            this._label = label;
            this.modifications.label = label;
            this._onDidUpdateCommentThread.fire();
        }
        get contextValue() {
            return this._contextValue;
        }
        set contextValue(context) {
            this._contextValue = context;
            this.modifications.contextValue = context;
            this._onDidUpdateCommentThread.fire();
        }
        get comments() {
            return this._comments;
        }
        set comments(newComments) {
            this._comments = newComments;
            this.modifications.comments = newComments;
            this._onDidUpdateCommentThread.fire();
        }
        get collapsibleState() {
            return this._collapseState;
        }
        set collapsibleState(newState) {
            if (this._collapseState === newState) {
                return;
            }
            this._collapseState = newState;
            this.modifications.collapsibleState = newState;
            this._onDidUpdateCommentThread.fire();
        }
        get state() {
            return this._state;
        }
        set state(newState) {
            this._state = newState;
            if (typeof newState === 'object') {
                checkProposedApiEnabled(this.extensionDescription, 'commentThreadApplicability');
                this.modifications.state = newState.resolved;
                this.modifications.applicability = newState.applicability;
            }
            else {
                this.modifications.state = newState;
            }
            this._onDidUpdateCommentThread.fire();
        }
        get isDisposed() {
            return this._isDiposed;
        }
        constructor(commentControllerId, _commentControllerHandle, _id, _uri, _range, _comments, extensionDescription, _isTemplate, editorId) {
            this._commentControllerHandle = _commentControllerHandle;
            this._id = _id;
            this._uri = _uri;
            this._range = _range;
            this._comments = _comments;
            this.extensionDescription = extensionDescription;
            this._isTemplate = _isTemplate;
            this.handle = ExtHostCommentThread._handlePool++;
            this.commentHandle = 0;
            this.modifications = Object.create(null);
            this._onDidUpdateCommentThread = new Emitter();
            this.onDidUpdateCommentThread = this._onDidUpdateCommentThread.event;
            this._canReply = true;
            this._commentsMap = new Map();
            this._acceptInputDisposables = new MutableDisposable();
            this._acceptInputDisposables.value = new DisposableStore();
            if (this._id === undefined) {
                this._id = `${commentControllerId}.${this.handle}`;
            }
            proxy.$createCommentThread(_commentControllerHandle, this.handle, this._id, this._uri, extHostTypeConverter.Range.from(this._range), this._comments.map((cmt) => convertToDTOComment(this, cmt, this._commentsMap, this.extensionDescription)), extensionDescription.identifier, this._isTemplate, editorId);
            this._localDisposables = [];
            this._isDiposed = false;
            this._localDisposables.push(this.onDidUpdateCommentThread(() => {
                this.eventuallyUpdateCommentThread();
            }));
            this._localDisposables.push({
                dispose: () => {
                    proxy.$deleteCommentThread(_commentControllerHandle, this.handle);
                },
            });
            const that = this;
            this.value = {
                get uri() {
                    return that.uri;
                },
                get range() {
                    return that.range;
                },
                set range(value) {
                    that.range = value;
                },
                get comments() {
                    return that.comments;
                },
                set comments(value) {
                    that.comments = value;
                },
                get collapsibleState() {
                    return that.collapsibleState;
                },
                set collapsibleState(value) {
                    that.collapsibleState = value;
                },
                get canReply() {
                    return that.canReply;
                },
                set canReply(state) {
                    that.canReply = state;
                },
                get contextValue() {
                    return that.contextValue;
                },
                set contextValue(value) {
                    that.contextValue = value;
                },
                get label() {
                    return that.label;
                },
                set label(value) {
                    that.label = value;
                },
                get state() {
                    return that.state;
                },
                set state(value) {
                    that.state = value;
                },
                reveal: (comment, options) => that.reveal(comment, options),
                hide: () => that.hide(),
                dispose: () => {
                    that.dispose();
                },
            };
        }
        updateIsTemplate() {
            if (this._isTemplate) {
                this._isTemplate = false;
                this.modifications.isTemplate = false;
            }
        }
        eventuallyUpdateCommentThread() {
            if (this._isDiposed) {
                return;
            }
            this.updateIsTemplate();
            if (!this._acceptInputDisposables.value) {
                this._acceptInputDisposables.value = new DisposableStore();
            }
            const modified = (value) => Object.prototype.hasOwnProperty.call(this.modifications, value);
            const formattedModifications = {};
            if (modified('range')) {
                formattedModifications.range = extHostTypeConverter.Range.from(this._range);
            }
            if (modified('label')) {
                formattedModifications.label = this.label;
            }
            if (modified('contextValue')) {
                /*
                 * null -> cleared contextValue
                 * undefined -> no change
                 */
                formattedModifications.contextValue = this.contextValue ?? null;
            }
            if (modified('comments')) {
                formattedModifications.comments = this._comments.map((cmt) => convertToDTOComment(this, cmt, this._commentsMap, this.extensionDescription));
            }
            if (modified('collapsibleState')) {
                formattedModifications.collapseState = convertToCollapsibleState(this._collapseState);
            }
            if (modified('canReply')) {
                formattedModifications.canReply = this.canReply;
            }
            if (modified('state')) {
                formattedModifications.state = convertToState(this._state);
            }
            if (modified('applicability')) {
                formattedModifications.applicability = convertToRelevance(this._state);
            }
            if (modified('isTemplate')) {
                formattedModifications.isTemplate = this._isTemplate;
            }
            this.modifications = {};
            proxy.$updateCommentThread(this._commentControllerHandle, this.handle, this._id, this._uri, formattedModifications);
        }
        getCommentByUniqueId(uniqueId) {
            for (const key of this._commentsMap) {
                const comment = key[0];
                const id = key[1];
                if (uniqueId === id) {
                    return comment;
                }
            }
            return;
        }
        async reveal(commentOrOptions, options) {
            checkProposedApiEnabled(this.extensionDescription, 'commentReveal');
            let comment;
            if (commentOrOptions && commentOrOptions.body !== undefined) {
                comment = commentOrOptions;
            }
            else {
                options = options ?? commentOrOptions;
            }
            let commentToReveal = comment ? this._commentsMap.get(comment) : undefined;
            commentToReveal ??= this._commentsMap.get(this._comments[0]);
            let preserveFocus = true;
            let focusReply = false;
            if (options?.focus === types.CommentThreadFocus.Reply) {
                focusReply = true;
                preserveFocus = false;
            }
            else if (options?.focus === types.CommentThreadFocus.Comment) {
                preserveFocus = false;
            }
            return proxy.$revealCommentThread(this._commentControllerHandle, this.handle, commentToReveal, { preserveFocus, focusReply });
        }
        async hide() {
            return proxy.$hideCommentThread(this._commentControllerHandle, this.handle);
        }
        dispose() {
            this._isDiposed = true;
            this._acceptInputDisposables.dispose();
            this._localDisposables.forEach((disposable) => disposable.dispose());
        }
    }
    __decorate([
        debounce(100)
    ], ExtHostCommentThread.prototype, "eventuallyUpdateCommentThread", null);
    class ExtHostCommentController {
        get id() {
            return this._id;
        }
        get label() {
            return this._label;
        }
        get handle() {
            return this._handle;
        }
        get commentingRangeProvider() {
            return this._commentingRangeProvider;
        }
        set commentingRangeProvider(provider) {
            this._commentingRangeProvider = provider;
            if (provider?.resourceHints) {
                checkProposedApiEnabled(this._extension, 'commentingRangeHint');
            }
            proxy.$updateCommentingRanges(this.handle, provider?.resourceHints);
        }
        get reactionHandler() {
            return this._reactionHandler;
        }
        set reactionHandler(handler) {
            this._reactionHandler = handler;
            proxy.$updateCommentControllerFeatures(this.handle, { reactionHandler: !!handler });
        }
        get options() {
            return this._options;
        }
        set options(options) {
            this._options = options;
            proxy.$updateCommentControllerFeatures(this.handle, { options: this._options });
        }
        get activeComment() {
            checkProposedApiEnabled(this._extension, 'activeComment');
            return this._activeComment;
        }
        get activeCommentThread() {
            checkProposedApiEnabled(this._extension, 'activeComment');
            return this._activeThread?.value;
        }
        constructor(_extension, _handle, _id, _label) {
            this._extension = _extension;
            this._handle = _handle;
            this._id = _id;
            this._label = _label;
            this._threads = new Map();
            proxy.$registerCommentController(this.handle, _id, _label, this._extension.identifier.value);
            const that = this;
            this.value = Object.freeze({
                id: that.id,
                label: that.label,
                get options() {
                    return that.options;
                },
                set options(options) {
                    that.options = options;
                },
                get commentingRangeProvider() {
                    return that.commentingRangeProvider;
                },
                set commentingRangeProvider(commentingRangeProvider) {
                    that.commentingRangeProvider = commentingRangeProvider;
                },
                get reactionHandler() {
                    return that.reactionHandler;
                },
                set reactionHandler(handler) {
                    that.reactionHandler = handler;
                },
                // get activeComment(): vscode.Comment | undefined { return that.activeComment; },
                get activeCommentThread() {
                    return that.activeCommentThread;
                },
                createCommentThread(uri, range, comments) {
                    return that.createCommentThread(uri, range, comments).value;
                },
                dispose: () => {
                    that.dispose();
                },
            }); // TODO @alexr00 remove this cast when the proposed API is stable
            this._localDisposables = [];
            this._localDisposables.push({
                dispose: () => {
                    proxy.$unregisterCommentController(this.handle);
                },
            });
        }
        createCommentThread(resource, range, comments) {
            const commentThread = new ExtHostCommentThread(this.id, this.handle, undefined, resource, range, comments, this._extension, false);
            this._threads.set(commentThread.handle, commentThread);
            return commentThread;
        }
        $setActiveComment(commentInfo) {
            if (!commentInfo) {
                this._activeComment = undefined;
                this._activeThread = undefined;
                return;
            }
            const thread = this._threads.get(commentInfo.commentThreadHandle);
            if (thread) {
                this._activeComment = commentInfo.uniqueIdInThread
                    ? thread.getCommentByUniqueId(commentInfo.uniqueIdInThread)
                    : undefined;
                this._activeThread = thread;
            }
        }
        $createCommentThreadTemplate(uriComponents, range, editorId) {
            const commentThread = new ExtHostCommentThread(this.id, this.handle, undefined, URI.revive(uriComponents), extHostTypeConverter.Range.to(range), [], this._extension, true, editorId);
            commentThread.collapsibleState = languages.CommentThreadCollapsibleState.Expanded;
            this._threads.set(commentThread.handle, commentThread);
            return commentThread;
        }
        $updateCommentThreadTemplate(threadHandle, range) {
            const thread = this._threads.get(threadHandle);
            if (thread) {
                thread.range = extHostTypeConverter.Range.to(range);
            }
        }
        $updateCommentThread(threadHandle, changes) {
            const thread = this._threads.get(threadHandle);
            if (!thread) {
                return;
            }
            const modified = (value) => Object.prototype.hasOwnProperty.call(changes, value);
            if (modified('collapseState')) {
                thread.collapsibleState = convertToCollapsibleState(changes.collapseState);
            }
        }
        $deleteCommentThread(threadHandle) {
            const thread = this._threads.get(threadHandle);
            thread?.dispose();
            this._threads.delete(threadHandle);
        }
        getCommentThread(handle) {
            return this._threads.get(handle);
        }
        dispose() {
            this._threads.forEach((value) => {
                value.dispose();
            });
            this._localDisposables.forEach((disposable) => disposable.dispose());
        }
    }
    function convertToDTOComment(thread, vscodeComment, commentsMap, extension) {
        let commentUniqueId = commentsMap.get(vscodeComment);
        if (!commentUniqueId) {
            commentUniqueId = ++thread.commentHandle;
            commentsMap.set(vscodeComment, commentUniqueId);
        }
        if (vscodeComment.state !== undefined) {
            checkProposedApiEnabled(extension, 'commentsDraftState');
        }
        if (vscodeComment.reactions?.some((reaction) => reaction.reactors !== undefined)) {
            checkProposedApiEnabled(extension, 'commentReactor');
        }
        return {
            mode: vscodeComment.mode,
            contextValue: vscodeComment.contextValue,
            uniqueIdInThread: commentUniqueId,
            body: typeof vscodeComment.body === 'string'
                ? vscodeComment.body
                : extHostTypeConverter.MarkdownString.from(vscodeComment.body),
            userName: vscodeComment.author.name,
            userIconPath: vscodeComment.author.iconPath,
            label: vscodeComment.label,
            commentReactions: vscodeComment.reactions
                ? vscodeComment.reactions.map((reaction) => convertToReaction(reaction))
                : undefined,
            state: vscodeComment.state,
            timestamp: vscodeComment.timestamp?.toJSON(),
        };
    }
    function convertToReaction(reaction) {
        return {
            label: reaction.label,
            iconPath: reaction.iconPath
                ? extHostTypeConverter.pathOrURIToURI(reaction.iconPath)
                : undefined,
            count: reaction.count,
            hasReacted: reaction.authorHasReacted,
            reactors: (reaction.reactors &&
                reaction.reactors.length > 0 &&
                typeof reaction.reactors[0] !== 'string'
                ? reaction.reactors.map((reactor) => reactor.name)
                : reaction.reactors),
        };
    }
    function convertFromReaction(reaction) {
        return {
            label: reaction.label || '',
            count: reaction.count || 0,
            iconPath: reaction.iconPath ? URI.revive(reaction.iconPath) : '',
            authorHasReacted: reaction.hasReacted || false,
            reactors: reaction.reactors?.map((reactor) => ({ name: reactor })),
        };
    }
    function convertToCollapsibleState(kind) {
        if (kind !== undefined) {
            switch (kind) {
                case types.CommentThreadCollapsibleState.Expanded:
                    return languages.CommentThreadCollapsibleState.Expanded;
                case types.CommentThreadCollapsibleState.Collapsed:
                    return languages.CommentThreadCollapsibleState.Collapsed;
            }
        }
        return languages.CommentThreadCollapsibleState.Collapsed;
    }
    function convertToState(kind) {
        let resolvedKind;
        if (typeof kind === 'object') {
            resolvedKind = kind.resolved;
        }
        else {
            resolvedKind = kind;
        }
        if (resolvedKind !== undefined) {
            switch (resolvedKind) {
                case types.CommentThreadState.Unresolved:
                    return languages.CommentThreadState.Unresolved;
                case types.CommentThreadState.Resolved:
                    return languages.CommentThreadState.Resolved;
            }
        }
        return languages.CommentThreadState.Unresolved;
    }
    function convertToRelevance(kind) {
        let applicabilityKind = undefined;
        if (typeof kind === 'object') {
            applicabilityKind = kind.applicability;
        }
        if (applicabilityKind !== undefined) {
            switch (applicabilityKind) {
                case types.CommentThreadApplicability.Current:
                    return languages.CommentThreadApplicability.Current;
                case types.CommentThreadApplicability.Outdated:
                    return languages.CommentThreadApplicability.Outdated;
            }
        }
        return languages.CommentThreadApplicability.Current;
    }
    return new ExtHostCommentsImpl();
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdENvbW1lbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdENvbW1lbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUV6RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxlQUFlLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUV0RixPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFBO0FBRWhFLE9BQU8sS0FBSyxTQUFTLE1BQU0scUNBQXFDLENBQUE7QUFDaEUsT0FBTyxFQUNOLHNCQUFzQixHQUV0QixNQUFNLG1EQUFtRCxDQUFBO0FBRTFELE9BQU8sS0FBSyxvQkFBb0IsTUFBTSw0QkFBNEIsQ0FBQTtBQUNsRSxPQUFPLEtBQUssS0FBSyxNQUFNLG1CQUFtQixDQUFBO0FBRTFDLE9BQU8sRUFHTixXQUFXLEdBR1gsTUFBTSx1QkFBdUIsQ0FBQTtBQUU5QixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQWF4RixNQUFNLFVBQVUscUJBQXFCLENBQ3BDLFdBQXlCLEVBQ3pCLFFBQXlCLEVBQ3pCLFNBQTJCO0lBRTNCLE1BQU0sS0FBSyxHQUFHLFdBQVcsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLGtCQUFrQixDQUFDLENBQUE7SUFFbEUsTUFBTSxtQkFBbUI7aUJBQ1QsZUFBVSxHQUFHLENBQUMsQUFBSixDQUFJO1FBVTdCO1lBUlEsd0JBQW1CLEdBQWtELElBQUksR0FBRyxFQUdqRixDQUFB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