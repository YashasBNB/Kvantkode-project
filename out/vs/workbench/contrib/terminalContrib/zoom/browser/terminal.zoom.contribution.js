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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWwuem9vbS5jb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi96b29tL2Jyb3dzZXIvdGVybWluYWwuem9vbS5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUUzRCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNwRyxPQUFPLEVBQ04sVUFBVSxFQUNWLGlCQUFpQixFQUNqQixZQUFZLEdBQ1osTUFBTSx5Q0FBeUMsQ0FBQTtBQUNoRCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFRcEUsT0FBTyxFQUNOLDRCQUE0QixHQUc1QixNQUFNLGlEQUFpRCxDQUFBO0FBQ3hELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFHM0YsSUFBTSxrQ0FBa0MsR0FBeEMsTUFBTSxrQ0FBbUMsU0FBUSxVQUFVOzthQUMxQyxPQUFFLEdBQUcseUJBQXlCLEFBQTVCLENBQTRCO0lBUTlDLE1BQU0sQ0FBQyxHQUFHLENBQ1QsUUFBdUQ7UUFFdkQsT0FBTyxRQUFRLENBQUMsZUFBZSxDQUM5QixvQ0FBa0MsQ0FBQyxF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