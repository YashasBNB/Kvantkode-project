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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5Ym9hcmRMYXlvdXRNYWluU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0va2V5Ym9hcmRMYXlvdXQvZWxlY3Ryb24tbWFpbi9rZXlib2FyZExheW91dE1haW5TZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sS0FBSyxRQUFRLE1BQU0sa0NBQWtDLENBQUE7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFLN0UsT0FBTyxFQUNOLHFCQUFxQixHQUVyQixNQUFNLHVEQUF1RCxDQUFBO0FBRTlELE1BQU0sQ0FBQyxNQUFNLDBCQUEwQixHQUFHLGVBQWUsQ0FDeEQsMkJBQTJCLENBQzNCLENBQUE7QUFJTSxJQUFNLHlCQUF5QixHQUEvQixNQUFNLHlCQUEwQixTQUFRLFVBQVU7SUFTeEQsWUFBbUMsb0JBQTJDO1FBQzdFLEtBQUssRUFBRSxDQUFBO1FBUFMsK0JBQTBCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBdUIsQ0FBQyxDQUFBO1FBQ3ZGLDhCQUF5QixHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxLQUFLLENBQUE7UUFPekUsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUE7UUFDeEIsSUFBSSxDQUFDLG1CQUFtQixHQUFHLElBQUksQ0FBQTtRQUUvQix1REFBdUQ7UUFDdkQsc0RBQXNEO1FBQ3RELHNCQUFzQjtRQUN0QixvQkFBb0IsQ0FBQyxJQUFJLDRDQUFvQyxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQTtJQUM3RixDQUFDO0lBRU8sV0FBVztRQUNsQixJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3hCLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFBO1FBQ3pDLENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxZQUFZLENBQUE7SUFDekIsQ0FBQztJQUVPLEtBQUssQ0FBQyxhQUFhO1FBQzFCLE1BQU0sZUFBZSxHQUFHLE1BQU0sTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFBO1FBRXJELElBQUksQ0FBQyxtQkFBbUIsR0FBRyxzQkFBc0IsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUNsRSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3BCLHdEQUF3RDtZQUN4RCxvRkFBb0Y7WUFDcEYsa0VBQWtFO1lBQ2xFLGVBQWUsQ0FBQyx5QkFBeUIsQ0FBQyxHQUFHLEVBQUU7Z0JBQzlDLElBQUksQ0FBQyxtQkFBbUIsR0FBRyxzQkFBc0IsQ0FBQyxlQUFlLENBQUMsQ0FBQTtnQkFDbEUsSUFBSSxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtZQUMvRCxDQUFDLENBQUMsQ0FBQTtRQUNILENBQUM7SUFDRixDQUFDO0lBRU0sS0FBSyxDQUFDLHFCQUFxQjtRQUNqQyxNQUFNLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQTtRQUN4QixPQUFPLElBQUksQ0FBQyxtQkFBb0IsQ0FBQTtJQUNqQyxDQUFDO0NBQ0QsQ0FBQTtBQTlDWSx5QkFBeUI7SUFTeEIsV0FBQSxxQkFBcUIsQ0FBQTtHQVR0Qix5QkFBeUIsQ0E4Q3JDOztBQUVELFNBQVMsc0JBQXNCLENBQUMsZUFBb0M7SUFDbkUsTUFBTSxlQUFlLEdBQUcsZUFBZSxDQUFDLFNBQVMsRUFBRSxDQUFBO0lBQ25ELE1BQU0sa0JBQWtCLEdBQUcsZUFBZSxDQUFDLHdCQUF3QixFQUFFLENBQUE7SUFDckUsT0FBTyxFQUFFLGVBQWUsRUFBRSxrQkFBa0IsRUFBRSxDQUFBO0FBQy9DLENBQUMifQ==