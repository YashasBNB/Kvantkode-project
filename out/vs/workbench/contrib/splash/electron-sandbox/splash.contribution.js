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
import { registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { ISplashStorageService } from '../browser/splash.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { PartsSplash } from '../browser/partsSplash.js';
let SplashStorageService = class SplashStorageService {
    constructor(nativeHostService) {
        this.saveWindowSplash = nativeHostService.saveWindowSplash.bind(nativeHostService);
    }
};
SplashStorageService = __decorate([
    __param(0, INativeHostService)
], SplashStorageService);
registerSingleton(ISplashStorageService, SplashStorageService, 1 /* InstantiationType.Delayed */);
registerWorkbenchContribution2(PartsSplash.ID, PartsSplash, 1 /* WorkbenchPhase.BlockStartup */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3BsYXNoLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3NwbGFzaC9lbGVjdHJvbi1zYW5kYm94L3NwbGFzaC5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFrQiw4QkFBOEIsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQzVELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ2pGLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFHdkQsSUFBTSxvQkFBb0IsR0FBMUIsTUFBTSxvQkFBb0I7SUFLekIsWUFBZ0MsaUJBQXFDO1FBQ3BFLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxpQkFBaUIsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtJQUNuRixDQUFDO0NBQ0QsQ0FBQTtBQVJLLG9CQUFvQjtJQUtaLFdBQUEsa0JBQWtCLENBQUE7R0FMMUIsb0JBQW9CLENBUXpCO0FBRUQsaUJBQWlCLENBQUMscUJBQXFCLEVBQUUsb0JBQW9CLG9DQUE0QixDQUFBO0FBRXpGLDhCQUE4QixDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsV0FBVyxzQ0FBOEIsQ0FBQSJ9