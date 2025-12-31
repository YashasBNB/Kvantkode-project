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
var SettingsChangeRelauncher_1;
import { dispose, Disposable, toDisposable, } from '../../../../base/common/lifecycle.js';
import { Extensions as WorkbenchExtensions, } from '../../../common/contributions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IConfigurationService, } from '../../../../platform/configuration/common/configuration.js';
import { localize } from '../../../../nls.js';
import { IWorkspaceContextService, } from '../../../../platform/workspace/common/workspace.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { isEqual } from '../../../../base/common/resources.js';
import { isMacintosh, isNative, isLinux } from '../../../../base/common/platform.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { IUserDataSyncEnablementService, IUserDataSyncService, } from '../../../../platform/userDataSync/common/userDataSync.js';
import { IUserDataSyncWorkbenchService } from '../../../services/userDataSync/common/userDataSync.js';
import { ChatConfiguration } from '../../chat/common/constants.js';
let SettingsChangeRelauncher = class SettingsChangeRelauncher extends Disposable {
    static { SettingsChangeRelauncher_1 = this; }
    static { this.SETTINGS = [
        "window.titleBarStyle" /* TitleBarSetting.TITLE_BAR_STYLE */,
        'window.nativeTabs',
        'window.nativeFullScreen',
        'window.clickThroughInactive',
        'window.controlsStyle',
        'update.mode',
        'editor.accessibilitySupport',
        'security.workspace.trust.enabled',
        'workbench.enableExperiments',
        '_extensionsGallery.enablePPE',
        'security.restrictUNCAccess',
        'accessibility.verbosity.debug',
        ChatConfiguration.UnifiedChatView,
        ChatConfiguration.UseFileStorage,
        'telemetry.feedback.enabled',
    ]; }
    constructor(hostService, configurationService, userDataSyncService, userDataSyncEnablementService, userDataSyncWorkbenchService, productService, dialogService) {
        super();
        this.hostService = hostService;
        this.configurationService = configurationService;
        this.userDataSyncService = userDataSyncService;
        this.userDataSyncEnablementService = userDataSyncEnablementService;
        this.productService = productService;
        this.dialogService = dialogService;
        this.titleBarStyle = new ChangeObserver('string');
        this.nativeTabs = new ChangeObserver('boolean');
        this.nativeFullScreen = new ChangeObserver('boolean');
        this.clickThroughInactive = new ChangeObserver('boolean');
        this.controlsStyle = new ChangeObserver('string');
        this.updateMode = new ChangeObserver('string');
        this.workspaceTrustEnabled = new ChangeObserver('boolean');
        this.experimentsEnabled = new ChangeObserver('boolean');
        this.enablePPEExtensionsGallery = new ChangeObserver('boolean');
        this.restrictUNCAccess = new ChangeObserver('boolean');
        this.accessibilityVerbosityDebug = new ChangeObserver('boolean');
        this.unifiedChatView = new ChangeObserver('boolean');
        this.useFileStorage = new ChangeObserver('boolean');
        this.telemetryFeedbackEnabled = new ChangeObserver('boolean');
        this.update(false);
        this._register(this.configurationService.onDidChangeConfiguration((e) => this.onConfigurationChange(e)));
        this._register(userDataSyncWorkbenchService.onDidTurnOnSync((e) => this.update(true)));
    }
    onConfigurationChange(e) {
        if (e && !SettingsChangeRelauncher_1.SETTINGS.some((key) => e.affectsConfiguration(key))) {
            return;
        }
        // Skip if turning on sync is in progress
        if (this.isTurningOnSyncInProgress()) {
            return;
        }
        this.update(e.source !== 7 /* ConfigurationTarget.DEFAULT */ /* do not ask to relaunch if defaults changed */);
    }
    isTurningOnSyncInProgress() {
        return (!this.userDataSyncEnablementService.isEnabled() &&
            this.userDataSyncService.status === "syncing" /* SyncStatus.Syncing */);
    }
    update(askToRelaunch) {
        let changed = false;
        function processChanged(didChange) {
            changed = changed || didChange;
        }
        const config = this.configurationService.getValue();
        if (isNative) {
            // Titlebar style
            processChanged((config.window.titleBarStyle === "native" /* TitlebarStyle.NATIVE */ ||
                config.window.titleBarStyle === "custom" /* TitlebarStyle.CUSTOM */) &&
                this.titleBarStyle.handleChange(config.window?.titleBarStyle));
            // macOS: Native tabs
            processChanged(isMacintosh && this.nativeTabs.handleChange(config.window?.nativeTabs));
            // macOS: Native fullscreen
            processChanged(isMacintosh && this.nativeFullScreen.handleChange(config.window?.nativeFullScreen));
            // macOS: Click through (accept first mouse)
            processChanged(isMacintosh && this.clickThroughInactive.handleChange(config.window?.clickThroughInactive));
            // Windows/Linux: Window controls style
            processChanged(!isMacintosh && this.controlsStyle.handleChange(config.window?.controlsStyle));
            // Update mode
            processChanged(this.updateMode.handleChange(config.update?.mode));
            // On linux turning on accessibility support will also pass this flag to the chrome renderer, thus a restart is required
            if (isLinux &&
                typeof config.editor?.accessibilitySupport === 'string' &&
                config.editor.accessibilitySupport !== this.accessibilitySupport) {
                this.accessibilitySupport = config.editor.accessibilitySupport;
                if (this.accessibilitySupport === 'on') {
                    changed = true;
                }
            }
            // Workspace trust
            processChanged(this.workspaceTrustEnabled.handleChange(config?.security?.workspace?.trust?.enabled));
            // UNC host access restrictions
            processChanged(this.restrictUNCAccess.handleChange(config?.security?.restrictUNCAccess));
            // Debug accessibility verbosity
            processChanged(this.accessibilityVerbosityDebug.handleChange(config?.accessibility?.verbosity?.debug));
            processChanged(this.unifiedChatView.handleChange(config.chat?.unifiedChatView));
            processChanged(this.useFileStorage.handleChange(config.chat?.useFileStorage));
        }
        // Experiments
        processChanged(this.experimentsEnabled.handleChange(config.workbench?.enableExperiments));
        // Profiles
        processChanged(this.productService.quality !== 'stable' &&
            this.enablePPEExtensionsGallery.handleChange(config._extensionsGallery?.enablePPE));
        // Enable Feedback
        processChanged(this.telemetryFeedbackEnabled.handleChange(config.telemetry?.feedback?.enabled));
        if (askToRelaunch && changed && this.hostService.hasFocus) {
            this.doConfirm(isNative
                ? localize('relaunchSettingMessage', 'A setting has changed that requires a restart to take effect.')
                : localize('relaunchSettingMessageWeb', 'A setting has changed that requires a reload to take effect.'), isNative
                ? localize('relaunchSettingDetail', 'Press the restart button to restart {0} and enable the setting.', this.productService.nameLong)
                : localize('relaunchSettingDetailWeb', 'Press the reload button to reload {0} and enable the setting.', this.productService.nameLong), isNative
                ? localize({ key: 'restart', comment: ['&& denotes a mnemonic'] }, '&&Restart')
                : localize({ key: 'restartWeb', comment: ['&& denotes a mnemonic'] }, '&&Reload'), () => this.hostService.restart());
        }
    }
    async doConfirm(message, detail, primaryButton, confirmedFn) {
        const { confirmed } = await this.dialogService.confirm({ message, detail, primaryButton });
        if (confirmed) {
            confirmedFn();
        }
    }
};
SettingsChangeRelauncher = SettingsChangeRelauncher_1 = __decorate([
    __param(0, IHostService),
    __param(1, IConfigurationService),
    __param(2, IUserDataSyncService),
    __param(3, IUserDataSyncEnablementService),
    __param(4, IUserDataSyncWorkbenchService),
    __param(5, IProductService),
    __param(6, IDialogService)
], SettingsChangeRelauncher);
export { SettingsChangeRelauncher };
class ChangeObserver {
    static create(typeName) {
        return new ChangeObserver(typeName);
    }
    constructor(typeName) {
        this.typeName = typeName;
        this.lastValue = undefined;
    }
    /**
     * Returns if there was a change compared to the last value
     */
    handleChange(value) {
        if (typeof value === this.typeName && value !== this.lastValue) {
            this.lastValue = value;
            return true;
        }
        return false;
    }
}
let WorkspaceChangeExtHostRelauncher = class WorkspaceChangeExtHostRelauncher extends Disposable {
    constructor(contextService, extensionService, hostService, environmentService) {
        super();
        this.contextService = contextService;
        this.extensionHostRestarter = this._register(new RunOnceScheduler(async () => {
            if (!!environmentService.extensionTestsLocationURI) {
                return; // no restart when in tests: see https://github.com/microsoft/vscode/issues/66936
            }
            if (environmentService.remoteAuthority) {
                hostService.reload(); // TODO@aeschli, workaround
            }
            else if (isNative) {
                const stopped = await extensionService.stopExtensionHosts(localize('restartExtensionHost.reason', 'Changing workspace folders'));
                if (stopped) {
                    extensionService.startExtensionHosts();
                }
            }
        }, 10));
        this.contextService.getCompleteWorkspace().then((workspace) => {
            this.firstFolderResource = workspace.folders.length > 0 ? workspace.folders[0].uri : undefined;
            this.handleWorkbenchState();
            this._register(this.contextService.onDidChangeWorkbenchState(() => setTimeout(() => this.handleWorkbenchState())));
        });
        this._register(toDisposable(() => {
            this.onDidChangeWorkspaceFoldersUnbind?.dispose();
        }));
    }
    handleWorkbenchState() {
        // React to folder changes when we are in workspace state
        if (this.contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */) {
            // Update our known first folder path if we entered workspace
            const workspace = this.contextService.getWorkspace();
            this.firstFolderResource = workspace.folders.length > 0 ? workspace.folders[0].uri : undefined;
            // Install workspace folder listener
            if (!this.onDidChangeWorkspaceFoldersUnbind) {
                this.onDidChangeWorkspaceFoldersUnbind = this.contextService.onDidChangeWorkspaceFolders(() => this.onDidChangeWorkspaceFolders());
            }
        }
        // Ignore the workspace folder changes in EMPTY or FOLDER state
        else {
            dispose(this.onDidChangeWorkspaceFoldersUnbind);
            this.onDidChangeWorkspaceFoldersUnbind = undefined;
        }
    }
    onDidChangeWorkspaceFolders() {
        const workspace = this.contextService.getWorkspace();
        // Restart extension host if first root folder changed (impact on deprecated workspace.rootPath API)
        const newFirstFolderResource = workspace.folders.length > 0 ? workspace.folders[0].uri : undefined;
        if (!isEqual(this.firstFolderResource, newFirstFolderResource)) {
            this.firstFolderResource = newFirstFolderResource;
            this.extensionHostRestarter.schedule(); // buffer calls to extension host restart
        }
    }
};
WorkspaceChangeExtHostRelauncher = __decorate([
    __param(0, IWorkspaceContextService),
    __param(1, IExtensionService),
    __param(2, IHostService),
    __param(3, IWorkbenchEnvironmentService)
], WorkspaceChangeExtHostRelauncher);
export { WorkspaceChangeExtHostRelauncher };
const workbenchRegistry = Registry.as(WorkbenchExtensions.Workbench);
workbenchRegistry.registerWorkbenchContribution(SettingsChangeRelauncher, 3 /* LifecyclePhase.Restored */);
workbenchRegistry.registerWorkbenchContribution(WorkspaceChangeExtHostRelauncher, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVsYXVuY2hlci5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9yZWxhdW5jaGVyL2Jyb3dzZXIvcmVsYXVuY2hlci5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFFTixPQUFPLEVBQ1AsVUFBVSxFQUNWLFlBQVksR0FDWixNQUFNLHNDQUFzQyxDQUFBO0FBQzdDLE9BQU8sRUFHTixVQUFVLElBQUksbUJBQW1CLEdBQ2pDLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBTzNFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNyRSxPQUFPLEVBR04scUJBQXFCLEdBQ3JCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFDTix3QkFBd0IsR0FFeEIsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUNyRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUVuRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDOUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFcEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQy9FLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ3pHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1REFBdUQs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