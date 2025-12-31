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
var TerminalMouseWheelZoomContribution_1;
import { Event } from '../../../../../base/common/event.js';
import { MouseWheelClassifier } from '../../../../../base/browser/ui/scrollbar/scrollableElement.js';
import { Disposable, MutableDisposable, toDisposable, } from '../../../../../base/common/lifecycle.js';
import { isMacintosh } from '../../../../../base/common/platform.js';
import { registerTerminalContribution, } from '../../../terminal/browser/terminalExtensions.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { registerTerminalAction } from '../../../terminal/browser/terminalActions.js';
import { localize2 } from '../../../../../nls.js';
import { isNumber } from '../../../../../base/common/types.js';
import { defaultTerminalFontSize } from '../../../terminal/common/terminalConfiguration.js';
let TerminalMouseWheelZoomContribution = class TerminalMouseWheelZoomContribution extends Disposable {
    static { TerminalMouseWheelZoomContribution_1 = this; }
    static { this.ID = 'terminal.mouseWheelZoom'; }
    static get(instance) {
        return instance.getContribution(TerminalMouseWheelZoomContribution_1.ID);
    }
    constructor(_ctx, _configurationService) {
        super();
        this._configurationService = _configurationService;
        this._listener = this._register(new MutableDisposable());
    }
    xtermOpen(xterm) {
        this._register(Event.runAndSubscribe(this._configurationService.onDidChangeConfiguration, (e) => {
            if (!e || e.affectsConfiguration("terminal.integrated.mouseWheelZoom" /* TerminalZoomSettingId.MouseWheelZoom */)) {
                if (!!this._configurationService.getValue("terminal.integrated.mouseWheelZoom" /* TerminalZoomSettingId.MouseWheelZoom */)) {
                    this._setupMouseWheelZoomListener(xterm.raw);
                }
                else {
                    this._listener.clear();
                }
            }
        }));
    }
    _getConfigFontSize() {
        return this._configurationService.getValue("terminal.integrated.fontSize" /* TerminalSettingId.FontSize */);
    }
    _setupMouseWheelZoomListener(raw) {
        // This is essentially a copy of what we do in the editor, just we modify font size directly
        // as there is no separate zoom level concept in the terminal
        const classifier = MouseWheelClassifier.INSTANCE;
        let prevMouseWheelTime = 0;
        let gestureStartFontSize = this._getConfigFontSize();
        let gestureHasZoomModifiers = false;
        let gestureAccumulatedDelta = 0;
        raw.attachCustomWheelEventHandler((e) => {
            const browserEvent = e;
            if (classifier.isPhysicalMouseWheel()) {
                if (this._hasMouseWheelZoomModifiers(browserEvent)) {
                    const delta = browserEvent.deltaY > 0 ? -1 : 1;
                    this._configurationService.updateValue("terminal.integrated.fontSize" /* TerminalSettingId.FontSize */, this._getConfigFontSize() + delta);
                    // EditorZoom.setZoomLevel(zoomLevel + delta);
                    browserEvent.preventDefault();
                    browserEvent.stopPropagation();
                    return false;
                }
            }
            else {
                // we consider mousewheel events that occur within 50ms of each other to be part of the same gesture
                // we don't want to consider mouse wheel events where ctrl/cmd is pressed during the inertia phase
                // we also want to accumulate deltaY values from the same gesture and use that to set the zoom level
                if (Date.now() - prevMouseWheelTime > 50) {
                    // reset if more than 50ms have passed
                    gestureStartFontSize = this._getConfigFontSize();
                    gestureHasZoomModifiers = this._hasMouseWheelZoomModifiers(browserEvent);
                    gestureAccumulatedDelta = 0;
                }
                prevMouseWheelTime = Date.now();
                gestureAccumulatedDelta += browserEvent.deltaY;
                if (gestureHasZoomModifiers) {
                    const deltaAbs = Math.ceil(Math.abs(gestureAccumulatedDelta / 5));
                    const deltaDirection = gestureAccumulatedDelta > 0 ? -1 : 1;
                    const delta = deltaAbs * deltaDirection;
                    this._configurationService.updateValue("terminal.integrated.fontSize" /* TerminalSettingId.FontSize */, gestureStartFontSize + delta);
                    gestureAccumulatedDelta += browserEvent.deltaY;
                    browserEvent.preventDefault();
                    browserEvent.stopPropagation();
                    return false;
                }
            }
            return true;
        });
        this._listener.value = toDisposable(() => raw.attachCustomWheelEventHandler(() => true));
    }
    _hasMouseWheelZoomModifiers(browserEvent) {
        return isMacintosh
            ? // on macOS we support cmd + two fingers scroll (`metaKey` set)
                // and also the two fingers pinch gesture (`ctrKey` set)
                (browserEvent.metaKey || browserEvent.ctrlKey) &&
                    !browserEvent.shiftKey &&
                    !browserEvent.altKey
            : browserEvent.ctrlKey &&
                !browserEvent.metaKey &&
                !browserEvent.shiftKey &&
                !browserEvent.altKey;
    }
};
TerminalMouseWheelZoomContribution = TerminalMouseWheelZoomContribution_1 = __decorate([
    __param(1, IConfigurationService)
], TerminalMouseWheelZoomContribution);
registerTerminalContribution(TerminalMouseWheelZoomContribution.ID, TerminalMouseWheelZoomContribution, true);
registerTerminalAction({
    id: "workbench.action.terminal.fontZoomIn" /* TerminalZoomCommandId.FontZoomIn */,
    title: localize2('fontZoomIn', 'Increase Font Size'),
    run: async (c, accessor) => {
        const configurationService = accessor.get(IConfigurationService);
        const value = configurationService.getValue("terminal.integrated.fontSize" /* TerminalSettingId.FontSize */);
        if (isNumber(value)) {
            await configurationService.updateValue("terminal.integrated.fontSize" /* TerminalSettingId.FontSize */, value + 1);
        }
    },
});
registerTerminalAction({
    id: "workbench.action.terminal.fontZoomOut" /* TerminalZoomCommandId.FontZoomOut */,
    title: localize2('fontZoomOut', 'Decrease Font Size'),
    run: async (c, accessor) => {
        const configurationService = accessor.get(IConfigurationService);
        const value = configurationService.getValue("terminal.integrated.fontSize" /* TerminalSettingId.FontSize */);
        if (isNumber(value)) {
            await configurationService.updateValue("terminal.integrated.fontSize" /* TerminalSettingId.FontSize */, value - 1);
        }
    },
});
registerTerminalAction({
    id: "workbench.action.terminal.fontZoomReset" /* TerminalZoomCommandId.FontZoomReset */,
    title: localize2('fontZoomReset', 'Reset Font Size'),
    run: async (c, accessor) => {
        const configurationService = accessor.get(IConfigurationService);
        await configurationService.updateValue("terminal.integrated.fontSize" /* TerminalSettingId.FontSize */, defaultTerminalFontSize);
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuem9vbS5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvem9vbS9icm93c2VyL3Rlcm1pbmFsLnpvb20uY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFM0QsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDcEcsT0FBTyxFQUNOLFVBQVUsRUFDVixpQkFBaUIsRUFDakIsWUFBWSxHQUNaLE1BQU0seUNBQXlDLENBQUE7QUFDaEQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBUXBFLE9BQU8sRUFDTiw0QkFBNEIsR0FHNUIsTUFBTSxpREFBaUQsQ0FBQTtBQUN4RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNyRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDakQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzlELE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRzNGLElBQU0sa0NBQWtDLEdBQXhDLE1BQU0sa0NBQW1DLFNBQVEsVUFBVTs7YUFDMUMsT0FBRSxHQUFHLHlCQUF5QixBQUE1QixDQUE0QjtJQVE5QyxNQUFNLENBQUMsR0FBRyxDQUNULFFBQXVEO1FBRXZELE9BQU8sUUFBUSxDQUFDLGVBQWUsQ0FDOUIsb0NBQWtDLENBQUMsRUFBRSxDQUNyQyxDQUFBO0lBQ0YsQ0FB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