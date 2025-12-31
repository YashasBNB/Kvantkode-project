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
import * as platform from '../../../base/common/platform.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { ILifecycleMainService, } from '../../lifecycle/electron-main/lifecycleMainService.js';
export const IKeyboardLayoutMainService = createDecorator('keyboardLayoutMainService');
let KeyboardLayoutMainService = class KeyboardLayoutMainService extends Disposable {
    constructor(lifecycleMainService) {
        super();
        this._onDidChangeKeyboardLayout = this._register(new Emitter());
        this.onDidChangeKeyboardLayout = this._onDidChangeKeyboardLayout.event;
        this._initPromise = null;
        this._keyboardLayoutData = null;
        // perf: automatically trigger initialize after windows
        // have opened so that we can do this work in parallel
        // to the window load.
        lifecycleMainService.when(3 /* LifecycleMainPhase.AfterWindowOpen */).then(() => this._initialize());
    }
    _initialize() {
        if (!this._initPromise) {
            this._initPromise = this._doInitialize();
        }
        return this._initPromise;
    }
    async _doInitialize() {
        const nativeKeymapMod = await import('native-keymap');
        this._keyboardLayoutData = readKeyboardLayoutData(nativeKeymapMod);
        if (!platform.isCI) {
            // See https://github.com/microsoft/vscode/issues/152840
            // Do not register the keyboard layout change listener in CI because it doesn't work
            // on the build machines and it just adds noise to the build logs.
            nativeKeymapMod.onDidChangeKeyboardLayout(() => {
                this._keyboardLayoutData = readKeyboardLayoutData(nativeKeymapMod);
                this._onDidChangeKeyboardLayout.fire(this._keyboardLayoutData);
            });
        }
    }
    async getKeyboardLayoutData() {
        await this._initialize();
        return this._keyboardLayoutData;
    }
};
KeyboardLayoutMainService = __decorate([
    __param(0, ILifecycleMainService)
], KeyboardLayoutMainService);
export { KeyboardLayoutMainService };
function readKeyboardLayoutData(nativeKeymapMod) {
    const keyboardMapping = nativeKeymapMod.getKeyMap();
    const keyboardLayoutInfo = nativeKeymapMod.getCurrentKeyboardLayout();
    return { keyboardMapping, keyboardLayoutInfo };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5Ym9hcmRMYXlvdXRNYWluU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2tleWJvYXJkTGF5b3V0L2VsZWN0cm9uLW1haW4va2V5Ym9hcmRMYXlvdXRNYWluU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEtBQUssUUFBUSxNQUFNLGtDQUFrQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDOUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBSzdFLE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSx1REFBdUQsQ0FBQTtBQUU5RCxNQUFNLENBQUMsTUFBTSwwQkFBMEIsR0FBRyxlQUFlLENBQ3hELDJCQUEyQixDQUMzQixDQUFBO0FBSU0sSUFBTSx5QkFBeUIsR0FBL0IsTUFBTSx5QkFBMEIsU0FBUSxVQUFVO0lBU3hELFlBQW1DLG9CQUEyQztRQUM3RSxLQUFLLEVBQUUsQ0FBQTtRQVBTLCtCQUEwQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQXVCLENBQUMsQ0FBQTtRQUN2Riw4QkFBeUIsR0FBRyxJQUFJLENBQUMsMEJBQTBCLENBQUMsS0FBSyxDQUFBO1FBT3pFLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFBO1FBQ3hCLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxJQUFJLENBQUE7UUFFL0IsdURBQXVEO1FBQ3ZELHNEQUFzRDtRQUN0RCxzQkFBc0I7UUFDdEIsb0JBQW9CLENBQUMsSUFBSSw0Q0FBb0MsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUE7SUFDN0YsQ0FBQztJQUVPLFdBQVc7UUFDbEIsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUN4QixJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQTtRQUN6QyxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFBO0lBQ3pCLENBQUM7SUFFTyxLQUFLLENBQUMsYUFBYTtRQUMxQixNQUFNLGVBQWUsR0FBRyxNQUFNLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUVyRCxJQUFJLENBQUMsbUJBQW1CLEdBQUcsc0JBQXNCLENBQUMsZUFBZSxDQUFDLENBQUE7UUFDbEUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNwQix3REFBd0Q7WUFDeEQsb0ZBQW9GO1lBQ3BGLGtFQUFrRTtZQUNsRSxlQUFlLENBQUMseUJBQXlCLENBQUMsR0FBRyxFQUFFO2dCQUM5QyxJQUFJLENBQUMsbUJBQW1CLEdBQUcsc0JBQXNCLENBQUMsZUFBZSxDQUFDLENBQUE7Z0JBQ2xFLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLG1CQUFtQixDQUFDLENBQUE7WUFDL0QsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDO0lBQ0YsQ0FBQztJQUVNLEtBQUssQ0FBQyxxQkFBcUI7UUFDakMsTUFBTSxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUE7UUFDeEIsT0FBTyxJQUFJLENBQUMsbUJBQW9CLENBQUE7SUFDakMsQ0FBQztDQUNELENBQUE7QUE5Q1kseUJBQXlCO0lBU3hCLFdBQUEscUJBQXFCLENBQUE7R0FUdEIseUJBQXlCLENBOENyQzs7QUFFRCxTQUFTLHNCQUFzQixDQUFDLGVBQW9DO0lBQ25FLE1BQU0sZUFBZSxHQUFHLGVBQWUsQ0FBQyxTQUFTLEVBQUUsQ0FBQTtJQUNuRCxNQUFNLGtCQUFrQixHQUFHLGVBQWUsQ0FBQyx3QkFBd0IsRUFBRSxDQUFBO0lBQ3JFLE9BQU8sRUFBRSxlQUFlLEVBQUUsa0JBQWtCLEVBQUUsQ0FBQTtBQUMvQyxDQUFDIn0=