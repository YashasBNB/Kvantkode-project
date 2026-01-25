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
import { macLinuxKeyboardMappingEquals, windowsKeyboardMappingEquals, } from '../../../../platform/keyboardLayout/common/keyboardLayout.js';
import { Emitter } from '../../../../base/common/event.js';
import { OS } from '../../../../base/common/platform.js';
import { IMainProcessService } from '../../../../platform/ipc/common/mainProcessService.js';
import { ProxyChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const INativeKeyboardLayoutService = createDecorator('nativeKeyboardLayoutService');
let NativeKeyboardLayoutService = class NativeKeyboardLayoutService extends Disposable {
    constructor(mainProcessService) {
        super();
        this._onDidChangeKeyboardLayout = this._register(new Emitter());
        this.onDidChangeKeyboardLayout = this._onDidChangeKeyboardLayout.event;
        this._keyboardLayoutService = ProxyChannel.toService(mainProcessService.getChannel('keyboardLayout'));
        this._initPromise = null;
        this._keyboardMapping = null;
        this._keyboardLayoutInfo = null;
        this._register(this._keyboardLayoutService.onDidChangeKeyboardLayout(async ({ keyboardLayoutInfo, keyboardMapping }) => {
            await this.initialize();
            if (keyboardMappingEquals(this._keyboardMapping, keyboardMapping)) {
                // the mappings are equal
                return;
            }
            this._keyboardMapping = keyboardMapping;
            this._keyboardLayoutInfo = keyboardLayoutInfo;
            this._onDidChangeKeyboardLayout.fire();
        }));
    }
    initialize() {
        if (!this._initPromise) {
            this._initPromise = this._doInitialize();
        }
        return this._initPromise;
    }
    async _doInitialize() {
        const keyboardLayoutData = await this._keyboardLayoutService.getKeyboardLayoutData();
        const { keyboardLayoutInfo, keyboardMapping } = keyboardLayoutData;
        this._keyboardMapping = keyboardMapping;
        this._keyboardLayoutInfo = keyboardLayoutInfo;
    }
    getRawKeyboardMapping() {
        return this._keyboardMapping;
    }
    getCurrentKeyboardLayout() {
        return this._keyboardLayoutInfo;
    }
};
NativeKeyboardLayoutService = __decorate([
    __param(0, IMainProcessService)
], NativeKeyboardLayoutService);
export { NativeKeyboardLayoutService };
function keyboardMappingEquals(a, b) {
    if (OS === 1 /* OperatingSystem.Windows */) {
        return windowsKeyboardMappingEquals(a, b);
    }
    return macLinuxKeyboardMappingEquals(a, b);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlS2V5Ym9hcmRMYXlvdXRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMva2V5YmluZGluZy9lbGVjdHJvbi1zYW5kYm94L25hdGl2ZUtleWJvYXJkTGF5b3V0U2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUtOLDZCQUE2QixFQUM3Qiw0QkFBNEIsR0FDNUIsTUFBTSw4REFBOEQsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsT0FBTyxFQUFTLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFtQixFQUFFLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUUzRixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDdkUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRTVGLE1BQU0sQ0FBQyxNQUFNLDRCQUE0QixHQUFHLGVBQWUsQ0FDMUQsNkJBQTZCLENBQzdCLENBQUE7QUFTTSxJQUFNLDJCQUEyQixHQUFqQyxNQUFNLDJCQUNaLFNBQVEsVUFBVTtJQWFsQixZQUFpQyxrQkFBdUM7UUFDdkUsS0FBSyxFQUFFLENBQUE7UUFUUywrQkFBMEIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUFRLENBQUMsQ0FBQTtRQUN4RSw4QkFBeUIsR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQUMsS0FBSyxDQUFBO1FBU3pFLElBQUksQ0FBQyxzQkFBc0IsR0FBRyxZQUFZLENBQUMsU0FBUyxDQUNuRCxrQkFBa0IsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsQ0FDL0MsQ0FBQTtRQUNELElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFBO1FBQ3hCLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUE7UUFDNUIsSUFBSSxDQUFDLG1CQUFtQixHQUFHLElBQUksQ0FBQTtRQUUvQixJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyx5QkFBeUIsQ0FDcEQsS0FBSyxFQUFFLEVBQUUsa0JBQWtCLEVBQUUsZUFBZSxFQUFFLEVBQUUsRUFBRTtZQUNqRCxNQUFNLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQTtZQUN2QixJQUFJLHFCQUFxQixDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxlQUFlLENBQUMsRUFBRSxDQUFDO2dCQUNuRSx5QkFBeUI7Z0JBQ3pCLE9BQU07WUFDUCxDQUFDO1lBRUQsSUFBSSxDQUFDLGdCQUFnQixHQUFHLGVBQWUsQ0FBQTtZQUN2QyxJQUFJLENBQUMsbUJBQW1CLEdBQUcsa0JBQWtCLENBQUE7WUFDN0MsSUFBSSxDQUFDLDBCQUEwQixDQUFDLElBQUksRUFBRSxDQUFBO1FBQ3ZDLENBQUMsQ0FDRCxDQUNELENBQUE7SUFDRixDQUFDO0lBRU0sVUFBVTtRQUNoQixJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3hCLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFBO1FBQ3pDLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUE7SUFDekIsQ0FBQztJQUVPLEtBQUssQ0FBQyxhQUFhO1FBQzFCLE1BQU0sa0JBQWtCLEdBQUcsTUFBTSxJQUFJLENBQUMsc0JBQXNCLENBQUMscUJBQXFCLEVBQUUsQ0FBQTtRQUNwRixNQUFNLEVBQUUsa0JBQWtCLEVBQUUsZUFBZSxFQUFFLEdBQUcsa0JBQWtCLENBQUE7UUFDbEUsSUFBSSxDQUFDLGdCQUFnQixHQUFHLGVBQWUsQ0FBQTtRQUN2QyxJQUFJLENBQUMsbUJBQW1CLEdBQUcsa0JBQWtCLENBQUE7SUFDOUMsQ0FBQztJQUVNLHFCQUFxQjtRQUMzQixPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQTtJQUM3QixDQUFDO0lBRU0sd0JBQXdCO1FBQzlCLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixDQUFBO0lBQ2hDLENBQUM7Q0FDRCxDQUFBO0FBN0RZLDJCQUEyQjtJQWMxQixXQUFBLG1CQUFtQixDQUFBO0dBZHBCLDJCQUEyQixDQTZEdkM7O0FBRUQsU0FBUyxxQkFBcUIsQ0FBQyxDQUEwQixFQUFFLENBQTBCO0lBQ3BGLElBQUksRUFBRSxvQ0FBNEIsRUFBRSxDQUFDO1FBQ3BDLE9BQU8sNEJBQTRCLENBQ0YsQ0FBQyxFQUNELENBQUMsQ0FDakMsQ0FBQTtJQUNGLENBQUM7SUFFRCxPQUFPLDZCQUE2QixDQUNGLENBQUMsRUFDRCxDQUFDLENBQ2xDLENBQUE7QUFDRixDQUFDIn0=