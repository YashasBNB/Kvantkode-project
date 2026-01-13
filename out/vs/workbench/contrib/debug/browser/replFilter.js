/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { matchesFuzzy } from '../../../../base/common/filters.js';
import { splitGlobAware } from '../../../../base/common/glob.js';
import { ReplEvaluationResult, ReplEvaluationInput } from '../common/replModel.js';
import { Variable } from '../common/debugModel.js';
export class ReplFilter {
    constructor() {
        this._parsedQueries = [];
    }
    static { this.matchQuery = matchesFuzzy; }
    set filterQuery(query) {
        this._parsedQueries = [];
        query = query.trim();
        if (query && query !== '') {
            const filters = splitGlobAware(query, ',')
                .map((s) => s.trim())
                .filter((s) => !!s.length);
            for (const f of filters) {
                if (f.startsWith('\\')) {
                    this._parsedQueries.push({ type: 'include', query: f.slice(1) });
                }
                else if (f.startsWith('!')) {
                    this._parsedQueries.push({ type: 'exclude', query: f.slice(1) });
                }
                else {
                    this._parsedQueries.push({ type: 'include', query: f });
                }
            }
        }
    }
    filter(element, parentVisibility) {
        if (element instanceof ReplEvaluationInput ||
            element instanceof ReplEvaluationResult ||
            element instanceof Variable) {
            // Only filter the output events, everything else is visible https://github.com/microsoft/vscode/issues/105863
            return 1 /* TreeVisibility.Visible */;
        }
        let includeQueryPresent = false;
        let includeQueryMatched = false;
        const text = element.toString(true);
        for (const { type, query } of this._parsedQueries) {
            if (type === 'exclude' && ReplFilter.matchQuery(query, text)) {
                // If exclude query matches, ignore all other queries and hide
                return false;
            }
            else if (type === 'include') {
                includeQueryPresent = true;
                if (ReplFilter.matchQuery(query, text)) {
                    includeQueryMatched = true;
                }
            }
        }
        return includeQueryPresent
            ? includeQueryMatched
            : typeof parentVisibility !== 'undefined'
                ? parentVisibility
                : 1 /* TreeVisibility.Visible */;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbEZpbHRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvYnJvd3Nlci9yZXBsRmlsdGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBYyxZQUFZLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFPaEUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDbEYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBT2xELE1BQU0sT0FBTyxVQUFVO0lBQXZCO1FBR1MsbUJBQWMsR0FBa0IsRUFBRSxDQUFBO0lBc0QzQyxDQUFDO2FBeERPLGVBQVUsR0FBRyxZQUFZLEFBQWYsQ0FBZTtJQUdoQyxJQUFJLFdBQVcsQ0FBQyxLQUFhO1FBQzVCLElBQUksQ0FBQyxjQUFjLEdBQUcsRUFBRSxDQUFBO1FBQ3hCLEtBQUssR0FBRyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUE7UUFFcEIsSUFBSSxLQUFLLElBQUksS0FBSyxLQUFLLEVBQUUsRUFBRSxDQUFDO1lBQzNCLE1BQU0sT0FBTyxHQUFHLGNBQWMsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDO2lCQUN4QyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQztpQkFDcEIsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQzNCLEtBQUssTUFBTSxDQUFDLElBQUksT0FBTyxFQUFFLENBQUM7Z0JBQ3pCLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO29CQUN4QixJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBO2dCQUNqRSxDQUFDO3FCQUFNLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDO29CQUM5QixJQUFJLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBO2dCQUNqRSxDQUFDO3FCQUFNLENBQUM7b0JBQ1AsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFBO2dCQUN4RCxDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsTUFBTSxDQUFDLE9BQXFCLEVBQUUsZ0JBQWdDO1FBQzdELElBQ0MsT0FBTyxZQUFZLG1CQUFtQjtZQUN0QyxPQUFPLFlBQVksb0JBQW9CO1lBQ3ZDLE9BQU8sWUFBWSxRQUFRLEVBQzFCLENBQUM7WUFDRiw4R0FBOEc7WUFDOUcsc0NBQTZCO1FBQzlCLENBQUM7UUFFRCxJQUFJLG1CQUFtQixHQUFHLEtBQUssQ0FBQTtRQUMvQixJQUFJLG1CQUFtQixHQUFHLEtBQUssQ0FBQTtRQUUvQixNQUFNLElBQUksR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBRW5DLEtBQUssTUFBTSxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7WUFDbkQsSUFBSSxJQUFJLEtBQUssU0FBUyxJQUFJLFVBQVUsQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUM7Z0JBQzlELDhEQUE4RDtnQkFDOUQsT0FBTyxLQUFLLENBQUE7WUFDYixDQUFDO2lCQUFNLElBQUksSUFBSSxLQUFLLFNBQVMsRUFBRSxDQUFDO2dCQUMvQixtQkFBbUIsR0FBRyxJQUFJLENBQUE7Z0JBQzFCLElBQUksVUFBVSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQztvQkFDeEMsbUJBQW1CLEdBQUcsSUFBSSxDQUFBO2dCQUMzQixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7UUFFRCxPQUFPLG1CQUFtQjtZQUN6QixDQUFDLENBQUMsbUJBQW1CO1lBQ3JCLENBQUMsQ0FBQyxPQUFPLGdCQUFnQixLQUFLLFdBQVc7Z0JBQ3hDLENBQUMsQ0FBQyxnQkFBZ0I7Z0JBQ2xCLENBQUMsK0JBQXVCLENBQUE7SUFDM0IsQ0FBQyJ9