/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as pfs from '../../../../base/node/pfs.js';
import { resultIsMatch, } from '../common/search.js';
import { RipgrepTextSearchEngine } from './ripgrepTextSearchEngine.js';
import { NativeTextSearchManager } from './textSearchManager.js';
export class TextSearchEngineAdapter {
    constructor(query, numThreads) {
        this.query = query;
        this.numThreads = numThreads;
    }
    search(token, onResult, onMessage) {
        if ((!this.query.folderQueries || !this.query.folderQueries.length) &&
            (!this.query.extraFileResources || !this.query.extraFileResources.length)) {
            return Promise.resolve({
                type: 'success',
                limitHit: false,
                stats: {
                    type: 'searchProcess',
                },
                messages: [],
            });
        }
        const pretendOutputChannel = {
            appendLine(msg) {
                onMessage({ message: msg });
            },
        };
        const textSearchManager = new NativeTextSearchManager(this.query, new RipgrepTextSearchEngine(pretendOutputChannel, this.numThreads), pfs);
        return new Promise((resolve, reject) => {
            return textSearchManager
                .search((matches) => {
                onResult(matches.map(fileMatchToSerialized));
            }, token)
                .then((c) => resolve({
                limitHit: c.limitHit ?? false,
                type: 'success',
                stats: c.stats,
                messages: [],
            }), reject);
        });
    }
}
function fileMatchToSerialized(match) {
    return {
        path: match.resource && match.resource.fsPath,
        results: match.results,
        numMatches: (match.results || []).reduce((sum, r) => {
            if (resultIsMatch(r)) {
                const m = r;
                return sum + m.rangeLocations.length;
            }
            else {
                return sum + 1;
            }
        }, 0),
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dFNlYXJjaEFkYXB0ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvc2VhcmNoL25vZGUvdGV4dFNlYXJjaEFkYXB0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSw4QkFBOEIsQ0FBQTtBQUNuRCxPQUFPLEVBT04sYUFBYSxHQUNiLE1BQU0scUJBQXFCLENBQUE7QUFDNUIsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDdEUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFFaEUsTUFBTSxPQUFPLHVCQUF1QjtJQUNuQyxZQUNTLEtBQWlCLEVBQ2pCLFVBQW1CO1FBRG5CLFVBQUssR0FBTCxLQUFLLENBQVk7UUFDakIsZUFBVSxHQUFWLFVBQVUsQ0FBUztJQUN6QixDQUFDO0lBRUosTUFBTSxDQUNMLEtBQXdCLEVBQ3hCLFFBQW1ELEVBQ25ELFNBQThDO1FBRTlDLElBQ0MsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsTUFBTSxDQUFDO1lBQy9ELENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGtCQUFrQixJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxNQUFNLENBQUMsRUFDeEUsQ0FBQztZQUNGLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQztnQkFDdEIsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsUUFBUSxFQUFFLEtBQUs7Z0JBQ2YsS0FBSyxFQUFFO29CQUNOLElBQUksRUFBRSxlQUFlO2lCQUNyQjtnQkFDRCxRQUFRLEVBQUUsRUFBRTthQUNaLENBQUMsQ0FBQTtRQUNILENBQUM7UUFFRCxNQUFNLG9CQUFvQixHQUFHO1lBQzVCLFVBQVUsQ0FBQyxHQUFXO2dCQUNyQixTQUFTLENBQUMsRUFBRSxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQTtZQUM1QixDQUFDO1NBQ0QsQ0FBQTtRQUNELE1BQU0saUJBQWlCLEdBQUcsSUFBSSx1QkFBdUIsQ0FDcEQsSUFBSSxDQUFDLEtBQUssRUFDVixJQUFJLHVCQUF1QixDQUFDLG9CQUFvQixFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsRUFDbEUsR0FBRyxDQUNILENBQUE7UUFDRCxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1lBQ3RDLE9BQU8saUJBQWlCO2lCQUN0QixNQUFNLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRTtnQkFDbkIsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFBO1lBQzdDLENBQUMsRUFBRSxLQUFLLENBQUM7aUJBQ1IsSUFBSSxDQUNKLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDTCxPQUFPLENBQUM7Z0JBQ1AsUUFBUSxFQUFFLENBQUMsQ0FBQyxRQUFRLElBQUksS0FBSztnQkFDN0IsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsS0FBSyxFQUFFLENBQUMsQ0FBQyxLQUFLO2dCQUNkLFFBQVEsRUFBRSxFQUFFO2FBQ1osQ0FBQyxFQUNILE1BQU0sQ0FDTixDQUFBO1FBQ0gsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0NBQ0Q7QUFFRCxTQUFTLHFCQUFxQixDQUFDLEtBQWlCO0lBQy9DLE9BQU87UUFDTixJQUFJLEVBQUUsS0FBSyxDQUFDLFFBQVEsSUFBSSxLQUFLLENBQUMsUUFBUSxDQUFDLE1BQU07UUFDN0MsT0FBTyxFQUFFLEtBQUssQ0FBQyxPQUFPO1FBQ3RCLFVBQVUsRUFBRSxDQUFDLEtBQUssQ0FBQyxPQUFPLElBQUksRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFO1lBQ25ELElBQUksYUFBYSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3RCLE1BQU0sQ0FBQyxHQUFxQixDQUFDLENBQUE7Z0JBQzdCLE9BQU8sR0FBRyxHQUFHLENBQUMsQ0FBQyxjQUFjLENBQUMsTUFBTSxDQUFBO1lBQ3JDLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPLEdBQUcsR0FBRyxDQUFDLENBQUE7WUFDZixDQUFDO1FBQ0YsQ0FBQyxFQUFFLENBQUMsQ0FBQztLQUNMLENBQUE7QUFDRixDQUFDIn0=