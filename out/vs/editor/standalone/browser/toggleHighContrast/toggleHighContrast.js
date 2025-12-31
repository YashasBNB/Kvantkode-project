/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditorAction, registerEditorAction, } from '../../../browser/editorExtensions.js';
import { IStandaloneThemeService } from '../../common/standaloneTheme.js';
import { ToggleHighContrastNLS } from '../../../common/standaloneStrings.js';
import { isDark, isHighContrast } from '../../../../platform/theme/common/theme.js';
import { HC_BLACK_THEME_NAME, HC_LIGHT_THEME_NAME, VS_DARK_THEME_NAME, VS_LIGHT_THEME_NAME, } from '../standaloneThemeService.js';
class ToggleHighContrast extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.toggleHighContrast',
            label: ToggleHighContrastNLS.toggleHighContrast,
            alias: 'Toggle High Contrast Theme',
            precondition: undefined,
        });
        this._originalThemeName = null;
    }
    run(accessor, editor) {
        const standaloneThemeService = accessor.get(IStandaloneThemeService);
        const currentTheme = standaloneThemeService.getColorTheme();
        if (isHighContrast(currentTheme.type)) {
            // We must toggle back to the integrator's theme
            standaloneThemeService.setTheme(this._originalThemeName ||
                (isDark(currentTheme.type) ? VS_DARK_THEME_NAME : VS_LIGHT_THEME_NAME));
            this._originalThemeName = null;
        }
        else {
            standaloneThemeService.setTheme(isDark(currentTheme.type) ? HC_BLACK_THEME_NAME : HC_LIGHT_THEME_NAME);
            this._originalThemeName = currentTheme.themeName;
        }
    }
}
registerEditorAction(ToggleHighContrast);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9nZ2xlSGlnaENvbnRyYXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3N0YW5kYWxvbmUvYnJvd3Nlci90b2dnbGVIaWdoQ29udHJhc3QvdG9nZ2xlSGlnaENvbnRyYXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFDTixZQUFZLEVBRVosb0JBQW9CLEdBQ3BCLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDekUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDNUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxjQUFjLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNuRixPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLG1CQUFtQixFQUNuQixrQkFBa0IsRUFDbEIsbUJBQW1CLEdBQ25CLE1BQU0sOEJBQThCLENBQUE7QUFFckMsTUFBTSxrQkFBbUIsU0FBUSxZQUFZO0lBRzVDO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLGtDQUFrQztZQUN0QyxLQUFLLEVBQUUscUJBQXFCLENBQUMsa0JBQWtCO1lBQy9DLEtBQUssRUFBRSw0QkFBNEI7WUFDbkMsWUFBWSxFQUFFLFNBQVM7U0FDdkIsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQTtJQUMvQixDQUFDO0lBRU0sR0FBRyxDQUFDLFFBQTBCLEVBQUUsTUFBbUI7UUFDekQsTUFBTSxzQkFBc0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHVCQUF1QixDQUFDLENBQUE7UUFDcEUsTUFBTSxZQUFZLEdBQUcsc0JBQXNCLENBQUMsYUFBYSxFQUFFLENBQUE7UUFDM0QsSUFBSSxjQUFjLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDdkMsZ0RBQWdEO1lBQ2hELHNCQUFzQixDQUFDLFFBQVEsQ0FDOUIsSUFBSSxDQUFDLGtCQUFrQjtnQkFDdEIsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FDdkUsQ0FBQTtZQUNELElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUE7UUFDL0IsQ0FBQzthQUFNLENBQUM7WUFDUCxzQkFBc0IsQ0FBQyxRQUFRLENBQzlCLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FDckUsQ0FBQTtZQUNELElBQUksQ0FBQyxrQkFBa0IsR0FBRyxZQUFZLENBQUMsU0FBUyxDQUFBO1FBQ2pELENBQUM7SUFDRixDQUFDO0NBQ0Q7QUFFRCxvQkFBb0IsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBIn0=