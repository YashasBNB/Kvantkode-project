/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../../../../nls.js';
import { URI } from '../../../../../../../../base/common/uri.js';
import { Codicon } from '../../../../../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../../../../../base/common/themables.js';
import { DOCUMENTATION_URL } from '../../../../../common/promptSyntax/constants.js';
import { isLinux, isWindows } from '../../../../../../../../base/common/platform.js';
/**
 * Name of the `"super"` key based on the current OS.
 */
export const SUPER_KEY_NAME = isWindows || isLinux ? 'Ctrl' : '⌘';
/**
 * Name of the `alt`/`options` key based on the current OS.
 */
export const ALT_KEY_NAME = isWindows || isLinux ? 'Alt' : '⌥';
/**
 * A special quick pick item that links to the documentation.
 */
export const DOCS_OPTION = Object.freeze({
    type: 'item',
    label: localize('commands.prompts.use.select-dialog.docs-label', 'Learn how to create reusable prompts'),
    description: DOCUMENTATION_URL,
    tooltip: DOCUMENTATION_URL,
    value: URI.parse(DOCUMENTATION_URL),
});
/**
 * Button that opens a prompt file in the editor.
 */
export const EDIT_BUTTON = Object.freeze({
    tooltip: localize('commands.prompts.use.select-dialog.open-button.tooltip', 'edit ({0}-key + enter)', SUPER_KEY_NAME),
    iconClass: ThemeIcon.asClassName(Codicon.edit),
});
/**
 * Button that deletes a prompt file.
 */
export const DELETE_BUTTON = Object.freeze({
    tooltip: localize('delete', 'delete'),
    iconClass: ThemeIcon.asClassName(Codicon.trash),
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc3RhbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9jaGF0L2Jyb3dzZXIvYWN0aW9ucy9jaGF0QXR0YWNoUHJvbXB0QWN0aW9uL2RpYWxvZ3MvYXNrVG9TZWxlY3RQcm9tcHQvY29uc3RhbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBRXpFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNuRixPQUFPLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBTXBGOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sY0FBYyxHQUFHLFNBQVMsSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFBO0FBRWpFOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sWUFBWSxHQUFHLFNBQVMsSUFBSSxPQUFPLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFBO0FBRTlEOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sV0FBVyxHQUFpQyxNQUFNLENBQUMsTUFBTSxDQUFDO0lBQ3RFLElBQUksRUFBRSxNQUFNO0lBQ1osS0FBSyxFQUFFLFFBQVEsQ0FDZCwrQ0FBK0MsRUFDL0Msc0NBQXNDLENBQ3RDO0lBQ0QsV0FBVyxFQUFFLGlCQUFpQjtJQUM5QixPQUFPLEVBQUUsaUJBQWlCO0lBQzFCLEtBQUssRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLGlCQUFpQixDQUFDO0NBQ25DLENBQUMsQ0FBQTtBQUVGOztHQUVHO0FBQ0gsTUFBTSxDQUFDLE1BQU0sV0FBVyxHQUFzQixNQUFNLENBQUMsTUFBTSxDQUFDO0lBQzNELE9BQU8sRUFBRSxRQUFRLENBQ2hCLHdEQUF3RCxFQUN4RCx3QkFBd0IsRUFDeEIsY0FBYyxDQUNkO0lBQ0QsU0FBUyxFQUFFLFNBQVMsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQztDQUM5QyxDQUFDLENBQUE7QUFFRjs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLGFBQWEsR0FBc0IsTUFBTSxDQUFDLE1BQU0sQ0FBQztJQUM3RCxPQUFPLEVBQUUsUUFBUSxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUM7SUFDckMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQztDQUMvQyxDQUFDLENBQUEifQ==