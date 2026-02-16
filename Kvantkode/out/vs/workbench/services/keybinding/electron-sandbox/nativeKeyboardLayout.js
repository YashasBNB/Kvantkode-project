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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlS2V5Ym9hcmRMYXlvdXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9rZXliaW5kaW5nL2VsZWN0cm9uLXNhbmRib3gvbmF0aXZlS2V5Ym9hcmRMYXlvdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFFTixzQkFBc0IsR0FPdEIsTUFBTSw4REFBOEQsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFtQixFQUFFLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN6RSxPQUFPLEVBQ04sb0JBQW9CLEdBRXBCLE1BQU0sOERBQThELENBQUE7QUFDckUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDMUUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDNUUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDNUUsT0FBTyxFQUVOLGtCQUFrQixHQUNsQixNQUFNLDhEQUE4RCxDQUFBO0FBRXJFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSw0QkFBNEIsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQy9FLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUV6RCxJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFzQixTQUFRLFVBQVU7SUFRcEQsWUFFQyw0QkFBMkUsRUFDcEQscUJBQTZEO1FBRXBGLEtBQUssRUFBRSxDQUFB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