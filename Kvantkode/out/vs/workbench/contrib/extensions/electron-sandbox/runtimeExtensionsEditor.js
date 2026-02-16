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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVudGltZUV4dGVuc2lvbnNFZGl0b3IuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVuc2lvbnMvZWxlY3Ryb24tc2FuZGJveC9ydW50aW1lRXh0ZW5zaW9uc0VkaXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRTdELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sS0FBSyxHQUFHLE1BQU0sb0JBQW9CLENBQUE7QUFDekMsT0FBTyxFQUFFLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDOUYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDN0YsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2xGLE9BQU8sRUFDTixjQUFjLEVBRWQsa0JBQWtCLEVBQ2xCLGFBQWEsR0FDYixNQUFNLHNEQUFzRCxDQUFBO0FBQzdELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRW5GLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1B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