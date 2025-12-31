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
var PartsSplash_1;
import { onDidChangeFullscreen, isFullscreen } from '../../../../base/browser/browser.js';
import * as dom from '../../../../base/browser/dom.js';
import { Color } from '../../../../base/common/color.js';
import { Event } from '../../../../base/common/event.js';
import { DisposableStore, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { editorBackground, foreground } from '../../../../platform/theme/common/colorRegistry.js';
import { getThemeTypeSelector, IThemeService, } from '../../../../platform/theme/common/themeService.js';
import { DEFAULT_EDITOR_MIN_DIMENSIONS } from '../../../browser/parts/editor/editor.js';
import * as themes from '../../../common/theme.js';
import { IWorkbenchLayoutService, } from '../../../services/layout/browser/layoutService.js';
import { IWorkbenchEnvironmentService } from '../../../services/environment/common/environmentService.js';
import { IEditorGroupsService } from '../../../services/editor/common/editorGroupsService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import * as perf from '../../../../base/common/performance.js';
import { assertIsDefined } from '../../../../base/common/types.js';
import { ISplashStorageService } from './splash.js';
import { mainWindow } from '../../../../base/browser/window.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
let PartsSplash = class PartsSplash {
    static { PartsSplash_1 = this; }
    static { this.ID = 'workbench.contrib.partsSplash'; }
    static { this._splashElementId = 'monaco-parts-splash'; }
    constructor(_themeService, _layoutService, _environmentService, _configService, _partSplashService, editorGroupsService, lifecycleService) {
        this._themeService = _themeService;
        this._layoutService = _layoutService;
        this._environmentService = _environmentService;
        this._configService = _configService;
        this._partSplashService = _partSplashService;
        this._disposables = new DisposableStore();
        Event.once(_layoutService.onDidLayoutMainContainer)(() => {
            this._removePartsSplash();
            perf.mark('code/didRemovePartsSplash');
        }, undefined, this._disposables);
        const lastIdleSchedule = this._disposables.add(new MutableDisposable());
        const savePartsSplashSoon = () => {
            lastIdleSchedule.value = dom.runWhenWindowIdle(mainWindow, () => this._savePartsSplash(), 2500);
        };
        lifecycleService.when(3 /* LifecyclePhase.Restored */).then(() => {
            Event.any(Event.filter(onDidChangeFullscreen, (windowId) => windowId === mainWindow.vscodeWindowId), editorGroupsService.mainPart.onDidLayout, _themeService.onDidColorThemeChange)(savePartsSplashSoon, undefined, this._disposables);
            savePartsSplashSoon();
        });
        _configService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration("window.titleBarStyle" /* TitleBarSetting.TITLE_BAR_STYLE */)) {
                this._didChangeTitleBarStyle = true;
                this._savePartsSplash();
            }
        }, this, this._disposables);
    }
    dispose() {
        this._disposables.dispose();
    }
    _savePartsSplash() {
        const theme = this._themeService.getColorTheme();
        this._partSplashService.saveWindowSplash({
            zoomLevel: this._configService.getValue('window.zoomLevel'),
            baseTheme: getThemeTypeSelector(theme.type),
            colorInfo: {
                foreground: theme.getColor(foreground)?.toString(),
                background: Color.Format.CSS.formatHex(theme.getColor(editorBackground) || themes.WORKBENCH_BACKGROUND(theme)),
                editorBackground: theme.getColor(editorBackground)?.toString(),
                titleBarBackground: theme.getColor(themes.TITLE_BAR_ACTIVE_BACKGROUND)?.toString(),
                titleBarBorder: theme.getColor(themes.TITLE_BAR_BORDER)?.toString(),
                activityBarBackground: theme.getColor(themes.ACTIVITY_BAR_BACKGROUND)?.toString(),
                activityBarBorder: theme.getColor(themes.ACTIVITY_BAR_BORDER)?.toString(),
                sideBarBackground: theme.getColor(themes.SIDE_BAR_BACKGROUND)?.toString(),
                sideBarBorder: theme.getColor(themes.SIDE_BAR_BORDER)?.toString(),
                statusBarBackground: theme.getColor(themes.STATUS_BAR_BACKGROUND)?.toString(),
                statusBarBorder: theme.getColor(themes.STATUS_BAR_BORDER)?.toString(),
                statusBarNoFolderBackground: theme
                    .getColor(themes.STATUS_BAR_NO_FOLDER_BACKGROUND)
                    ?.toString(),
                windowBorder: theme.getColor(themes.WINDOW_ACTIVE_BORDER)?.toString() ??
                    theme.getColor(themes.WINDOW_INACTIVE_BORDER)?.toString(),
            },
            layoutInfo: !this._shouldSaveLayoutInfo()
                ? undefined
                : {
                    sideBarSide: this._layoutService.getSideBarPosition() === 1 /* Position.RIGHT */ ? 'right' : 'left',
                    editorPartMinWidth: DEFAULT_EDITOR_MIN_DIMENSIONS.width,
                    titleBarHeight: this._layoutService.isVisible("workbench.parts.titlebar" /* Parts.TITLEBAR_PART */, mainWindow)
                        ? dom.getTotalHeight(assertIsDefined(this._layoutService.getContainer(mainWindow, "workbench.parts.titlebar" /* Parts.TITLEBAR_PART */)))
                        : 0,
                    activityBarWidth: this._layoutService.isVisible("workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */)
                        ? dom.getTotalWidth(assertIsDefined(this._layoutService.getContainer(mainWindow, "workbench.parts.activitybar" /* Parts.ACTIVITYBAR_PART */)))
                        : 0,
                    sideBarWidth: this._layoutService.isVisible("workbench.parts.sidebar" /* Parts.SIDEBAR_PART */)
                        ? dom.getTotalWidth(assertIsDefined(this._layoutService.getContainer(mainWindow, "workbench.parts.sidebar" /* Parts.SIDEBAR_PART */)))
                        : 0,
                    auxiliarySideBarWidth: this._layoutService.isVisible("workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */)
                        ? dom.getTotalWidth(assertIsDefined(this._layoutService.getContainer(mainWindow, "workbench.parts.auxiliarybar" /* Parts.AUXILIARYBAR_PART */)))
                        : 0,
                    statusBarHeight: this._layoutService.isVisible("workbench.parts.statusbar" /* Parts.STATUSBAR_PART */, mainWindow)
                        ? dom.getTotalHeight(assertIsDefined(this._layoutService.getContainer(mainWindow, "workbench.parts.statusbar" /* Parts.STATUSBAR_PART */)))
                        : 0,
                    windowBorder: this._layoutService.hasMainWindowBorder(),
                    windowBorderRadius: this._layoutService.getMainWindowBorderRadius(),
                },
        });
    }
    _shouldSaveLayoutInfo() {
        return (!isFullscreen(mainWindow) &&
            !this._environmentService.isExtensionDevelopment &&
            !this._didChangeTitleBarStyle);
    }
    _removePartsSplash() {
        const element = mainWindow.document.getElementById(PartsSplash_1._splashElementId);
        if (element) {
            element.style.display = 'none';
        }
        // remove initial colors
        const defaultStyles = mainWindow.document.head.getElementsByClassName('initialShellColors');
        defaultStyles[0]?.remove();
    }
};
PartsSplash = PartsSplash_1 = __decorate([
    __param(0, IThemeService),
    __param(1, IWorkbenchLayoutService),
    __param(2, IWorkbenchEnvironmentService),
    __param(3, IConfigurationService),
    __param(4, ISplashStorageService),
    __param(5, IEditorGroupsService),
    __param(6, ILifecycleService)
], PartsSplash);
export { PartsSplash };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFydHNTcGxhc2guanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9zcGxhc2gvYnJvd3Nlci9wYXJ0c1NwbGFzaC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLFlBQVksRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3pGLE9BQU8sS0FBSyxHQUFHLE1BQU0saUNBQWlDLENBQUE7QUFDdEQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsZUFBZSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDekYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLFVBQVUsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ2pHLE9BQU8sRUFDTixvQkFBb0IsRUFDcEIsYUFBYSxHQUNiLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDdkYsT0FBTyxLQUFLLE1BQU0sTUFBTSwwQkFBMEIsQ0FBQTtBQUNsRCxPQUFPLEVBQ04sdUJBQXVCLEdBR3ZCLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDekcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDN0YsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxLQUFLLElBQUksTUFBTSx3Q0FBd0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7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