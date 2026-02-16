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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhbG9ncy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZGlhbG9ncy9jb21tb24vZGlhbG9ncy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUtoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxRQUFRLE1BQU0sa0NBQWtDLENBQUE7QUFFdkQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQzFDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUc3RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUVsRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFtUDNELE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBRyxlQUFlLENBQWlCLGVBQWUsQ0FBQyxDQUFBO0FBeUM5RSxJQUFLLFVBSUo7QUFKRCxXQUFLLFVBQVU7SUFDZCwyREFBZ0IsQ0FBQTtJQUNoQiwrQ0FBTSxDQUFBO0lBQ04sNkNBQUssQ0FBQTtBQUNOLENBQUMsRUFKSSxVQUFVLEtBQVYsVUFBVSxRQUlkO0FBRUQsTUFBTSxPQUFnQixxQkFBcUI7SUFDaEMsc0JBQXNCLENBQUMsTUFBcUI7UUFDckQsT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxVQUFVLENBQUMsWUFBWSxDQUFDLENBQUE7SUFDeEQsQ0FBQztJQUVTLGdCQUFnQixDQUFDLE1BQXdCO1FBQ2xELE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsVUFBVSxDQUFDLE1BQU0sQ0FB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