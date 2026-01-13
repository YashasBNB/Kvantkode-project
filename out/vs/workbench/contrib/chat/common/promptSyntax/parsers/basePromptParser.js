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
import { TopError } from './topError.js';
import { URI } from '../../../../../../base/common/uri.js';
import { ChatPromptCodec } from '../codecs/chatPromptCodec.js';
import { Emitter } from '../../../../../../base/common/event.js';
import { FileReference } from '../codecs/tokens/fileReference.js';
import { assertDefined } from '../../../../../../base/common/types.js';
import { DeferredPromise } from '../../../../../../base/common/async.js';
import { ILogService } from '../../../../../../platform/log/common/log.js';
import { PromptVariableWithData } from '../codecs/tokens/promptVariable.js';
import { basename, extUri } from '../../../../../../base/common/resources.js';
import { assert, assertNever } from '../../../../../../base/common/assert.js';
import { isPromptFile } from '../../../../../../platform/prompts/common/constants.js';
import { ObservableDisposable } from '../../../../../../base/common/observableDisposable.js';
import { IInstantiationService } from '../../../../../../platform/instantiation/common/instantiation.js';
import { MarkdownLink } from '../../../../../../editor/common/codecs/markdownCodec/tokens/markdownLink.js';
import { NotPromptFile, RecursiveReference, FolderReference, ResolveError, } from '../../promptFileReferenceErrors.js';
/**
 * Base prompt parser class that provides a common interface for all
 * prompt parsers that are responsible for parsing chat prompt syntax.
 */
