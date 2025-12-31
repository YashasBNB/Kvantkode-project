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
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IDialogService, } from '../../../../platform/dialogs/common/dialogs.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { registerWorkbenchContribution2, } from '../../../common/contributions.js';
import { BrowserDialogHandler } from '../../../browser/parts/dialogs/dialogHandler.js';
import { NativeDialogHandler } from './dialogHandler.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
let DialogHandlerContribution = class DialogHandlerContribution extends Disposable {
    static { this.ID = 'workbench.contrib.dialogHandler'; }
    constructor(configurationService, dialogService, logService, layoutService, keybindingService, instantiationService, productService, clipboardService, nativeHostService, openerService) {
        super();
        this.configurationService = configurationService;
        this.dialogService = dialogService;
        this.browserImpl = new Lazy(() => new BrowserDialogHandler(logService, layoutService, keybindingService, instantiationService, productService, clipboardService, openerService));
        this.nativeImpl = new Lazy(() => new NativeDialogHandler(logService, nativeHostService, productService, clipboardService));
        this.model = this.dialogService.model;
        this._register(this.model.onWillShowDialog(() => {
            if (!this.currentDialog) {
                this.processDialogs();
            }
        }));
        this.processDialogs();
    }
    async processDialogs() {
        while (this.model.dialogs.length) {
            this.currentDialog = this.model.dialogs[0];
            let result = undefined;
            try {
                // Confirm
                if (this.currentDialog.args.confirmArgs) {
                    const args = this.currentDialog.args.confirmArgs;
                    result =
                        this.useCustomDialog || args?.confirmation.custom
                            ? await this.browserImpl.value.confirm(args.confirmation)
                            : await this.nativeImpl.value.confirm(args.confirmation);
                }
                // Input (custom only)
                else if (this.currentDialog.args.inputArgs) {
                    const args = this.currentDialog.args.inputArgs;
                    result = await this.browserImpl.value.input(args.input);
                }
                // Prompt
                else if (this.currentDialog.args.promptArgs) {
                    const args = this.currentDialog.args.promptArgs;
                    result =
                        this.useCustomDialog || args?.prompt.custom
                            ? await this.browserImpl.value.prompt(args.prompt)
                            : await this.nativeImpl.value.prompt(args.prompt);
                }
                // About
                else {
                    if (this.useCustomDialog) {
                        await this.browserImpl.value.about();
                    }
                    else {
                        await this.nativeImpl.value.about();
                    }
                }
            }
            catch (error) {
                result = error;
            }
            this.currentDialog.close(result);
            this.currentDialog = undefined;
        }
    }
    get useCustomDialog() {
        return this.configurationService.getValue('window.dialogStyle') === 'custom';
    }
};
DialogHandlerContribution = __decorate([
    __param(0, IConfigurationService),
    __param(1, IDialogService),
    __param(2, ILogService),
    __param(3, ILayoutService),
    __param(4, IKeybindingService),
    __param(5, IInstantiationService),
    __param(6, IProductService),
    __param(7, IClipboardService),
    __param(8, INativeHostService),
    __param(9, IOpenerService)
], DialogHandlerContribution);
export { DialogHandlerContribution };
registerWorkbenchContribution2(DialogHandlerContribution.ID, DialogHandlerContribution, 1 /* WorkbenchPhase.BlockStartup */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhbG9nLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9lbGVjdHJvbi1zYW5kYm94L3BhcnRzL2RpYWxvZ3MvZGlhbG9nLmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUM3RixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBR04sY0FBYyxHQUNkLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sdURBQXVELENBQUE7QUFDdkYsT0FBTyxFQUdOLDhCQUE4QixHQUM5QixNQUFNLGtDQUFrQyxDQUFBO0FBRXpDLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRXhELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBRXRF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