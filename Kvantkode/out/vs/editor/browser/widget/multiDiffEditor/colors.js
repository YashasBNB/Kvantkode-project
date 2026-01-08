/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../nls.js';
import { registerColor, editorBackground } from '../../../../platform/theme/common/colorRegistry.js';
export const multiDiffEditorHeaderBackground = registerColor('multiDiffEditor.headerBackground', {
    dark: '#262626',
    light: 'tab.inactiveBackground',
    hcDark: 'tab.inactiveBackground',
    hcLight: 'tab.inactiveBackground',
}, localize('multiDiffEditor.headerBackground', "The background color of the diff editor's header"));
export const multiDiffEditorBackground = registerColor('multiDiffEditor.background', editorBackground, localize('multiDiffEditor.background', 'The background color of the multi file diff editor'));
export const multiDiffEditorBorder = registerColor('multiDiffEditor.border', {
    dark: 'sideBarSectionHeader.border',
    light: '#cccccc',
    hcDark: 'sideBarSectionHeader.border',
    hcLight: '#cccccc',
}, localize('multiDiffEditor.border', 'The border color of the multi file diff editor'));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3JzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvYnJvd3Nlci93aWRnZXQvbXVsdGlEaWZmRWRpdG9yL2NvbG9ycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLGFBQWEsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBRXBHLE1BQU0sQ0FBQyxNQUFNLCtCQUErQixHQUFHLGFBQWEsQ0FDM0Qsa0NBQWtDLEVBQ2xDO0lBQ0MsSUFBSSxFQUFFLFNBQVM7SUFDZixLQUFLLEVBQUUsd0JBQXdCO0lBQy9CLE1BQU0sRUFBRSx3QkFBd0I7SUFDaEMsT0FBTyxFQUFFLHdCQUF3QjtDQUNqQyxFQUNELFFBQVEsQ0FBQyxrQ0FBa0MsRUFBRSxrREFBa0QsQ0FBQyxDQUNoRyxDQUFBO0FBRUQsTUFBTSxDQUFDLE1BQU0seUJBQXlCLEdBQUcsYUFBYSxDQUNyRCw0QkFBNEIsRUFDNUIsZ0JBQWdCLEVBQ2hCLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSxvREFBb0QsQ0FBQyxDQUM1RixDQUFBO0FBRUQsTUFBTSxDQUFDLE1BQU0scUJBQXFCLEdBQUcsYUFBYSxDQUNqRCx3QkFBd0IsRUFDeEI7SUFDQyxJQUFJLEVBQUUsNkJBQTZCO0lBQ25DLEtBQUssRUFBRSxTQUFTO0lBQ2hCLE1BQU0sRUFBRSw2QkFBNkI7SUFDckMsT0FBTyxFQUFFLFNBQVM7Q0FDbEIsRUFDRCxRQUFRLENBQUMsd0JBQXdCLEVBQUUsZ0RBQWdELENBQUMsQ0FDcEYsQ0FBQSJ9