let BasePromptParser = class BasePromptParser extends ObservableDisposable {
    /**
     * Subscribe to the `onUpdate` event that is fired when prompt tokens are updated.
     * @param callback The callback function to be called on updates.
     */
    onUpdate(callback) {
        this._register(this._onUpdate.event(callback));
        return this;
    }
    /**
     * If file reference resolution fails, this attribute will be set
     * to an error instance that describes the error condition.
     */
    get errorCondition() {
        return this._errorCondition;
    }
    /**
     * Whether file references resolution failed.
     * Set to `undefined` if the `resolve` method hasn't been ever called yet.
     */
    get resolveFailed() {
        if (!this.firstParseResult.gotFirstResult) {
            return undefined;
        }
        return !!this._errorCondition;
    }
    /**
     * Returned promise is resolved when the parser process is settled.
     * The settled state means that the prompt parser stream exists and
     * has ended, or an error condition has been set in case of failure.
     *
     * Furthermore, this function can be called multiple times and will
     * block until the latest prompt contents parsing logic is settled
     * (e.g., for every `onContentChanged` event of the prompt source).
     */
    async settled() {
        assert(this.started, 'Cannot wait on the parser that did not start yet.');
        await this.firstParseResult.promise;
        if (this.errorCondition) {
            return this;
        }
        assertDefined(this.stream, 'No stream reference found.');
        await this.stream.settled;
        return this;
    }
    /**
     * Same as {@linkcode settled} but also waits for all possible
     * nested child prompt references and their children to be settled.
     */
    async allSettled() {
        await this.settled();
        await Promise.allSettled(this.references.map((reference) => {
            return reference.allSettled();
        }));
        return this;
    }
    constructor(promptContentsProvider, seenReferences = [], instantiationService, logService) {
        super();
        this.promptContentsProvider = promptContentsProvider;
        this.instantiationService = instantiationService;
        this.logService = logService;
        /**
         * List of file references in the current branch of the file reference tree.
         */
        this._references = [];
        /**
         * The event is fired when lines or their content change.
         */
        this._onUpdate = this._register(new Emitter());
        /**
         * The promise is resolved when at least one parse result (a stream or
         * an error) has been received from the prompt contents provider.
         */
        this.firstParseResult = new FirstParseResult();
        /**
         * Private attribute to track if the {@linkcode start}
         * method has been already called at least once.
         */
        this.started = false;
        this._onUpdate.fire = this._onUpdate.fire.bind(this._onUpdate);
        // to prevent infinite file recursion, we keep track of all references in
        // the current branch of the file reference tree and check if the current
        // file reference has been already seen before
        if (seenReferences.includes(this.uri.path)) {
            seenReferences.push(this.uri.path);
            this._errorCondition = new RecursiveReference(this.uri, seenReferences);
            this._onUpdate.fire();
            this.firstParseResult.complete();
            return this;
        }
        // we don't care if reading the file fails below, hence can add the path
        // of the current reference to the `seenReferences` set immediately, -
        // even if the file doesn't exist, we would never end up in the recursion
        seenReferences.push(this.uri.path);
        this._register(this.promptContentsProvider.onContentChanged((streamOrError) => {
            // process the received message
            this.onContentsChanged(streamOrError, seenReferences);
            // indicate that we've received at least one `onContentChanged` event
            this.firstParseResult.complete();
        }));
        // dispose self when contents provider is disposed
        this.promptContentsProvider.onDispose(this.dispose.bind(this));
    }
    /**
     * Handler the event event that is triggered when prompt contents change.
     *
     * @param streamOrError Either a binary stream of file contents, or an error object
     * 						that was generated during the reference resolve attempt.
     * @param seenReferences List of parent references that we've have already seen
     * 					 	during the process of traversing the references tree. It's
     * 						used to prevent the tree navigation to fall into an infinite
     * 						references recursion.
     */
    onContentsChanged(streamOrError, seenReferences) {
        // dispose and cleanup the previously received stream
        // object or an error condition, if any received yet
        this.stream?.dispose();
        delete this.stream;
        delete this._errorCondition;
        // dispose all currently existing references
        this.disposeReferences();
        // if an error received, set up the error condition and stop
        if (streamOrError instanceof ResolveError) {
            this._errorCondition = streamOrError;
            this._onUpdate.fire();
            return;
        }
        // decode the byte stream to a stream of prompt tokens
        this.stream = ChatPromptCodec.decode(streamOrError);
        // on error or stream end, dispose the stream and fire the update event
        this.stream.on('error', this.onStreamEnd.bind(this, this.stream));
        this.stream.on('end', this.onStreamEnd.bind(this, this.stream));
        // when some tokens received, process and store the references
        this.stream.on('data', (token) => {
            if (token instanceof PromptVariableWithData) {
                try {
                    this.onReference(FileReference.from(token), [...seenReferences]);
                }
                catch (error) {
                    // no-op
                }
            }
            // note! the `isURL` is a simple check and needs to be improved to truly
            // 		 handle only file references, ignoring broken URLs or references
            if (token instanceof MarkdownLink && !token.isURL) {
                this.onReference(token, [...seenReferences]);
            }
        });
        // calling `start` on a disposed stream throws, so we warn and return instead
        if (this.stream.disposed) {
            this.logService.warn(`[prompt parser][${basename(this.uri)}] cannot start stream that has been already disposed, aborting`);
            return;
        }
        // start receiving data on the stream
        this.stream.start();
    }
    /**
     * Handle a new reference token inside prompt contents.
     */
    onReference(token, seenReferences) {
        const referenceUri = extUri.resolvePath(this.dirname, token.path);
        const contentProvider = this.promptContentsProvider.createNew({ uri: referenceUri });
        const reference = this.instantiationService.createInstance(PromptReference, contentProvider, token, seenReferences);
        // the content provider is exclusively owned by the reference
        // hence dispose it when the reference is disposed
        reference.onDispose(contentProvider.dispose.bind(contentProvider));
        this._references.push(reference);
        reference.onUpdate(this._onUpdate.fire);
        this._onUpdate.fire();
        reference.start();
        return this;
    }
    /**
     * Handle the `stream` end event.
     *
     * @param stream The stream that has ended.
     * @param error Optional error object if stream ended with an error.
     */
    onStreamEnd(_stream, error) {
        if (error) {
            this.logService.warn(`[prompt parser][${basename(this.uri)}] received an error on the chat prompt decoder stream: ${error}`);
        }
        this._onUpdate.fire();
        return this;
    }
    /**
     * Dispose all currently held references.
     */
    disposeReferences() {
        for (const reference of [...this._references]) {
            reference.dispose();
        }
        this._references.length = 0;
    }
    /**
     * Start the prompt parser.
     */
    start() {
        // if already started, nothing to do
        if (this.started) {
            return this;
        }
        this.started = true;
        // if already in the error state that could be set
        // in the constructor, then nothing to do
        if (this.errorCondition) {
            return this;
        }
        this.promptContentsProvider.start();
        return this;
    }
    /**
     * Associated URI of the prompt.
     */
    get uri() {
        return this.promptContentsProvider.uri;
    }
    /**
     * Get the parent folder of the file reference.
     */
    get dirname() {
        return URI.joinPath(this.uri, '..');
    }
    /**
     * Get a list of immediate child references of the prompt.
     */
    get references() {
        return [...this._references];
    }
    /**
     * Get a list of all references of the prompt, including
     * all possible nested references its children may have.
     */
    get allReferences() {
        const result = [];
        for (const reference of this.references) {
            result.push(reference);
            if (reference.type === 'file') {
                result.push(...reference.allReferences);
            }
        }
        return result;
    }
    /**
     * Get list of all valid references.
     */
    get allValidReferences() {
        return (this.allReferences
            // filter out unresolved references
            .filter((reference) => {
            const { errorCondition } = reference;
            // include all references without errors
            if (!errorCondition) {
                return true;
            }
            // filter out folder references from the list
            if (errorCondition instanceof FolderReference) {
                return false;
            }
            // include non-prompt file references
            return errorCondition instanceof NotPromptFile;
        }));
    }
    /**
     * Get list of all valid child references as URIs.
     */
    get allValidReferencesUris() {
        return this.allValidReferences.map((child) => child.uri);
    }
    /**
     * Get list of errors for the direct links of the current reference.
     */
    get errors() {
        const childErrors = [];
        for (const reference of this.references) {
            const { errorCondition } = reference;
            if (errorCondition && !(errorCondition instanceof NotPromptFile)) {
                childErrors.push(errorCondition);
            }
        }
        return childErrors;
    }
    /**
     * List of all errors that occurred while resolving the current
     * reference including all possible errors of nested children.
     */
    get allErrors() {
        const result = [];
        for (const reference of this.references) {
            const { errorCondition } = reference;
            if (errorCondition && !(errorCondition instanceof NotPromptFile)) {
                result.push({
                    originalError: errorCondition,
                    parentUri: this.uri,
                });
            }
            // recursively collect all possible errors of its children
            result.push(...reference.allErrors);
        }
        return result;
    }
    /**
     * The top most error of the current reference or any of its
     * possible child reference errors.
     */
    get topError() {
        if (this.errorCondition) {
            return new TopError({
                errorSubject: 'root',
                errorsCount: 1,
                originalError: this.errorCondition,
            });
        }
        const childErrors = [...this.errors];
        const nestedErrors = [];
        for (const reference of this.references) {
            nestedErrors.push(...reference.allErrors);
        }
        if (childErrors.length === 0 && nestedErrors.length === 0) {
            return undefined;
        }
        const firstDirectChildError = childErrors[0];
        const firstNestedChildError = nestedErrors[0];
        const hasDirectChildError = firstDirectChildError !== undefined;
        const firstChildError = hasDirectChildError
            ? {
                originalError: firstDirectChildError,
                parentUri: this.uri,
            }
            : firstNestedChildError;
        const totalErrorsCount = childErrors.length + nestedErrors.length;
        const subject = hasDirectChildError ? 'child' : 'indirect-child';
        return new TopError({
            errorSubject: subject,
            originalError: firstChildError.originalError,
            parentUri: firstChildError.parentUri,
            errorsCount: totalErrorsCount,
        });
    }
    /**
     * Check if the current reference points to a given resource.
     */
    sameUri(otherUri) {
        return this.uri.toString() === otherUri.toString();
    }
    /**
     * Check if the current reference points to a prompt snippet file.
     */
    get isPromptFile() {
        return isPromptFile(this.uri);
    }
    /**
     * Returns a string representation of this object.
     */
    toString() {
        return `prompt:${this.uri.path}`;
    }
    /**
     * @inheritdoc
     */
    dispose() {
        if (this.disposed) {
            return;
        }
        this.disposeReferences();
        this.stream?.dispose();
        this._onUpdate.fire();
        super.dispose();
    }
};
BasePromptParser = __decorate([
    __param(2, IInstantiationService),
    __param(3, ILogService)
], BasePromptParser);
export { BasePromptParser };
/**
 * Prompt reference object represents any reference inside prompt text
 * contents. For instance the file variable(`#file:/path/to/file.md`) or
 * a markdown link(`[#file:file.md](/path/to/file.md)`).
 */
