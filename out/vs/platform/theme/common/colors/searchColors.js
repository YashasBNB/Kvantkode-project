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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoQ29sb3JzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vdGhlbWUvY29tbW9uL2NvbG9ycy9zZWFyY2hDb2xvcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUV6Qyw2QkFBNkI7QUFDN0IsT0FBTyxFQUFFLGFBQWEsRUFBRSxXQUFXLEVBQUUsTUFBTSxrQkFBa0IsQ0FBQTtBQUU3RCw0QkFBNEI7QUFDNUIsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzVDLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSw4QkFBOEIsRUFBRSxNQUFNLG1CQUFtQixDQUFBO0FBRTVGLE1BQU0sQ0FBQyxNQUFNLDJCQUEyQixHQUFHLGFBQWEsQ0FDdkQsOEJBQThCLEVBQzlCO0lBQ0MsS0FBSyxFQUFFLFVBQVU7SUFDakIsSUFBSSxFQUFFLFdBQVcsQ0FBQyxVQUFVLEVBQUUsSUFBSSxDQUFDO0lBQ25DLE1BQU0sRUFBRSxVQUFVO0lBQ2xCLE9BQU8sRUFBRSxVQUFVO0NBQ25CLEVBQ0QsR0FBRyxDQUFDLFFBQVEsQ0FDWCw4QkFBOEIsRUFDOUIsK0RBQStELENBQy9ELENBQ0QsQ0FBQTtBQUVELG1HQUFtRztBQUVuRyxNQUFNLENBQUMsTUFBTSxxQkFBcUIsR0FBRyxhQUFhLENBQ2pELGtDQUFrQyxFQUNsQztJQUNDLEtBQUssRUFBRSxXQUFXLENBQUMsd0JBQXdCLEVBQUUsSUFBSSxDQUFDO0lBQ2xELElBQUksRUFBRSxXQUFXLENBQUMsd0JBQXdCLEVBQUUsSUFBSSxDQUFDO0lBQ2pELE1BQU0sRUFBRSx3QkFBd0I7SUFDaEMsT0FBTyxFQUFFLHdCQUF3QjtDQUNqQyxFQUNELEdBQUcsQ0FBQyxRQUFRLENBQUMseUJBQXlCLEVBQUUsMkNBQTJDLENBQUMsQ0FDcEYsQ0FBQTtBQUVELE1BQU0sQ0FBQyxNQUFNLDJCQUEyQixHQUFHLGFBQWEsQ0FDdkQsOEJBQThCLEVBQzlCO0lBQ0MsS0FBSyxFQUFFLFdBQVcsQ0FBQyw4QkFBOEIsRUFBRSxJQUFJLENBQUM7SUFDeEQsSUFBSSxFQUFFLFdBQVcsQ0FBQyw4QkFBOEIsRUFBRSxJQUFJLENBQUM7SUFDdkQsTUFBTSxFQUFFLDhCQUE4QjtJQUN0QyxPQUFPLEVBQUUsOEJBQThCO0NBQ3ZDLEVBQ0QsR0FBRyxDQUFDLFFBQVEsQ0FDWCxvQ0FBb0MsRUFDcEMsa0RBQWtELENBQ2xELENBQ0QsQ0FBQSJ9