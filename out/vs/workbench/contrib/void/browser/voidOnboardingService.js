/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Disposable, toDisposable } from '../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { registerWorkbenchContribution2, } from '../../../common/contributions.js';
import { mountVoidOnboarding } from './react/out/void-onboarding/index.js';
import { h, getActiveWindow } from '../../../../base/browser/dom.js';
// Onboarding contribution that mounts the component at startup
let OnboardingContribution = class OnboardingContribution extends Disposable {
    static { this.ID = 'workbench.contrib.voidOnboarding'; }
    constructor(instantiationService) {
        super();
        this.instantiationService = instantiationService;
        this.initialize();
    }
    initialize() {
        // Get the active window reference for multi-window support
        const targetWindow = getActiveWindow();
        // Find the monaco-workbench element using the proper window reference
        const workbench = targetWindow.document.querySelector('.monaco-workbench');
        if (workbench) {
            const onboardingContainer = h('div.void-onboarding-container').root;
            workbench.appendChild(onboardingContainer);
            this.instantiationService.invokeFunction((accessor) => {
                const result = mountVoidOnboarding(onboardingContainer, accessor);
                if (result && typeof result.dispose === 'function') {
                    this._register(toDisposable(result.dispose));
                }
            });
            // Register cleanup for the DOM element
            this._register(toDisposable(() => {
                if (onboardingContainer.parentElement) {
                    onboardingContainer.parentElement.removeChild(onboardingContainer);
                }
            }));
        }
    }
};
OnboardingContribution = __decorate([
    __param(0, IInstantiationService)
], OnboardingContribution);
export { OnboardingContribution };
// Register the contribution to be initialized during the AfterRestored phase
registerWorkbenchContribution2(OnboardingContribution.ID, OnboardingContribution, 3 /* WorkbenchPhase.AfterRestored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidm9pZE9uYm9hcmRpbmdTZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdm9pZC9icm93c2VyL3ZvaWRPbmJvYXJkaW5nU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7OzBGQUcwRjs7Ozs7Ozs7OztBQUUxRixPQUFPLEVBQUUsVUFBVSxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9FLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFFTiw4QkFBOEIsR0FFOUIsTUFBTSxrQ0FBa0MsQ0FBQTtBQUV6QyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsQ0FBQyxFQUFFLGVBQWUsRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBRXBFLCtEQUErRDtBQUN4RCxJQUFNLHNCQUFzQixHQUE1QixNQUFNLHNCQUF1QixTQUFRLFVBQVU7YUFDckMsT0FBRSxHQUFHLGtDQUFrQyxBQUFyQyxDQUFxQztJQUV2RCxZQUFvRCxvQkFBMkM7UUFDOUYsS0FBSyxFQUFFLENBQUE7UUFENEMseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUU5RixJQUFJLENBQUMsVUFBVSxFQUFFLENBQUE7SUFDbEIsQ0FBQztJQUVPLFVBQVU7UUFDakIsMkRBQTJEO1FBQzNELE1BQU0sWUFBWSxHQUFHLGVBQWUsRUFBRSxDQUFBO1FBRXRDLHNFQUFzRTtRQUN0RSxNQUFNLFNBQVMsR0FBRyxZQUFZLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO1FBRTFFLElBQUksU0FBUyxFQUFFLENBQUM7WUFDZixNQUFNLG1CQUFtQixHQUFHLENBQUMsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDLElBQUksQ0FBQTtZQUNuRSxTQUFTLENBQUMsV0FBVyxDQUFDLG1CQUFtQixDQUFDLENBQUE7WUFDMUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxDQUFDLFFBQTBCLEVBQUUsRUFBRTtnQkFDdkUsTUFBTSxNQUFNLEdBQUcsbUJBQW1CLENBQUMsbUJBQW1CLEVBQUUsUUFBUSxDQUFDLENBQUE7Z0JBQ2pFLElBQUksTUFBTSxJQUFJLE9BQU8sTUFBTSxDQUFDLE9BQU8sS0FBSyxVQUFVLEVBQUUsQ0FBQztvQkFDcEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7Z0JBQzdDLENBQUM7WUFDRixDQUFDLENBQUMsQ0FBQTtZQUNGLHVDQUF1QztZQUN2QyxJQUFJLENBQUMsU0FBUyxDQUNiLFlBQVksQ0FBQyxHQUFHLEVBQUU7Z0JBQ2pCLElBQUksbUJBQW1CLENBQUMsYUFBYSxFQUFFLENBQUM7b0JBQ3ZDLG1CQUFtQixDQUFDLGFBQWEsQ0FBQyxXQUFXLENBQUMsbUJBQW1CLENBQUMsQ0FBQTtnQkFDbkUsQ0FBQztZQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQzs7QUFqQ1csc0JBQXNCO0lBR3JCLFdBQUEscUJBQXFCLENBQUE7R0FIdEIsc0JBQXNCLENBa0NsQzs7QUFFRCw2RUFBNkU7QUFDN0UsOEJBQThCLENBQzdCLHNCQUFzQixDQUFDLEVBQUUsRUFDekIsc0JBQXNCLHVDQUV0QixDQUFBIn0=