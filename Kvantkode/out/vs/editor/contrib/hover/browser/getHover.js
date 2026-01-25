/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AsyncIterableObject } from '../../../../base/common/async.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { onUnexpectedExternalError } from '../../../../base/common/errors.js';
import { registerModelAndPositionCommand } from '../../../browser/editorExtensions.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
export class HoverProviderResult {
    constructor(provider, hover, ordinal) {
        this.provider = provider;
        this.hover = hover;
        this.ordinal = ordinal;
    }
}
/**
 * Does not throw or return a rejected promise (returns undefined instead).
 */
async function executeProvider(provider, ordinal, model, position, token) {
    const result = await Promise.resolve(provider.provideHover(model, position, token)).catch(onUnexpectedExternalError);
    if (!result || !isValid(result)) {
        return undefined;
    }
    return new HoverProviderResult(provider, result, ordinal);
}
export function getHoverProviderResultsAsAsyncIterable(registry, model, position, token, recursive = false) {
    const providers = registry.ordered(model, recursive);
    const promises = providers.map((provider, index) => executeProvider(provider, index, model, position, token));
    return AsyncIterableObject.fromPromisesResolveOrder(promises).coalesce();
}
export function getHoversPromise(registry, model, position, token, recursive = false) {
    return getHoverProviderResultsAsAsyncIterable(registry, model, position, token, recursive)
        .map((item) => item.hover)
        .toPromise();
}
registerModelAndPositionCommand('_executeHoverProvider', (accessor, model, position) => {
    const languageFeaturesService = accessor.get(ILanguageFeaturesService);
    return getHoversPromise(languageFeaturesService.hoverProvider, model, position, CancellationToken.None);
});
registerModelAndPositionCommand('_executeHoverProvider_recursive', (accessor, model, position) => {
    const languageFeaturesService = accessor.get(ILanguageFeaturesService);
    return getHoversPromise(languageFeaturesService.hoverProvider, model, position, CancellationToken.None, true);
});
function isValid(result) {
    const hasRange = typeof result.range !== 'undefined';
    const hasHtmlContent = typeof result.contents !== 'undefined' && result.contents && result.contents.length > 0;
    return hasRange && hasHtmlContent;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0SG92ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2hvdmVyL2Jyb3dzZXIvZ2V0SG92ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDdEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDM0UsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDN0UsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFLdEYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFFdkYsTUFBTSxPQUFPLG1CQUFtQjtJQUMvQixZQUNpQixRQUF1QixFQUN2QixLQUFZLEVBQ1osT0FBZTtRQUZmLGFBQVEsR0FBUixRQUFRLENBQWU7UUFDdkIsVUFBSyxHQUFMLEtBQUssQ0FBTztRQUNaLFlBQU8sR0FBUCxPQUFPLENBQVE7SUFDN0IsQ0FBQztDQUNKO0FBRUQ7O0dBRUc7QUFDSCxLQUFLLFVBQVUsZUFBZSxDQUM3QixRQUF1QixFQUN2QixPQUFlLEVBQ2YsS0FBaUIsRUFDakIsUUFBa0IsRUFDbEIsS0FBd0I7SUFFeEIsTUFBTSxNQUFNLEdBQUcsTUFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FDeEYseUJBQXlCLENBQ3pCLENBQUE7SUFDRCxJQUFJLENBQUMsTUFBTSxJQUFJLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7UUFDakMsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUNELE9BQU8sSUFBSSxtQkFBbUIsQ0FBQyxRQUFRLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFBO0FBQzFELENBQUM7QUFFRCxNQUFNLFVBQVUsc0NBQXNDLENBQ3JELFFBQWdELEVBQ2hELEtBQWlCLEVBQ2pCLFFBQWtCLEVBQ2xCLEtBQXdCLEVBQ3hCLFNBQVMsR0FBRyxLQUFLO0lBRWpCLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLFNBQVMsQ0FBQyxDQUFBO0lBQ3BELE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsS0FBSyxFQUFFLEVBQUUsQ0FDbEQsZUFBZSxDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxLQUFLLENBQUMsQ0FDeEQsQ0FBQTtJQUNELE9BQU8sbUJBQW1CLENBQUMsd0JBQXdCLENBQUMsUUFBUSxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUE7QUFDekUsQ0FBQztBQUVELE1BQU0sVUFBVSxnQkFBZ0IsQ0FDL0IsUUFBZ0QsRUFDaEQsS0FBaUIsRUFDakIsUUFBa0IsRUFDbEIsS0FBd0IsRUFDeEIsU0FBUyxHQUFHLEtBQUs7SUFFakIsT0FBTyxzQ0FBc0MsQ0FBQyxRQUFRLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsU0FBUyxDQUFDO1NBQ3hGLEdBQUcsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztTQUN6QixTQUFTLEVBQUUsQ0FBQTtBQUNkLENBQUM7QUFFRCwrQkFBK0IsQ0FDOUIsdUJBQXVCLEVBQ3ZCLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQW9CLEVBQUU7SUFDL0MsTUFBTSx1QkFBdUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHdCQUF3QixDQUFDLENBQUE7SUFDdEUsT0FBTyxnQkFBZ0IsQ0FDdEIsdUJBQXVCLENBQUMsYUFBYSxFQUNyQyxLQUFLLEVBQ0wsUUFBUSxFQUNSLGlCQUFpQixDQUFDLElBQUksQ0FDdEIsQ0FBQTtBQUNGLENBQUMsQ0FDRCxDQUFBO0FBRUQsK0JBQStCLENBQzlCLGlDQUFpQyxFQUNqQyxDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFvQixFQUFFO0lBQy9DLE1BQU0sdUJBQXVCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO0lBQ3RFLE9BQU8sZ0JBQWdCLENBQ3RCLHVCQUF1QixDQUFDLGFBQWEsRUFDckMsS0FBSyxFQUNMLFFBQVEsRUFDUixpQkFBaUIsQ0FBQyxJQUFJLEVBQ3RCLElBQUksQ0FDSixDQUFBO0FBQ0YsQ0FBQyxDQUNELENBQUE7QUFFRCxTQUFTLE9BQU8sQ0FBQyxNQUFhO0lBQzdCLE1BQU0sUUFBUSxHQUFHLE9BQU8sTUFBTSxDQUFDLEtBQUssS0FBSyxXQUFXLENBQUE7SUFDcEQsTUFBTSxjQUFjLEdBQ25CLE9BQU8sTUFBTSxDQUFDLFFBQVEsS0FBSyxXQUFXLElBQUksTUFBTSxDQUFDLFFBQVEsSUFBSSxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7SUFDeEYsT0FBTyxRQUFRLElBQUksY0FBYyxDQUFBO0FBQ2xDLENBQUMifQ==