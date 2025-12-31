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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlS2V5Ym9hcmRMYXlvdXRTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2tleWJpbmRpbmcvZWxlY3Ryb24tc2FuZGJveC9uYXRpdmVLZXlib2FyZExheW91dFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFLTiw2QkFBNkIsRUFDN0IsNEJBQTRCLEdBQzVCLE1BQU0sOERBQThELENBQUE7QUFDckUsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBbUIsRUFBRSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDekUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFFM0YsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUU1RixNQUFNLENBQUMsTUFBTSw0QkFBNEIsR0FBRyxlQUFlLENBQzFELDZCQUE2QixDQUM3QixDQUFBO0FBU00sSUFBTSwyQkFBMkIsR0FBakMsTUFBTSwyQkFDWixTQUFRLFVBQVU7SUFhbEIsWUFBaUMsa0JBQXVDO1FBQ3ZFLEtBQUssRUFBRSxDQUFBO1FBVFMsK0JBQTBCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7UUFDeEUsOEJBQXlCLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEtBQUssQ0FBQTtRQVN6RSxJQUFJLENBQUMsc0JBQXNCLEdBQUcsWUFBWSxDQUFDLFNBQVMsQ0FDbkQsa0JBQWtCLENBQUMsVUFBVSxDQUFDLGdCQUFnQixDQUFDLENBQy9DLENBQUE7UUFDRCxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQTtRQUN4QixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFBO1FBQzVCLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLENBQUE7UUFFL0IsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsc0JBQXNCLENBQUMseUJBQXlCLENBQ3BELEtBQUssRUFBRSxFQUFFLGtCQUFrQixFQUFFLGVBQWUsRUFBRSxFQUFFLEVBQUU7WUFDakQsTUFBTSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUE7WUFDdkIsSUFBSSxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsZUFBZSxDQUFDLEVBQUUsQ0FBQztnQkFDbkUseUJBQXlCO2dCQUN6QixPQUFNO1lBQ1AsQ0FBQztZQUVELElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxlQUFlLENBQUE7WUFDdkMsSUFBSSxDQUFDLG1CQUFtQixHQUFHLGtCQUFrQixDQUFBO1lBQzdDLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUN2QyxDQUFDLENBQ0QsQ0FDRCxDQUFBO0lBQ0YsQ0FBQztJQUVNLFVBQVU7UUFDaEIsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUN4QixJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQTtRQUN6QyxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFBO0lBQ3pCLENBQUM7SUFFTyxLQUFLLENBQUMsYUFBYTtRQUMxQixNQUFNLGtCQUFrQixHQUFHLE1BQU0sSUFBSSxDQUFDLHNCQUFzQixDQUFDLHFCQUFxQixFQUFFLENBQUE7UUFDcEYsTUFBTSxFQUFFLGtCQUFrQixFQUFFLGVBQWUsRUFBRSxHQUFHLGtCQUFrQixDQUFBO1FBQ2xFLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxlQUFlLENBQUE7UUFDdkMsSUFBSSxDQUFDLG1CQUFtQixHQUFHLGtCQUFrQixDQUFBO0lBQzlDLENBQUM7SUFFTSxxQkFBcUI7UUFDM0IsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUE7SUFDN0IsQ0FBQztJQUVNLHdCQUF3QjtRQUM5QixPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQTtJQUNoQyxDQUFDO0NBQ0QsQ0FBQTtBQTdEWSwyQkFBMkI7SUFjMUIsV0FBQSxtQkFBbUIsQ0FBQTtHQWRwQiwyQkFBMkIsQ0E2RHZDOztBQUVELFNBQVMscUJBQXFCLENBQUMsQ0FBMEIsRUFBRSxDQUEwQjtJQUNwRixJQUFJLEVBQUUsb0NBQTRCLEVBQUUsQ0FBQztRQUNwQyxPQUFPLDRCQUE0QixDQUNGLENBQUMsRUFDRCxDQUFDLENBQ2pDLENBQUE7SUFDRixDQUFDO0lBRUQsT0FBTyw2QkFBNkIsQ0FDRixDQUFDLEVBQ0QsQ0FBQyxDQUNsQyxDQUFBO0FBQ0YsQ0FBQyJ9