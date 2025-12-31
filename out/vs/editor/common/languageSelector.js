/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { match as matchGlobPattern } from '../../base/common/glob.js';
import { normalize } from '../../base/common/path.js';
export function score(selector, candidateUri, candidateLanguage, candidateIsSynchronized, candidateNotebookUri, candidateNotebookType) {
    if (Array.isArray(selector)) {
        // array -> take max individual value
        let ret = 0;
        for (const filter of selector) {
            const value = score(filter, candidateUri, candidateLanguage, candidateIsSynchronized, candidateNotebookUri, candidateNotebookType);
            if (value === 10) {
                return value; // already at the highest
            }
            if (value > ret) {
                ret = value;
            }
        }
        return ret;
    }
    else if (typeof selector === 'string') {
        if (!candidateIsSynchronized) {
            return 0;
        }
        // short-hand notion, desugars to
        // 'fooLang' -> { language: 'fooLang'}
        // '*' -> { language: '*' }
        if (selector === '*') {
            return 5;
        }
        else if (selector === candidateLanguage) {
            return 10;
        }
        else {
            return 0;
        }
    }
    else if (selector) {
        // filter -> select accordingly, use defaults for scheme
        const { language, pattern, scheme, hasAccessToAllModels, notebookType } = selector; // TODO: microsoft/TypeScript#42768
        if (!candidateIsSynchronized && !hasAccessToAllModels) {
            return 0;
        }
        // selector targets a notebook -> use the notebook uri instead
        // of the "normal" document uri.
        if (notebookType && candidateNotebookUri) {
            candidateUri = candidateNotebookUri;
        }
        let ret = 0;
        if (scheme) {
            if (scheme === candidateUri.scheme) {
                ret = 10;
            }
            else if (scheme === '*') {
                ret = 5;
            }
            else {
                return 0;
            }
        }
        if (language) {
            if (language === candidateLanguage) {
                ret = 10;
            }
            else if (language === '*') {
                ret = Math.max(ret, 5);
            }
            else {
                return 0;
            }
        }
        if (notebookType) {
            if (notebookType === candidateNotebookType) {
                ret = 10;
            }
            else if (notebookType === '*' && candidateNotebookType !== undefined) {
                ret = Math.max(ret, 5);
            }
            else {
                return 0;
            }
        }
        if (pattern) {
            let normalizedPattern;
            if (typeof pattern === 'string') {
                normalizedPattern = pattern;
            }
            else {
                // Since this pattern has a `base` property, we need
                // to normalize this path first before passing it on
                // because we will compare it against `Uri.fsPath`
                // which uses platform specific separators.
                // Refs: https://github.com/microsoft/vscode/issues/99938
                normalizedPattern = { ...pattern, base: normalize(pattern.base) };
            }
            if (normalizedPattern === candidateUri.fsPath ||
                matchGlobPattern(normalizedPattern, candidateUri.fsPath)) {
                ret = 10;
            }
            else {
                return 0;
            }
        }
        return ret;
    }
    else {
        return 0;
    }
}
export function targetsNotebooks(selector) {
    if (typeof selector === 'string') {
        return false;
    }
    else if (Array.isArray(selector)) {
        return selector.some(targetsNotebooks);
    }
    else {
        return !!selector.notebookType;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFuZ3VhZ2VTZWxlY3Rvci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vbGFuZ3VhZ2VTZWxlY3Rvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQW9CLEtBQUssSUFBSSxnQkFBZ0IsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBRXZGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQXFCckQsTUFBTSxVQUFVLEtBQUssQ0FDcEIsUUFBc0MsRUFDdEMsWUFBaUIsRUFDakIsaUJBQXlCLEVBQ3pCLHVCQUFnQyxFQUNoQyxvQkFBcUMsRUFDckMscUJBQXlDO0lBRXpDLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDO1FBQzdCLHFDQUFxQztRQUNyQyxJQUFJLEdBQUcsR0FBRyxDQUFDLENBQUE7UUFDWCxLQUFLLE1BQU0sTUFBTSxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQy9CLE1BQU0sS0FBSyxHQUFHLEtBQUssQ0FDbEIsTUFBTSxFQUNOLFlBQVksRUFDWixpQkFBaUIsRUFDakIsdUJBQXVCLEVBQ3ZCLG9CQUFvQixFQUNwQixxQkFBcUIsQ0FDckIsQ0FBQTtZQUNELElBQUksS0FBSyxLQUFLLEVBQUUsRUFBRSxDQUFDO2dCQUNsQixPQUFPLEtBQUssQ0FBQSxDQUFDLHlCQUF5QjtZQUN2QyxDQUFDO1lBQ0QsSUFBSSxLQUFLLEdBQUcsR0FBRyxFQUFFLENBQUM7Z0JBQ2pCLEdBQUcsR0FBRyxLQUFLLENBQUE7WUFDWixDQUFDO1FBQ0YsQ0FBQztRQUNELE9BQU8sR0FBRyxDQUFBO0lBQ1gsQ0FBQztTQUFNLElBQUksT0FBTyxRQUFRLEtBQUssUUFBUSxFQUFFLENBQUM7UUFDekMsSUFBSSxDQUFDLHVCQUF1QixFQUFFLENBQUM7WUFD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