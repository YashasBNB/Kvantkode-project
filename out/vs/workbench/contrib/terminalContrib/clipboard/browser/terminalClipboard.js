/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IDialogService } from '../../../../../platform/dialogs/common/dialogs.js';
export async function shouldPasteTerminalText(accessor, text, bracketedPasteMode) {
    const configurationService = accessor.get(IConfigurationService);
    const dialogService = accessor.get(IDialogService);
    // If the clipboard has only one line, a warning should never show
    const textForLines = text.split(/\r?\n/);
    if (textForLines.length === 1) {
        return true;
    }
    // Get config value
    function parseConfigValue(value) {
        // Valid value
        if (typeof value === 'string') {
            if (value === 'auto' || value === 'always' || value === 'never') {
                return value;
            }
        }
        // Legacy backwards compatibility
        if (typeof value === 'boolean') {
            return value ? 'auto' : 'never';
        }
        // Invalid value fallback
        return 'auto';
    }
    const configValue = parseConfigValue(configurationService.getValue("terminal.integrated.enableMultiLinePasteWarning" /* TerminalSettingId.EnableMultiLinePasteWarning */));
    // Never show it
    if (configValue === 'never') {
        return true;
    }
    // Special edge cases to not show for auto
    if (configValue === 'auto') {
        // Ignore check if the shell is in bracketed paste mode (ie. the shell can handle multi-line
        // text).
        if (bracketedPasteMode) {
            return true;
        }
        const textForLines = text.split(/\r?\n/);
        // Ignore check when a command is copied with a trailing new line
        if (textForLines.length === 2 && textForLines[1].trim().length === 0) {
            return true;
        }
    }
    const displayItemsCount = 3;
    const maxPreviewLineLength = 30;
    let detail = localize('preview', 'Preview:');
    for (let i = 0; i < Math.min(textForLines.length, displayItemsCount); i++) {
        const line = textForLines[i];
        const cleanedLine = line.length > maxPreviewLineLength ? `${line.slice(0, maxPreviewLineLength)}…` : line;
        detail += `\n${cleanedLine}`;
    }
    if (textForLines.length > displayItemsCount) {
        detail += `\n…`;
    }
    const { result, checkboxChecked } = await dialogService.prompt({
        message: localize('confirmMoveTrashMessageFilesAndDirectories', 'Are you sure you want to paste {0} lines of text into the terminal?', textForLines.length),
        detail,
        type: 'warning',
        buttons: [
            {
                label: localize({ key: 'multiLinePasteButton', comment: ['&& denotes a mnemonic'] }, '&&Paste'),
                run: () => ({ confirmed: true, singleLine: false }),
            },
            {
                label: localize({ key: 'multiLinePasteButton.oneLine', comment: ['&& denotes a mnemonic'] }, 'Paste as &&one line'),
                run: () => ({ confirmed: true, singleLine: true }),
            },
        ],
        cancelButton: true,
        checkbox: {
            label: localize('doNotAskAgain', 'Do not ask me again'),
        },
    });
    if (!result) {
        return false;
    }
    if (result.confirmed && checkboxChecked) {
        await configurationService.updateValue("terminal.integrated.enableMultiLinePasteWarning" /* TerminalSettingId.EnableMultiLinePasteWarning */, 'never');
    }
    if (result.singleLine) {
        return { modifiedText: text.replace(/\r?\n/g, '') };
    }
    return result.confirmed;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDbGlwYm9hcmQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvY2xpcGJvYXJkL2Jyb3dzZXIvdGVybWluYWxDbGlwYm9hcmQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2hELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUlsRixNQUFNLENBQUMsS0FBSyxVQUFVLHVCQUF1QixDQUM1QyxRQUEwQixFQUMxQixJQUFZLEVBQ1osa0JBQXVDO0lBRXZDLE1BQU0sb0JBQW9CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFBO0lBQ2hFLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7SUFFbEQsa0VBQWtFO0lBQ2xFLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDeEMsSUFBSSxZQUFZLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1FBQy9CLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELG1CQUFtQjtJQUNuQixTQUFTLGdCQUFnQixDQUFDLEtBQWM7UUFDdkMsY0FBYztRQUNkLElBQUksT0FBTyxLQUFLLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDL0IsSUFBSSxLQUFLLEtBQUssTUFBTSxJQUFJLEtBQUssS0FBSyxRQUFRLElBQUksS0FBSyxLQUFLLE9BQU8sRUFBRSxDQUFDO2dCQUNqRSxPQUFPLEtBQUssQ0FBQTtZQUNiLENBQUM7UUFDRixDQUFD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