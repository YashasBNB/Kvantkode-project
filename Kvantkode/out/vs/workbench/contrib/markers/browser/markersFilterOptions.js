/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { matchesFuzzy, matchesFuzzy2 } from '../../../../base/common/filters.js';
import { splitGlobAware, getEmptyExpression, parse, } from '../../../../base/common/glob.js';
import * as strings from '../../../../base/common/strings.js';
import { relativePath } from '../../../../base/common/resources.js';
import { TernarySearchTree } from '../../../../base/common/ternarySearchTree.js';
export class ResourceGlobMatcher {
    constructor(globalExpression, rootExpressions, uriIdentityService) {
        this.globalExpression = parse(globalExpression);
        this.expressionsByRoot = TernarySearchTree.forUris((uri) => uriIdentityService.extUri.ignorePathCasing(uri));
        for (const expression of rootExpressions) {
            this.expressionsByRoot.set(expression.root, {
                root: expression.root,
                expression: parse(expression.expression),
            });
        }
    }
    matches(resource) {
        const rootExpression = this.expressionsByRoot.findSubstr(resource);
        if (rootExpression) {
            const path = relativePath(rootExpression.root, resource);
            if (path && !!rootExpression.expression(path)) {
                return true;
            }
        }
        return !!this.globalExpression(resource.path);
    }
}
export class FilterOptions {
    static { this._filter = matchesFuzzy2; }
    static { this._messageFilter = matchesFuzzy; }
    static EMPTY(uriIdentityService) {
        return new FilterOptions('', [], false, false, false, uriIdentityService);
    }
    constructor(filter, filesExclude, showWarnings, showErrors, showInfos, uriIdentityService) {
        this.filter = filter;
        this.showWarnings = false;
        this.showErrors = false;
        this.showInfos = false;
        filter = filter.trim();
        this.showWarnings = showWarnings;
        this.showErrors = showErrors;
        this.showInfos = showInfos;
        const filesExcludeByRoot = Array.isArray(filesExclude) ? filesExclude : [];
        const excludesExpression = Array.isArray(filesExclude)
            ? getEmptyExpression()
            : filesExclude;
        for (const { expression } of filesExcludeByRoot) {
            for (const pattern of Object.keys(expression)) {
                if (!pattern.endsWith('/**')) {
                    // Append `/**` to pattern to match a parent folder #103631
                    expression[`${strings.rtrim(pattern, '/')}/**`] = expression[pattern];
                }
            }
        }
        const negate = filter.startsWith('!');
        this.textFilter = { text: (negate ? strings.ltrim(filter, '!') : filter).trim(), negate };
        const includeExpression = getEmptyExpression();
        if (filter) {
            const filters = splitGlobAware(filter, ',')
                .map((s) => s.trim())
                .filter((s) => !!s.length);
            for (const f of filters) {
                if (f.startsWith('!')) {
                    const filterText = strings.ltrim(f, '!');
                    if (filterText) {
                        this.setPattern(excludesExpression, filterText);
                    }
                }
                else {
                    this.setPattern(includeExpression, f);
                }
            }
        }
        this.excludesMatcher = new ResourceGlobMatcher(excludesExpression, filesExcludeByRoot, uriIdentityService);
        this.includesMatcher = new ResourceGlobMatcher(includeExpression, [], uriIdentityService);
    }
    setPattern(expression, pattern) {
        if (pattern[0] === '.') {
            pattern = '*' + pattern; // convert ".js" to "*.js"
        }
        expression[`**/${pattern}/**`] = true;
        expression[`**/${pattern}`] = true;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Vyc0ZpbHRlck9wdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21hcmtlcnMvYnJvd3Nlci9tYXJrZXJzRmlsdGVyT3B0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQVcsWUFBWSxFQUFFLGFBQWEsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3pGLE9BQU8sRUFFTixjQUFjLEVBQ2Qsa0JBQWtCLEVBRWxCLEtBQUssR0FDTCxNQUFNLGlDQUFpQyxDQUFBO0FBQ3hDLE9BQU8sS0FBSyxPQUFPLE1BQU0sb0NBQW9DLENBQUE7QUFFN0QsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBR2hGLE1BQU0sT0FBTyxtQkFBbUI7SUFPL0IsWUFDQyxnQkFBNkIsRUFDN0IsZUFBeUQsRUFDekQsa0JBQXVDO1FBRXZDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQTtRQUMvQyxJQUFJLENBQUMsaUJBQWlCLEdBQUcsaUJBQWlCLENBQUMsT0FBTyxDQUNqRCxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUN4RCxDQUFBO1FBQ0QsS0FBSyxNQUFNLFVBQVUsSUFBSSxlQUFlLEVBQUUsQ0FBQztZQUMxQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUU7Z0JBQzNDLElBQUksRUFBRSxVQUFVLENBQUMsSUFBSTtnQkFDckIsVUFBVSxFQUFFLEtBQUssQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDO2FB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