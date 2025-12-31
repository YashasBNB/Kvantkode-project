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
var TroubleshootIssueService_1, IssueTroubleshootUi_1;
import { localize, localize2 } from '../../../../nls.js';
import { IExtensionManagementService } from '../../../../platform/extensionManagement/common/extensionManagement.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IWorkbenchIssueService } from '../common/issue.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { IUserDataProfileImportExportService, IUserDataProfileManagementService, IUserDataProfileService, } from '../../../services/userDataProfile/common/userDataProfile.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IExtensionBisectService } from '../../../services/extensionManagement/browser/extensionBisect.js';
import { INotificationService, NotificationPriority, Severity, } from '../../../../platform/notification/common/notification.js';
import { IWorkbenchExtensionEnablementService } from '../../../services/extensionManagement/common/extensionManagement.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IUserDataProfilesService, } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { createDecorator, } from '../../../../platform/instantiation/common/instantiation.js';
import { Categories } from '../../../../platform/action/common/actionCommonCategories.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions } from '../../../common/contributions.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { URI } from '../../../../base/common/uri.js';
import { RemoteNameContext } from '../../../common/contextkeys.js';
import { IsWebContext } from '../../../../platform/contextkey/common/contextkeys.js';
const ITroubleshootIssueService = createDecorator('ITroubleshootIssueService');
var TroubleshootStage;
(function (TroubleshootStage) {
    TroubleshootStage[TroubleshootStage["EXTENSIONS"] = 1] = "EXTENSIONS";
    TroubleshootStage[TroubleshootStage["WORKBENCH"] = 2] = "WORKBENCH";
})(TroubleshootStage || (TroubleshootStage = {}));
class TroubleShootState {
    static fromJSON(raw) {
        if (!raw) {
            return undefined;
        }
        try {
            const data = JSON.parse(raw);
            if ((data.stage === TroubleshootStage.EXTENSIONS ||
                data.stage === TroubleshootStage.WORKBENCH) &&
                typeof data.profile === 'string') {
                return new TroubleShootState(data.stage, data.profile);
            }
        }
        catch {
            /* ignore */
        }
        return undefined;
    }
    constructor(stage, profile) {
        this.stage = stage;
        this.profile = profile;
    }
}
let TroubleshootIssueService = class TroubleshootIssueService extends Disposable {
    static { TroubleshootIssueService_1 = this; }
    static { this.storageKey = 'issueTroubleshootState'; }
    constructor(userDataProfileService, userDataProfilesService, userDataProfileManagementService, userDataProfileImportExportService, dialogService, extensionBisectService, notificationService, extensionManagementService, extensionEnablementService, issueService, productService, hostService, storageService, openerService) {
        super();
        this.userDataProfileService = userDataProfileService;
        this.userDataProfilesService = userDataProfilesService;
        this.userDataProfileManagementService = userDataProfileManagementService;
        this.userDataProfileImportExportService = userDataProfileImportExportService;
        this.dialogService = dialogService;
        this.extensionBisectService = extensionBisectService;
        this.notificationService = notificationService;
        this.extensionManagementService = extensionManagementService;
        this.extensionEnablementService = extensionEnablementService;
        this.issueService = issueService;
        this.productService = productService;
        this.hostService = hostService;
        this.storageService = storageService;
        this.openerService = openerService;
    }
    isActive() {
        return this.state !== undefined;
    }
    async start() {
        if (this.isActive()) {
            throw new Error('invalid state');
        }
        const res = await this.dialogService.confirm({
            message: localize('troubleshoot issue', 'Troubleshoot Issue'),
            detail: localize('detail.start', 'Issue troubleshooting is a process to help you identify the cause for an issue. The cause for an issue can be a misconfiguration, due to an extension, or be {0} itself.\n\nDuring the process the window reloads repeatedly. Each time you must confirm if you are still seeing the issue.', this.productService.nameLong),
            primaryButton: localize({ key: 'msg', comment: ['&& denotes a mnemonic'] }, '&&Troubleshoot Issue'),
            custom: true,
        });
        if (!res.confirmed) {
            return;
        }
        const originalProfile = this.userDataProfileService.currentProfile;
        await this.userDataProfileImportExportService.createTroubleshootProfile();
        this.state = new TroubleShootState(TroubleshootStage.EXTENSIONS, originalProfile.id);
        await this.resume();
    }
    async resume() {
        if (!this.isActive()) {
            return;
        }
        if (this.state?.stage === TroubleshootStage.EXTENSIONS &&
            !this.extensionBisectService.isActive) {
            await this.reproduceIssueWithExtensionsDisabled();
        }
        if (this.state?.stage === TroubleshootStage.WORKBENCH) {
            await this.reproduceIssueWithEmptyProfile();
        }
        await this.stop();
    }
    async stop() {
        if (!this.isActive()) {
            return;
        }
        if (this.notificationHandle) {
            this.notificationHandle.close();
            this.notificationHandle = undefined;
        }
        if (this.extensionBisectService.isActive) {
            await this.extensionBisectService.reset();
        }
        const profile = this.userDataProfilesService.profiles.find((p) => p.id === this.state?.profile) ??
            this.userDataProfilesService.defaultProfile;
        this.state = undefined;
        await this.userDataProfileManagementService.switchProfile(profile);
    }
    async reproduceIssueWithExtensionsDisabled() {
        if (!(await this.extensionManagementService.getInstalled(1 /* ExtensionType.User */)).length) {
            this.state = new TroubleShootState(TroubleshootStage.WORKBENCH, this.state.profile);
            return;
        }
        const result = await this.askToReproduceIssue(localize('profile.extensions.disabled', 'Issue troubleshooting is active and has temporarily disabled all installed extensions. Check if you can still reproduce the problem and proceed by selecting from these options.'));
        if (result === 'good') {
            const profile = this.userDataProfilesService.profiles.find((p) => p.id === this.state.profile) ??
                this.userDataProfilesService.defaultProfile;
            await this.reproduceIssueWithExtensionsBisect(profile);
        }
        if (result === 'bad') {
            this.state = new TroubleShootState(TroubleshootStage.WORKBENCH, this.state.profile);
        }
        if (result === 'stop') {
            await this.stop();
        }
    }
    async reproduceIssueWithEmptyProfile() {
        await this.userDataProfileManagementService.createAndEnterTransientProfile();
        this.updateState(this.state);
        const result = await this.askToReproduceIssue(localize('empty.profile', 'Issue troubleshooting is active and has temporarily reset your configurations to defaults. Check if you can still reproduce the problem and proceed by selecting from these options.'));
        if (result === 'stop') {
            await this.stop();
        }
        if (result === 'good') {
            await this.askToReportIssue(localize('issue is with configuration', 'Issue troubleshooting has identified that the issue is caused by your configurations. Please report the issue by exporting your configurations using "Export Profile" command and share the file in the issue report.'));
        }
        if (result === 'bad') {
            await this.askToReportIssue(localize('issue is in core', 'Issue troubleshooting has identified that the issue is with {0}.', this.productService.nameLong));
        }
    }
    async reproduceIssueWithExtensionsBisect(profile) {
        await this.userDataProfileManagementService.switchProfile(profile);
        const extensions = (await this.extensionManagementService.getInstalled(1 /* ExtensionType.User */)).filter((ext) => this.extensionEnablementService.isEnabled(ext));
        await this.extensionBisectService.start(extensions);
        await this.hostService.reload();
    }
    askToReproduceIssue(message) {
        return new Promise((c, e) => {
            const goodPrompt = {
                label: localize('I cannot reproduce', "I Can't Reproduce"),
                run: () => c('good'),
            };
            const badPrompt = {
                label: localize('This is Bad', 'I Can Reproduce'),
                run: () => c('bad'),
            };
            const stop = {
                label: localize('Stop', 'Stop'),
                run: () => c('stop'),
            };
            this.notificationHandle = this.notificationService.prompt(Severity.Info, message, [goodPrompt, badPrompt, stop], { sticky: true, priority: NotificationPriority.URGENT });
        });
    }
    async askToReportIssue(message) {
        let isCheckedInInsiders = false;
        if (this.productService.quality === 'stable') {
            const res = await this.askToReproduceIssueWithInsiders();
            if (res === 'good') {
                await this.dialogService.prompt({
                    type: Severity.Info,
                    message: localize('troubleshoot issue', 'Troubleshoot Issue'),
                    detail: localize('use insiders', 'This likely means that the issue has been addressed already and will be available in an upcoming release. You can safely use {0} insiders until the new stable version is available.', this.productService.nameLong),
                    custom: true,
                });
                return;
            }
            if (res === 'stop') {
                await this.stop();
                return;
            }
            if (res === 'bad') {
                isCheckedInInsiders = true;
            }
        }
        await this.issueService.openReporter({
            issueBody: `> ${message} ${isCheckedInInsiders ? `It is confirmed that the issue exists in ${this.productService.nameLong} Insiders` : ''}`,
        });
    }
    async askToReproduceIssueWithInsiders() {
        const confirmRes = await this.dialogService.confirm({
            type: 'info',
            message: localize('troubleshoot issue', 'Troubleshoot Issue'),
            primaryButton: localize('download insiders', 'Download {0} Insiders', this.productService.nameLong),
            cancelButton: localize('report anyway', 'Report Issue Anyway'),
            detail: localize('ask to download insiders', 'Please try to download and reproduce the issue in {0} insiders.', this.productService.nameLong),
            custom: {
                disableCloseAction: true,
            },
        });
        if (!confirmRes.confirmed) {
            return undefined;
        }
        const opened = await this.openerService.open(URI.parse('https://aka.ms/vscode-insiders'));
        if (!opened) {
            return undefined;
        }
        const res = await this.dialogService.prompt({
            type: 'info',
            message: localize('troubleshoot issue', 'Troubleshoot Issue'),
            buttons: [
                {
                    label: localize('good', "I can't reproduce"),
                    run: () => 'good',
                },
                {
                    label: localize('bad', 'I can reproduce'),
                    run: () => 'bad',
                },
            ],
            cancelButton: {
                label: localize('stop', 'Stop'),
                run: () => 'stop',
            },
            detail: localize('ask to reproduce issue', 'Please try to reproduce the issue in {0} insiders and confirm if the issue exists there.', this.productService.nameLong),
            custom: {
                disableCloseAction: true,
            },
        });
        return res.result;
    }
    get state() {
        if (this._state === undefined) {
            const raw = this.storageService.get(TroubleshootIssueService_1.storageKey, 0 /* StorageScope.PROFILE */);
            this._state = TroubleShootState.fromJSON(raw);
        }
        return this._state || undefined;
    }
    set state(state) {
        this._state = state ?? null;
        this.updateState(state);
    }
    updateState(state) {
        if (state) {
            this.storageService.store(TroubleshootIssueService_1.storageKey, JSON.stringify(state), 0 /* StorageScope.PROFILE */, 1 /* StorageTarget.MACHINE */);
        }
        else {
            this.storageService.remove(TroubleshootIssueService_1.storageKey, 0 /* StorageScope.PROFILE */);
        }
    }
};
TroubleshootIssueService = TroubleshootIssueService_1 = __decorate([
    __param(0, IUserDataProfileService),
    __param(1, IUserDataProfilesService),
    __param(2, IUserDataProfileManagementService),
    __param(3, IUserDataProfileImportExportService),
    __param(4, IDialogService),
    __param(5, IExtensionBisectService),
    __param(6, INotificationService),
    __param(7, IExtensionManagementService),
    __param(8, IWorkbenchExtensionEnablementService),
    __param(9, IWorkbenchIssueService),
    __param(10, IProductService),
    __param(11, IHostService),
    __param(12, IStorageService),
    __param(13, IOpenerService)
], TroubleshootIssueService);
let IssueTroubleshootUi = class IssueTroubleshootUi extends Disposable {
    static { IssueTroubleshootUi_1 = this; }
    static { this.ctxIsTroubleshootActive = new RawContextKey('isIssueTroubleshootActive', false); }
    constructor(contextKeyService, troubleshootIssueService, storageService) {
        super();
        this.contextKeyService = contextKeyService;
        this.troubleshootIssueService = troubleshootIssueService;
        this.updateContext();
        if (troubleshootIssueService.isActive()) {
            troubleshootIssueService.resume();
        }
        this._register(storageService.onDidChangeValue(0 /* StorageScope.PROFILE */, TroubleshootIssueService.storageKey, this._store)(() => {
            this.updateContext();
        }));
    }
    updateContext() {
        IssueTroubleshootUi_1.ctxIsTroubleshootActive
            .bindTo(this.contextKeyService)
            .set(this.troubleshootIssueService.isActive());
    }
};
IssueTroubleshootUi = IssueTroubleshootUi_1 = __decorate([
    __param(0, IContextKeyService),
    __param(1, ITroubleshootIssueService),
    __param(2, IStorageService)
], IssueTroubleshootUi);
Registry.as(Extensions.Workbench).registerWorkbenchContribution(IssueTroubleshootUi, 3 /* LifecyclePhase.Restored */);
registerAction2(class TroubleshootIssueAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.troubleshootIssue.start',
            title: localize2('troubleshootIssue', 'Troubleshoot Issue...'),
            category: Categories.Help,
            f1: true,
            precondition: ContextKeyExpr.and(IssueTroubleshootUi.ctxIsTroubleshootActive.negate(), RemoteNameContext.isEqualTo(''), IsWebContext.negate()),
        });
    }
    run(accessor) {
        return accessor.get(ITroubleshootIssueService).start();
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.troubleshootIssue.stop',
            title: localize2('title.stop', 'Stop Troubleshoot Issue'),
            category: Categories.Help,
            f1: true,
            precondition: IssueTroubleshootUi.ctxIsTroubleshootActive,
        });
    }
    async run(accessor) {
        return accessor.get(ITroubleshootIssueService).stop();
    }
});
registerSingleton(ITroubleshootIssueService, TroubleshootIssueService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNzdWVUcm91Ymxlc2hvb3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9pc3N1ZS9icm93c2VyL2lzc3VlVHJvdWJsZXNob290LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ3hELE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLHdFQUF3RSxDQUFBO0FBRXBILE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUN6RixPQUFPLEVBQ04sbUNBQW1DLEVBQ25DLGlDQUFpQyxFQUNqQyx1QkFBdUIsR0FDdkIsTUFBTSw2REFBNkQsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDL0UsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDMUcsT0FBTyxFQUVOLG9CQUFvQixFQUVwQixvQkFBb0IsRUFDcEIsUUFBUSxHQUNSLE1BQU0sMERBQTBELENBQUE7QUFDakUsT0FBTyxFQUFFLG9DQUFvQyxFQUFFLE1BQU0scUVBQXFFLENBQUE7QUFDMUgsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3JFLE9BQU8sRUFFTix3QkFBd0IsR0FDeEIsTUFBTSxnRUFBZ0UsQ0FBQTtBQUN2RSxPQUFPLEVBRU4sZUFBZSxHQUNmLE1BQU0sNERB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