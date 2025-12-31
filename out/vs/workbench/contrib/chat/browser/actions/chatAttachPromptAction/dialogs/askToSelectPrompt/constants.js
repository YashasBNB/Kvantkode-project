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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uc3RhbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2FjdGlvbnMvY2hhdEF0dGFjaFByb21wdEFjdGlvbi9kaWFsb2dzL2Fza1RvU2VsZWN0UHJvbXB0L2NvbnN0YW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDekQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUV6RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDNUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saURBQWlELENBQUE7QUFDbkYsT0FBTyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQU1wRjs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBRyxTQUFTLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQTtBQUVqRTs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLFlBQVksR0FBRyxTQUFTLElBQUksT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQTtBQUU5RDs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLFdBQVcsR0FBaUMsTUFBTSxDQUFDLE1BQU0sQ0FBQztJQUN0RSxJQUFJLEVBQUUsTUFBTTtJQUNaLEtBQUssRUFBRSxRQUFRLENBQ2QsK0NBQStDLEVBQy9DLHNDQUFzQyxDQUN0QztJQUNELFdBQVcsRUFBRSxpQkFBaUI7SUFDOUIsT0FBTyxFQUFFLGlCQUFpQjtJQUMxQixLQUFLLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQztDQUNuQyxDQUFDLENBQUE7QUFFRjs7R0FFRztBQUNILE1BQU0sQ0FBQyxNQUFNLFdBQVcsR0FBc0IsTUFBTSxDQUFDLE1BQU0sQ0FBQztJQUMzRCxPQUFPLEVBQUUsUUFBUSxDQUNoQix3REFBd0QsRUFDeEQsd0JBQXdCLEVBQ3hCLGNBQWMsQ0FDZDtJQUNELFNBQVMsRUFBRSxTQUFTLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUM7Q0FDOUMsQ0FBQyxDQUFBO0FBRUY7O0dBRUc7QUFDSCxNQUFNLENBQUMsTUFBTSxhQUFhLEdBQXNCLE1BQU0sQ0FBQyxNQUFNLENBQUM7SUFDN0QsT0FBTyxFQUFFLFFBQVEsQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDO0lBQ3JDLFNBQVMsRUFBRSxTQUFTLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUM7Q0FDL0MsQ0FBQyxDQUFBIn0=