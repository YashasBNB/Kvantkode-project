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
import { VSBuffer } from '../../../../base/common/buffer.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { Schemas } from '../../../../base/common/network.js';
import { joinPath } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import * as nls from '../../../../nls.js';
import { Action2, IMenuService, MenuId } from '../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ContextKeyExpr, IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IFileDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService, createDecorator, } from '../../../../platform/instantiation/common/instantiation.js';
import { ILabelService } from '../../../../platform/label/common/label.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { Utils } from '../../../../platform/profiling/common/profiling.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ActiveEditorContext } from '../../../common/contextkeys.js';
import { IEditorService, SIDE_GROUP } from '../../../services/editor/common/editorService.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IExtensionFeaturesManagementService } from '../../../services/extensionManagement/common/extensionFeatures.js';
import { IExtensionService, } from '../../../services/extensions/common/extensions.js';
import { AbstractRuntimeExtensionsEditor, } from '../browser/abstractRuntimeExtensionsEditor.js';
import { IExtensionsWorkbenchService } from '../common/extensions.js';
import { ReportExtensionIssueAction } from '../common/reportExtensionIssueAction.js';
import { SlowExtensionAction } from './extensionsSlowActions.js';
export const IExtensionHostProfileService = createDecorator('extensionHostProfileService');
export const CONTEXT_PROFILE_SESSION_STATE = new RawContextKey('profileSessionState', 'none');
export const CONTEXT_EXTENSION_HOST_PROFILE_RECORDED = new RawContextKey('extensionHostProfileRecorded', false);
export var ProfileSessionState;
(function (ProfileSessionState) {
    ProfileSessionState[ProfileSessionState["None"] = 0] = "None";
    ProfileSessionState[ProfileSessionState["Starting"] = 1] = "Starting";
    ProfileSessionState[ProfileSessionState["Running"] = 2] = "Running";
    ProfileSessionState[ProfileSessionState["Stopping"] = 3] = "Stopping";
})(ProfileSessionState || (ProfileSessionState = {}));
let RuntimeExtensionsEditor = class RuntimeExtensionsEditor extends AbstractRuntimeExtensionsEditor {
    constructor(group, telemetryService, themeService, contextKeyService, extensionsWorkbenchService, extensionService, notificationService, contextMenuService, instantiationService, storageService, labelService, environmentService, clipboardService, _extensionHostProfileService, extensionFeaturesManagementService, hoverService, menuService) {
        super(group, telemetryService, themeService, contextKeyService, extensionsWorkbenchService, extensionService, notificationService, contextMenuService, instantiationService, storageService, labelService, environmentService, clipboardService, extensionFeaturesManagementService, hoverService, menuService);
        this._extensionHostProfileService = _extensionHostProfileService;
        this._profileInfo = this._extensionHostProfileService.lastProfile;
        this._extensionsHostRecorded = CONTEXT_EXTENSION_HOST_PROFILE_RECORDED.bindTo(contextKeyService);
        this._profileSessionState = CONTEXT_PROFILE_SESSION_STATE.bindTo(contextKeyService);
        this._register(this._extensionHostProfileService.onDidChangeLastProfile(() => {
            this._profileInfo = this._extensionHostProfileService.lastProfile;
            this._extensionsHostRecorded.set(!!this._profileInfo);
            this._updateExtensions();
        }));
        this._register(this._extensionHostProfileService.onDidChangeState(() => {
            const state = this._extensionHostProfileService.state;
            this._profileSessionState.set(ProfileSessionState[state].toLowerCase());
        }));
    }
    _getProfileInfo() {
        return this._profileInfo;
    }
    _getUnresponsiveProfile(extensionId) {
        return this._extensionHostProfileService.getUnresponsiveProfile(extensionId);
    }
    _createSlowExtensionAction(element) {
        if (element.unresponsiveProfile) {
            return this._instantiationService.createInstance(SlowExtensionAction, element.description, element.unresponsiveProfile);
        }
        return null;
    }
    _createReportExtensionIssueAction(element) {
        if (element.marketplaceInfo) {
            return this._instantiationService.createInstance(ReportExtensionIssueAction, element.description);
        }
        return null;
    }
};
RuntimeExtensionsEditor = __decorate([
    __param(1, ITelemetryService),
    __param(2, IThemeService),
    __param(3, IContextKeyService),
    __param(4, IExtensionsWorkbenchService),
    __param(5, IExtensionService),
    __param(6, INotificationService),
    __param(7, IContextMenuService),
    __param(8, IInstantiationService),
    __param(9, IStorageService),
    __param(10, ILabelService),
    __param(11, IWorkbenchEnvironmentService),
    __param(12, IClipboardService),
    __param(13, IExtensionHostProfileService),
    __param(14, IExtensionFeaturesManagementService),
    __param(15, IHoverService),
    __param(16, IMenuService)
], RuntimeExtensionsEditor);
export { RuntimeExtensionsEditor };
export class StartExtensionHostProfileAction extends Action2 {
    static { this.ID = 'workbench.extensions.action.extensionHostProfile'; }
    static { this.LABEL = nls.localize('extensionHostProfileStart', 'Start Extension Host Profile'); }
    constructor() {
        super({
            id: StartExtensionHostProfileAction.ID,
            title: {
                value: StartExtensionHostProfileAction.LABEL,
                original: 'Start Extension Host Profile',
            },
            precondition: CONTEXT_PROFILE_SESSION_STATE.isEqualTo('none'),
            icon: Codicon.circleFilled,
            menu: [
                {
                    id: MenuId.EditorTitle,
                    when: ContextKeyExpr.and(ActiveEditorContext.isEqualTo(RuntimeExtensionsEditor.ID), CONTEXT_PROFILE_SESSION_STATE.notEqualsTo('running')),
                    group: 'navigation',
                },
                {
                    id: MenuId.ExtensionEditorContextMenu,
                    when: CONTEXT_PROFILE_SESSION_STATE.notEqualsTo('running'),
                    group: 'profiling',
                },
            ],
        });
    }
    run(accessor) {
        const extensionHostProfileService = accessor.get(IExtensionHostProfileService);
        extensionHostProfileService.startProfiling();
        return Promise.resolve();
    }
}
export class StopExtensionHostProfileAction extends Action2 {
    static { this.ID = 'workbench.extensions.action.stopExtensionHostProfile'; }
    static { this.LABEL = nls.localize('stopExtensionHostProfileStart', 'Stop Extension Host Profile'); }
    constructor() {
        super({
            id: StopExtensionHostProfileAction.ID,
            title: {
                value: StopExtensionHostProfileAction.LABEL,
                original: 'Stop Extension Host Profile',
            },
            icon: Codicon.debugStop,
            menu: [
                {
                    id: MenuId.EditorTitle,
                    when: ContextKeyExpr.and(ActiveEditorContext.isEqualTo(RuntimeExtensionsEditor.ID), CONTEXT_PROFILE_SESSION_STATE.isEqualTo('running')),
                    group: 'navigation',
                },
                {
                    id: MenuId.ExtensionEditorContextMenu,
                    when: CONTEXT_PROFILE_SESSION_STATE.isEqualTo('running'),
                    group: 'profiling',
                },
            ],
        });
    }
    run(accessor) {
        const extensionHostProfileService = accessor.get(IExtensionHostProfileService);
        extensionHostProfileService.stopProfiling();
        return Promise.resolve();
    }
}
export class OpenExtensionHostProfileACtion extends Action2 {
    static { this.LABEL = nls.localize('openExtensionHostProfile', 'Open Extension Host Profile'); }
    static { this.ID = 'workbench.extensions.action.openExtensionHostProfile'; }
    constructor() {
        super({
            id: OpenExtensionHostProfileACtion.ID,
            title: {
                value: OpenExtensionHostProfileACtion.LABEL,
                original: 'Open Extension Host Profile',
            },
            precondition: CONTEXT_EXTENSION_HOST_PROFILE_RECORDED,
            icon: Codicon.graph,
            menu: [
                {
                    id: MenuId.EditorTitle,
                    when: ContextKeyExpr.and(ActiveEditorContext.isEqualTo(RuntimeExtensionsEditor.ID)),
                    group: 'navigation',
                },
                {
                    id: MenuId.ExtensionEditorContextMenu,
                    when: CONTEXT_EXTENSION_HOST_PROFILE_RECORDED,
                    group: 'profiling',
                },
            ],
        });
    }
    async run(accessor) {
        const extensionHostProfileService = accessor.get(IExtensionHostProfileService);
        const commandService = accessor.get(ICommandService);
        const editorService = accessor.get(IEditorService);
        if (!extensionHostProfileService.lastProfileSavedTo) {
            await commandService.executeCommand(SaveExtensionHostProfileAction.ID);
        }
        if (!extensionHostProfileService.lastProfileSavedTo) {
            return;
        }
        await editorService.openEditor({
            resource: extensionHostProfileService.lastProfileSavedTo,
            options: {
                revealIfOpened: true,
                override: 'jsProfileVisualizer.cpuprofile.table',
            },
        }, SIDE_GROUP);
    }
}
export class SaveExtensionHostProfileAction extends Action2 {
    static { this.LABEL = nls.localize('saveExtensionHostProfile', 'Save Extension Host Profile'); }
    static { this.ID = 'workbench.extensions.action.saveExtensionHostProfile'; }
    constructor() {
        super({
            id: SaveExtensionHostProfileAction.ID,
            title: {
                value: SaveExtensionHostProfileAction.LABEL,
                original: 'Save Extension Host Profile',
            },
            precondition: CONTEXT_EXTENSION_HOST_PROFILE_RECORDED,
            icon: Codicon.saveAll,
            menu: [
                {
                    id: MenuId.EditorTitle,
                    when: ContextKeyExpr.and(ActiveEditorContext.isEqualTo(RuntimeExtensionsEditor.ID)),
                    group: 'navigation',
                },
                {
                    id: MenuId.ExtensionEditorContextMenu,
                    when: CONTEXT_EXTENSION_HOST_PROFILE_RECORDED,
                    group: 'profiling',
                },
            ],
        });
    }
    run(accessor) {
        const environmentService = accessor.get(IWorkbenchEnvironmentService);
        const extensionHostProfileService = accessor.get(IExtensionHostProfileService);
        const fileService = accessor.get(IFileService);
        const fileDialogService = accessor.get(IFileDialogService);
        return this._asyncRun(environmentService, extensionHostProfileService, fileService, fileDialogService);
    }
    async _asyncRun(environmentService, extensionHostProfileService, fileService, fileDialogService) {
        const picked = await fileDialogService.showSaveDialog({
            title: nls.localize('saveprofile.dialogTitle', 'Save Extension Host Profile'),
            availableFileSystems: [Schemas.file],
            defaultUri: joinPath(await fileDialogService.defaultFilePath(), `CPU-${new Date().toISOString().replace(/[\-:]/g, '')}.cpuprofile`),
            filters: [
                {
                    name: 'CPU Profiles',
                    extensions: ['cpuprofile', 'txt'],
                },
            ],
        });
        if (!picked) {
            return;
        }
        const profileInfo = extensionHostProfileService.lastProfile;
        let dataToWrite = profileInfo ? profileInfo.data : {};
        let savePath = picked.fsPath;
        if (environmentService.isBuilt) {
            // when running from a not-development-build we remove
            // absolute filenames because we don't want to reveal anything
            // about users. We also append the `.txt` suffix to make it
            // easier to attach these files to GH issues
            dataToWrite = Utils.rewriteAbsolutePaths(dataToWrite, 'piiRemoved');
            savePath = savePath + '.txt';
        }
        const saveURI = URI.file(savePath);
        extensionHostProfileService.lastProfileSavedTo = saveURI;
        return fileService.writeFile(saveURI, VSBuffer.fromString(JSON.stringify(profileInfo ? profileInfo.data : {}, null, '\t')));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVudGltZUV4dGVuc2lvbnNFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9leHRlbnNpb25zL2VsZWN0cm9uLXNhbmRib3gvcnVudGltZUV4dGVuc2lvbnNFZGl0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUU3RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzlGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNsRixPQUFPLEVBQ04sY0FBYyxFQUVkLGtCQUFrQixFQUNsQixhQUFhLEdBQ2IsTUFBTSxzREFBc0QsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUVuRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDekUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzNFLE9B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