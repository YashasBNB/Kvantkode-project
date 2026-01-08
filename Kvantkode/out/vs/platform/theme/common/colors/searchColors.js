/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as nls from '../../../../nls.js';
// Import the effects we need
import { registerColor, transparent } from '../colorUtils.js';
// Import the colors we need
import { foreground } from './baseColors.js';
import { editorFindMatchHighlight, editorFindMatchHighlightBorder } from './editorColors.js';
export const searchResultsInfoForeground = registerColor('search.resultsInfoForeground', {
    light: foreground,
    dark: transparent(foreground, 0.65),
    hcDark: foreground,
    hcLight: foreground,
}, nls.localize('search.resultsInfoForeground', "Color of the text in the search viewlet's completion message."));
// ----- search editor (Distinct from normal editor find match to allow for better differentiation)
export const searchEditorFindMatch = registerColor('searchEditor.findMatchBackground', {
    light: transparent(editorFindMatchHighlight, 0.66),
    dark: transparent(editorFindMatchHighlight, 0.66),
    hcDark: editorFindMatchHighlight,
    hcLight: editorFindMatchHighlight,
}, nls.localize('searchEditor.queryMatch', 'Color of the Search Editor query matches.'));
export const searchEditorFindMatchBorder = registerColor('searchEditor.findMatchBorder', {
    light: transparent(editorFindMatchHighlightBorder, 0.66),
    dark: transparent(editorFindMatchHighlightBorder, 0.66),
    hcDark: editorFindMatchHighlightBorder,
    hcLight: editorFindMatchHighlightBorder,
}, nls.localize('searchEditor.editorFindMatchBorder', 'Border color of the Search Editor query matches.'));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoQ29sb3JzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90aGVtZS9jb21tb24vY29sb3JzL3NlYXJjaENvbG9ycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBRXpDLDZCQUE2QjtBQUM3QixPQUFPLEVBQUUsYUFBYSxFQUFFLFdBQVcsRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBRTdELDRCQUE0QjtBQUM1QixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDNUMsT0FBTyxFQUFFLHdCQUF3QixFQUFFLDhCQUE4QixFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFFNUYsTUFBTSxDQUFDLE1BQU0sMkJBQTJCLEdBQUcsYUFBYSxDQUN2RCw4QkFBOEIsRUFDOUI7SUFDQyxLQUFLLEVBQUUsVUFBVTtJQUNqQixJQUFJLEVBQUUsV0FBVyxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUM7SUFDbkMsTUFBTSxFQUFFLFVBQVU7SUFDbEIsT0FBTyxFQUFFLFVBQVU7Q0FDbkIsRUFDRCxHQUFHLENBQUMsUUFBUSxDQUNYLDhCQUE4QixFQUM5QiwrREFBK0QsQ0FDL0QsQ0FDRCxDQUFBO0FBRUQsbUdBQW1HO0FBRW5HLE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLGFBQWEsQ0FDakQsa0NBQWtDLEVBQ2xDO0lBQ0MsS0FBSyxFQUFFLFdBQVcsQ0FBQyx3QkFBd0IsRUFBRSxJQUFJLENBQUM7SUFDbEQsSUFBSSxFQUFFLFdBQVcsQ0FBQyx3QkFBd0IsRUFBRSxJQUFJLENBQUM7SUFDakQsTUFBTSxFQUFFLHdCQUF3QjtJQUNoQyxPQUFPLEVBQUUsd0JBQXdCO0NBQ2pDLEVBQ0QsR0FBRyxDQUFDLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSwyQ0FBMkMsQ0FBQyxDQUNwRixDQUFBO0FBRUQsTUFBTSxDQUFDLE1BQU0sMkJBQTJCLEdBQUcsYUFBYSxDQUN2RCw4QkFBOEIsRUFDOUI7SUFDQyxLQUFLLEVBQUUsV0FBVyxDQUFDLDhCQUE4QixFQUFFLElBQUksQ0FBQztJQUN4RCxJQUFJLEVBQUUsV0FBVyxDQUFDLDhCQUE4QixFQUFFLElBQUksQ0FBQztJQUN2RCxNQUFNLEVBQUUsOEJBQThCO0lBQ3RDLE9BQU8sRUFBRSw4QkFBOEI7Q0FDdkMsRUFDRCxHQUFHLENBQUMsUUFBUSxDQUNYLG9DQUFvQyxFQUNwQyxrREFBa0QsQ0FDbEQsQ0FDRCxDQUFBIn0=