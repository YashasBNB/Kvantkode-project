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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvbXB0UGF0aEF1dG9jb21wbGV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9jb21tb24vcHJvbXB0U3ludGF4L2xhbmd1YWdlRmVhdHVyZXMvcHJvbXB0UGF0aEF1dG9jb21wbGV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHOzs7Ozs7Ozs7R0FTRztBQUVILE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQ25ELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUVyRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBRXJFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUczRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzVFLE9BQU8sRUFBRSxNQUFNLEVBQUUsV0FBVyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDN0UsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBRS9FLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUVqRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUN2RyxPQUFPLEVBRU4sVUFBVSxJQUFJLG1CQUFtQixHQUNqQyxNQUFNLHdDQUF3QyxDQUFBO0FBNkIvQzs7R0FFRztBQUNILE1BQU0saUJBQWlCLEdBQUcsQ0FDekIsVUFBdUMsRUFDdkMsUUFBa0IsRUFDaUIs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