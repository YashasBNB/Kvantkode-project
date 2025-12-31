/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EventHelper } from '../../../base/browser/dom.js';
import { defaultButtonStyles, defaultCheckboxStyles, defaultInputBoxStyles, defaultDialogStyles, } from '../../theme/browser/defaultStyles.js';
const defaultDialogAllowableCommands = [
    'workbench.action.quit',
    'workbench.action.reloadWindow',
    'copy',
    'cut',
    'editor.action.selectAll',
    'editor.action.clipboardCopyAction',
    'editor.action.clipboardCutAction',
    'editor.action.clipboardPasteAction',
];
export function createWorkbenchDialogOptions(options, keybindingService, layoutService, allowableCommands = defaultDialogAllowableCommands) {
    return {
        keyEventProcessor: (event) => {
            const resolved = keybindingService.softDispatch(event, layoutService.activeContainer);
            if (resolved.kind === 2 /* ResultKind.KbFound */ && resolved.commandId) {
                if (!allowableCommands.includes(resolved.commandId)) {
                    EventHelper.stop(event, true);
                }
            }
        },
        buttonStyles: defaultButtonStyles,
        checkboxStyles: defaultCheckboxStyles,
        inputBoxStyles: defaultInputBoxStyles,
        dialogStyles: defaultDialogStyles,
        ...options,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhbG9nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZGlhbG9ncy9icm93c2VyL2RpYWxvZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFNMUQsT0FBTyxFQUNOLG1CQUFtQixFQUNuQixxQkFBcUIsRUFDckIscUJBQXFCLEVBQ3JCLG1CQUFtQixHQUNuQixNQUFNLHNDQUFzQyxDQUFBO0FBRTdDLE1BQU0sOEJBQThCLEdBQUc7SUFDdEMsdUJBQXVCO0lBQ3ZCLCtCQUErQjtJQUMvQixNQUFNO0lBQ04sS0FBSztJQUNMLHlCQUF5QjtJQUN6QixtQ0FBbUM7SUFDbkMsa0NBQWtDO0lBQ2xDLG9DQUFvQztDQUNwQyxDQUFBO0FBRUQsTUFBTSxVQUFVLDRCQUE0QixDQUMzQyxPQUFnQyxFQUNoQyxpQkFBcUMsRUFDckMsYUFBNkIsRUFDN0IsaUJBQWlCLEdBQUcsOEJBQThCO0lBRWxELE9BQU87UUFDTixpQkFBaUIsRUFBRSxDQUFDLEtBQTRCLEVBQUUsRUFBRTtZQUNuRCxNQUFNLFFBQVEsR0FBRyxpQkFBaUIsQ0FBQyxZQUFZLENBQUMsS0FBSyxFQUFFLGFBQWEsQ0FBQyxlQUFlLENBQUMsQ0FBQTtZQUNyRixJQUFJLFFBQVEsQ0FBQyxJQUFJLCtCQUF1QixJQUFJLFFBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQztnQkFDaEUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztvQkFDckQsV0FBVyxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUE7Z0JBQzlCLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUNELFlBQVksRUFBRSxtQkFBbUI7UUFDakMsY0FBYyxFQUFFLHFCQUFxQjtRQUNyQyxjQUFjLEVBQUUscUJBQXFCO1FBQ3JDLFlBQVksRUFBRSxtQkFBbUI7UUFDakMsR0FBRyxPQUFPO0tBQ1YsQ0FBQTtBQUNGLENBQUMifQ==