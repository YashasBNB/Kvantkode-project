/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { basename } from '../../../base/common/resources.js';
import Severity from '../../../base/common/severity.js';
import { localize } from '../../../nls.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { mnemonicButtonLabel } from '../../../base/common/labels.js';
import { isLinux, isMacintosh, isWindows } from '../../../base/common/platform.js';
import { deepClone } from '../../../base/common/objects.js';
export const IDialogService = createDecorator('dialogService');
var DialogKind;
(function (DialogKind) {
    DialogKind[DialogKind["Confirmation"] = 1] = "Confirmation";
    DialogKind[DialogKind["Prompt"] = 2] = "Prompt";
    DialogKind[DialogKind["Input"] = 3] = "Input";
})(DialogKind || (DialogKind = {}));
export class AbstractDialogHandler {
    getConfirmationButtons(dialog) {
        return this.getButtons(dialog, DialogKind.Confirmation);
    }
    getPromptButtons(dialog) {
        return this.getButtons(dialog, DialogKind.Prompt);
    }
    getInputButtons(dialog) {
        return this.getButtons(dialog, DialogKind.Input);
    }
    getButtons(dialog, kind) {
        // We put buttons in the order of "default" button first and "cancel"
        // button last. There maybe later processing when presenting the buttons
        // based on OS standards.
        const buttons = [];
        switch (kind) {
            case DialogKind.Confirmation: {
                const confirmationDialog = dialog;
                if (confirmationDialog.primaryButton) {
                    buttons.push(confirmationDialog.primaryButton);
                }
                else {
                    buttons.push(localize({ key: 'yesButton', comment: ['&& denotes a mnemonic'] }, '&&Yes'));
                }
                if (confirmationDialog.cancelButton) {
                    buttons.push(confirmationDialog.cancelButton);
                }
                else {
                    buttons.push(localize('cancelButton', 'Cancel'));
                }
                break;
            }
            case DialogKind.Prompt: {
                const promptDialog = dialog;
                if (Array.isArray(promptDialog.buttons) && promptDialog.buttons.length > 0) {
                    buttons.push(...promptDialog.buttons.map((button) => button.label));
                }
                if (promptDialog.cancelButton) {
                    if (promptDialog.cancelButton === true) {
                        buttons.push(localize('cancelButton', 'Cancel'));
                    }
                    else if (typeof promptDialog.cancelButton === 'string') {
                        buttons.push(promptDialog.cancelButton);
                    }
                    else {
                        if (promptDialog.cancelButton.label) {
                            buttons.push(promptDialog.cancelButton.label);
                        }
                        else {
                            buttons.push(localize('cancelButton', 'Cancel'));
                        }
                    }
                }
                if (buttons.length === 0) {
                    buttons.push(localize({ key: 'okButton', comment: ['&& denotes a mnemonic'] }, '&&OK'));
                }
                break;
            }
            case DialogKind.Input: {
                const inputDialog = dialog;
                if (inputDialog.primaryButton) {
                    buttons.push(inputDialog.primaryButton);
                }
                else {
                    buttons.push(localize({ key: 'okButton', comment: ['&& denotes a mnemonic'] }, '&&OK'));
                }
                if (inputDialog.cancelButton) {
                    buttons.push(inputDialog.cancelButton);
                }
                else {
                    buttons.push(localize('cancelButton', 'Cancel'));
                }
                break;
            }
        }
        return buttons;
    }
    getDialogType(type) {
        if (typeof type === 'string') {
            return type;
        }
        if (typeof type === 'number') {
            return type === Severity.Info
                ? 'info'
                : type === Severity.Error
                    ? 'error'
                    : type === Severity.Warning
                        ? 'warning'
                        : 'none';
        }
        return undefined;
    }
    getPromptResult(prompt, buttonIndex, checkboxChecked) {
        const promptButtons = [...(prompt.buttons ?? [])];
        if (prompt.cancelButton &&
            typeof prompt.cancelButton !== 'string' &&
            typeof prompt.cancelButton !== 'boolean') {
            promptButtons.push(prompt.cancelButton);
        }
        let result = promptButtons[buttonIndex]?.run({ checkboxChecked });
        if (!(result instanceof Promise)) {
            result = Promise.resolve(result);
        }
        return { result, checkboxChecked };
    }
}
export const IFileDialogService = createDecorator('fileDialogService');
export var ConfirmResult;
(function (ConfirmResult) {
    ConfirmResult[ConfirmResult["SAVE"] = 0] = "SAVE";
    ConfirmResult[ConfirmResult["DONT_SAVE"] = 1] = "DONT_SAVE";
    ConfirmResult[ConfirmResult["CANCEL"] = 2] = "CANCEL";
})(ConfirmResult || (ConfirmResult = {}));
const MAX_CONFIRM_FILES = 10;
export function getFileNamesMessage(fileNamesOrResources) {
    const message = [];
    message.push(...fileNamesOrResources
        .slice(0, MAX_CONFIRM_FILES)
        .map((fileNameOrResource) => typeof fileNameOrResource === 'string' ? fileNameOrResource : basename(fileNameOrResource)));
    if (fileNamesOrResources.length > MAX_CONFIRM_FILES) {
        if (fileNamesOrResources.length - MAX_CONFIRM_FILES === 1) {
            message.push(localize('moreFile', '...1 additional file not shown'));
        }
        else {
            message.push(localize('moreFiles', '...{0} additional files not shown', fileNamesOrResources.length - MAX_CONFIRM_FILES));
        }
    }
    message.push('');
    return message.join('\n');
}
/**
 * A utility method to ensure the options for the message box dialog
 * are using properties that are consistent across all platforms and
 * specific to the platform where necessary.
 */
