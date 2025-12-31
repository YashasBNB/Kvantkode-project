/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { RipgrepTextSearchEngine } from './ripgrepTextSearchEngine.js';
import { Progress } from '../../../../platform/progress/common/progress.js';
import { Schemas } from '../../../../base/common/network.js';
export class RipgrepSearchProvider {
    constructor(outputChannel, getNumThreads) {
        this.outputChannel = outputChannel;
        this.getNumThreads = getNumThreads;
        this.inProgress = new Set();
        process.once('exit', () => this.dispose());
    }
    async provideTextSearchResults(query, options, progress, token) {
        const numThreads = await this.getNumThreads();
        const engine = new RipgrepTextSearchEngine(this.outputChannel, numThreads);
        return Promise.all(options.folderOptions.map((folderOption) => {
            const extendedOptions = {
                folderOptions: folderOption,
                numThreads,
                maxResults: options.maxResults,
                previewOptions: options.previewOptions,
                maxFileSize: options.maxFileSize,
                surroundingContext: options.surroundingContext,
            };
            if (folderOption.folder.scheme === Schemas.vscodeUserData) {
                // Ripgrep search engine can only provide file-scheme results, but we want to use it to search some schemes that are backed by the filesystem, but with some other provider as the frontend,
                // case in point vscode-userdata. In these cases we translate the query to a file, and translate the results back to the frontend scheme.
                const translatedOptions = {
                    ...extendedOptions,
                    folder: folderOption.folder.with({ scheme: Schemas.file }),
                };
                const progressTranslator = new Progress((data) => progress.report({
                    ...data,
                    uri: data.uri.with({ scheme: folderOption.folder.scheme }),
                }));
                return this.withToken(token, (token) => engine.provideTextSearchResultsWithRgOptions(query, translatedOptions, progressTranslator, token));
            }
            else {
                return this.withToken(token, (token) => engine.provideTextSearchResultsWithRgOptions(query, extendedOptions, progress, token));
            }
        })).then((e) => {
            const complete = {
                // todo: get this to actually check
                limitHit: e.some((complete) => !!complete && complete.limitHit),
            };
            return complete;
        });
    }
    async withToken(token, fn) {
        const merged = mergedTokenSource(token);
        this.inProgress.add(merged);
        const result = await fn(merged.token);
        this.inProgress.delete(merged);
        return result;
    }
    dispose() {
        this.inProgress.forEach((engine) => engine.cancel());
    }
}
function mergedTokenSource(token) {
    const tokenSource = new CancellationTokenSource();
    token.onCancellationRequested(() => tokenSource.cancel());
    return tokenSource;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmlwZ3JlcFNlYXJjaFByb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3NlYXJjaC9ub2RlL3JpcGdyZXBTZWFyY2hQcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsdUJBQXVCLEVBQXFCLE1BQU0seUNBQXlDLENBQUE7QUFFcEcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFRdEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUc1RCxNQUFNLE9BQU8scUJBQXFCO0lBR2pDLFlBQ1MsYUFBNEIsRUFDNUIsYUFBZ0Q7UUFEaEQsa0JBQWEsR0FBYixhQUFhLENBQWU7UUFDNUIsa0JBQWEsR0FBYixhQUFhLENBQW1DO1FBSmpELGVBQVUsR0FBaUMsSUFBSSxHQUFHLEVBQUUsQ0FBQTtRQU0zRCxPQUFPLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBRUQsS0FBSyxDQUFDLHdCQUF3QixDQUM3QixLQUF1QixFQUN2QixPQUFrQyxFQUNsQyxRQUFxQyxFQUNyQyxLQUF3QjtRQUV4QixNQUFNLFVBQVUsR0FBRyxNQUFNLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQTtRQUM3QyxNQUFNLE1BQU0sR0FBRyxJQUFJLHVCQUF1QixDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsVUFBVSxDQUFDLENBQUE7UUFFMUUsT0FBTyxPQUFPLENBQUMsR0FBRyxDQUNqQixPQUFPLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDLFlBQVksRUFBRSxFQUFFO1lBQzFDLE1BQU0sZUFBZSxHQUE2QjtnQkFDakQsYUFBYSxFQUFFLFlBQVk7Z0JBQzNCLFVBQVU7Z0JBQ1YsVUFBVSxFQUFFLE9BQU8sQ0FBQyxVQUFVO2dCQUM5QixjQUFjLEVBQUUsT0FBTyxDQUFDLGNBQWM7Z0JBQ3RDLFdBQVcsRUFBRSxPQUFPLENBQUMsV0FBVztnQkFDaEMsa0JBQWtCLEVBQUUsT0FBTyxDQUFDLGtCQUFrQjthQUM5QyxDQUFBO1lBQ0QsSUFBSSxZQUFZLENBQUMsTUFBTSxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsY0FBYyxFQUFFLENBQUM7Z0JBQzNELDRMQUE0TDtnQkFDNUwseUlBQXlJO2dCQUN6SSxNQUFNLGlCQUFpQixHQUFHO29CQUN6QixHQUFHLGVBQWU7b0JBQ2xCLE1BQU0sRUFBRSxZQUFZLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7aUJBQzFELENBQUE7Z0JBQ0QsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLFFBQVEsQ0FBb0IsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUNuRSxRQUFRLENBQUMsTUFBTSxDQUFDO29CQUNmLEdBQUcsSUFBSTtvQkFDUCxHQUFHLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxNQUFNLEVBQUUsWUFBWSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQztpQkFDMUQsQ0FBQyxDQUNGLENBQUE7Z0JBQ0QsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQ3RDLE1BQU0sQ0FBQyxxQ0FBcUMsQ0FDM0MsS0FBSyxFQUNMLGlCQUFpQixFQUNqQixrQkFBa0IsRUFDbEIsS0FBSyxDQUNMLENBQ0QsQ0FBQTtZQUNGLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FDdEMsTUFBTSxDQUFDLHFDQUFxQyxDQUFDLEtBQUssRUFBRSxlQUFlLEVBQUUsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUNyRixDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDWixNQUFNLFFBQVEsR0FBd0I7Z0JBQ3JDLG1DQUFtQztnQkFDbkMsUUFBUSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxRQUFRLElBQUksUUFBUSxDQUFDLFFBQVEsQ0FBQzthQUMvRCxDQUFBO1lBQ0QsT0FBTyxRQUFRLENBQUE7UUFDaEIsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU8sS0FBSyxDQUFDLFNBQVMsQ0FDdEIsS0FBd0IsRUFDeEIsRUFBNEM7UUFFNUMsTUFBTSxNQUFNLEdBQUcsaUJBQWlCLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDdkMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDM0IsTUFBTSxNQUFNLEdBQUcsTUFBTSxFQUFFLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3JDLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBRTlCLE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVPLE9BQU87UUFDZCxJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUE7SUFDckQsQ0FBQztDQUNEO0FBRUQsU0FBUyxpQkFBaUIsQ0FBQyxLQUF3QjtJQUNsRCxNQUFNLFdBQVcsR0FBRyxJQUFJLHVCQUF1QixFQUFFLENBQUE7SUFDakQsS0FBSyxDQUFDLHVCQUF1QixDQUFDLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBO0lBRXpELE9BQU8sV0FBVyxDQUFBO0FBQ25CLENBQUMifQ==