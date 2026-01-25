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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlSG9zdENvbG9yU2NoZW1lU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RoZW1lcy9lbGVjdHJvbi1zYW5kYm94L25hdGl2ZUhvc3RDb2xvclNjaGVtZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNqRixPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzdHLE9BQU8sRUFDTixlQUFlLEdBR2YsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRXRFLE9BQU8sRUFBRSxpQkFBaUIsRUFBZSxNQUFNLHFDQUFxQyxDQUFBO0FBRTdFLElBQU0sNEJBQTRCLEdBQWxDLE1BQU0sNEJBQTZCLFNBQVEsVUFBVTs7SUFDM0QseUVBQXlFO2FBQ3pELGdCQUFXLEdBQUcscUJBQXFCLEFBQXhCLENBQXdCO0lBVW5ELFlBQ3FCLGlCQUFzRCxFQUN0QyxrQkFBc0QsRUFDekUsY0FBdUMsRUFDckMsZ0JBQW1DO1FBRXRELEtBQUssRUFBRSxDQUFBO1FBTDhCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBb0I7UUFFakQsbUJBQWMsR0FBZCxjQUFjLENBQWlC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