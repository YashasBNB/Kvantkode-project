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
import { debounce } from '../../../../../base/common/decorators.js';
import { Event } from '../../../../../base/common/event.js';
import { Disposable, MutableDisposable } from '../../../../../base/common/lifecycle.js';
import { IAccessibilityService } from '../../../../../platform/accessibility/common/accessibility.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { ITerminalLogService, } from '../../../../../platform/terminal/common/terminal.js';
let TextAreaSyncAddon = class TextAreaSyncAddon extends Disposable {
    activate(terminal) {
        this._terminal = terminal;
        this._refreshListeners();
    }
    constructor(_capabilities, _accessibilityService, _configurationService, _logService) {
        super();
        this._capabilities = _capabilities;
        this._accessibilityService = _accessibilityService;
        this._configurationService = _configurationService;
        this._logService = _logService;
        this._listeners = this._register(new MutableDisposable());
        this._register(Event.runAndSubscribe(Event.any(this._capabilities.onDidAddCapability, this._capabilities.onDidRemoveCapability, this._accessibilityService.onDidChangeScreenReaderOptimized), () => {
            this._refreshListeners();
        }));
    }
    _refreshListeners() {
        const commandDetection = this._capabilities.get(2 /* TerminalCapability.CommandDetection */);
        if (this._shouldBeActive() && commandDetection) {
            if (!this._listeners.value) {
                const textarea = this._terminal?.textarea;
                if (textarea) {
                    this._listeners.value = Event.runAndSubscribe(commandDetection.promptInputModel.onDidChangeInput, () => this._sync(textarea));
                }
            }
        }
        else {
            this._listeners.clear();
        }
    }
    _shouldBeActive() {
        return (this._accessibilityService.isScreenReaderOptimized() ||
            this._configurationService.getValue("terminal.integrated.developer.devMode" /* TerminalSettingId.DevMode */));
    }
    _sync(textArea) {
        const commandCapability = this._capabilities.get(2 /* TerminalCapability.CommandDetection */);
        if (!commandCapability) {
            return;
        }
        textArea.value = commandCapability.promptInputModel.value;
        textArea.selectionStart = commandCapability.promptInputModel.cursorIndex;
        textArea.selectionEnd = commandCapability.promptInputModel.cursorIndex;
        this._logService.debug(`TextAreaSyncAddon#sync: text changed to "${textArea.value}"`);
    }
};
__decorate([
    debounce(50)
], TextAreaSyncAddon.prototype, "_sync", null);
TextAreaSyncAddon = __decorate([
    __param(1, IAccessibilityService),
    __param(2, IConfigurationService),
    __param(3, ITerminalLogService)
], TextAreaSyncAddon);
export { TextAreaSyncAddon };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEFyZWFTeW5jQWRkb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9hY2Nlc3NpYmlsaXR5L2Jyb3dzZXIvdGV4dEFyZWFTeW5jQWRkb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsVUFBVSxFQUFFLGlCQUFpQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDdkYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFLckcsT0FBTyxFQUNOLG1CQUFtQixHQUVuQixNQUFNLHFEQUFxRCxDQUFBO0FBRXJELElBQU0saUJBQWlCLEdBQXZCLE1BQU0saUJBQWtCLFNBQVEsVUFBVTtJQUloRCxRQUFRLENBQUMsUUFBa0I7UUFDMUIsSUFBSSxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUE7UUFDekIsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7SUFDekIsQ0FBQztJQUVELFlBQ2tCLGFBQXVDLEVBQ2pDLHFCQUE2RCxFQUM3RCxxQkFBNkQsRUFDL0QsV0FBaUQ7UUFFdEUsS0FBSyxFQUFFLENBQUE7UUFMVSxrQkFBYSxHQUFiLGFBQWEsQ0FBMEI7UUFDaEIsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUM1QywwQkFBcUIsR0FBckIscUJBQXFCLENBQXVCO1FBQzlDLGdCQUFXLEdBQVgsV0FBVyxDQUFxQjtRQVh0RCxlQUFVLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGlCQUFpQixFQUFFLENBQUMsQ0FBQTtRQWVwRSxJQUFJLENBQUMsU0FBUyxDQUNiLEtBQUssQ0FBQyxlQUFlLENBQ3BCLEtBQUssQ0FBQyxHQUFHLENBQ1IsSUFBSSxDQUFDLGFBQWEsQ0FBQyxrQkFBa0IsRUFDckMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxxQkFBcUIsRUFDeEMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLGdDQUFnQyxDQUMzRCxFQUNELEdBQUcsRUFBRTtZQUNKLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO1FBQ3pCLENBQUMsQ0FDRCxDQUNELENBQUE7SUFDRixDQUFDO0lBRU8saUJBQWlCO1FBQ3hCLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLGFBQWEsQ0FBQyxHQUFHLDZDQUFxQyxDQUFBO1FBQ3BGLElBQUksSUFBSSxDQUFDLGVBQWUsRUFBRSxJQUFJLGdCQUFnQixFQUFFLENBQUM7WUFDaEQsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JBQzVCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxTQUFTLEVBQUUsUUFBUSxDQUFBO2dCQUN6QyxJQUFJLFFBQVEsRUFBRSxDQUFDO29CQUNkLElBQUksQ0FBQyxVQUFVLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxlQUFlLENBQzVDLGdCQUFnQixDQUFDLGdCQUFnQixDQUFDLGdCQUFnQixFQUNsRCxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUMxQixDQUFBO2dCQUNGLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQzthQUFNLENBQUM7WUFDUCxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFBO1FBQ3hCLENBQUM7SUFDRixDQUFDO0lBRU8sZUFBZTtRQUN0QixPQUFPLENBQ04sSUFBSSxDQUFDLHFCQUFxQixDQUFDLHVCQUF1QixFQUFFO1lBQ3BELElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxRQUFRLHlFQUEyQixDQUM5RCxDQUFBO0lBQ0YsQ0FBQztJQUdPLEtBQUssQ0FBQyxRQUE2QjtRQUMxQyxNQUFNLGlCQUFpQixHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyw2Q0FBcUMsQ0FBQTtRQUNyRixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztZQUN4QixPQUFNO1FBQ1AsQ0FBQztRQUVELFFBQVEsQ0FBQyxLQUFLLEdBQUcsaUJBQWlCLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxDQUFBO1FBQ3pELFFBQVEsQ0FBQyxjQUFjLEdBQUcsaUJBQWlCLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFBO1FBQ3hFLFFBQVEsQ0FBQyxZQUFZLEdBQUcsaUJBQWlCLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFBO1FBRXRFLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLDRDQUE0QyxRQUFRLENBQUMsS0FBSyxHQUFHLENBQUMsQ0FBQTtJQUN0RixDQUFDO0NBQ0QsQ0FBQTtBQVpRO0lBRFAsUUFBUSxDQUFDLEVBQUUsQ0FBQzs4Q0FZWjtBQW5FVyxpQkFBaUI7SUFXM0IsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsbUJBQW1CLENBQUE7R0FiVCxpQkFBaUIsQ0FvRTdCIn0=