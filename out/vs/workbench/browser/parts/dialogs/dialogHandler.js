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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhbG9nSGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9icm93c2VyL3BhcnRzL2RpYWxvZ3MvZGlhbG9nSGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFRTixxQkFBcUIsR0FJckIsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDckYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sUUFBUSxNQUFNLHFDQUFxQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxNQUFNLEVBQWlCLE1BQU0sOENBQThDLENBQUE7QUFDcEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDekQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUNOLGdCQUFnQixFQUNoQixvQkFBb0IsR0FDcEIsTUFBTSxnRkFBZ0YsQ0FBQTtBQUN2RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDN0UsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFFdEYsSUFBTSxvQkFBb0IsR0FBMUIs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