/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { asArray, coalesce } from '../../../../base/common/arrays.js';
import { DEFAULT_TEXT_SEARCH_PREVIEW_OPTIONS } from './search.js';
import { TextSearchContext2, TextSearchMatch2, } from './searchExtTypes.js';
/**
 * Checks if the given object is of type TextSearchMatch.
 * @param object The object to check.
 * @returns True if the object is a TextSearchMatch, false otherwise.
 */
function isTextSearchMatch(object) {
    return 'uri' in object && 'ranges' in object && 'preview' in object;
}
function newToOldFileProviderOptions(options) {
    return options.folderOptions.map((folderOption) => ({
        folder: folderOption.folder,
        excludes: folderOption.excludes.map((e) => (typeof e === 'string' ? e : e.pattern)),
        includes: folderOption.includes,
        useGlobalIgnoreFiles: folderOption.useIgnoreFiles.global,
        useIgnoreFiles: folderOption.useIgnoreFiles.local,
        useParentIgnoreFiles: folderOption.useIgnoreFiles.parent,
        followSymlinks: folderOption.followSymlinks,
        maxResults: options.maxResults,
        session: options.session, // TODO: make sure that we actually use a cancellation token here.
    }));
}
export class OldFileSearchProviderConverter {
    constructor(provider) {
        this.provider = provider;
    }
    provideFileSearchResults(pattern, options, token) {
        const getResult = async () => {
            const newOpts = newToOldFileProviderOptions(options);
            return Promise.all(newOpts.map((o) => this.provider.provideFileSearchResults({ pattern }, o, token)));
        };
        return getResult().then((e) => coalesce(e).flat());
    }
}
function newToOldTextProviderOptions(options) {
    return options.folderOptions.map((folderOption) => ({
        folder: folderOption.folder,
        excludes: folderOption.excludes.map((e) => (typeof e === 'string' ? e : e.pattern)),
        includes: folderOption.includes,
        useGlobalIgnoreFiles: folderOption.useIgnoreFiles.global,
        useIgnoreFiles: folderOption.useIgnoreFiles.local,
        useParentIgnoreFiles: folderOption.useIgnoreFiles.parent,
        followSymlinks: folderOption.followSymlinks,
        maxResults: options.maxResults,
        previewOptions: newToOldPreviewOptions(options.previewOptions),
        maxFileSize: options.maxFileSize,
        encoding: folderOption.encoding,
        afterContext: options.surroundingContext,
        beforeContext: options.surroundingContext,
    }));
}
export function newToOldPreviewOptions(options) {
    return {
        matchLines: options?.matchLines ?? DEFAULT_TEXT_SEARCH_PREVIEW_OPTIONS.matchLines,
        charsPerLine: options?.charsPerLine ?? DEFAULT_TEXT_SEARCH_PREVIEW_OPTIONS.charsPerLine,
    };
}
export function oldToNewTextSearchResult(result) {
    if (isTextSearchMatch(result)) {
        const ranges = asArray(result.ranges).map((r, i) => {
            const previewArr = asArray(result.preview.matches);
            const matchingPreviewRange = previewArr[i];
            return { sourceRange: r, previewRange: matchingPreviewRange };
        });
        return new TextSearchMatch2(result.uri, ranges, result.preview.text);
    }
    else {
        return new TextSearchContext2(result.uri, result.text, result.lineNumber);
    }
}
export class OldTextSearchProviderConverter {
    constructor(provider) {
        this.provider = provider;
    }
    provideTextSearchResults(query, options, progress, token) {
        const progressShim = (oldResult) => {
            if (!validateProviderResult(oldResult)) {
                return;
            }
            progress.report(oldToNewTextSearchResult(oldResult));
        };
        const getResult = async () => {
            return coalesce(await Promise.all(newToOldTextProviderOptions(options).map((o) => this.provider.provideTextSearchResults(query, o, { report: (e) => progressShim(e) }, token)))).reduce((prev, cur) => ({ limitHit: prev.limitHit || cur.limitHit }), { limitHit: false });
        };
        const oldResult = getResult();
        return oldResult.then((e) => {
            return {
                limitHit: e.limitHit,
                message: coalesce(asArray(e.message)),
            };
        });
    }
}
function validateProviderResult(result) {
    if (extensionResultIsMatch(result)) {
        if (Array.isArray(result.ranges)) {
            if (!Array.isArray(result.preview.matches)) {
                console.warn("INVALID - A text search provider match's`ranges` and`matches` properties must have the same type.");
                return false;
            }
            if (result.preview.matches.length !== result.ranges.length) {
                console.warn("INVALID - A text search provider match's`ranges` and`matches` properties must have the same length.");
                return false;
            }
        }
        else {
            if (Array.isArray(result.preview.matches)) {
                console.warn("INVALID - A text search provider match's`ranges` and`matches` properties must have the same length.");
                return false;
            }
        }
    }
    return true;
}
export function extensionResultIsMatch(data) {
    return !!data.preview;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoRXh0Q29udmVyc2lvblR5cGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc2VhcmNoL2NvbW1vbi9zZWFyY2hFeHRDb252ZXJzaW9uVHlwZXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEc7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUlyRSxPQUFPLEVBQUUsbUNBQW1DLEVBQUUsTUFBTSxhQUFhLENBQUE7QUFDakUsT0FBTyxFQU1OLGtCQUFrQixFQUNsQixnQkFBZ0IsR0FNaEIsTUFBTSxxQkFBcUIsQ0FBQTtBQXFTNUI7Ozs7R0FJRztBQUNILFNBQVMsaUJBQWlCLENBQUMsTUFBVztJQUNyQyxPQUFPLEtBQUssSUFBSSxNQUFNLElBQUksUUFBUSxJQUFJLE1BQU0sSUFBSSxTQUFTLElBQUksTUFBTSxDQUFBO0FBQ3BFLENBQUM7QUF3SUQsU0FBUywyQkFBMkIsQ0FBQyxPQUFrQztJQUN0RSxPQUFPLE9BQU8sQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUMvQixDQUFDLFlBQVksRUFBRSxFQUFFLENBQ2hCLENBQUM7UUFDQSxNQUFNLEVBQUUsWUFBWSxDQUFDLE1BQU07UUFDM0IsUUFBUSxFQUFFLFlBQVksQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbkYsUUFBUSxFQUFFLFlBQVksQ0FBQyxRQUFRO1FBQy9CLG9CQUFvQixFQUFFLFlBQVksQ0FBQyxjQUFjLENBQUMs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