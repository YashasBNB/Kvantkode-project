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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVwbEZpbHRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2Jyb3dzZXIvcmVwbEZpbHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQWMsWUFBWSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDN0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBT2hFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQ2xGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQU9sRCxNQUFNLE9BQU8sVUFBVTtJQUF2QjtRQUdTLG1CQUFjLEdBQWtCLEVBQUUsQ0FBQTtJQXNEM0MsQ0FBQzthQXhETyxlQUFVLEdBQUcsWUFBWSxBQUFmLENBQWU7SUFHaEMsSUFBSSxXQUFXLENBQUMsS0FBYTtRQUM1QixJQUFJLENBQUMsY0FBYyxHQUFHLEVBQUUsQ0FBQTtRQUN4QixLQUFLLEdBQUcsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFBO1FBRXBCLElBQUksS0FBSyxJQUFJLEtBQUssS0FBSyxFQUFFLEVBQUUsQ0FBQztZQUMzQixNQUFNLE9BQU8sR0FBRyxjQUFjLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQztpQkFDeEMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLENBQUM7aUJBQ3BCLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUMzQixLQUFLLE1BQU0sQ0FBQyxJQUFJLE9BQU8sRUFBRSxDQUFDO2dCQUN6QixJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztvQkFDeEIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtnQkFDakUsQ0FBQztxQkFBTSxJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDOUIsSUFBSSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtnQkFDakUsQ0FBQztxQkFBTSxDQUFDO29CQUNQLElBQUksQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQTtnQkFDeEQsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELE1BQU0sQ0FBQyxPQUFxQixFQUFFLGdCQUFnQztRQUM3RCxJQUNDLE9BQU8sWUFBWSxtQkFBbUI7WUFDdEMsT0FBTyxZQUFZLG9CQUFvQjtZQUN2QyxPQUFPLFlBQVksUUFBUSxFQUMxQixDQUFDO1lBQ0YsOEdBQThHO1lBQzlHLHNDQUE2QjtRQUM5QixDQUFDO1FBRUQsSUFBSSxtQkFBbUIsR0FBRyxLQUFLLENBQUE7UUFDL0IsSUFBSSxtQkFBbUIsR0FBRyxLQUFLLENBQUE7UUFFL0IsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUVuQyxLQUFLLE1BQU0sRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ25ELElBQUksSUFBSSxLQUFLLFNBQVMsSUFBSSxVQUFVLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDO2dCQUM5RCw4REFBOEQ7Z0JBQzlELE9BQU8sS0FBSyxDQUFBO1lBQ2IsQ0FBQztpQkFBTSxJQUFJLElBQUksS0FBSyxTQUFTLEVBQUUsQ0FBQztnQkFDL0IsbUJBQW1CLEdBQUcsSUFBSSxDQUFBO2dCQUMxQixJQUFJLFVBQVUsQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUM7b0JBQ3hDLG1CQUFtQixHQUFHLElBQUksQ0FBQTtnQkFDM0IsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBRUQsT0FBTyxtQkFBbUI7WUFDekIsQ0FBQyxDQUFDLG1CQUFtQjtZQUNyQixDQUFDLENBQUMsT0FBTyxnQkFBZ0IsS0FBSyxXQUFXO2dCQUN4QyxDQUFDLENBQUMsZ0JBQWdCO2dCQUNsQixDQUFDLCtCQUF1QixDQUFBO0lBQzNCLENBQUMifQ==