export function massageMessageBoxOptions(options, productService) {
    const massagedOptions = deepClone(options);
    let buttons = (massagedOptions.buttons ?? []).map((button) => mnemonicButtonLabel(button).withMnemonic);
    let buttonIndeces = (options.buttons || []).map((button, index) => index);
    let defaultId = 0; // by default the first button is default button
    let cancelId = massagedOptions.cancelId ?? buttons.length - 1; // by default the last button is cancel button
    // Apply HIG per OS when more than one button is used
    if (buttons.length > 1) {
        const cancelButton = typeof cancelId === 'number' ? buttons[cancelId] : undefined;
        if (isLinux || isMacintosh) {
            // Linux: the GNOME HIG (https://developer.gnome.org/hig/patterns/feedback/dialogs.html?highlight=dialog)
            // recommend the following:
            // "Always ensure that the cancel button appears first, before the affirmative button. In left-to-right
            //  locales, this is on the left. This button order ensures that users become aware of, and are reminded
            //  of, the ability to cancel prior to encountering the affirmative button."
            //
            // Electron APIs do not reorder buttons for us, so we ensure a reverse order of buttons and a position
            // of the cancel button (if provided) that matches the HIG
            // macOS: the HIG (https://developer.apple.com/design/human-interface-guidelines/components/presentation/alerts)
            // recommend the following:
            // "Place buttons where people expect. In general, place the button people are most likely to choose on the trailing side in a
            //  row of buttons or at the top in a stack of buttons. Always place the default button on the trailing side of a row or at the
            //  top of a stack. Cancel buttons are typically on the leading side of a row or at the bottom of a stack."
            //
            // However: it seems that older macOS versions where 3 buttons were presented in a row differ from this
            // recommendation. In fact, cancel buttons were placed to the left of the default button and secondary
            // buttons on the far left. To support these older macOS versions we have to manually shuffle the cancel
            // button in the same way as we do on Linux. This will not have any impact on newer macOS versions where
            // shuffling is done for us.
            if (typeof cancelButton === 'string' && buttons.length > 1 && cancelId !== 1) {
                buttons.splice(cancelId, 1);
                buttons.splice(1, 0, cancelButton);
                const cancelButtonIndex = buttonIndeces[cancelId];
                buttonIndeces.splice(cancelId, 1);
                buttonIndeces.splice(1, 0, cancelButtonIndex);
                cancelId = 1;
            }
            if (isLinux && buttons.length > 1) {
                buttons = buttons.reverse();
                buttonIndeces = buttonIndeces.reverse();
                defaultId = buttons.length - 1;
                if (typeof cancelButton === 'string') {
                    cancelId = defaultId - 1;
                }
            }
        }
        else if (isWindows) {
            // Windows: the HIG (https://learn.microsoft.com/en-us/windows/win32/uxguide/win-dialog-box)
            // recommend the following:
            // "One of the following sets of concise commands: Yes/No, Yes/No/Cancel, [Do it]/Cancel,
            //  [Do it]/[Don't do it], [Do it]/[Don't do it]/Cancel."
            //
            // Electron APIs do not reorder buttons for us, so we ensure the position of the cancel button
            // (if provided) that matches the HIG
            if (typeof cancelButton === 'string' &&
                buttons.length > 1 &&
                cancelId !== buttons.length - 1 /* last action */) {
                buttons.splice(cancelId, 1);
                buttons.push(cancelButton);
                const buttonIndex = buttonIndeces[cancelId];
                buttonIndeces.splice(cancelId, 1);
                buttonIndeces.push(buttonIndex);
                cancelId = buttons.length - 1;
            }
        }
    }
    massagedOptions.buttons = buttons;
    massagedOptions.defaultId = defaultId;
    massagedOptions.cancelId = cancelId;
    massagedOptions.noLink = true;
    massagedOptions.title = massagedOptions.title || productService.nameLong;
    return {
        options: massagedOptions,
        buttonIndeces,
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhbG9ncy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2RpYWxvZ3MvY29tbW9uL2RpYWxvZ3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFLaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sUUFBUSxNQUFNLGtDQUFrQyxDQUFBO0FBRXZELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQkFBaUIsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFHN0UsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFbEYsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBbVAzRCxNQUFNLENBQUMsTUFBTSxjQUFjLEdBQUcsZUFBZSxDQUFpQixlQUFlLENBQUMsQ0FBQTtBQXlDOUUsSUFBSyxVQUlKO0FBSkQsV0FBSyxVQUFVO0lBQ2QsMkRBQWdCLENBQUE7SUFDaEIsK0NBQU0sQ0FBQTtJQUNOLDZDQUFLLENBQUE7QUFDTixDQUFDLEVBSkksVUFBVSxLQUFWLFVBQVUsUUFJZDtBQUVELE1BQU0sT0FBZ0IscUJBQXFCO0lBQ2hDLHNCQUFzQixDQUFDLE1BQXFCO1FBQ3JELE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLFlBQVksQ0FBQyxDQUFBO0lBQ3hELENBQUM7SUFFUyxnQkFBZ0IsQ0FBQyxNQUF3QjtRQUNsRCxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtJQUNsRCxDQUFDO0lBRVMs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