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
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { areSameExtensions } from '../../../../platform/extensionManagement/common/extensionManagementUtil.js';
import { RawContextKey } from '../../../../platform/contextkey/common/contextkey.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { localize2 } from '../../../../nls.js';
export const VIEWLET_ID = 'workbench.view.extensions';
export const EXTENSIONS_CATEGORY = localize2('extensions', 'Extensions');
export var ExtensionState;
(function (ExtensionState) {
    ExtensionState[ExtensionState["Installing"] = 0] = "Installing";
    ExtensionState[ExtensionState["Installed"] = 1] = "Installed";
    ExtensionState[ExtensionState["Uninstalling"] = 2] = "Uninstalling";
    ExtensionState[ExtensionState["Uninstalled"] = 3] = "Uninstalled";
})(ExtensionState || (ExtensionState = {}));
export var ExtensionRuntimeActionType;
(function (ExtensionRuntimeActionType) {
    ExtensionRuntimeActionType["ReloadWindow"] = "reloadWindow";
    ExtensionRuntimeActionType["RestartExtensions"] = "restartExtensions";
    ExtensionRuntimeActionType["DownloadUpdate"] = "downloadUpdate";
    ExtensionRuntimeActionType["ApplyUpdate"] = "applyUpdate";
    ExtensionRuntimeActionType["QuitAndInstall"] = "quitAndInstall";
})(ExtensionRuntimeActionType || (ExtensionRuntimeActionType = {}));
export const IExtensionsWorkbenchService = createDecorator('extensionsWorkbenchService');
export var ExtensionEditorTab;
(function (ExtensionEditorTab) {
    ExtensionEditorTab["Readme"] = "readme";
    ExtensionEditorTab["Features"] = "features";
    ExtensionEditorTab["Changelog"] = "changelog";
    ExtensionEditorTab["Dependencies"] = "dependencies";
    ExtensionEditorTab["ExtensionPack"] = "extensionPack";
})(ExtensionEditorTab || (ExtensionEditorTab = {}));
export const ConfigurationKey = 'extensions';
export const AutoUpdateConfigurationKey = 'extensions.autoUpdate';
export const AutoCheckUpdatesConfigurationKey = 'extensions.autoCheckUpdates';
export const CloseExtensionDetailsOnViewChangeKey = 'extensions.closeExtensionDetailsOnViewChange';
export const AutoRestartConfigurationKey = 'extensions.autoRestart';
let ExtensionContainers = class ExtensionContainers extends Disposable {
    constructor(containers, extensionsWorkbenchService) {
        super();
        this.containers = containers;
        this._register(extensionsWorkbenchService.onChange(this.update, this));
    }
    set extension(extension) {
        this.containers.forEach((c) => (c.extension = extension));
    }
    update(extension) {
        for (const container of this.containers) {
            if (extension && container.extension) {
                if (areSameExtensions(container.extension.identifier, extension.identifier)) {
                    if (container.extension.server &&
                        extension.server &&
                        container.extension.server !== extension.server) {
                        if (container.updateWhenCounterExtensionChanges) {
                            container.update();
                        }
                    }
                    else {
                        container.extension = extension;
                    }
                }
            }
            else {
                container.update();
            }
        }
    }
};
ExtensionContainers = __decorate([
    __param(1, IExtensionsWorkbenchService)
], ExtensionContainers);
export { ExtensionContainers };
export const WORKSPACE_RECOMMENDATIONS_VIEW_ID = 'workbench.views.extensions.workspaceRecommendations';
export const OUTDATED_EXTENSIONS_VIEW_ID = 'workbench.views.extensions.searchOutdated';
export const TOGGLE_IGNORE_EXTENSION_ACTION_ID = 'workbench.extensions.action.toggleIgnoreExtension';
export const SELECT_INSTALL_VSIX_EXTENSION_COMMAND_ID = 'workbench.extensions.action.installVSIX';
export const INSTALL_EXTENSION_FROM_VSIX_COMMAND_ID = 'workbench.extensions.command.installFromVSIX';
export const LIST_WORKSPACE_UNSUPPORTED_EXTENSIONS_COMMAND_ID = 'workbench.extensions.action.listWorkspaceUnsupportedExtensions';
// Context Keys
export const HasOutdatedExtensionsContext = new RawContextKey('hasOutdatedExtensions', false);
export const CONTEXT_HAS_GALLERY = new RawContextKey('hasGallery', false);
export const ExtensionResultsListFocused = new RawContextKey('extensionResultListFocused ', true);
// Context Menu Groups
export const THEME_ACTIONS_GROUP = '_theme_';
export const INSTALL_ACTIONS_GROUP = '0_install';
export const UPDATE_ACTIONS_GROUP = '0_update';
export const extensionsSearchActionsMenu = new MenuId('extensionsSearchActionsMenu');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2V4dGVuc2lvbnMvY29tbW9uL2V4dGVuc2lvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBb0I1RixPQUFPLEVBQUUsVUFBVSxFQUFlLE1BQU0sc0NBQXNDLENBQUE7QUFDOUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sNEVBQTRFLENBQUE7QUFPOUcsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBR3BGLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUl2RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFOUMsTUFBTSxDQUFDLE1BQU0sVUFBVSxHQUFHLDJCQUEyQixDQUFBO0FBQ3JELE1BQU0sQ0FBQyxNQUFNLG1CQUFtQixHQUFHLFNBQVMsQ0FBQyxZQUFZLEVBQUUsWUFBWSxDQUFDLENBQUE7QUFZeEUsTUFBTSxDQUFOLElBQWtCLGNBS2pCO0FBTEQsV0FBa0IsY0FBYztJQUMvQiwrREFBVSxDQUFBO0lBQ1YsNkRBQVMsQ0FBQTtJQUNULG1FQUFZLENBQUE7SUFDWixpRUFBVyxDQUFBO0FBQ1osQ0FBQyxFQUxpQixjQUFjLEtBQWQsY0FBYyxRQUsvQjtBQUVELE1BQU0sQ0FBTixJQUFrQiwwQkFNakI7QUFORCxXQUFrQiwwQkFBMEI7SUFDM0MsMkRBQTZCLENBQUE7SUFDN0IscUVBQXVDLENBQUE7SUFDdkMsK0RBQWlDLENBQUE7SUFDakMseURBQTJCLENBQUE7SUFDM0IsK0RBQWlDLENBQUE7QUFDbEMsQ0FBQyxFQU5pQiwwQkFBMEIsS0FBMUIsMEJBQTBC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