let PromptReference = class PromptReference extends ObservableDisposable {
    constructor(promptContentsProvider, token, seenReferences = [], initService) {
        super();
        this.promptContentsProvider = promptContentsProvider;
        this.token = token;
        this.range = this.token.range;
        this.path = this.token.path;
        this.text = this.token.text;
        this.parser = this._register(initService.createInstance(BasePromptParser, this.promptContentsProvider, seenReferences));
    }
    /**
     * Get the range of the `link` part of the reference.
     */
    get linkRange() {
        // `#file:` references
        if (this.token instanceof FileReference) {
            return this.token.dataRange;
        }
        // `markdown link` references
        if (this.token instanceof MarkdownLink) {
            return this.token.linkRange;
        }
        return undefined;
    }
    /**
     * Type of the reference, - either a prompt `#file` variable,
     * or a `markdown link` reference (`[caption](/path/to/file.md)`).
     */
    get type() {
        if (this.token instanceof FileReference) {
            return 'file';
        }
        if (this.token instanceof MarkdownLink) {
            return 'file';
        }
        assertNever(this.token, `Unknown token type '${this.token}'.`);
    }
    /**
     * Subtype of the reference, - either a prompt `#file` variable,
     * or a `markdown link` reference (`[caption](/path/to/file.md)`).
     */
    get subtype() {
        if (this.token instanceof FileReference) {
            return 'prompt';
        }
        if (this.token instanceof MarkdownLink) {
            return 'markdown';
        }
        assertNever(this.token, `Unknown token type '${this.token}'.`);
    }
    /**
     * Start parsing the reference contents.
     */
    start() {
        this.parser.start();
        return this;
    }
    /**
     * Subscribe to the `onUpdate` event that is fired when prompt tokens are updated.
     * @param callback The callback function to be called on updates.
     */
    onUpdate(callback) {
        this.parser.onUpdate(callback);
        return this;
    }
    get resolveFailed() {
        return this.parser.resolveFailed;
    }
    get errorCondition() {
        return this.parser.errorCondition;
    }
    get topError() {
        return this.parser.topError;
    }
    get uri() {
        return this.parser.uri;
    }
    get isPromptFile() {
        return this.parser.isPromptFile;
    }
    get errors() {
        return this.parser.errors;
    }
    get allErrors() {
        return this.parser.allErrors;
    }
    get references() {
        return this.parser.references;
    }
    get allReferences() {
        return this.parser.allReferences;
    }
    get allValidReferences() {
        return this.parser.allValidReferences;
    }
    async settled() {
        await this.parser.settled();
        return this;
    }
    async allSettled() {
        await this.parser.allSettled();
        return this;
    }
    /**
     * Returns a string representation of this object.
     */
    toString() {
        return `prompt-reference/${this.type}:${this.subtype}/${this.token}`;
    }
};
PromptReference = __decorate([
    __param(3, IInstantiationService)
], PromptReference);
export { PromptReference };
/**
 * A tiny utility object that helps us to track existence
 * of at least one parse result from the content provider.
 */
class FirstParseResult extends DeferredPromise {
    constructor() {
        super(...arguments);
        /**
         * Private attribute to track if we have
         * received at least one result.
         */
        this._gotResult = false;
    }
    /**
     * Whether we've received at least one result.
     */
    get gotFirstResult() {
        return this._gotResult;
    }
    /**
     * Get underlying promise reference.
     */
    get promise() {
        return this.p;
    }
    /**
     * Complete the underlying promise.
     */
    complete() {
        this._gotResult = true;
        return super.complete(void 0);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZVByb21wdFBhcnNlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L3BhcnNlcnMvYmFzZVByb21wdFBhcnNlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZUFBZSxDQUFBO0FBQ3hDLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDOUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUdqRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFHdEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFN0UsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ3hHLE9BQU8sRUFB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