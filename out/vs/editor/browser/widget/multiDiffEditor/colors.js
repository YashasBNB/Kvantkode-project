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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sb3JzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2Jyb3dzZXIvd2lkZ2V0L211bHRpRGlmZkVkaXRvci9jb2xvcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxhQUFhLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUVwRyxNQUFNLENBQUMsTUFBTSwrQkFBK0IsR0FBRyxhQUFhLENBQzNELGtDQUFrQyxFQUNsQztJQUNDLElBQUksRUFBRSxTQUFTO0lBQ2YsS0FBSyxFQUFFLHdCQUF3QjtJQUMvQixNQUFNLEVBQUUsd0JBQXdCO0lBQ2hDLE9BQU8sRUFBRSx3QkFBd0I7Q0FDakMsRUFDRCxRQUFRLENBQUMsa0NBQWtDLEVBQUUsa0RBQWtELENBQUMsQ0FDaEcsQ0FBQTtBQUVELE1BQU0sQ0FBQyxNQUFNLHlCQUF5QixHQUFHLGFBQWEsQ0FDckQsNEJBQTRCLEVBQzVCLGdCQUFnQixFQUNoQixRQUFRLENBQUMsNEJBQTRCLEVBQUUsb0RBQW9ELENBQUMsQ0FDNUYsQ0FBQTtBQUVELE1BQU0sQ0FBQyxNQUFNLHFCQUFxQixHQUFHLGFBQWEsQ0FDakQsd0JBQXdCLEVBQ3hCO0lBQ0MsSUFBSSxFQUFFLDZCQUE2QjtJQUNuQyxLQUFLLEVBQUUsU0FBUztJQUNoQixNQUFNLEVBQUUsNkJBQTZCO0lBQ3JDLE9BQU8sRUFBRSxTQUFTO0NBQ2xCLEVBQ0QsUUFBUSxDQUFDLHdCQUF3QixFQUFFLGdEQUFnRCxDQUFDLENBQ3BGLENBQUEifQ==