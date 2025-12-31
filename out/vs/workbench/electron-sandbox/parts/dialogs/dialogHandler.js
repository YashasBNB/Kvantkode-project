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
import { localize } from '../../../../nls.js';
import { fromNow } from '../../../../base/common/date.js';
import { isLinuxSnap } from '../../../../base/common/platform.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { AbstractDialogHandler, } from '../../../../platform/dialogs/common/dialogs.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { process } from '../../../../base/parts/sandbox/electron-sandbox/globals.js';
import { getActiveWindow } from '../../../../base/browser/dom.js';
let NativeDialogHandler = class NativeDialogHandler extends AbstractDialogHandler {
    constructor(logService, nativeHostService, productService, clipboardService) {
        super();
        this.logService = logService;
        this.nativeHostService = nativeHostService;
        this.productService = productService;
        this.clipboardService = clipboardService;
    }
    async prompt(prompt) {
        this.logService.trace('DialogService#prompt', prompt.message);
        const buttons = this.getPromptButtons(prompt);
        const { response, checkboxChecked } = await this.nativeHostService.showMessageBox({
            type: this.getDialogType(prompt.type),
            title: prompt.title,
            message: prompt.message,
            detail: prompt.detail,
            buttons,
            cancelId: prompt.cancelButton ? buttons.length - 1 : -1 /* Disabled */,
            checkboxLabel: prompt.checkbox?.label,
            checkboxChecked: prompt.checkbox?.checked,
            targetWindowId: getActiveWindow().vscodeWindowId,
        });
        return this.getPromptResult(prompt, response, checkboxChecked);
    }
    async confirm(confirmation) {
        this.logService.trace('DialogService#confirm', confirmation.message);
        const buttons = this.getConfirmationButtons(confirmation);
        const { response, checkboxChecked } = await this.nativeHostService.showMessageBox({
            type: this.getDialogType(confirmation.type) ?? 'question',
            title: confirmation.title,
            message: confirmation.message,
            detail: confirmation.detail,
            buttons,
            cancelId: buttons.length - 1,
            checkboxLabel: confirmation.checkbox?.label,
            checkboxChecked: confirmation.checkbox?.checked,
            targetWindowId: getActiveWindow().vscodeWindowId,
        });
        return { confirmed: response === 0, checkboxChecked };
    }
    input() {
        throw new Error('Unsupported'); // we have no native API for password dialogs in Electron
    }
    async about() {
        let version = this.productService.version;
        if (this.productService.target) {
            version = `${version} (${this.productService.target} setup)`;
        }
        else if (this.productService.darwinUniversalAssetId) {
            version = `${version} (Universal)`;
        }
        const osProps = await this.nativeHostService.getOSProperties();
        const detailString = (useAgo) => {
            return localize({
                key: 'aboutDetail',
                comment: [
                    'Electron, Chromium, Node.js and V8 are product names that need no translation',
                ],
            }, 'VSCode Version: {0}\nVoid Version: {1}\nCommit: {2}\nDate: {3}\nElectron: {4}\nElectronBuildId: {5}\nChromium: {6}\nNode.js: {7}\nV8: {8}\nOS: {9}', version, this.productService.voidVersion || 'Unknown', // Void added this
            this.productService.commit || 'Unknown', this.productService.date
                ? `${this.productService.date}${useAgo ? ' (' + fromNow(new Date(this.productService.date), true) + ')' : ''}`
                : 'Unknown', process.versions['electron'], process.versions['microsoft-build'], process.versions['chrome'], process.versions['node'], process.versions['v8'], `${osProps.type} ${osProps.arch} ${osProps.release}${isLinuxSnap ? ' snap' : ''}`);
        };
        const detail = detailString(true);
        const detailToCopy = detailString(false);
        const { response } = await this.nativeHostService.showMessageBox({
            type: 'info',
            message: this.productService.nameLong,
            detail: `\n${detail}`,
            buttons: [
                localize({ key: 'copy', comment: ['&& denotes a mnemonic'] }, '&&Copy'),
                localize('okButton', 'OK'),
            ],
            targetWindowId: getActiveWindow().vscodeWindowId,
        });
        if (response === 0) {
            this.clipboardService.writeText(detailToCopy);
        }
    }
};
NativeDialogHandler = __decorate([
    __param(0, ILogService),
    __param(1, INativeHostService),
    __param(2, IProductService),
    __param(3, IClipboardService)
], NativeDialogHandler);
export { NativeDialogHandler };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhbG9nSGFuZGxlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9lbGVjdHJvbi1zYW5kYm94L3BhcnRzL2RpYWxvZ3MvZGlhbG9nSGFuZGxlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUM3RixPQUFPLEVBQ04scUJBQXFCLEdBS3JCLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDcEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRTFELElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW9CLFNBQVEscUJBQXFCO0lBQzdELFlBQytCLFVBQXVCLEVBQ2hCLGlCQUFxQyxFQUN4QyxjQUErQixFQUM3QixnQkFBbUM7UUFFdkUsS0FBSyxFQUFFLENBQUE7UUFMdUIsZUFBVSxHQUFWLFVBQVUsQ0FBYTtRQUNoQixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBQ3hDLG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQUM3QixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQW1C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