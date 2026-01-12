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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhbG9nLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9kaWFsb2dzL2Jyb3dzZXIvZGlhbG9nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQU0xRCxPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLHFCQUFxQixFQUNyQixxQkFBcUIsRUFDckIsbUJBQW1CLEdBQ25CLE1BQU0sc0NBQXNDLENBQUE7QUFFN0MsTUFBTSw4QkFBOEIsR0FBRztJQUN0Qyx1QkFBdUI7SUFDdkIsK0JBQStCO0lBQy9CLE1BQU07SUFDTixLQUFLO0lBQ0wseUJBQXlCO0lBQ3pCLG1DQUFtQztJQUNuQyxrQ0FBa0M7SUFDbEMsb0NBQW9DO0NBQ3BDLENBQUE7QUFFRCxNQUFNLFVBQVUsNEJBQTRCLENBQzNDLE9BQWdDLEVBQ2hDLGlCQUFxQyxFQUNyQyxhQUE2QixFQUM3QixpQkFBaUIsR0FBRyw4QkFBOEI7SUFFbEQsT0FBTztRQUNOLGlCQUFpQixFQUFFLENBQUMsS0FBNEIsRUFBRSxFQUFFO1lBQ25ELE1BQU0sUUFBUSxHQUFHLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsYUFBYSxDQUFDLGVBQWUsQ0FBQyxDQUFBO1lBQ3JGLElBQUksUUFBUSxDQUFDLElBQUksK0JBQXVCLElBQUksUUFBUSxDQUFDLFNBQVMsRUFBRSxDQUFDO2dCQUNoRSxJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsRUFBRSxDQUFDO29CQUNyRCxXQUFXLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsQ0FBQTtnQkFDOUIsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBQ0QsWUFBWSxFQUFFLG1CQUFtQjtRQUNqQyxjQUFjLEVBQUUscUJBQXFCO1FBQ3JDLGNBQWMsRUFBRSxxQkFBcUI7UUFDckMsWUFBWSxFQUFFLG1CQUFtQjtRQUNqQyxHQUFHLE9BQU87S0FDVixDQUFBO0FBQ0YsQ0FBQyJ9