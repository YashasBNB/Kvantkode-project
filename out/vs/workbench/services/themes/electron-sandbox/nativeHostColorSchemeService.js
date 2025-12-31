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
var NativeHostColorSchemeService_1;
import { Emitter } from '../../../../base/common/event.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IHostColorSchemeService } from '../common/hostColorSchemeService.js';
import { INativeWorkbenchEnvironmentService } from '../../environment/electron-sandbox/environmentService.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { isBoolean, isObject } from '../../../../base/common/types.js';
import { ILifecycleService } from '../../lifecycle/common/lifecycle.js';
let NativeHostColorSchemeService = class NativeHostColorSchemeService extends Disposable {
    static { NativeHostColorSchemeService_1 = this; }
    // we remember the last color scheme value to restore for reloaded window
    static { this.STORAGE_KEY = 'HostColorSchemeData'; }
    constructor(nativeHostService, environmentService, storageService, lifecycleService) {
        super();
        this.nativeHostService = nativeHostService;
        this.storageService = storageService;
        this._onDidChangeColorScheme = this._register(new Emitter());
        this.onDidChangeColorScheme = this._onDidChangeColorScheme.event;
        // register listener with the OS
        this._register(this.nativeHostService.onDidChangeColorScheme((scheme) => this.update(scheme)));
        let initial = environmentService.window.colorScheme;
        if (lifecycleService.startupKind === 3 /* StartupKind.ReloadedWindow */) {
            initial = this.getStoredValue(initial);
        }
        this.dark = initial.dark;
        this.highContrast = initial.highContrast;
        // fetch the actual value from the OS
        this.nativeHostService.getOSColorScheme().then((scheme) => this.update(scheme));
    }
    getStoredValue(dftl) {
        const stored = this.storageService.get(NativeHostColorSchemeService_1.STORAGE_KEY, -1 /* StorageScope.APPLICATION */);
        if (stored) {
            try {
                const scheme = JSON.parse(stored);
                if (isObject(scheme) && isBoolean(scheme.highContrast) && isBoolean(scheme.dark)) {
                    return scheme;
                }
            }
            catch (e) {
                // ignore
            }
        }
        return dftl;
    }
    update({ highContrast, dark }) {
        if (dark !== this.dark || highContrast !== this.highContrast) {
            this.dark = dark;
            this.highContrast = highContrast;
            this.storageService.store(NativeHostColorSchemeService_1.STORAGE_KEY, JSON.stringify({ highContrast, dark }), -1 /* StorageScope.APPLICATION */, 1 /* StorageTarget.MACHINE */);
            this._onDidChangeColorScheme.fire();
        }
    }
};
NativeHostColorSchemeService = NativeHostColorSchemeService_1 = __decorate([
    __param(0, INativeHostService),
    __param(1, INativeWorkbenchEnvironmentService),
    __param(2, IStorageService),
    __param(3, ILifecycleService)
], NativeHostColorSchemeService);
export { NativeHostColorSchemeService };
registerSingleton(IHostColorSchemeService, NativeHostColorSchemeService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlSG9zdENvbG9yU2NoZW1lU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90aGVtZXMvZWxlY3Ryb24tc2FuZGJveC9uYXRpdmVIb3N0Q29sb3JTY2hlbWVTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDakYsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUM3RyxPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLFNBQVMsRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUV0RSxPQUFPLEVBQUUsaUJBQWlCLEVBQWUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUU3RSxJQUFNLDRCQUE0QixHQUFsQyxNQUFNLDRCQUE2QixTQUFRLFVBQVU7O0lBQzNELHlFQUF5RTthQUN6RCxnQkFBVyxHQUFHLHFCQUFxQixBQUF4QixDQUF3QjtJQVVuRCxZQUNxQixpQkFBc0QsRUFDdEMsa0JBQXNELEVBQ3pFLGNBQXVDLEVBQ3JDLGdCQUFtQztRQUV0RCxLQUFLLEVBQUUsQ0FBQTtRQUw4QixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW9CO1FBRWpELG1CQUFjLEdBQWQsY0FBYyxDQUFpQjtRQVR4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