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
/**
 * Notes on what to implement next:
 *   - re-trigger suggestions dialog on `folder` selection because the `#file:` references take
 *     `file` paths, therefore a "folder" completion is never final
 *   - provide the same suggestions that the `#file:` variables in the chat input have, e.g.,
 *     recently used files, related files, etc.
 *   - support markdown links; markdown extension does sometimes provide the paths completions, but
 *     the prompt completions give more options (e.g., recently used files, related files, etc.)
 *   - add `Windows` support
 */
import { LANGUAGE_SELECTOR } from '../constants.js';
import { IPromptsService } from '../service/types.js';
import { assertOneOf } from '../../../../../../base/common/types.js';
import { isWindows } from '../../../../../../base/common/platform.js';
import { Disposable } from '../../../../../../base/common/lifecycle.js';
import { CancellationError } from '../../../../../../base/common/errors.js';
import { dirname, extUri } from '../../../../../../base/common/resources.js';
import { assert, assertNever } from '../../../../../../base/common/assert.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { Registry } from '../../../../../../platform/registry/common/platform.js';
import { ILanguageFeaturesService } from '../../../../../../editor/common/services/languageFeatures.js';
import { Extensions as WorkbenchExtensions, } from '../../../../../common/contributions.js';
/**
 * Finds a file reference that suites the provided `position`.
 */
const findFileReference = (references, position) => {
    for (const reference of references) {
        const { range } = reference;
        // ignore any other types of references
        if (reference.type !== 'file') {
            return undefined;
        }
        // this ensures that we handle only the `#file:` references for now
        if (reference.subtype !== 'prompt') {
            return undefined;
        }
        // reference must match the provided position
        const { startLineNumber, endColumn } = range;
        if (startLineNumber !== position.lineNumber || endColumn !== position.column) {
            continue;
        }
        return reference;
    }
    return undefined;
};
/**
 * Provides reference paths autocompletion for the `#file:` variables inside prompts.
 */
