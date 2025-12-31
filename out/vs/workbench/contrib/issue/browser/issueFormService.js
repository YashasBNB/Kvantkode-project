var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { safeInnerHtml } from '../../../../base/browser/dom.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { isLinux, isWindows } from '../../../../base/common/platform.js';
import Severity from '../../../../base/common/severity.js';
import { localize } from '../../../../nls.js';
import { IMenuService, MenuId } from '../../../../platform/actions/common/actions.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { ExtensionIdentifier, ExtensionIdentifierSet, } from '../../../../platform/extensions/common/extensions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import product from '../../../../platform/product/common/product.js';
import { AuxiliaryWindowMode, IAuxiliaryWindowService, } from '../../../services/auxiliaryWindow/browser/auxiliaryWindowService.js';
import { IHostService } from '../../../services/host/browser/host.js';
import BaseHtml from './issueReporterPage.js';
import { IssueWebReporter } from './issueReporterService.js';
import './media/issueReporter.css';
let IssueFormService = class IssueFormService {
    constructor(instantiationService, auxiliaryWindowService, menuService, contextKeyService, logService, dialogService, hostService) {
        this.instantiationService = instantiationService;
        this.auxiliaryWindowService = auxiliaryWindowService;
        this.menuService = menuService;
        this.contextKeyService = contextKeyService;
        this.logService = logService;
        this.dialogService = dialogService;
        this.hostService = hostService;
        this.issueReporterWindow = null;
        this.extensionIdentifierSet = new ExtensionIdentifierSet();
        this.arch = '';
        this.release = '';
        this.type = '';
    }
    async openReporter(data) {
        if (this.hasToReload(data)) {
            return;
        }
        await this.openAuxIssueReporter(data);
        if (this.issueReporterWindow) {
            const issueReporter = this.instantiationService.createInstance(IssueWebReporter, false, data, { type: this.type, arch: this.arch, release: this.release }, product, this.issueReporterWindow);
            issueReporter.render();
        }
    }
    async openAuxIssueReporter(data, bounds) {
        let issueReporterBounds = { width: 700, height: 800 };
        // Center Issue Reporter Window based on bounds from native host service
        if (bounds && bounds.x && bounds.y) {
            const centerX = bounds.x + bounds.width / 2;
            const centerY = bounds.y + bounds.height / 2;
            issueReporterBounds = { ...issueReporterBounds, x: centerX - 350, y: centerY - 400 };
        }
        const disposables = new DisposableStore();
        // Auxiliary Window
        const auxiliaryWindow = disposables.add(await this.auxiliaryWindowService.open({
            mode: AuxiliaryWindowMode.Normal,
            bounds: issueReporterBounds,
            nativeTitlebar: true,
            disableFullscreen: true,
        }));
        const platformClass = isWindows ? 'windows' : isLinux ? 'linux' : 'mac';
        if (auxiliaryWindow) {
            await auxiliaryWindow.whenStylesHaveLoaded;
            auxiliaryWindow.window.document.title = 'Issue Reporter';
            auxiliaryWindow.window.document.body.classList.add('issue-reporter-body', 'monaco-workbench', platformClass);
            // custom issue reporter wrapper
            const div = document.createElement('div');
            div.classList.add('monaco-workbench');
            // removes preset monaco-workbench
            auxiliaryWindow.container.remove();
            auxiliaryWindow.window.document.body.appendChild(div);
            safeInnerHtml(div, BaseHtml());
            this.issueReporterWindow = auxiliaryWindow.window;
        }
        else {
            console.error('Failed to open auxiliary window');
            disposables.dispose();
        }
        // handle closing issue reporter
        this.issueReporterWindow?.addEventListener('beforeunload', () => {
            auxiliaryWindow.window.close();
            disposables.dispose();
            this.issueReporterWindow = null;
        });
    }
    async sendReporterMenu(extensionId) {
        const menu = this.menuService.createMenu(MenuId.IssueReporter, this.contextKeyService);
        // render menu and dispose
        const actions = menu.getActions({ renderShortTitle: true }).flatMap((entry) => entry[1]);
        for (const action of actions) {
            try {
                if (action.item &&
                    'source' in action.item &&
                    action.item.source?.id.toLowerCase() === extensionId.toLowerCase()) {
                    this.extensionIdentifierSet.add(extensionId.toLowerCase());
                    await action.run();
                }
            }
            catch (error) {
                console.error(error);
            }
        }
        if (!this.extensionIdentifierSet.has(extensionId)) {
            // send undefined to indicate no action was taken
            return undefined;
        }
        // we found the extension, now we clean up the menu and remove it from the set. This is to ensure that we do duplicate extension identifiers
        this.extensionIdentifierSet.delete(new ExtensionIdentifier(extensionId));
        menu.dispose();
        const result = this.currentData;
        // reset current data.
        this.currentData = undefined;
        return result ?? undefined;
    }
    //#region used by issue reporter
    async closeReporter() {
        this.issueReporterWindow?.close();
    }
    async reloadWithExtensionsDisabled() {
        if (this.issueReporterWindow) {
            try {
                await this.hostService.reload({ disableExtensions: true });
            }
            catch (error) {
                this.logService.error(error);
            }
        }
    }
    async showConfirmCloseDialog() {
        await this.dialogService.prompt({
            type: Severity.Warning,
            message: localize('confirmCloseIssueReporter', 'Your input will not be saved. Are you sure you want to close this window?'),
            buttons: [
                {
                    label: localize({ key: 'yes', comment: ['&& denotes a mnemonic'] }, '&&Yes'),
                    run: () => {
                        this.closeReporter();
                        this.issueReporterWindow = null;
                    },
                },
                {
                    label: localize('cancel', 'Cancel'),
                    run: () => { },
                },
            ],
        });
    }
    async showClipboardDialog() {
        let result = false;
        await this.dialogService.prompt({
            type: Severity.Warning,
            message: localize('issueReporterWriteToClipboard', 'There is too much data to send to GitHub directly. The data will be copied to the clipboard, please paste it into the GitHub issue page that is opened.'),
            buttons: [
                {
                    label: localize({ key: 'ok', comment: ['&& denotes a mnemonic'] }, '&&OK'),
                    run: () => {
                        result = true;
                    },
                },
                {
                    label: localize('cancel', 'Cancel'),
                    run: () => {
                        result = false;
                    },
                },
            ],
        });
        return result;
    }
    hasToReload(data) {
        if (data.extensionId && this.extensionIdentifierSet.has(data.extensionId)) {
            this.currentData = data;
            this.issueReporterWindow?.focus();
            return true;
        }
        if (this.issueReporterWindow) {
            this.issueReporterWindow.focus();
            return true;
        }
        return false;
    }
};
IssueFormService = __decorate([
    __param(0, IInstantiationService),
    __param(1, IAuxiliaryWindowService),
    __param(2, IMenuService),
    __param(3, IContextKeyService),
    __param(4, ILogService),
    __param(5, IDialogService),
    __param(6, IHostService)
], IssueFormService);
export { IssueFormService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNzdWVGb3JtU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2lzc3VlL2Jyb3dzZXIvaXNzdWVGb3JtU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDL0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDeEUsT0FBTyxRQUFRLE1BQU0scUNBQXFDLENBQUE7QUFDMUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDckYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQy9FLE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsc0JBQXNCLEdBQ3RCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sT0FBTyxNQUFNLGdEQUFnRCxDQUFBO0FBRXBFLE9BQU8sRUFDTixtQkFBbUIsRUFDbkIsdUJBQXVCLEdBQ3ZCLE1BQU0scUVBQXFFLENBQUE7QUFDNUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRXJFLE9BQU8sUUFBUSxNQUFNLHdCQUF3QixDQUFBO0FBQzdDLE9BQU8s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