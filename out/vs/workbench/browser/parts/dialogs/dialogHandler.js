/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var BrowserDialogHandler_1;
import { localize } from '../../../../nls.js';
import { AbstractDialogHandler, } from '../../../../platform/dialogs/common/dialogs.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import Severity from '../../../../base/common/severity.js';
import { Dialog } from '../../../../base/browser/ui/dialog/dialog.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { fromNow } from '../../../../base/common/date.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { MarkdownRenderer, openLinkFromMarkdown, } from '../../../../editor/browser/widget/markdownRenderer/browser/markdownRenderer.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { createWorkbenchDialogOptions } from '../../../../platform/dialogs/browser/dialog.js';
let BrowserDialogHandler = class BrowserDialogHandler extends AbstractDialogHandler {
    static { BrowserDialogHandler_1 = this; }
    static { this.ALLOWABLE_COMMANDS = [
        'copy',
        'cut',
        'editor.action.selectAll',
        'editor.action.clipboardCopyAction',
        'editor.action.clipboardCutAction',
        'editor.action.clipboardPasteAction',
    ]; }
    constructor(logService, layoutService, keybindingService, instantiationService, productService, clipboardService, openerService) {
        super();
        this.logService = logService;
        this.layoutService = layoutService;
        this.keybindingService = keybindingService;
        this.productService = productService;
        this.clipboardService = clipboardService;
        this.openerService = openerService;
        this.markdownRenderer = instantiationService.createInstance(MarkdownRenderer, {});
    }
    async prompt(prompt) {
        this.logService.trace('DialogService#prompt', prompt.message);
        const buttons = this.getPromptButtons(prompt);
        const { button, checkboxChecked } = await this.doShow(prompt.type, prompt.message, buttons, prompt.detail, prompt.cancelButton ? buttons.length - 1 : -1 /* Disabled */, prompt.checkbox, undefined, typeof prompt?.custom === 'object' ? prompt.custom : undefined);
        return this.getPromptResult(prompt, button, checkboxChecked);
    }
    async confirm(confirmation) {
        this.logService.trace('DialogService#confirm', confirmation.message);
        const buttons = this.getConfirmationButtons(confirmation);
        const { button, checkboxChecked } = await this.doShow(confirmation.type ?? 'question', confirmation.message, buttons, confirmation.detail, buttons.length - 1, confirmation.checkbox, undefined, typeof confirmation?.custom === 'object' ? confirmation.custom : undefined);
        return { confirmed: button === 0, checkboxChecked };
    }
    async input(input) {
        this.logService.trace('DialogService#input', input.message);
        const buttons = this.getInputButtons(input);
        const { button, checkboxChecked, values } = await this.doShow(input.type ?? 'question', input.message, buttons, input.detail, buttons.length - 1, input?.checkbox, input.inputs, typeof input.custom === 'object' ? input.custom : undefined);
        return { confirmed: button === 0, checkboxChecked, values };
    }
    async about() {
        const detailString = (useAgo) => {
            return localize('aboutDetail', 'Version: {0}\nCommit: {1}\nDate: {2}\nBrowser: {3}', this.productService.version || 'Unknown', this.productService.commit || 'Unknown', this.productService.date
                ? `${this.productService.date}${useAgo ? ' (' + fromNow(new Date(this.productService.date), true) + ')' : ''}`
                : 'Unknown', navigator.userAgent);
        };
        const detail = detailString(true);
        const detailToCopy = detailString(false);
        const { button } = await this.doShow(Severity.Info, this.productService.nameLong, [
            localize({ key: 'copy', comment: ['&& denotes a mnemonic'] }, '&&Copy'),
            localize('ok', 'OK'),
        ], detail, 1);
        if (button === 0) {
            this.clipboardService.writeText(detailToCopy);
        }
    }
    async doShow(type, message, buttons, detail, cancelId, checkbox, inputs, customOptions) {
        const dialogDisposables = new DisposableStore();
        const renderBody = customOptions
            ? (parent) => {
                parent.classList.add(...(customOptions.classes || []));
                customOptions.markdownDetails?.forEach((markdownDetail) => {
                    const result = this.markdownRenderer.render(markdownDetail.markdown, {
                        actionHandler: {
                            callback: (link) => {
                                if (markdownDetail.dismissOnLinkClick) {
                                    dialog.dispose();
                                }
                                return openLinkFromMarkdown(this.openerService, link, markdownDetail.markdown.isTrusted, true /* skip URL validation to prevent another dialog from showing which is unsupported */);
                            },
                            disposables: dialogDisposables,
                        },
                    });
                    parent.appendChild(result.element);
                    result.element.classList.add(...(markdownDetail.classes || []));
                    dialogDisposables.add(result);
                });
            }
            : undefined;
        const dialog = new Dialog(this.layoutService.activeContainer, message, buttons, createWorkbenchDialogOptions({
            detail,
            cancelId,
            type: this.getDialogType(type),
            renderBody,
            icon: customOptions?.icon,
            disableCloseAction: customOptions?.disableCloseAction,
            buttonDetails: customOptions?.buttonDetails,
            checkboxLabel: checkbox?.label,
            checkboxChecked: checkbox?.checked,
            inputs,
        }, this.keybindingService, this.layoutService, BrowserDialogHandler_1.ALLOWABLE_COMMANDS));
        dialogDisposables.add(dialog);
        const result = await dialog.show();
        dialogDisposables.dispose();
        return result;
    }
};
BrowserDialogHandler = BrowserDialogHandler_1 = __decorate([
    __param(0, ILogService),
    __param(1, ILayoutService),
    __param(2, IKeybindingService),
    __param(3, IInstantiationService),
    __param(4, IProductService),
    __param(5, IClipboardService),
    __param(6, IOpenerService)
], BrowserDialogHandler);
export { BrowserDialogHandler };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhbG9nSGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2Jyb3dzZXIvcGFydHMvZGlhbG9ncy9kaWFsb2dIYW5kbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQVFOLHFCQUFxQixHQUlyQixNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxRQUFRLE1BQU0scUNBQXFDLENBQUE7QUFDMUQsT0FBTyxFQUFFLE1BQU0sRUFBaUIsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNwRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDdEUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN6RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQ04sZ0JBQWdCLEVBQ2hCLG9CQUFvQixHQUNwQixNQUFNLGdGQUFnRixDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtB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