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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IKeyboardLayoutService, } from '../../../../platform/keyboardLayout/common/keyboardLayout.js';
import { Emitter } from '../../../../base/common/event.js';
import { OS } from '../../../../base/common/platform.js';
import { CachedKeyboardMapper, } from '../../../../platform/keyboardLayout/common/keyboardMapper.js';
import { WindowsKeyboardMapper } from '../common/windowsKeyboardMapper.js';
import { FallbackKeyboardMapper } from '../common/fallbackKeyboardMapper.js';
import { MacLinuxKeyboardMapper } from '../common/macLinuxKeyboardMapper.js';
import { readKeyboardConfig, } from '../../../../platform/keyboardLayout/common/keyboardConfig.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { INativeKeyboardLayoutService } from './nativeKeyboardLayoutService.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
let KeyboardLayoutService = class KeyboardLayoutService extends Disposable {
    constructor(_nativeKeyboardLayoutService, _configurationService) {
        super();
        this._nativeKeyboardLayoutService = _nativeKeyboardLayoutService;
        this._configurationService = _configurationService;
        this._onDidChangeKeyboardLayout = this._register(new Emitter());
        this.onDidChangeKeyboardLayout = this._onDidChangeKeyboardLayout.event;
        this._keyboardMapper = null;
        this._register(this._nativeKeyboardLayoutService.onDidChangeKeyboardLayout(async () => {
            this._keyboardMapper = null;
            this._onDidChangeKeyboardLayout.fire();
        }));
        this._register(_configurationService.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration('keyboard')) {
                this._keyboardMapper = null;
                this._onDidChangeKeyboardLayout.fire();
            }
        }));
    }
    getRawKeyboardMapping() {
        return this._nativeKeyboardLayoutService.getRawKeyboardMapping();
    }
    getCurrentKeyboardLayout() {
        return this._nativeKeyboardLayoutService.getCurrentKeyboardLayout();
    }
    getAllKeyboardLayouts() {
        return [];
    }
    getKeyboardMapper() {
        const config = readKeyboardConfig(this._configurationService);
        if (config.dispatch === 1 /* DispatchConfig.KeyCode */) {
            // Forcefully set to use keyCode
            return new FallbackKeyboardMapper(config.mapAltGrToCtrlAlt, OS);
        }
        if (!this._keyboardMapper) {
            this._keyboardMapper = new CachedKeyboardMapper(createKeyboardMapper(this.getCurrentKeyboardLayout(), this.getRawKeyboardMapping(), config.mapAltGrToCtrlAlt));
        }
        return this._keyboardMapper;
    }
    validateCurrentKeyboardMapping(keyboardEvent) {
        return;
    }
};
KeyboardLayoutService = __decorate([
    __param(0, INativeKeyboardLayoutService),
    __param(1, IConfigurationService)
], KeyboardLayoutService);
export { KeyboardLayoutService };
function createKeyboardMapper(layoutInfo, rawMapping, mapAltGrToCtrlAlt) {
    const _isUSStandard = isUSStandard(layoutInfo);
    if (OS === 1 /* OperatingSystem.Windows */) {
        return new WindowsKeyboardMapper(_isUSStandard, rawMapping, mapAltGrToCtrlAlt);
    }
    if (!rawMapping || Object.keys(rawMapping).length === 0) {
        // Looks like reading the mappings failed (most likely Mac + Japanese/Chinese keyboard layouts)
        return new FallbackKeyboardMapper(mapAltGrToCtrlAlt, OS);
    }
    if (OS === 2 /* OperatingSystem.Macintosh */) {
        const kbInfo = layoutInfo;
        if (kbInfo.id === 'com.apple.keylayout.DVORAK-QWERTYCMD') {
            // Use keyCode based dispatching for DVORAK - QWERTY ⌘
            return new FallbackKeyboardMapper(mapAltGrToCtrlAlt, OS);
        }
    }
    return new MacLinuxKeyboardMapper(_isUSStandard, rawMapping, mapAltGrToCtrlAlt, OS);
}
function isUSStandard(_kbInfo) {
    if (!_kbInfo) {
        return false;
    }
    if (OS === 3 /* OperatingSystem.Linux */) {
        const kbInfo = _kbInfo;
        const layouts = kbInfo.layout.split(/,/g);
        return layouts[kbInfo.group] === 'us';
    }
    if (OS === 2 /* OperatingSystem.Macintosh */) {
        const kbInfo = _kbInfo;
        return kbInfo.id === 'com.apple.keylayout.US';
    }
    if (OS === 1 /* OperatingSystem.Windows */) {
        const kbInfo = _kbInfo;
        return kbInfo.name === '00000409';
    }
    return false;
}
registerSingleton(IKeyboardLayoutService, KeyboardLayoutService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlS2V5Ym9hcmRMYXlvdXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMva2V5YmluZGluZy9lbGVjdHJvbi1zYW5kYm94L25hdGl2ZUtleWJvYXJkTGF5b3V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBRU4sc0JBQXNCLEdBT3RCLE1BQU0sOERBQThELENBQUE7QUFDckUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBbUIsRUFBRSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDekUsT0FBTyxFQUNOLG9CQUFvQixHQUVwQixNQUFNLDhEQUE4RCxDQUFBO0FBQ3JFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzVFLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzVFLE9BQU8sRUFFTixrQkFBa0IsR0FDbEIsTUFBTSw4REFBOEQsQ0FBQTtBQUVyRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMvRSxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFFekQsSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxxQkFBc0IsU0FBUSxVQUFVO0lBUXBELFlBRUMsNEJBQTJFLEVBQ3BELHFCQUE2RDtRQUVwRixLQUFLLEVBQUUsQ0FBQTtRQUhVLGlDQUE0QixHQUE1Qiw0QkFBNEIsQ0FBOEI7UUFDbkMsMEJBQXFCLEdBQXJCLHFCQUFxQixDQUF1QjtRQVJwRSwrQkFBMEIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQUN4RSw4QkFBeUIsR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQUMsS0FBSyxDQUFBO1FBVXpFLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFBO1FBRTNCLElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLDRCQUE0QixDQUFDLHlCQUF5QixDQUFDLEtBQUssSUFBSSxFQUFFO1lBQ3RFLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFBO1lBQzNCLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUN2QyxDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixxQkFBcUIsQ0FBQyx3QkFBd0IsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxFQUFFLEVBQUU7WUFDMUQsSUFBSSxDQUFDLENBQUMsb0JBQW9CLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztnQkFDeEMsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUE7Z0JBQzNCLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtZQUN2QyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFTSxxQkFBcUI7UUFDM0IsT0FBTyxJQUFJLENBQUMsNEJBQTRCLENBQUMscUJBQXFCLEVBQUUsQ0FBQTtJQUNqRSxDQUFDO0lBRU0sd0JBQXdCO1FBQzlCLE9BQU8sSUFBSSxDQUFDLDRCQUE0QixDQUFDLHdCQUF3QixFQUFFLENBQUE7SUFDcEUsQ0FBQztJQUVNLHFCQUFxQjtRQUMzQixPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7SUFFTSxpQkFBaUI7UUFDdkIsTUFBTSxNQUFNLEdBQUcsa0JBQWtCLENBQUMsSUFBSSxDQUFDLHFCQUFxQixDQUFDLENBQUE7UUFDN0QsSUFBSSxNQUFNLENBQUMsUUFBUSxtQ0FBMkIsRUFBRSxDQUFDO1lBQ2hELGdDQUFnQztZQUNoQyxPQUFPLElBQUksc0JBQXNCLENBQUMsTUFBTSxDQUFDLGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ2hFLENBQUM7UUFDRCxJQUFJLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQzNCLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxvQkFBb0IsQ0FDOUMsb0JBQW9CLENBQ25CLElBQUksQ0FBQyx3QkFBd0IsRUFBRSxFQUMvQixJQUFJLENBQUMscUJBQXFCLEVBQUUsRUFDNUIsTUFBTSxDQUFDLGlCQUFpQixDQUN4QixDQUNELENBQUE7UUFDRixDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUFBO0lBQzVCLENBQUM7SUFFTSw4QkFBOEIsQ0FBQyxhQUE2QjtRQUNsRSxPQUFNO0lBQ1AsQ0FBQztDQUNELENBQUE7QUFsRVkscUJBQXFCO0lBUy9CLFdBQUEsNEJBQTRCLENBQUE7SUFFNUIsV0FBQSxxQkFBcUIsQ0FBQTtHQVhYLHFCQUFxQixDQWtFakM7O0FBRUQsU0FBUyxvQkFBb0IsQ0FDNUIsVUFBc0MsRUFDdEMsVUFBbUMsRUFDbkMsaUJBQTBCO0lBRTFCLE1BQU0sYUFBYSxHQUFHLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQTtJQUM5QyxJQUFJLEVBQUUsb0NBQTRCLEVBQUUsQ0FBQztRQUNwQyxPQUFPLElBQUkscUJBQXFCLENBQy9CLGFBQWEsRUFDWSxVQUFVLEVBQ25DLGlCQUFpQixDQUNqQixDQUFBO0lBQ0YsQ0FBQztJQUVELElBQUksQ0FBQyxVQUFVLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7UUFDekQsK0ZBQStGO1FBQy9GLE9BQU8sSUFBSSxzQkFBc0IsQ0FBQyxpQkFBaUIsRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUN6RCxDQUFDO0lBRUQsSUFBSSxFQUFFLHNDQUE4QixFQUFFLENBQUM7UUFDdEMsTUFBTSxNQUFNLEdBQTJCLFVBQVUsQ0FBQTtRQUNqRCxJQUFJLE1BQU0sQ0FBQyxFQUFFLEtBQUssc0NBQXNDLEVBQUUsQ0FBQztZQUMxRCxzREFBc0Q7WUFDdEQsT0FBTyxJQUFJLHNCQUFzQixDQUFDLGlCQUFpQixFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3pELENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTyxJQUFJLHNCQUFzQixDQUNoQyxhQUFhLEVBQ2EsVUFBVSxFQUNwQyxpQkFBaUIsRUFDakIsRUFBRSxDQUNGLENBQUE7QUFDRixDQUFDO0FBRUQsU0FBUyxZQUFZLENBQUMsT0FBbUM7SUFDeEQsSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ2QsT0FBTyxLQUFLLENBQUE7SUFDYixDQUFDO0lBRUQsSUFBSSxFQUFFLGtDQUEwQixFQUFFLENBQUM7UUFDbEMsTUFBTSxNQUFNLEdBQTZCLE9BQU8sQ0FBQTtRQUNoRCxNQUFNLE9BQU8sR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUN6QyxPQUFPLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEtBQUssSUFBSSxDQUFBO0lBQ3RDLENBQUM7SUFFRCxJQUFJLEVBQUUsc0NBQThCLEVBQUUsQ0FBQztRQUN0QyxNQUFNLE1BQU0sR0FBMkIsT0FBTyxDQUFBO1FBQzlDLE9BQU8sTUFBTSxDQUFDLEVBQUUsS0FBSyx3QkFBd0IsQ0FBQTtJQUM5QyxDQUFDO0lBRUQsSUFBSSxFQUFFLG9DQUE0QixFQUFFLENBQUM7UUFDcEMsTUFBTSxNQUFNLEdBQStCLE9BQU8sQ0FBQTtRQUNsRCxPQUFPLE1BQU0sQ0FBQyxJQUFJLEtBQUssVUFBVSxDQUFBO0lBQ2xDLENBQUM7SUFFRCxPQUFPLEtBQUssQ0FBQTtBQUNiLENBQUM7QUFFRCxpQkFBaUIsQ0FBQyxzQkFBc0IsRUFBRSxxQkFBcUIsb0NBQTRCLENBQUEifQ==