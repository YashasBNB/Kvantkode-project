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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZXh0ZW5zaW9ucy9jb21tb24vZXh0ZW5zaW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFvQjVGLE9BQU8sRUFBRSxVQUFVLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0RUFBNEUsQ0FBQTtBQU85RyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFHcEYsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBSXZFLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUU5QyxNQUFNLENBQUMsTUFBTSxVQUFVLEdBQUcsMkJBQTJCLENBQUE7QUFDckQsTUFBTSxDQUFDLE1BQU0sbUJBQW1CLEdBQUcsU0FBUyxDQUFDLFlBQVksRUFBRSxZQUFZLENBQUMsQ0FBQTtBQVl4RSxNQUFNLENBQU4sSUFBa0IsY0FLakI7QUFMRCxXQUFrQixjQUFjO0lBQy9CLCtEQUFVLENBQUE7SUFDViw2REFBUyxDQUFBO0lBQ1QsbUVBQVksQ0FBQTtJQUNaLGlFQUFXLENBQUE7QUFDWixDQUFDLEVBTGlCLGNBQWMsS0FBZCxjQUFjLFFBSy9CO0FBRUQsTUFBTSxDQUFOLElBQWtCLDBCQU1qQjtBQU5ELFdBQWtCLDBCQUEwQjtJQUMzQywyREFBNkIsQ0FBQTtJQUM3QixxRUFBdUMsQ0FBQTtJQUN2QywrREFBaUMsQ0FBQTtJQUNqQyx5REFBMkIsQ0FBQTtJQUMzQiwrREFBaUMsQ0FBQTtBQUNsQyxDQUFDLEVBTmlCLDBCQUEwQixLQUExQiww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