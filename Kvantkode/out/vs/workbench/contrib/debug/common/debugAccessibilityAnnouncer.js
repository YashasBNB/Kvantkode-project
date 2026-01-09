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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdBY2Nlc3NpYmlsaXR5QW5ub3VuY2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9jb21tb24vZGVidWdBY2Nlc3NpYmlsaXR5QW5ub3VuY2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxZQUFZLENBQUE7QUFDMUMsT0FBTyxFQUFFLFVBQVUsRUFBZSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRWpHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFFckMsSUFBTSxnQ0FBZ0MsR0FBdEMsTUFBTSxnQ0FBaUMsU0FBUSxVQUFVO2FBQ3hELE9BQUUsR0FBRyxvREFBb0QsQUFBdkQsQ0FBdUQ7SUFJaEUsWUFDZ0IsYUFBNkMsRUFDL0MsV0FBeUMsRUFDL0IscUJBQTZELEVBQzdELHFCQUE2RDtRQUVwRixLQUFLLEVBQUUsQ0FBQTtRQUx5QixrQkFBYSxHQUFiLGFBQWEsQ0FBZTtRQUM5QixnQkFBVyxHQUFYLFdBQVcsQ0FBYTtRQUNkLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFDNUMsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQVBwRSxjQUFTLEdBQW1DLElBQUksQ0FBQyxTQUFTLENBQzFFLElBQUksaUJBQWlCLEVBQUUsQ0FDdkIsQ0FBQTtRQVFBLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUNuQixJQUFJLENBQUMsU0FBUyxDQUNiLHFCQUFxQixDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDcEQsSUFBSSxDQUFDLENBQUMsb0JBQW9CLENBQUMsK0NBQStDLENBQUMsRUFBRSxDQUFDO2dCQUM3RSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUE7WUFDcEIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRU8sWUFBWTtRQUNuQixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsUUFBUSxDQUNoRCwrQ0FBK0MsQ0FDL0MsQ0FBQTtRQUNELElBQUksS0FBSyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNwQyxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVEsRUFBRSxDQUFDLCtCQUErQixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0JBQzFGLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssS0FBSyxVQUFVLENBQUMsYUFBYSxFQUFFLENBQUM7b0JBQ2hELE9BQU07Z0JBQ1AsQ0FBQztnQkFFRCx3SEFBd0g7Z0JBQ3hILElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxNQUFNLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFBO2dCQUMxRCxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQywyQ0FBMkMsQ0FBQyxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQTtZQUN2RixDQUFDLENBQUMsQ0FBQTtRQUNILENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUN2QixDQUFDO0lBQ0YsQ0FBQzs7QUF2Q1csZ0NBQWdDO0lBTTFDLFdBQUEsYUFBYSxDQUFBO0lBQ2IsV0FBQSxXQUFXLENBQUE7SUFDWCxXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEscUJBQXFCLENBQUE7R0FUWCxnQ0FBZ0MsQ0F3QzVDIn0=