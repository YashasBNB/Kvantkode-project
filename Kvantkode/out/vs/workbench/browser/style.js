/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './media/style.css';
import { registerThemingParticipant } from '../../platform/theme/common/themeService.js';
import { WORKBENCH_BACKGROUND, TITLE_BAR_ACTIVE_BACKGROUND } from '../common/theme.js';
import { isWeb, isIOS } from '../../base/common/platform.js';
import { createMetaElement } from '../../base/browser/dom.js';
import { isSafari, isStandalone } from '../../base/browser/browser.js';
import { selectionBackground } from '../../platform/theme/common/colorRegistry.js';
import { mainWindow } from '../../base/browser/window.js';
registerThemingParticipant((theme, collector) => {
    // Background (helps for subpixel-antialiasing on Windows)
    const workbenchBackground = WORKBENCH_BACKGROUND(theme);
    collector.addRule(`.monaco-workbench { background-color: ${workbenchBackground}; }`);
    // Selection (do NOT remove - https://github.com/microsoft/vscode/issues/169662)
    const windowSelectionBackground = theme.getColor(selectionBackground);
    if (windowSelectionBackground) {
        collector.addRule(`.monaco-workbench ::selection { background-color: ${windowSelectionBackground}; }`);
    }
    // Update <meta name="theme-color" content=""> based on selected theme
    if (isWeb) {
        const titleBackground = theme.getColor(TITLE_BAR_ACTIVE_BACKGROUND);
        if (titleBackground) {
            const metaElementId = 'monaco-workbench-meta-theme-color';
            let metaElement = mainWindow.document.getElementById(metaElementId);
            if (!metaElement) {
                metaElement = createMetaElement();
                metaElement.name = 'theme-color';
                metaElement.id = metaElementId;
            }
            metaElement.content = titleBackground.toString();
        }
    }
    // We disable user select on the root element, however on Safari this seems
    // to prevent any text selection in the monaco editor. As a workaround we
    // allow to select text in monaco editor instances.
    if (isSafari) {
        collector.addRule(`
			body.web {
				touch-action: none;
			}
			.monaco-workbench .monaco-editor .view-lines {
				user-select: text;
				-webkit-user-select: text;
			}
		`);
    }
    // Update body background color to ensure the home indicator area looks similar to the workbench
    if (isIOS && isStandalone()) {
        collector.addRule(`body { background-color: ${workbenchBackground}; }`);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3R5bGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3N0eWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sbUJBQW1CLENBQUE7QUFDMUIsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDeEYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLDJCQUEyQixFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDdEYsT0FBTyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsUUFBUSxFQUFFLFlBQVksRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3RFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUV6RCwwQkFBMEIsQ0FBQyxDQUFDLEtBQUssRUFBRSxTQUFTLEVBQUUsRUFBRTtJQUMvQywwREFBMEQ7SUFDMUQsTUFBTSxtQkFBbUIsR0FBRyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsQ0FBQTtJQUN2RCxTQUFTLENBQUMsT0FBTyxDQUFDLHlDQUF5QyxtQkFBbUIsS0FBSyxDQUFDLENBQUE7SUFFcEYsZ0ZBQWdGO0lBQ2hGLE1BQU0seUJBQXlCLEdBQUcsS0FBSyxDQUFDLFFBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO0lBQ3JFLElBQUkseUJBQXlCLEVBQUUsQ0FBQztRQUMvQixTQUFTLENBQUMsT0FBTyxDQUNoQixxREFBcUQseUJBQXlCLEtBQUssQ0FDbkYsQ0FBQTtJQUNGLENBQUM7SUFFRCxzRUFBc0U7SUFDdEUsSUFBSSxLQUFLLEVBQUUsQ0FBQztRQUNYLE1BQU0sZUFBZSxHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsMkJBQTJCLENBQUMsQ0FBQTtRQUNuRSxJQUFJLGVBQWUsRUFBRSxDQUFDO1lBQ3JCLE1BQU0sYUFBYSxHQUFHLG1DQUFtQyxDQUFBO1lBQ3pELElBQUksV0FBVyxHQUFHLFVBQVUsQ0FBQyxRQUFRLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBMkIsQ0FBQTtZQUM3RixJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7Z0JBQ2xCLFdBQVcsR0FBRyxpQkFBaUIsRUFBRSxDQUFBO2dCQUNqQyxXQUFXLENBQUMsSUFBSSxHQUFHLGFBQWEsQ0FBQTtnQkFDaEMsV0FBVyxDQUFDLEVBQUUsR0FBRyxhQUFhLENBQUE7WUFDL0IsQ0FBQztZQUVELFdBQVcsQ0FBQyxPQUFPLEdBQUcsZUFBZSxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQ2pELENBQUM7SUFDRixDQUFDO0lBRUQsMkVBQTJFO0lBQzNFLHlFQUF5RTtJQUN6RSxtREFBbUQ7SUFDbkQsSUFBSSxRQUFRLEVBQUUsQ0FBQztRQUNkLFNBQVMsQ0FBQyxPQUFPLENBQUM7Ozs7Ozs7O0dBUWpCLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxnR0FBZ0c7SUFDaEcsSUFBSSxLQUFLLElBQUksWUFBWSxFQUFFLEVBQUUsQ0FBQztRQUM3QixTQUFTLENBQUMsT0FBTyxDQUFDLDRCQUE0QixtQkFBbUIsS0FBSyxDQUFDLENBQUE7SUFDeEUsQ0FBQztBQUNGLENBQUMsQ0FBQyxDQUFBIn0=