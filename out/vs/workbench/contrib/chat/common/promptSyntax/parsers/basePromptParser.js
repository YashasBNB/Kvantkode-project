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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZVByb21wdFBhcnNlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9wYXJzZXJzL2Jhc2VQcm9tcHRQYXJzZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDMUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQzlELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFHakUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBR3RFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDMUUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDM0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsTUFBTSxFQUFFLFdBQVcsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRTdFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUM1RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUN4RyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNkVBQTZF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