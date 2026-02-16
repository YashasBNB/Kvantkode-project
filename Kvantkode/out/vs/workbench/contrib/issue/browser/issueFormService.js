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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNzdWVGb3JtU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvaXNzdWUvYnJvd3Nlci9pc3N1ZUZvcm1TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDdEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN4RSxPQUFPLFFBQVEsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUN6RixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDL0UsT0FBTyxFQUNOLG1CQUFtQixFQUNuQixzQkFBc0IsR0FDdEIsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxPQUFPLE1BQU0sZ0RBQWdELENBQUE7QUFFcEUsT0FBTyxFQUNOLG1CQUFtQixFQUNuQix1QkFBdUIsR0FDdkIsTUFBTSxxRUFBcUUsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFckUsT0FBTyxRQUFRLE1BQU0s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