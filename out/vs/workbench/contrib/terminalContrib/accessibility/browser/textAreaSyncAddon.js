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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dEFyZWFTeW5jQWRkb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvYWNjZXNzaWJpbGl0eS9icm93c2VyL3RleHRBcmVhU3luY0FkZG9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDM0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBS3JHLE9BQU8sRUFDTixtQkFBbUIsR0FFbkIsTUFBTSxxREFBcUQsQ0FBQTtBQUVyRCxJQUFNLGlCQUFpQixHQUF2QixNQUFNLGlCQUFrQixTQUFRLFVBQVU7SUFJaEQsUUFBUSxDQUFDLFFBQWtCO1FBQzFCLElBQUksQ0FBQyxTQUFTLEdBQUcsUUFBUSxDQUFBO1FBQ3pCLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFBO0lBQ3pCLENBQUM7SUFFRCxZQUNrQixhQUF1QyxFQUNqQyxxQkFBNkQsRUFDN0QscUJBQTZELEVBQy9ELFdBQWlEO1FBRXRFLEtBQUssRUFBRSxDQUFBO1FBTFUsa0JBQWEsR0FBYixhQUFhLENBQTBCO1FBQ2hCLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFDNUMsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQUM5QyxnQkFBVyxHQUFYLFdBQVcsQ0FBcUI7UUFYdEQsZUFBVSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxpQkFBaUIsRUFBRSxDQUFDLENBQUE7UUFlcEUsSUFBSSxDQUFDLFNBQVMsQ0FDYixLQUFLLENBQUMsZUFBZSxDQUNwQixLQUFLLENBQUMsR0FBRyxDQUNSLElBQUksQ0FBQyxhQUFhLENBQUMsa0JBQWtCLEVBQ3JDLElBQUksQ0FBQyxhQUFhLENBQUMscUJBQXFCLEVBQ3hDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxnQ0FBZ0MsQ0FDM0QsRUFDRCxHQUFHLEVBQUU7WUFDSixJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtRQUN6QixDQUFDLENBQ0QsQ0FDRCxDQUFBO0lBQ0YsQ0FBQztJQUVPLGlCQUFpQjtRQUN4QixNQUFNLGdCQUFnQixHQUFHLElBQUksQ0FBQyxhQUFhLENBQUMsR0FBRyw2Q0FBcUMsQ0FBQTtRQUNwRixJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUUsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDO1lBQ2hELElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssRUFBRSxDQUFDO2dCQUM1QixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQTtnQkFDekMsSUFBSSxRQUFRLEVBQUUsQ0FBQztvQkFDZCxJQUFJLENBQUMsVUFBVSxDQUFDLEtBQUssR0FBRyxLQUFLLENBQUMsZUFBZSxDQUM1QyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsRUFDbEQsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FDMUIsQ0FBQTtnQkFDRixDQUFDO1lBQ0YsQ0FBQztRQUNGLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUN4QixDQUFDO0lBQ0YsQ0FBQztJQUVPLGVBQWU7UUFDdEIsT0FBTyxDQUNOLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyx1QkFBdUIsRUFBRTtZQUNwRCxJQUFJLENBQUMscUJBQXFCLENBQUMsUUFBUSx5RUFBMkIsQ0FDOUQsQ0FBQTtJQUNGLENBQUM7SUFHTyxLQUFLLENBQUMsUUFBNkI7UUFDMUMsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsNkNBQXFDLENBQUE7UUFDckYsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDeEIsT0FBTTtRQUNQLENBQUM7UUFFRCxRQUFRLENBQUMsS0FBSyxHQUFHLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQTtRQUN6RCxRQUFRLENBQUMsY0FBYyxHQUFHLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQTtRQUN4RSxRQUFRLENBQUMsWUFBWSxHQUFHLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FBQTtRQUV0RSxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyw0Q0FBNEMsUUFBUSxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUE7SUFDdEYsQ0FBQztDQUNELENBQUE7QUFaUTtJQURQLFFBQVEsQ0FBQyxFQUFFLENBQUM7OENBWVo7QUFuRVcsaUJBQWlCO0lBVzNCLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLG1CQUFtQixDQUFBO0dBYlQsaUJBQWlCLENBb0U3QiJ9