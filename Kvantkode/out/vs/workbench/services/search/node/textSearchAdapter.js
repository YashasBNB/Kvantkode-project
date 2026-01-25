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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dFNlYXJjaEFkYXB0ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9zZWFyY2gvbm9kZS90ZXh0U2VhcmNoQWRhcHRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEtBQUssR0FBRyxNQUFNLDhCQUE4QixDQUFBO0FBQ25ELE9BQU8sRUFPTixhQUFhLEdBQ2IsTUFBTSxxQkFBcUIsQ0FBQTtBQUM1QixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUVoRSxNQUFNLE9BQU8sdUJBQXVCO0lBQ25DLFlBQ1MsS0FBaUIsRUFDakIsVUFBbUI7UUFEbkIsVUFBSyxHQUFMLEtBQUssQ0FBWTtRQUNqQixlQUFVLEdBQVYsVUFBVSxDQUFTO0lBQ3pCLENBQUM7SUFFSixNQUFNLENBQ0wsS0FBd0IsRUFDeEIsUUFBbUQsRUFDbkQsU0FBOEM7UUFFOUMsSUFDQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxNQUFNLENBQUM7WUFDL0QsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsa0JBQWtCLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLE1BQU0sQ0FBQyxFQUN4RSxDQUFDO1lBQ0YsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDO2dCQUN0QixJQUFJLEVBQUUsU0FBUztnQkFDZixRQUFRLEVBQUUsS0FBSztnQkFDZixLQUFLLEVBQUU7b0JBQ04sSUFBSSxFQUFFLGVBQWU7aUJBQ3JCO2dCQUNELFFBQVEsRUFBRSxFQUFFO2FBQ1osQ0FBQyxDQUFBO1FBQ0gsQ0FBQztRQUVELE1BQU0sb0JBQW9CLEdBQUc7WUFDNUIsVUFBVSxDQUFDLEdBQVc7Z0JBQ3JCLFNBQVMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFBO1lBQzVCLENBQUM7U0FDRCxDQUFBO1FBQ0QsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLHVCQUF1QixDQUNwRCxJQUFJLENBQUMsS0FBSyxFQUNWLElBQUksdUJBQXVCLENBQUMsb0JBQW9CLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxFQUNsRSxHQUFHLENBQ0gsQ0FBQTtRQUNELE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDdEMsT0FBTyxpQkFBaUI7aUJBQ3RCLE1BQU0sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFO2dCQUNuQixRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUE7WUFDN0MsQ0FBQyxFQUFFLEtBQUssQ0FBQztpQkFDUixJQUFJLENBQ0osQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUNMLE9BQU8sQ0FBQztnQkFDUCxRQUFRLEVBQUUsQ0FBQyxDQUFDLFFBQVEsSUFBSSxLQUFLO2dCQUM3QixJQUFJLEVBQUUsU0FBUztnQkFDZixLQUFLLEVBQUUsQ0FBQyxDQUFDLEtBQUs7Z0JBQ2QsUUFBUSxFQUFFLEVBQUU7YUFDWixDQUFDLEVBQ0gsTUFBTSxDQUNOLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7Q0FDRDtBQUVELFNBQVMscUJBQXFCLENBQUMsS0FBaUI7SUFDL0MsT0FBTztRQUNOLElBQUksRUFBRSxLQUFLLENBQUMsUUFBUSxJQUFJLEtBQUssQ0FBQyxRQUFRLENBQUMsTUFBTTtRQUM3QyxPQUFPLEVBQUUsS0FBSyxDQUFDLE9BQU87UUFDdEIsVUFBVSxFQUFFLENBQUMsS0FBSyxDQUFDLE9BQU8sSUFBSSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDbkQsSUFBSSxhQUFhLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDdEIsTUFBTSxDQUFDLEdBQXFCLENBQUMsQ0FBQTtnQkFDN0IsT0FBTyxHQUFHLEdBQUcsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUE7WUFDckMsQ0FBQztpQkFBTSxDQUFDO2dCQUNQLE9BQU8sR0FBRyxHQUFHLENBQUMsQ0FBQTtZQUNmLENBQUM7UUFDRixDQUFDLEVBQUUsQ0FBQyxDQUFDO0tBQ0wsQ0FBQTtBQUNGLENBQUMifQ==