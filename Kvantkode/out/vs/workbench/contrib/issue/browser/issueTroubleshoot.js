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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXNzdWVUcm91Ymxlc2hvb3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2lzc3VlL2Jyb3dzZXIvaXNzdWVUcm91Ymxlc2hvb3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDeEQsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sd0VBQXdFLENBQUE7QUFFcEgsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHVEQUF1RCxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzNELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3pGLE9BQU8sRUFDTixtQ0FBbUMsRUFDbkMsaUNBQWlDLEVBQ2pDLHVCQUF1QixHQUN2QixNQUFNLDZEQUE2RCxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUMxRyxPQUFPLEVBRU4sb0JBQW9CLEVBRXBCLG9CQUFvQixFQUNwQixRQUFRLEdBQ1IsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsb0NBQW9DLEVBQUUsTUFBTSxxRUFBcUUsQ0FBQTtBQUMxSCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDckUsT0FBTyxFQUVOLHdCQUF3QixHQUN4QixNQUFNLGdFQUFnRSxDQUFBO0FBQ3ZFLE9BQU8s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