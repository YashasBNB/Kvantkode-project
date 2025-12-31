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
import { clamp } from '../../../../base/common/numbers.js';
import { setGlobalSashSize, setGlobalHoverDelay } from '../../../../base/browser/ui/sash/sash.js';
import { Event } from '../../../../base/common/event.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
export const minSize = 1;
export const maxSize = 20; // see also https://ux.stackexchange.com/questions/39023/what-is-the-optimum-button-size-of-touch-screen-applications
let SashSettingsController = class SashSettingsController {
    constructor(configurationService, layoutService) {
        this.configurationService = configurationService;
        this.layoutService = layoutService;
        this.disposables = new DisposableStore();
        const onDidChangeSize = Event.filter(configurationService.onDidChangeConfiguration, (e) => e.affectsConfiguration('workbench.sash.size'));
        onDidChangeSize(this.onDidChangeSize, this, this.disposables);
        this.onDidChangeSize();
        const onDidChangeHoverDelay = Event.filter(configurationService.onDidChangeConfiguration, (e) => e.affectsConfiguration('workbench.sash.hoverDelay'));
        onDidChangeHoverDelay(this.onDidChangeHoverDelay, this, this.disposables);
        this.onDidChangeHoverDelay();
    }
    onDidChangeSize() {
        const configuredSize = this.configurationService.getValue('workbench.sash.size');
        const size = clamp(configuredSize, 4, 20);
        const hoverSize = clamp(configuredSize, 1, 8);
        this.layoutService.mainContainer.style.setProperty('--vscode-sash-size', size + 'px');
        this.layoutService.mainContainer.style.setProperty('--vscode-sash-hover-size', hoverSize + 'px');
        setGlobalSashSize(size);
    }
    onDidChangeHoverDelay() {
        setGlobalHoverDelay(this.configurationService.getValue('workbench.sash.hoverDelay'));
    }
    dispose() {
        this.disposables.dispose();
    }
};
SashSettingsController = __decorate([
    __param(0, IConfigurationService),
    __param(1, ILayoutService)
], SashSettingsController);
export { SashSettingsController };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2FzaC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Nhc2gvYnJvd3Nlci9zYXNoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLGVBQWUsRUFBZSxNQUFNLHNDQUFzQyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRWxHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUVyRixNQUFNLENBQUMsTUFBTSxPQUFPLEdBQUcsQ0FBQyxDQUFBO0FBQ3hCLE1BQU0sQ0FBQyxNQUFNLE9BQU8sR0FBRyxFQUFFLENBQUEsQ0FBQyxxSEFBcUg7QUFFeEksSUFBTSxzQkFBc0IsR0FBNUIsTUFBTSxzQkFBc0I7SUFHbEMsWUFDd0Isb0JBQTRELEVBQ25FLGFBQThDO1FBRHRCLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBdUI7UUFDbEQsa0JBQWEsR0FBYixhQUFhLENBQWdCO1FBSjlDLGdCQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQU1uRCxNQUFNLGVBQWUsR0FBRyxLQUFLLENBQUMsTUFBTSxDQUFDLG9CQUFvQixDQUFDLHdCQUF3QixFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FDekYsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLHFCQUFxQixDQUFDLENBQzdDLENBQUE7UUFDRCxlQUFlLENBQUMsSUFBSSxDQUFDLGVBQWUsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQzdELElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQTtRQUV0QixNQUFNLHFCQUFxQixHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsb0JBQW9CLENBQUMsd0JBQXdCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUMvRixDQUFDLENBQUMsb0JBQW9CLENBQUMsMkJBQTJCLENBQUMsQ0FDbkQsQ0FBQTtRQUNELHFCQUFxQixDQUFDLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFBO1FBQ3pFLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxDQUFBO0lBQzdCLENBQUM7SUFFTyxlQUFlO1FBQ3RCLE1BQU0sY0FBYyxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQVMscUJBQXFCLENBQUMsQ0FBQTtRQUN4RixNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsY0FBYyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUN6QyxNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsY0FBYyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUU3QyxJQUFJLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLG9CQUFvQixFQUFFLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQTtRQUNyRixJQUFJLENBQUMsYUFBYSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLDBCQUEwQixFQUFFLFNBQVMsR0FBRyxJQUFJLENBQUMsQ0FBQTtRQUNoRyxpQkFBaUIsQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUN4QixDQUFDO0lBRU8scUJBQXFCO1FBQzVCLG1CQUFtQixDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQVMsMkJBQTJCLENBQUMsQ0FBQyxDQUFBO0lBQzdGLENBQUM7SUFFRCxPQUFPO1FBQ04sSUFBSSxDQUFDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUMzQixDQUFDO0NBQ0QsQ0FBQTtBQXJDWSxzQkFBc0I7SUFJaEMsV0FBQSxxQkFBcUIsQ0FBQTtJQUNyQixXQUFBLGNBQWMsQ0FBQTtHQUxKLHNCQUFzQixDQXFDbEMifQ==