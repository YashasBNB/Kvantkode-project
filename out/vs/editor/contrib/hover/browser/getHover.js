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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0SG92ZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9ob3Zlci9icm93c2VyL2dldEhvdmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBS3RGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBRXZGLE1BQU0sT0FBTyxtQkFBbUI7SUFDL0IsWUFDaUIsUUFBdUIsRUFDdkIsS0FBWSxFQUNaLE9BQWU7UUFGZixhQUFRLEdBQVIsUUFBUSxDQUFlO1FBQ3ZCLFVBQUssR0FBTCxLQUFLLENBQU87UUFDWixZQUFPLEdBQVAsT0FBTyxDQUFRO0lBQzdCLENBQUM7Q0FDSjtBQUVEOztHQUVHO0FBQ0gsS0FBSyxVQUFVLGVBQWUsQ0FDN0IsUUFBdUIsRUFDdkIsT0FBZSxFQUNmLEtBQWlCLEVBQ2pCLFFBQWtCLEVBQ2xCLEtBQXdCO0lBRXhCLE1BQU0sTUFBTSxHQUFHLE1BQU0sT0FBTyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLEtBQUssRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQ3hGLHlCQUF5QixDQUN6QixDQUFBO0lBQ0QsSUFBSSxDQUFDLE1BQU0sSUFBSSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDO1FBQ2pDLE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFDRCxPQUFPLElBQUksbUJBQW1CLENBQUMsUUFBUSxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQTtBQUMxRCxDQUFDO0FBRUQsTUFBTSxVQUFVLHNDQUFzQyxDQUNyRCxRQUFnRCxFQUNoRCxLQUFpQixFQUNqQixRQUFrQixFQUNsQixLQUF3QixFQUN4QixTQUFTLEdBQUcsS0FBSztJQUVqQixNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSxTQUFTLENBQUMsQ0FBQTtJQUNwRCxNQUFNLFFBQVEsR0FBRyxTQUFTLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxFQUFFLENBQ2xELGVBQWUsQ0FBQyxRQUFRLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQ3hELENBQUE7SUFDRCxPQUFPLG1CQUFtQixDQUFDLHdCQUF3QixDQUFDLFFBQVEsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFBO0FBQ3pFLENBQUM7QUFFRCxNQUFNLFVBQVUsZ0JBQWdCLENBQy9CLFFBQWdELEVBQ2hELEtBQWlCLEVBQ2pCLFFBQWtCLEVBQ2xCLEtBQXdCLEVBQ3hCLFNBQVMsR0FBRyxLQUFLO0lBRWpCLE9BQU8sc0NBQXNDLENBQUMsUUFBUSxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsS0FBSyxFQUFFLFNBQVMsQ0FBQztTQUN4RixHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7U0FDekIsU0FBUyxFQUFFLENBQUE7QUFDZCxDQUFDO0FBRUQsK0JBQStCLENBQzlCLHVCQUF1QixFQUN2QixDQUFDLFFBQVEsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFvQixFQUFFO0lBQy9DLE1BQU0sdUJBQXVCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFBO0lBQ3RFLE9BQU8sZ0JBQWdCLENBQ3RCLHVCQUF1QixDQUFDLGFBQWEsRUFDckMsS0FBSyxFQUNMLFFBQVEsRUFDUixpQkFBaUIsQ0FBQyxJQUFJLENBQ3RCLENBQUE7QUFDRixDQUFDLENBQ0QsQ0FBQTtBQUVELCtCQUErQixDQUM5QixpQ0FBaUMsRUFDakMsQ0FBQyxRQUFRLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBb0IsRUFBRTtJQUMvQyxNQUFNLHVCQUF1QixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtJQUN0RSxPQUFPLGdCQUFnQixDQUN0Qix1QkFBdUIsQ0FBQyxhQUFhLEVBQ3JDLEtBQUssRUFDTCxRQUFRLEVBQ1IsaUJBQWlCLENBQUMsSUFBSSxFQUN0QixJQUFJLENBQ0osQ0FBQTtBQUNGLENBQUMsQ0FDRCxDQUFBO0FBRUQsU0FBUyxPQUFPLENBQUMsTUFBYTtJQUM3QixNQUFNLFFBQVEsR0FBRyxPQUFPLE1BQU0sQ0FBQyxLQUFLLEtBQUssV0FBVyxDQUFBO0lBQ3BELE1BQU0sY0FBYyxHQUNuQixPQUFPLE1BQU0sQ0FBQyxRQUFRLEtBQUssV0FBVyxJQUFJLE1BQU0sQ0FBQyxRQUFRLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO0lBQ3hGLE9BQU8sUUFBUSxJQUFJLGNBQWMsQ0FBQTtBQUNsQyxDQUFDIn0=