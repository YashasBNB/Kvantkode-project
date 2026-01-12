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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9nZ2xlSGlnaENvbnRyYXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3Ivc3RhbmRhbG9uZS9icm93c2VyL3RvZ2dsZUhpZ2hDb250cmFzdC90b2dnbGVIaWdoQ29udHJhc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUNOLFlBQVksRUFFWixvQkFBb0IsR0FDcEIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsTUFBTSxFQUFFLGNBQWMsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ25GLE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsbUJBQW1CLEVBQ25CLGtCQUFrQixFQUNsQixtQkFBbUIsR0FDbkIsTUFBTSw4QkFBOEIsQ0FBQTtBQUVyQyxNQUFNLGtCQUFtQixTQUFRLFlBQVk7SUFHNUM7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsa0NBQWtDO1lBQ3RDLEtBQUssRUFBRSxxQkFBcUIsQ0FBQyxrQkFBa0I7WUFDL0MsS0FBSyxFQUFFLDRCQUE0QjtZQUNuQyxZQUFZLEVBQUUsU0FBUztTQUN2QixDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFBO0lBQy9CLENBQUM7SUFFTSxHQUFHLENBQUMsUUFBMEIsRUFBRSxNQUFtQjtRQUN6RCxNQUFNLHNCQUFzQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsdUJBQXVCLENBQUMsQ0FBQTtRQUNwRSxNQUFNLFlBQVksR0FBRyxzQkFBc0IsQ0FBQyxhQUFhLEVBQUUsQ0FBQTtRQUMzRCxJQUFJLGNBQWMsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUN2QyxnREFBZ0Q7WUFDaEQsc0JBQXNCLENBQUMsUUFBUSxDQUM5QixJQUFJLENBQUMsa0JBQWtCO2dCQUN0QixDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUN2RSxDQUFBO1lBQ0QsSUFBSSxDQUFDLGtCQUFrQixHQUFHLElBQUksQ0FBQTtRQUMvQixDQUFDO2FBQU0sQ0FBQztZQUNQLHNCQUFzQixDQUFDLFFBQVEsQ0FDOUIsTUFBTSxDQUFDLFlBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUNyRSxDQUFBO1lBQ0QsSUFBSSxDQUFDLGtCQUFrQixHQUFHLFlBQVksQ0FBQyxTQUFTLENBQUE7UUFDakQsQ0FBQztJQUNGLENBQUM7Q0FDRDtBQUVELG9CQUFvQixDQUFDLGtCQUFrQixDQUFDLENBQUEifQ==