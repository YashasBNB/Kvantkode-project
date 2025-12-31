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
import { localize, localize2 } from '../../../../nls.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions, } from '../../../common/contributions.js';
import { hasWorkspaceFileExtension, IWorkspaceContextService, WORKSPACE_SUFFIX, } from '../../../../platform/workspace/common/workspace.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { INotificationService, NeverShowAgainScope, NotificationPriority, Severity, } from '../../../../platform/notification/common/notification.js';
import { isEqual, joinPath } from '../../../../base/common/resources.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { IQuickInputService, } from '../../../../platform/quickinput/common/quickInput.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { isVirtualWorkspace } from '../../../../platform/workspace/common/virtualWorkspace.js';
import { Action2, MenuId, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ActiveEditorContext, ResourceContextKey, TemporaryWorkspaceContext, } from '../../../common/contextkeys.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { TEXT_FILE_EDITOR_ID } from '../../files/common/files.js';
/**
 * A workbench contribution that will look for `.code-workspace` files in the root of the
 * workspace folder and open a notification to suggest to open one of the workspaces.
 */
let WorkspacesFinderContribution = class WorkspacesFinderContribution extends Disposable {
    constructor(contextService, notificationService, fileService, quickInputService, hostService, storageService) {
        super();
        this.contextService = contextService;
        this.notificationService = notificationService;
        this.fileService = fileService;
        this.quickInputService = quickInputService;
        this.hostService = hostService;
        this.storageService = storageService;
        this.findWorkspaces();
    }
    async findWorkspaces() {
        const folder = this.contextService.getWorkspace().folders[0];
        if (!folder ||
            this.contextService.getWorkbenchState() !== 2 /* WorkbenchState.FOLDER */ ||
            isVirtualWorkspace(this.contextService.getWorkspace())) {
            return; // require a single (non virtual) root folder
        }
        const rootFileNames = (await this.fileService.resolve(folder.uri)).children?.map((child) => child.name);
        if (Array.isArray(rootFileNames)) {
            const workspaceFiles = rootFileNames.filter(hasWorkspaceFileExtension);
            if (workspaceFiles.length > 0) {
                this.doHandleWorkspaceFiles(folder.uri, workspaceFiles);
            }
        }
    }
    doHandleWorkspaceFiles(folder, workspaces) {
        const neverShowAgain = {
            id: 'workspaces.dontPromptToOpen',
            scope: NeverShowAgainScope.WORKSPACE,
            isSecondary: true,
        };
        // Prompt to open one workspace
        if (workspaces.length === 1) {
            const workspaceFile = workspaces[0];
            this.notificationService.prompt(Severity.Info, localize({
                key: 'foundWorkspace',
                comment: ['{Locked="]({1})"}'],
            }, "This folder contains a workspace file '{0}'. Do you want to open it? [Learn more]({1}) about workspace files.", workspaceFile, 'https://go.microsoft.com/fwlink/?linkid=2025315'), [
                {
                    label: localize('openWorkspace', 'Open Workspace'),
                    run: () => this.hostService.openWindow([{ workspaceUri: joinPath(folder, workspaceFile) }]),
                },
            ], {
                neverShowAgain,
                priority: !this.storageService.isNew(1 /* StorageScope.WORKSPACE */)
                    ? NotificationPriority.SILENT
                    : undefined, // https://github.com/microsoft/vscode/issues/125315
            });
        }
        // Prompt to select a workspace from many
        else if (workspaces.length > 1) {
            this.notificationService.prompt(Severity.Info, localize({
                key: 'foundWorkspaces',
                comment: ['{Locked="]({0})"}'],
            }, 'This folder contains multiple workspace files. Do you want to open one? [Learn more]({0}) about workspace files.', 'https://go.microsoft.com/fwlink/?linkid=2025315'), [
                {
                    label: localize('selectWorkspace', 'Select Workspace'),
                    run: () => {
                        this.quickInputService
                            .pick(workspaces.map((workspace) => ({ label: workspace })), { placeHolder: localize('selectToOpen', 'Select a workspace to open') })
                            .then((pick) => {
                            if (pick) {
                                this.hostService.openWindow([{ workspaceUri: joinPath(folder, pick.label) }]);
                            }
                        });
                    },
                },
            ], {
                neverShowAgain,
                priority: !this.storageService.isNew(1 /* StorageScope.WORKSPACE */)
                    ? NotificationPriority.SILENT
                    : undefined, // https://github.com/microsoft/vscode/issues/125315
            });
        }
    }
};
WorkspacesFinderContribution = __decorate([
    __param(0, IWorkspaceContextService),
    __param(1, INotificationService),
    __param(2, IFileService),
    __param(3, IQuickInputService),
    __param(4, IHostService),
    __param(5, IStorageService)
], WorkspacesFinderContribution);
export { WorkspacesFinderContribution };
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(WorkspacesFinderContribution, 4 /* LifecyclePhase.Eventually */);
// Render "Open Workspace" button in *.code-workspace files
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.openWorkspaceFromEditor',
            title: localize2('openWorkspace', 'Open Workspace'),
            f1: false,
            menu: {
                id: MenuId.EditorContent,
                when: ContextKeyExpr.and(ResourceContextKey.Extension.isEqualTo(WORKSPACE_SUFFIX), ActiveEditorContext.isEqualTo(TEXT_FILE_EDITOR_ID), TemporaryWorkspaceContext.toNegated()),
            },
        });
    }
    async run(accessor, uri) {
        const hostService = accessor.get(IHostService);
        const contextService = accessor.get(IWorkspaceContextService);
        const notificationService = accessor.get(INotificationService);
        if (contextService.getWorkbenchState() === 3 /* WorkbenchState.WORKSPACE */) {
            const workspaceConfiguration = contextService.getWorkspace().configuration;
            if (workspaceConfiguration && isEqual(workspaceConfiguration, uri)) {
                notificationService.info(localize('alreadyOpen', 'This workspace is already open.'));
                return; // workspace already opened
            }
        }
        return hostService.openWindow([{ workspaceUri: uri }]);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya3NwYWNlcy5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93b3Jrc3BhY2VzL2Jyb3dzZXIvd29ya3NwYWNlcy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUNOLFVBQVUsSUFBSSxtQkFBbUIsR0FHakMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUV6QyxPQUFPLEVBQ04seUJBQXlCLEVBQ3pCLHdCQUF3QixFQUV4QixnQkFBZ0IsR0FDaEIsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFFTixvQkFBb0IsRUFDcEIsbUJBQW1CLEVBQ25CLG9CQUFvQixFQUNwQixRQUFRLEdBQ1IsTUFBTSwwREFBMEQsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNyRSxPQUFPLEVBQ04sa0JBQWtCLEdBRWxCLE1BQU0sc0RBQXNELENBQUE7QUFDN0QsT0FBTyxFQUFFLGVBQWUsRUFBZ0IsTUFBTSxnREFBZ0QsQ0FBQTtBQUM5RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUM5RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxlQUFl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