let PromptPathAutocompletion = class PromptPathAutocompletion extends Disposable {
    constructor(fileService, promptSyntaxService, languageService) {
        super();
        this.fileService = fileService;
        this.promptSyntaxService = promptSyntaxService;
        this.languageService = languageService;
        /**
         * Debug display name for this provider.
         */
        this._debugDisplayName = 'PromptPathAutocompletion';
        /**
         * List of trigger characters handled by this provider.
         */
        this.triggerCharacters = [':', '.', '/'];
        this._register(this.languageService.completionProvider.register(LANGUAGE_SELECTOR, this));
    }
    /**
     * The main function of this provider that calculates
     * completion items based on the provided arguments.
     */
    async provideCompletionItems(model, position, context, token) {
        assert(!token.isCancellationRequested, new CancellationError());
        const { triggerCharacter } = context;
        // it must always have been triggered by a character
        if (!triggerCharacter) {
            return undefined;
        }
        assertOneOf(triggerCharacter, this.triggerCharacters, `Prompt path autocompletion provider`);
        const parser = this.promptSyntaxService.getSyntaxParserFor(model);
        assert(!parser.disposed, 'Prompt parser must not be disposed.');
        // start the parser in case it was not started yet,
        // and wait for it to settle to a final result
        const { references } = await parser.start().settled();
        // validate that the cancellation was not yet requested
        assert(!token.isCancellationRequested, new CancellationError());
        const fileReference = findFileReference(references, position);
        if (!fileReference) {
            return undefined;
        }
        const modelDirname = dirname(model.uri);
        // in the case of the '.' trigger character, we must check if this is the first
        // dot in the link path, otherwise the dot could be a part of a folder name
        if (triggerCharacter === ':' || (triggerCharacter === '.' && fileReference.path === '.')) {
            return {
                suggestions: await this.getFirstFolderSuggestions(triggerCharacter, modelDirname, fileReference),
            };
        }
        if (triggerCharacter === '/' || triggerCharacter === '.') {
            return {
                suggestions: await this.getNonFirstFolderSuggestions(triggerCharacter, modelDirname, fileReference),
            };
        }
        assertNever(triggerCharacter, `Unexpected trigger character '${triggerCharacter}'.`);
    }
    /**
     * Gets "raw" folder suggestions. Unlike the full completion items,
     * these ones do not have `insertText` and `range` properties which
     * are meant to be added by the caller later on.
     */
    async getFolderSuggestions(uri) {
        const { children } = await this.fileService.resolve(uri);
        const suggestions = [];
        // no `children` - no suggestions
        if (!children) {
            return suggestions;
        }
        for (const child of children) {
            const kind = child.isDirectory ? 23 /* CompletionItemKind.Folder */ : 20 /* CompletionItemKind.File */;
            const sortText = child.isDirectory ? '1' : '2';
            suggestions.push({
                label: child.name,
                kind,
                sortText,
            });
        }
        return suggestions;
    }
    /**
     * Gets suggestions for a first folder/file name in the path. E.g., the one
     * that follows immediately after the `:` character of the `#file:` variable.
     *
     * The main difference between this and "subsequent" folder cases is that in
     * the beginning of the path the suggestions also contain the `..` item and
     * the `./` normalization prefix for relative paths.
     *
     * See also {@link getNonFirstFolderSuggestions}.
     */
    async getFirstFolderSuggestions(character, fileFolderUri, fileReference) {
        const { linkRange } = fileReference;
        // when character is `:`, there must be no link present yet
        // otherwise the `:` was used in the middle of the link hence
        // we don't want to provide suggestions for that
        if (character === ':' && linkRange !== undefined) {
            return [];
        }
        // otherwise when the `.` character is present, it is inside the link part
        // of the reference, hence we always expect the link range to be present
        if (character === '.' && linkRange === undefined) {
            return [];
        }
        const suggestions = await this.getFolderSuggestions(fileFolderUri);
        // replacement range for suggestions; when character is `.`, we want to also
        // replace it, because we add `./` at the beginning of all the relative paths
        const startColumnOffset = character === '.' ? 1 : 0;
        const range = {
            ...fileReference.range,
            endColumn: fileReference.range.endColumn,
            startColumn: fileReference.range.endColumn - startColumnOffset,
        };
        return [
            {
                label: '..',
                kind: 23 /* CompletionItemKind.Folder */,
                insertText: '..',
                range,
                sortText: '0',
            },
            ...suggestions.map((suggestion) => {
                // add space at the end of file names since no completions
                // that follow the file name are expected anymore
                const suffix = suggestion.kind === 20 /* CompletionItemKind.File */ ? ' ' : '';
                return {
                    ...suggestion,
                    range,
                    label: `./${suggestion.label}${suffix}`,
                    // we use the `./` prefix for consistency
                    insertText: `./${suggestion.label}${suffix}`,
                };
            }),
        ];
    }
    /**
     * Gets suggestions for a folder/file name that follows after the first one.
     * See also {@link getFirstFolderSuggestions}.
     */
    async getNonFirstFolderSuggestions(character, fileFolderUri, fileReference) {
        const { linkRange, path } = fileReference;
        if (linkRange === undefined) {
            return [];
        }
        const currenFolder = extUri.resolvePath(fileFolderUri, path);
        let suggestions = await this.getFolderSuggestions(currenFolder);
        // when trigger character was a `.`, which is we know is inside
        // the folder/file name in the path, filter out to only items
        // that start with the dot instead of showing all of them
        if (character === '.') {
            suggestions = suggestions.filter((suggestion) => {
                return suggestion.label.startsWith('.');
            });
        }
        // replacement range of the suggestions
        // when character is `.` we want to also replace it too
        const startColumnOffset = character === '.' ? 1 : 0;
        const range = {
            ...fileReference.range,
            endColumn: fileReference.range.endColumn,
            startColumn: fileReference.range.endColumn - startColumnOffset,
        };
        return suggestions.map((suggestion) => {
            // add space at the end of file names since no completions
            // that follow the file name are expected anymore
            const suffix = suggestion.kind === 20 /* CompletionItemKind.File */ ? ' ' : '';
            return {
                ...suggestion,
                insertText: `${suggestion.label}${suffix}`,
                range,
            };
        });
    }
};
PromptPathAutocompletion = __decorate([
    __param(0, IFileService),
    __param(1, IPromptsService),
    __param(2, ILanguageFeaturesService)
], PromptPathAutocompletion);
export { PromptPathAutocompletion };
/**
 * We restrict this provider to `Unix` machines for now because of
 * the filesystem paths differences on `Windows` operating system.
 *
 * Notes on `Windows` support:
 * 	- we add the `./` for the first path component, which may not work on `Windows`
 * 	- the first path component of the absolute paths must be a drive letter
 */
if (!isWindows) {
    // register the provider as a workbench contribution
    Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(PromptPathAutocompletion, 4 /* LifecyclePhase.Eventually */);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0UGF0aEF1dG9jb21wbGV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2NvbW1vbi9wcm9tcHRTeW50YXgvbGFuZ3VhZ2VGZWF0dXJlcy9wcm9tcHRQYXRoQXV0b2NvbXBsZXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEc7Ozs7Ozs7OztHQVNHO0FBRUgsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDbkQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHFCQUFxQixDQUFBO0FBRXJELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFFckUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRzNFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDNUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxXQUFXLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFL0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBRWpGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQ3ZHLE9BQU8sRUFFTixVQUFVLElBQUksbUJBQW1CLEdBQ2pDLE1BQU0sd0NBQXdDLENBQUE7QUE2Qi9DOztHQUVHO0FBQ0gsTUFBTSxpQkFBaUIsR0FBRyxDQUN6QixVQUF1QyxFQUN2QyxRQUFrQixF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