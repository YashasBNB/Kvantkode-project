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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoRXh0Q29udmVyc2lvblR5cGVzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3NlYXJjaC9jb21tb24vc2VhcmNoRXh0Q29udmVyc2lvblR5cGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFJckUsT0FBTyxFQUFFLG1DQUFtQyxFQUFFLE1BQU0sYUFBYSxDQUFBO0FBQ2pFLE9BQU8sRUFNTixrQkFBa0IsRUFDbEIsZ0JBQWdCLEdBTWhCLE1BQU0scUJBQXFCLENBQUE7QUFxUzVCOzs7O0dBSUc7QUFDSCxTQUFTLGlCQUFpQixDQUFDLE1BQVc7SUFDckMsT0FBTyxLQUFLLElBQUksTUFBTSxJQUFJLFFBQVEsSUFBSSxNQUFNLElBQUksU0FBUyxJQUFJLE1BQU0sQ0FBQTtBQUNwRSxDQUFDO0FBd0lELFNBQVMsMkJBQTJCLENBQUMsT0FBa0M7SUFDdEUsT0FBTyxPQUFPLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FDL0IsQ0FBQyxZQUFZLEVBQUUsRUFBRSxDQUNoQixDQUFDO1FBQ0EsTUFBTSxFQUFFLFlBQVksQ0FBQyxNQUFNO1FBQzNCLFFBQVEsRUFBRSxZQUFZLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ25GLFFBQVEsRUFBRSxZQUFZLENBQUMsUUFBUTtRQUMvQixvQkFBb0IsRUFBRSxZQUFZLENBQUMsY0FBYyxDQUFDLE1BQU07UUFDeEQsY0FBYyxFQUFFLFlB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