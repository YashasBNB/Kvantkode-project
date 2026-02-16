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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVByb21wdENvbnRlbnRzUHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvY29tbW9uL3Byb21wdFN5bnRheC9jb250ZW50UHJvdmlkZXJzL2ZpbGVQcm9tcHRDb250ZW50c1Byb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUloRyxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDaEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRzVFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUNyRixPQUFPLEVBQ04sVUFBVSxFQUNWLGFBQWEsRUFDYixZQUFZLEVBQ1osZUFBZSxHQUNmLE1BQU0sb0NBQW9DLENBQUE7QUFDM0MsT0FBTyxFQUdOLFlBQVksR0FDWixNQUFNLGtEQUFrRCxDQUFBO0FBRXpEOztHQUVHO0FBQ0ksSUFBTSx5QkFBeUIsaUNBQS9CLE1BQU0seUJBQ1osU0FBUSwwQkFBNEM7SUFHcEQsWUFDaUIsR0FBUSxFQUNPLFdBQXlCO1FBRXhELEtBQUssRUFBRSxDQUFBO1FBSFMsUUFBRyxHQUFILEdBQUcsQ0FBSztRQUNPLGdCQUFXLEdBQVgsV0FBVyxDQUFjO1FBSXhELGtEQUFrRDtRQUNsRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxLQUFLLEVBQUUsRUFBRTtZQUMzQyxxREFBcUQ7WUFDckQsbUVBQW1F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