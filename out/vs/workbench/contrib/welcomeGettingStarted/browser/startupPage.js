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
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import * as arrays from '../../../../base/common/arrays.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { IWorkspaceContextService, UNKNOWN_EMPTY_WINDOW_WORKSPACE, } from '../../../../platform/workspace/common/workspace.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IWorkingCopyBackupService } from '../../../services/workingCopy/common/workingCopyBackup.js';
import { ILifecycleService, } from '../../../services/lifecycle/common/lifecycle.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { joinPath } from '../../../../base/common/resources.js';
import { IWorkbenchLayoutService } from '../../../services/layout/browser/layoutService.js';
import { GettingStartedInput, gettingStartedInputTypeId, } from './gettingStartedInput.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { getTelemetryLevel } from '../../../../platform/telemetry/common/telemetryUtils.js';
import { IProductService } from '../../../../platform/product/common/productService.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { localize } from '../../../../nls.js';
import { IEditorResolverService, RegisteredEditorPriority, } from '../../../services/editor/common/editorResolverService.js';
import { ILogService } from '../../../../platform/log/common/log.js';
export const restoreWalkthroughsConfigurationKey = 'workbench.welcomePage.restorableWalkthroughs';
const configurationKey = 'workbench.startupEditor';
const oldConfigurationKey = 'workbench.welcome.enabled';
const telemetryOptOutStorageKey = 'workbench.telemetryOptOutShown';
let StartupPageEditorResolverContribution = class StartupPageEditorResolverContribution {
    static { this.ID = 'workbench.contrib.startupPageEditorResolver'; }
    constructor(instantiationService, editorResolverService) {
        this.instantiationService = instantiationService;
        editorResolverService.registerEditor(`${GettingStartedInput.RESOURCE.scheme}:/**`, {
            id: GettingStartedInput.ID,
            label: localize('welcome.displayName', 'Welcome Page'),
            priority: RegisteredEditorPriority.builtin,
        }, {
            singlePerResource: false,
            canSupportResource: (uri) => uri.scheme === GettingStartedInput.RESOURCE.scheme,
        }, {
            createEditorInput: ({ resource, options }) => {
                return {
                    editor: this.instantiationService.createInstance(GettingStartedInput, options),
                    options: {
                        ...options,
                        pinned: false,
                    },
                };
            },
        });
    }
};
StartupPageEditorResolverContribution = __decorate([
    __param(0, IInstantiationService),
    __param(1, IEditorResolverService)
], StartupPageEditorResolverContribution);
export { StartupPageEditorResolverContribution };
let StartupPageRunnerContribution = class StartupPageRunnerContribution extends Disposable {
    static { this.ID = 'workbench.contrib.startupPageRunner'; }
    constructor(configurationService, editorService, workingCopyBackupService, fileService, contextService, lifecycleService, layoutService, productService, commandService, environmentService, storageService, logService, notificationService) {
        super();
        this.configurationService = configurationService;
        this.editorService = editorService;
        this.workingCopyBackupService = workingCopyBackupService;
        this.fileService = fileService;
        this.contextService = contextService;
        this.lifecycleService = lifecycleService;
        this.layoutService = layoutService;
        this.productService = productService;
        this.commandService = commandService;
        this.environmentService = environmentService;
        this.storageService = storageService;
        this.logService = logService;
        this.notificationService = notificationService;
        this.run().then(undefined, onUnexpectedError);
        this._register(this.editorService.onDidCloseEditor((e) => {
            if (e.editor instanceof GettingStartedInput) {
                e.editor.selectedCategory = undefined;
                e.editor.selectedStep = undefined;
            }
        }));
    }
    async run() {
        // Wait for resolving startup editor until we are restored to reduce startup pressure
        await this.lifecycleService.when(3 /* LifecyclePhase.Restored */);
        // Always open Welcome page for first-launch, no matter what is open or which startupEditor is set.
        if (this.productService.enableTelemetry &&
            this.productService.showTelemetryOptOut &&
            getTelemetryLevel(this.configurationService) !== 0 /* TelemetryLevel.NONE */ &&
            !this.environmentService.skipWelcome &&
            !this.storageService.get(telemetryOptOutStorageKey, 0 /* StorageScope.PROFILE */)) {
            this.storageService.store(telemetryOptOutStorageKey, true, 0 /* StorageScope.PROFILE */, 0 /* StorageTarget.USER */);
        }
        if (this.tryOpenWalkthroughForFolder()) {
            return;
        }
        const enabled = isStartupPageEnabled(this.configurationService, this.contextService, this.environmentService, this.logService);
        if (enabled && this.lifecycleService.startupKind !== 3 /* StartupKind.ReloadedWindow */) {
            const hasBackups = await this.workingCopyBackupService.hasBackups();
            if (hasBackups) {
                return;
            }
            // Open the welcome even if we opened a set of default editors
            if (!this.editorService.activeEditor || this.layoutService.openedDefaultEditors) {
                const startupEditorSetting = this.configurationService.inspect(configurationKey);
                if (startupEditorSetting.value === 'readme') {
                    await this.openReadme();
                }
                else if (startupEditorSetting.value === 'welcomePage' ||
                    startupEditorSetting.value === 'welcomePageInEmptyWorkbench') {
                    await this.openGettingStarted();
                }
                else if (startupEditorSetting.value === 'terminal') {
                    this.commandService.executeCommand("workbench.action.createTerminalEditor" /* TerminalCommandId.CreateTerminalEditor */);
                }
            }
        }
    }
    tryOpenWalkthroughForFolder() {
        const toRestore = this.storageService.get(restoreWalkthroughsConfigurationKey, 0 /* StorageScope.PROFILE */);
        if (!toRestore) {
            return false;
        }
        else {
            const restoreData = JSON.parse(toRestore);
            const currentWorkspace = this.contextService.getWorkspace();
            if (restoreData.folder === UNKNOWN_EMPTY_WINDOW_WORKSPACE.id ||
                restoreData.folder === currentWorkspace.folders[0].uri.toString()) {
                const options = {
                    selectedCategory: restoreData.category,
                    selectedStep: restoreData.step,
                    pinned: false,
                };
                this.editorService.openEditor({
                    resource: GettingStartedInput.RESOURCE,
                    options,
                });
                this.storageService.remove(restoreWalkthroughsConfigurationKey, 0 /* StorageScope.PROFILE */);
                return true;
            }
        }
        return false;
    }
    async openReadme() {
        const readmes = arrays.coalesce(await Promise.all(this.contextService.getWorkspace().folders.map(async (folder) => {
            const folderUri = folder.uri;
            const folderStat = await this.fileService.resolve(folderUri).catch(onUnexpectedError);
            const files = folderStat?.children
                ? folderStat.children.map((child) => child.name).sort()
                : [];
            const file = files.find((file) => file.toLowerCase() === 'readme.md') ||
                files.find((file) => file.toLowerCase().startsWith('readme'));
            if (file) {
                return joinPath(folderUri, file);
            }
            else {
                return undefined;
            }
        })));
        if (!this.editorService.activeEditor) {
            if (readmes.length) {
                const isMarkDown = (readme) => readme.path.toLowerCase().endsWith('.md');
                await Promise.all([
                    this.commandService
                        .executeCommand('markdown.showPreview', null, readmes.filter(isMarkDown), {
                        locked: true,
                    })
                        .catch((error) => {
                        this.notificationService.error(localize('startupPage.markdownPreviewError', 'Could not open markdown preview: {0}.\n\nPlease make sure the markdown extension is enabled.', error.message));
                    }),
                    this.editorService.openEditors(readmes.filter((readme) => !isMarkDown(readme)).map((readme) => ({ resource: readme }))),
                ]);
            }
            else {
                // If no readme is found, default to showing the welcome page.
                await this.openGettingStarted();
            }
        }
    }
    async openGettingStarted(showTelemetryNotice) {
        const startupEditorTypeID = gettingStartedInputTypeId;
        const editor = this.editorService.activeEditor;
        // Ensure that the welcome editor won't get opened more than once
        if (editor?.typeId === startupEditorTypeID ||
            this.editorService.editors.some((e) => e.typeId === startupEditorTypeID)) {
            return;
        }
        const options = editor
            ? { pinned: false, index: 0, showTelemetryNotice }
            : { pinned: false, showTelemetryNotice };
        if (startupEditorTypeID === gettingStartedInputTypeId) {
            this.editorService.openEditor({
                resource: GettingStartedInput.RESOURCE,
                options,
            });
        }
    }
};
StartupPageRunnerContribution = __decorate([
    __param(0, IConfigurationService),
    __param(1, IEditorService),
    __param(2, IWorkingCopyBackupService),
    __param(3, IFileService),
    __param(4, IWorkspaceContextService),
    __param(5, ILifecycleService),
    __param(6, IWorkbenchLayoutService),
    __param(7, IProductService),
    __param(8, ICommandService),
    __param(9, IWorkbenchEnvironmentService),
    __param(10, IStorageService),
    __param(11, ILogService),
    __param(12, INotificationService)
], StartupPageRunnerContribution);
export { StartupPageRunnerContribution };
function isStartupPageEnabled(configurationService, contextService, environmentService, logService) {
    if (environmentService.skipWelcome) {
        return false;
    }
    const startupEditor = configurationService.inspect(configurationKey);
    if (!startupEditor.userValue && !startupEditor.workspaceValue) {
        const welcomeEnabled = configurationService.inspect(oldConfigurationKey);
        if (welcomeEnabled.value !== undefined && welcomeEnabled.value !== null) {
            return welcomeEnabled.value;
        }
    }
    return (startupEditor.value === 'welcomePage' ||
        startupEditor.value === 'readme' ||
        (contextService.getWorkbenchState() === 1 /* WorkbenchState.EMPTY */ &&
            startupEditor.value === 'welcomePageInEmptyWorkbench') ||
        startupEditor.value === 'terminal');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhcnR1cFBhZ2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWxjb21lR2V0dGluZ1N0YXJ0ZWQvYnJvd3Nlci9zdGFydHVwUGFnZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbEYsT0FBTyxLQUFLLE1BQU0sTUFBTSxtQ0FBbUMsQ0FBQTtBQUUzRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDakYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDckUsT0FBTyxFQUNOLHdCQUF3QixFQUN4Qiw4QkFBOEIsR0FFOUIsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUNyRyxPQUFPLEVBQ04saUJBQWlCLEdBR2pCLE1BQU0saURBQWlELENBQUE7QUFDeEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0QsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDM0YsT0FBTyxFQUVOLG1CQUFtQixFQUNuQix5QkFBeUIsR0FDekIsTUFBTSwwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSw0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