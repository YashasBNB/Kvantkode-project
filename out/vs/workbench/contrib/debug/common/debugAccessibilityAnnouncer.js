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
import { IDebugService } from './debug.js';
import { Disposable, MutableDisposable } from '../../../../base/common/lifecycle.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IAccessibilityService } from '../../../../platform/accessibility/common/accessibility.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Expression } from './debugModel.js';
let DebugWatchAccessibilityAnnouncer = class DebugWatchAccessibilityAnnouncer extends Disposable {
    static { this.ID = 'workbench.contrib.debugWatchAccessibilityAnnouncer'; }
    constructor(_debugService, _logService, _accessibilityService, _configurationService) {
        super();
        this._debugService = _debugService;
        this._logService = _logService;
        this._accessibilityService = _accessibilityService;
        this._configurationService = _configurationService;
        this._listener = this._register(new MutableDisposable());
        this._setListener();
        this._register(_configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('accessibility.debugWatchVariableAnnouncements')) {
                this._setListener();
            }
        }));
    }
    _setListener() {
        const value = this._configurationService.getValue('accessibility.debugWatchVariableAnnouncements');
        if (value && !this._listener.value) {
            this._listener.value = this._debugService.getModel().onDidChangeWatchExpressionValue((e) => {
                if (!e || e.value === Expression.DEFAULT_VALUE) {
                    return;
                }
                // TODO: get user feedback, perhaps setting to configure verbosity + whether value, name, neither, or both are announced
                this._accessibilityService.alert(`${e.name} = ${e.value}`);
                this._logService.trace(`debugAccessibilityAnnouncerValueChanged ${e.name} ${e.value}`);
            });
        }
        else {
            this._listener.clear();
        }
    }
};
DebugWatchAccessibilityAnnouncer = __decorate([
    __param(0, IDebugService),
    __param(1, ILogService),
    __param(2, IAccessibilityService),
    __param(3, IConfigurationService)
], DebugWatchAccessibilityAnnouncer);
export { DebugWatchAccessibilityAnnouncer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdBY2Nlc3NpYmlsaXR5QW5ub3VuY2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvZGVidWcvY29tbW9uL2RlYnVnQWNjZXNzaWJpbGl0eUFubm91bmNlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sWUFBWSxDQUFBO0FBQzFDLE9BQU8sRUFBRSxVQUFVLEVBQWUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVqRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlCQUFpQixDQUFBO0FBRXJDLElBQU0sZ0NBQWdDLEdBQXRDLE1BQU0sZ0NBQWlDLFNBQVEsVUFBVTthQUN4RCxPQUFFLEdBQUcsb0RBQW9ELEFBQXZELENBQXVEO0lBSWhFLFlBQ2dCLGFBQTZDLEVBQy9DLFdBQXlDLEVBQy9CLHFCQUE2RCxFQUM3RCxxQkFBNkQ7UUFFcEYsS0FBSyxFQUFFLENBQUE7UUFMeUIsa0JBQWEsR0FBYixhQUFhLENBQWU7UUFDOUIsZ0JBQVcsR0FBWCxXQUFXLENBQWE7UUFDZCwwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBQzVDLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFQcEUsY0FBUyxHQUFtQyxJQUFJLENBQUMsU0FBUyxDQUMxRSxJQUFJLGlCQUFpQixFQUFFLENBQ3ZCLENBQUE7UUFRQSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUE7UUFDbkIsSUFBSSxDQUFDLFNBQVMsQ0FDYixxQkFBcUIsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ3BELElBQUksQ0FBQyxDQUFDLG9CQUFvQixDQUFDLCtDQUErQyxDQUFDLEVBQUUsQ0FBQztnQkFDN0UsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFBO1lBQ3BCLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVPLFlBQVk7UUFDbkIsTUFBTSxLQUFLLEdBQUcsSUFBSSxDQUFDLHFCQUFxQixDQUFDLFFBQVEsQ0FDaEQsK0NBQStDLENBQy9DLENBQUE7UUFDRCxJQUFJLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDcEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxRQUFRLEVBQUUsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO2dCQUMxRixJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLEtBQUssVUFBVSxDQUFDLGFBQWEsRUFBRSxDQUFDO29CQUNoRCxPQUFNO2dCQUNQLENBQUM7Z0JBRUQsd0hBQXdIO2dCQUN4SCxJQUFJLENBQUMscUJBQXFCLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksTUFBTSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtnQkFDMUQsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsMkNBQTJDLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUE7WUFDdkYsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFFLENBQUE7UUFDdkIsQ0FBQztJQUNGLENBQUM7O0FBdkNXLGdDQUFnQztJQU0xQyxXQUFBLGFBQWEsQ0FBQTtJQUNiLFdBQUEsV0FBVyxDQUFBO0lBQ1gsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLHFCQUFxQixDQUFBO0dBVFgsZ0NBQWdDLENBd0M1QyJ9