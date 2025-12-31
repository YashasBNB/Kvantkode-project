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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3R5bGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYnJvd3Nlci9zdHlsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLG1CQUFtQixDQUFBO0FBQzFCLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3hGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSwyQkFBMkIsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ3RGLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDNUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDN0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxZQUFZLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNsRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFFekQsMEJBQTBCLENBQUMsQ0FBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLEVBQUU7SUFDL0MsMERBQTBEO0lBQzFELE1BQU0sbUJBQW1CLEdBQUcsb0JBQW9CLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDdkQsU0FBUyxDQUFDLE9BQU8sQ0FBQyx5Q0FBeUMsbUJBQW1CLEtBQUssQ0FBQyxDQUFBO0lBRXBGLGdGQUFnRjtJQUNoRixNQUFNLHlCQUF5QixHQUFHLEtBQUssQ0FBQyxRQUFRLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtJQUNyRSxJQUFJLHlCQUF5QixFQUFFLENBQUM7UUFDL0IsU0FBUyxDQUFDLE9BQU8sQ0FDaEIscURBQXFELHlCQUF5QixLQUFLLENBQ25GLENBQUE7SUFDRixDQUFDO0lBRUQsc0VBQXNFO0lBQ3RFLElBQUksS0FBSyxFQUFFLENBQUM7UUFDWCxNQUFNLGVBQWUsR0FBRyxLQUFLLENBQUMsUUFBUSxDQUFDLDJCQUEyQixDQUFDLENBQUE7UUFDbkUsSUFBSSxlQUFlLEVBQUUsQ0FBQztZQUNyQixNQUFNLGFBQWEsR0FBRyxtQ0FBbUMsQ0FBQTtZQUN6RCxJQUFJLFdBQVcsR0FBRyxVQUFVLENBQUMsUUFBUSxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQTJCLENBQUE7WUFDN0YsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUNsQixXQUFXLEdBQUcsaUJBQWlCLEVBQUUsQ0FBQTtnQkFDakMsV0FBVyxDQUFDLElBQUksR0FBRyxhQUFhLENBQUE7Z0JBQ2hDLFdBQVcsQ0FBQyxFQUFFLEdBQUcsYUFBYSxDQUFBO1lBQy9CLENBQUM7WUFFRCxXQUFXLENBQUMsT0FBTyxHQUFHLGVBQWUsQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUNqRCxDQUFDO0lBQ0YsQ0FBQztJQUVELDJFQUEyRTtJQUMzRSx5RUFBeUU7SUFDekUsbURBQW1EO0lBQ25ELElBQUksUUFBUSxFQUFFLENBQUM7UUFDZCxTQUFTLENBQUMsT0FBTyxDQUFDOzs7Ozs7OztHQVFqQixDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsZ0dBQWdHO0lBQ2hHLElBQUksS0FBSyxJQUFJLFlBQVksRUFBRSxFQUFFLENBQUM7UUFDN0IsU0FBUyxDQUFDLE9BQU8sQ0FBQyw0QkFBNEIsbUJBQW1CLEtBQUssQ0FBQyxDQUFBO0lBQ3hFLENBQUM7QUFDRixDQUFDLENBQUMsQ0FBQSJ9