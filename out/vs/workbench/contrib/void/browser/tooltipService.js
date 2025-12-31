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
import { mountVoidTooltip } from './react/out/void-tooltip/index.js';
import { h, getActiveWindow } from '../../../../base/browser/dom.js';
// Tooltip contribution that mounts the component at startup
let TooltipContribution = class TooltipContribution extends Disposable {
    static { this.ID = 'workbench.contrib.voidTooltip'; }
    constructor(instantiationService) {
        super();
        this.instantiationService = instantiationService;
        this.initializeTooltip();
    }
    initializeTooltip() {
        // Get the active window reference for multi-window support
        const targetWindow = getActiveWindow();
        // Find the monaco-workbench element using the proper window reference
        const workbench = targetWindow.document.querySelector('.monaco-workbench');
        if (workbench) {
            // Create a container element for the tooltip using h function
            const tooltipContainer = h('div.void-tooltip-container').root;
            workbench.appendChild(tooltipContainer);
            // Mount the React component
            this.instantiationService.invokeFunction((accessor) => {
                const result = mountVoidTooltip(tooltipContainer, accessor);
                if (result && typeof result.dispose === 'function') {
                    this._register(toDisposable(result.dispose));
                }
            });
            // Register cleanup for the DOM element
            this._register(toDisposable(() => {
                if (tooltipContainer.parentElement) {
                    tooltipContainer.parentElement.removeChild(tooltipContainer);
                }
            }));
        }
    }
};
TooltipContribution = __decorate([
    __param(0, IInstantiationService)
], TooltipContribution);
export { TooltipContribution };
// Register the contribution to be initialized during the AfterRestored phase
registerWorkbenchContribution2(TooltipContribution.ID, TooltipContribution, 3 /* WorkbenchPhase.AfterRestored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9vbHRpcFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2Jyb3dzZXIvdG9vbHRpcFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OzswRkFHMEY7Ozs7Ozs7Ozs7QUFFMUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBRU4sOEJBQThCLEdBRTlCLE1BQU0sa0NBQWtDLENBQUE7QUFFekMsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDcEUsT0FBTyxFQUFFLENBQUMsRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUVwRSw0REFBNEQ7QUFDckQsSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBb0IsU0FBUSxVQUFVO2FBQ2xDLE9BQUUsR0FBRywrQkFBK0IsQUFBbEMsQ0FBa0M7SUFFcEQsWUFBb0Qsb0JBQTJDO1FBQzlGLEtBQUssRUFBRSxDQUFBO1FBRDRDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFFOUYsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUE7SUFDekIsQ0FBQztJQUVPLGlCQUFpQjtRQUN4QiwyREFBMkQ7UUFDM0QsTUFBTSxZQUFZLEdBQUcsZUFBZSxFQUFFLENBQUE7UUFFdEMsc0VBQXNFO1FBQ3RFLE1BQU0sU0FBUyxHQUFHLFlBQVksQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLG1CQUFtQixDQUFDLENBQUE7UUFFMUUsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNmLDhEQUE4RDtZQUM5RCxNQUFNLGdCQUFnQixHQUFHLENBQUMsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLElBQUksQ0FBQTtZQUM3RCxTQUFTLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQUE7WUFFdkMsNEJBQTRCO1lBQzVCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsQ0FBQyxRQUEwQixFQUFFLEVBQUU7Z0JBQ3ZFLE1BQU0sTUFBTSxHQUFHLGdCQUFnQixDQUFDLGdCQUFnQixFQUFFLFFBQVEsQ0FBQyxDQUFBO2dCQUMzRCxJQUFJLE1BQU0sSUFBSSxPQUFPLE1BQU0sQ0FBQyxPQUFPLEtBQUssVUFBVSxFQUFFLENBQUM7b0JBQ3BELElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO2dCQUM3QyxDQUFDO1lBQ0YsQ0FBQyxDQUFDLENBQUE7WUFFRix1Q0FBdUM7WUFDdkMsSUFBSSxDQUFDLFNBQVMsQ0FDYixZQUFZLENBQUMsR0FBRyxFQUFFO2dCQUNqQixJQUFJLGdCQUFnQixDQUFDLGFBQWEsRUFBRSxDQUFDO29CQUNwQyxnQkFBZ0IsQ0FBQyxhQUFhLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQUE7Z0JBQzdELENBQUM7WUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBQ0YsQ0FBQztJQUNGLENBQUM7O0FBckNXLG1CQUFtQjtJQUdsQixXQUFBLHFCQUFxQixDQUFBO0dBSHRCLG1CQUFtQixDQXNDL0I7O0FBRUQsNkVBQTZFO0FBQzdFLDhCQUE4QixDQUM3QixtQkFBbUIsQ0FBQyxFQUFFLEVBQ3RCLG1CQUFtQix1Q0FFbkIsQ0FBQSJ9