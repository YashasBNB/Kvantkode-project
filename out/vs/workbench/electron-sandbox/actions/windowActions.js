/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import './media/actions.css';
import { URI } from '../../../base/common/uri.js';
import { localize, localize2 } from '../../../nls.js';
import { ApplyZoomTarget, MAX_ZOOM_LEVEL, MIN_ZOOM_LEVEL, applyZoom, } from '../../../platform/window/electron-sandbox/window.js';
import { IKeybindingService } from '../../../platform/keybinding/common/keybinding.js';
import { getZoomLevel } from '../../../base/browser/browser.js';
import { FileKind } from '../../../platform/files/common/files.js';
import { IModelService } from '../../../editor/common/services/model.js';
import { ILanguageService } from '../../../editor/common/languages/language.js';
import { IQuickInputService, } from '../../../platform/quickinput/common/quickInput.js';
import { getIconClasses } from '../../../editor/common/services/getIconClasses.js';
import { IConfigurationService } from '../../../platform/configuration/common/configuration.js';
import { INativeHostService } from '../../../platform/native/common/native.js';
import { Codicon } from '../../../base/common/codicons.js';
import { ThemeIcon } from '../../../base/common/themables.js';
import { isSingleFolderWorkspaceIdentifier, isWorkspaceIdentifier, } from '../../../platform/workspace/common/workspace.js';
import { Action2, MenuId } from '../../../platform/actions/common/actions.js';
import { Categories } from '../../../platform/action/common/actionCommonCategories.js';
import { isMacintosh } from '../../../base/common/platform.js';
import { getActiveWindow } from '../../../base/browser/dom.js';
import { isOpenedAuxiliaryWindow, } from '../../../platform/window/common/window.js';
export class CloseWindowAction extends Action2 {
    static { this.ID = 'workbench.action.closeWindow'; }
    constructor() {
        super({
            id: CloseWindowAction.ID,
            title: {
                ...localize2('closeWindow', 'Close Window'),
                mnemonicTitle: localize({ key: 'miCloseWindow', comment: ['&& denotes a mnemonic'] }, 'Clos&&e Window'),
            },
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                mac: { primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 53 /* KeyCode.KeyW */ },
                linux: {
                    primary: 512 /* KeyMod.Alt */ | 62 /* KeyCode.F4 */,
                    secondary: [2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 53 /* KeyCode.KeyW */],
                },
                win: {
                    primary: 512 /* KeyMod.Alt */ | 62 /* KeyCode.F4 */,
                    secondary: [2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 53 /* KeyCode.KeyW */],
                },
            },
            menu: {
                id: MenuId.MenubarFileMenu,
                group: '6_close',
                order: 4,
            },
        });
    }
    async run(accessor) {
        const nativeHostService = accessor.get(INativeHostService);
        return nativeHostService.closeWindow({ targetWindowId: getActiveWindow().vscodeWindowId });
    }
}
class BaseZoomAction extends Action2 {
    static { this.ZOOM_LEVEL_SETTING_KEY = 'window.zoomLevel'; }
    static { this.ZOOM_PER_WINDOW_SETTING_KEY = 'window.zoomPerWindow'; }
    constructor(desc) {
        super(desc);
    }
    async setZoomLevel(accessor, levelOrReset) {
        const configurationService = accessor.get(IConfigurationService);
        let target;
        if (configurationService.getValue(BaseZoomAction.ZOOM_PER_WINDOW_SETTING_KEY) !== false) {
            target = ApplyZoomTarget.ACTIVE_WINDOW;
        }
        else {
            target = ApplyZoomTarget.ALL_WINDOWS;
        }
        let level;
        if (typeof levelOrReset === 'number') {
            level = Math.round(levelOrReset); // prevent fractional zoom levels
        }
        else {
            // reset to 0 when we apply to all windows
            if (target === ApplyZoomTarget.ALL_WINDOWS) {
                level = 0;
            }
            // otherwise, reset to the default zoom level
            else {
                const defaultLevel = configurationService.getValue(BaseZoomAction.ZOOM_LEVEL_SETTING_KEY);
                if (typeof defaultLevel === 'number') {
                    level = defaultLevel;
                }
                else {
                    level = 0;
                }
            }
        }
        if (level > MAX_ZOOM_LEVEL || level < MIN_ZOOM_LEVEL) {
            return; // https://github.com/microsoft/vscode/issues/48357
        }
        if (target === ApplyZoomTarget.ALL_WINDOWS) {
            await configurationService.updateValue(BaseZoomAction.ZOOM_LEVEL_SETTING_KEY, level);
        }
        applyZoom(level, target);
    }
}
export class ZoomInAction extends BaseZoomAction {
    constructor() {
        super({
            id: 'workbench.action.zoomIn',
            title: {
                ...localize2('zoomIn', 'Zoom In'),
                mnemonicTitle: localize({ key: 'miZoomIn', comment: ['&& denotes a mnemonic'] }, '&&Zoom In'),
            },
            category: Categories.View,
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 86 /* KeyCode.Equal */,
                secondary: [
                    2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 86 /* KeyCode.Equal */,
                    2048 /* KeyMod.CtrlCmd */ | 109 /* KeyCode.NumpadAdd */,
                ],
            },
            menu: {
                id: MenuId.MenubarAppearanceMenu,
                group: '5_zoom',
                order: 1,
            },
        });
    }
    run(accessor) {
        return super.setZoomLevel(accessor, getZoomLevel(getActiveWindow()) + 1);
    }
}
export class ZoomOutAction extends BaseZoomAction {
    constructor() {
        super({
            id: 'workbench.action.zoomOut',
            title: {
                ...localize2('zoomOut', 'Zoom Out'),
                mnemonicTitle: localize({ key: 'miZoomOut', comment: ['&& denotes a mnemonic'] }, '&&Zoom Out'),
            },
            category: Categories.View,
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 88 /* KeyCode.Minus */,
                secondary: [
                    2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 88 /* KeyCode.Minus */,
                    2048 /* KeyMod.CtrlCmd */ | 111 /* KeyCode.NumpadSubtract */,
                ],
                linux: {
                    primary: 2048 /* KeyMod.CtrlCmd */ | 88 /* KeyCode.Minus */,
                    secondary: [2048 /* KeyMod.CtrlCmd */ | 111 /* KeyCode.NumpadSubtract */],
                },
            },
            menu: {
                id: MenuId.MenubarAppearanceMenu,
                group: '5_zoom',
                order: 2,
            },
        });
    }
    run(accessor) {
        return super.setZoomLevel(accessor, getZoomLevel(getActiveWindow()) - 1);
    }
}
export class ZoomResetAction extends BaseZoomAction {
    constructor() {
        super({
            id: 'workbench.action.zoomReset',
            title: {
                ...localize2('zoomReset', 'Reset Zoom'),
                mnemonicTitle: localize({ key: 'miZoomReset', comment: ['&& denotes a mnemonic'] }, '&&Reset Zoom'),
            },
            category: Categories.View,
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 2048 /* KeyMod.CtrlCmd */ | 98 /* KeyCode.Numpad0 */,
            },
            menu: {
                id: MenuId.MenubarAppearanceMenu,
                group: '5_zoom',
                order: 3,
            },
        });
    }
    run(accessor) {
        return super.setZoomLevel(accessor, true);
    }
}
class BaseSwitchWindow extends Action2 {
    constructor(desc) {
        super(desc);
        this.closeWindowAction = {
            iconClass: ThemeIcon.asClassName(Codicon.removeClose),
            tooltip: localize('close', 'Close Window'),
        };
        this.closeDirtyWindowAction = {
            iconClass: 'dirty-window ' + ThemeIcon.asClassName(Codicon.closeDirty),
            tooltip: localize('close', 'Close Window'),
            alwaysVisible: true,
        };
    }
    async run(accessor) {
        const quickInputService = accessor.get(IQuickInputService);
        const keybindingService = accessor.get(IKeybindingService);
        const modelService = accessor.get(IModelService);
        const languageService = accessor.get(ILanguageService);
        const nativeHostService = accessor.get(INativeHostService);
        const currentWindowId = getActiveWindow().vscodeWindowId;
        const windows = await nativeHostService.getWindows({ includeAuxiliaryWindows: true });
        const mainWindows = new Set();
        const mapMainWindowToAuxiliaryWindows = new Map();
        for (const window of windows) {
            if (isOpenedAuxiliaryWindow(window)) {
                let auxiliaryWindows = mapMainWindowToAuxiliaryWindows.get(window.parentId);
                if (!auxiliaryWindows) {
                    auxiliaryWindows = new Set();
                    mapMainWindowToAuxiliaryWindows.set(window.parentId, auxiliaryWindows);
                }
                auxiliaryWindows.add(window);
            }
            else {
                mainWindows.add(window);
            }
        }
        function isWindowPickItem(candidate) {
            const windowPickItem = candidate;
            return typeof windowPickItem?.windowId === 'number';
        }
        const picks = [];
        for (const window of mainWindows) {
            const auxiliaryWindows = mapMainWindowToAuxiliaryWindows.get(window.id);
            if (mapMainWindowToAuxiliaryWindows.size > 0) {
                picks.push({
                    type: 'separator',
                    label: auxiliaryWindows ? localize('windowGroup', 'window group') : undefined,
                });
            }
            const resource = window.filename
                ? URI.file(window.filename)
                : isSingleFolderWorkspaceIdentifier(window.workspace)
                    ? window.workspace.uri
                    : isWorkspaceIdentifier(window.workspace)
                        ? window.workspace.configPath
                        : undefined;
            const fileKind = window.filename
                ? FileKind.FILE
                : isSingleFolderWorkspaceIdentifier(window.workspace)
                    ? FileKind.FOLDER
                    : isWorkspaceIdentifier(window.workspace)
                        ? FileKind.ROOT_FOLDER
                        : FileKind.FILE;
            const pick = {
                windowId: window.id,
                label: window.title,
                ariaLabel: window.dirty
                    ? localize('windowDirtyAriaLabel', '{0}, window with unsaved changes', window.title)
                    : window.title,
                iconClasses: getIconClasses(modelService, languageService, resource, fileKind),
                description: currentWindowId === window.id ? localize('current', 'Current Window') : undefined,
                buttons: currentWindowId !== window.id
                    ? window.dirty
                        ? [this.closeDirtyWindowAction]
                        : [this.closeWindowAction]
                    : undefined,
            };
            picks.push(pick);
            if (auxiliaryWindows) {
                for (const auxiliaryWindow of auxiliaryWindows) {
                    const pick = {
                        windowId: auxiliaryWindow.id,
                        label: auxiliaryWindow.title,
                        iconClasses: getIconClasses(modelService, languageService, auxiliaryWindow.filename ? URI.file(auxiliaryWindow.filename) : undefined, FileKind.FILE),
                        description: currentWindowId === auxiliaryWindow.id
                            ? localize('current', 'Current Window')
                            : undefined,
                        buttons: [this.closeWindowAction],
                    };
                    picks.push(pick);
                }
            }
        }
        const pick = await quickInputService.pick(picks, {
            contextKey: 'inWindowsPicker',
            activeItem: (() => {
                for (let i = 0; i < picks.length; i++) {
                    const pick = picks[i];
                    if (isWindowPickItem(pick) && pick.windowId === currentWindowId) {
                        let nextPick = picks[i + 1]; // try to select next window unless it's a separator
                        if (isWindowPickItem(nextPick)) {
                            return nextPick;
                        }
                        nextPick = picks[i + 2]; // otherwise try to select the next window after the separator
                        if (isWindowPickItem(nextPick)) {
                            return nextPick;
                        }
                    }
                }
                return undefined;
            })(),
            placeHolder: localize('switchWindowPlaceHolder', 'Select a window to switch to'),
            quickNavigate: this.isQuickNavigate()
                ? { keybindings: keybindingService.lookupKeybindings(this.desc.id) }
                : undefined,
            hideInput: this.isQuickNavigate(),
            onDidTriggerItemButton: async (context) => {
                await nativeHostService.closeWindow({ targetWindowId: context.item.windowId });
                context.removeItem();
            },
        });
        if (pick) {
            nativeHostService.focusWindow({ targetWindowId: pick.windowId });
        }
    }
}
export class SwitchWindowAction extends BaseSwitchWindow {
    constructor() {
        super({
            id: 'workbench.action.switchWindow',
            title: localize2('switchWindow', 'Switch Window...'),
            f1: true,
            keybinding: {
                weight: 200 /* KeybindingWeight.WorkbenchContrib */,
                primary: 0,
                mac: { primary: 256 /* KeyMod.WinCtrl */ | 53 /* KeyCode.KeyW */ },
            },
        });
    }
    isQuickNavigate() {
        return false;
    }
}
export class QuickSwitchWindowAction extends BaseSwitchWindow {
    constructor() {
        super({
            id: 'workbench.action.quickSwitchWindow',
            title: localize2('quickSwitchWindow', 'Quick Switch Window...'),
            f1: false, // hide quick pickers from command palette to not confuse with the other entry that shows a input field
        });
    }
    isQuickNavigate() {
        return true;
    }
}
function canRunNativeTabsHandler(accessor) {
    if (!isMacintosh) {
        return false;
    }
    const configurationService = accessor.get(IConfigurationService);
    return configurationService.getValue('window.nativeTabs') === true;
}
export const NewWindowTabHandler = function (accessor) {
    if (!canRunNativeTabsHandler(accessor)) {
        return;
    }
    return accessor.get(INativeHostService).newWindowTab();
};
export const ShowPreviousWindowTabHandler = function (accessor) {
    if (!canRunNativeTabsHandler(accessor)) {
        return;
    }
    return accessor.get(INativeHostService).showPreviousWindowTab();
};
export const ShowNextWindowTabHandler = function (accessor) {
    if (!canRunNativeTabsHandler(accessor)) {
        return;
    }
    return accessor.get(INativeHostService).showNextWindowTab();
};
export const MoveWindowTabToNewWindowHandler = function (accessor) {
    if (!canRunNativeTabsHandler(accessor)) {
        return;
    }
    return accessor.get(INativeHostService).moveWindowTabToNewWindow();
};
export const MergeWindowTabsHandlerHandler = function (accessor) {
    if (!canRunNativeTabsHandler(accessor)) {
        return;
    }
    return accessor.get(INativeHostService).mergeAllWindowTabs();
};
export const ToggleWindowTabsBarHandler = function (accessor) {
    if (!canRunNativeTabsHandler(accessor)) {
        return;
    }
    return accessor.get(INativeHostService).toggleWindowTabsBar();
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93QWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9lbGVjdHJvbi1zYW5kYm94L2FjdGlvbnMvd2luZG93QWN0aW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLHFCQUFxQixDQUFBO0FBQzVCLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBQ3JELE9BQU8sRUFDTixlQUFlLEVBQ2YsY0FBYyxFQUNkLGNBQWMsRUFDZCxTQUFTLEdBQ1QsTUFBTSxxREFBcUQsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUN0RixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDL0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUMvRSxPQUFPLEVBQ04sa0JBQWtCLEdBSWxCLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBR2xGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDN0QsT0FBTyxFQUNOLGlD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