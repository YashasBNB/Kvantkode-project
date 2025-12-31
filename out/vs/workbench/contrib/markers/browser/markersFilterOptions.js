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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Vyc0ZpbHRlck9wdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9tYXJrZXJzL2Jyb3dzZXIvbWFya2Vyc0ZpbHRlck9wdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFXLFlBQVksRUFBRSxhQUFhLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RixPQUFPLEVBRU4sY0FBYyxFQUNkLGtCQUFrQixFQUVsQixLQUFLLEdBQ0wsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEtBQUssT0FBTyxNQUFNLG9DQUFvQyxDQUFBO0FBRTdELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUdoRixNQUFNLE9BQU8sbUJBQW1CO0lBTy9CLFlBQ0MsZ0JBQTZCLEVBQzdCLGVBQXlELEVBQ3pELGtCQUF1QztRQUV2QyxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLGdCQUFnQixDQUFDLENBQUE7UUFDL0MsSUFBSSxDQUFDLGlCQUFpQixHQUFHLGlCQUFpQixDQUFDLE9BQU8sQ0FDakQsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsQ0FDeEQsQ0FBQTtRQUNELEtBQUssTUFBTSxVQUFVLElBQUksZUFBZSxFQUFFLENBQUM7WUFDMUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxFQUFFO2dCQUMzQyxJQUFJLEVBQUUsVUFBVSxDQUFDLElBQUk7Z0JBQ3JCLFVBQVUsRUFBRSxLQUFLLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQzthQUN4QyxD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