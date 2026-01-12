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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdENvbW1lbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0Q29tbWVudHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRXpELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDdkQsT0FBTyxFQUFFLGVBQWUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRXRGLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sNkJBQTZCLENBQUE7QUFFaEUsT0FBTyxLQUFLLFNBQVMsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNoRSxPQUFPLEVBQ04sc0JBQXNCLEdBRXRCLE1BQU0sbURBQW1ELENBQUE7QUFFMUQsT0FBTyxLQUFLLG9CQUFvQixNQUFNLDRCQUE0QixDQUFBO0FBQ2xFLE9BQU8sS0FBSyxLQUFLLE1BQU0sbUJBQW1CLENBQUE7QUFFMUMsT0FBTyxFQUdOLFdBQVcsR0FHWCxNQUFNLHVCQUF1QixDQUFBO0FBRTlCLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBYXhGLE1BQU0sVUFBVSxxQkFBcUIsQ0FDcEMsV0FBeUIsRUFDekIsUUFBeUIsRUFDekIsU0FBMkI7SUFFM0IsTUFBTSxLQUFLLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtJQUVsRSxNQUFNLG1CQUFtQjtpQkFDVCxlQUFVLEdBQUcsQ0FBQyxBQUFKLENBQUk7UUFVN0I7WUFSUSx3QkFBbUIsR0FBa0QsSUFBSSxHQUFHLEVBR2pG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