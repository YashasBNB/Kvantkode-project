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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDbGlwYm9hcmQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9jbGlwYm9hcmQvYnJvd3Nlci90ZXJtaW5hbENsaXBib2FyZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDaEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBSWxGLE1BQU0sQ0FBQyxLQUFLLFVBQVUsdUJBQXVCLENBQzVDLFFBQTBCLEVBQzFCLElBQVksRUFDWixrQkFBdUM7SUFFdkMsTUFBTSxvQkFBb0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLENBQUE7SUFDaEUsTUFBTSxhQUFhLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsQ0FBQTtJQUVsRCxrRUFBa0U7SUFDbEUsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUN4QyxJQUFJLFlBQVksQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDL0IsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsbUJBQW1CO0lBQ25CLFNBQVMsZ0JBQWdCLENBQUMsS0FBYztRQUN2QyxjQUFjO1FBQ2QsSUFBSSxPQUFPLEtBQUssS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUMvQixJQUFJLEtBQUssS0FBSyxNQUFNLElBQUksS0FBSyxLQUFLLFFBQVEsSUFBSSxLQUFLLEtBQUssT0FBTyxFQUFFLENBQUM7Z0JBQ2pFLE9BQU8sS0FBSyxDQUFBO1lBQ2IsQ0FBQztRQUNG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