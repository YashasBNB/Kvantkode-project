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
var FilePromptContentProvider_1;
import { assert } from '../../../../../../base/common/assert.js';
import { assertDefined } from '../../../../../../base/common/types.js';
import { CancellationError } from '../../../../../../base/common/errors.js';
import { PromptContentsProviderBase } from './promptContentsProviderBase.js';
import { isPromptFile } from '../../../../../../platform/prompts/common/constants.js';
import { OpenFailed, NotPromptFile, ResolveError, FolderReference, } from '../../promptFileReferenceErrors.js';
import { IFileService, } from '../../../../../../platform/files/common/files.js';
/**
 * Prompt contents provider for a file on the disk referenced by the provided {@linkcode URI}.
 */
let FilePromptContentProvider = FilePromptContentProvider_1 = class FilePromptContentProvider extends PromptContentsProviderBase {
    constructor(uri, fileService) {
        super();
        this.uri = uri;
        this.fileService = fileService;
        // make sure the object is updated on file changes
        this._register(this.fileService.onDidFilesChange((event) => {
            // if file was added or updated, forward the event to
            // the `getContentsStream()` produce a new stream for file contents
            if (event.contains(this.uri, 1 /* FileChangeType.ADDED */, 0 /* FileChangeType.UPDATED */)) {
                // we support only full file parsing right now because
                // the event doesn't contain a list of changed lines
                return this.onChangeEmitter.fire('full');
            }
            // if file was deleted, forward the event to
            // the `getContentsStream()` produce an error
            if (event.contains(this.uri, 2 /* FileChangeType.DELETED */)) {
                return this.onChangeEmitter.fire(event);
            }
        }));
    }
    /**
     * Creates a stream of lines from the file based on the changes listed in
     * the provided event.
     *
     * @param event - event that describes the changes in the file; `'full'` is
     * 				  the special value that means that all contents have changed
     * @param cancellationToken - token that cancels this operation
     */
    async getContentsStream(_event, cancellationToken) {
        assert(!cancellationToken?.isCancellationRequested, new CancellationError());
        // get the binary stream of the file contents
        let fileStream;
        try {
            // ensure that the referenced URI points to a file before
            // trying to get a stream for its contents
            const info = await this.fileService.resolve(this.uri);
            // validate that the cancellation was not yet requested
            assert(!cancellationToken?.isCancellationRequested, new CancellationError());
            assert(info.isFile, new FolderReference(this.uri));
            fileStream = await this.fileService.readFileStream(this.uri);
        }
        catch (error) {
            if (error instanceof ResolveError) {
                throw error;
            }
            throw new OpenFailed(this.uri, error);
        }
        assertDefined(fileStream, new OpenFailed(this.uri, 'Failed to open file stream.'));
        // after the promise above complete, this object can be already disposed or
        // the cancellation could be requested, in that case destroy the stream and
        // throw cancellation error
        if (this.disposed || cancellationToken?.isCancellationRequested) {
            fileStream.value.destroy();
            throw new CancellationError();
        }
        // if URI doesn't point to a prompt snippet file, don't try to resolve it
        if (isPromptFile(this.uri) === false) {
            throw new NotPromptFile(this.uri);
        }
        return fileStream.value;
    }
    createNew(promptContentsSource) {
        return new FilePromptContentProvider_1(promptContentsSource.uri, this.fileService);
    }
    /**
     * String representation of this object.
     */
    toString() {
        return `file-prompt-contents-provider:${this.uri.path}`;
    }
};
FilePromptContentProvider = FilePromptContentProvider_1 = __decorate([
    __param(1, IFileService)
], FilePromptContentProvider);
export { FilePromptContentProvider };
