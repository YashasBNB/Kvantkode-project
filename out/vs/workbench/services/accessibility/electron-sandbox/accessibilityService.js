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
import { IAccessibilityService, } from '../../../../platform/accessibility/common/accessibility.js';
import { isWindows, isLinux } from '../../../../base/common/platform.js';
import { INativeWorkbenchEnvironmentService } from '../../environment/electron-sandbox/environmentService.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { AccessibilityService } from '../../../../platform/accessibility/browser/accessibilityService.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IJSONEditingService } from '../../configuration/common/jsonEditing.js';
import { registerWorkbenchContribution2, } from '../../../common/contributions.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { ILayoutService } from '../../../../platform/layout/browser/layoutService.js';
let NativeAccessibilityService = class NativeAccessibilityService extends AccessibilityService {
    constructor(environmentService, contextKeyService, configurationService, _layoutService, _telemetryService, nativeHostService) {
        super(contextKeyService, _layoutService, configurationService);
        this._telemetryService = _telemetryService;
        this.nativeHostService = nativeHostService;
        this.didSendTelemetry = false;
        this.shouldAlwaysUnderlineAccessKeys = undefined;
        this.setAccessibilitySupport(environmentService.window.accessibilitySupport
            ? 2 /* AccessibilitySupport.Enabled */
            : 1 /* AccessibilitySupport.Disabled */);
    }
    async alwaysUnderlineAccessKeys() {
        if (!isWindows) {
            return false;
        }
        if (typeof this.shouldAlwaysUnderlineAccessKeys !== 'boolean') {
            const windowsKeyboardAccessibility = await this.nativeHostService.windowsGetStringRegKey('HKEY_CURRENT_USER', 'Control Panel\\Accessibility\\Keyboard Preference', 'On');
            this.shouldAlwaysUnderlineAccessKeys = windowsKeyboardAccessibility === '1';
        }
        return this.shouldAlwaysUnderlineAccessKeys;
    }
    setAccessibilitySupport(accessibilitySupport) {
        super.setAccessibilitySupport(accessibilitySupport);
        if (!this.didSendTelemetry && accessibilitySupport === 2 /* AccessibilitySupport.Enabled */) {
            this._telemetryService.publicLog2('accessibility', { enabled: true });
            this.didSendTelemetry = true;
        }
    }
};
NativeAccessibilityService = __decorate([
    __param(0, INativeWorkbenchEnvironmentService),
    __param(1, IContextKeyService),
    __param(2, IConfigurationService),
    __param(3, ILayoutService),
    __param(4, ITelemetryService),
    __param(5, INativeHostService)
], NativeAccessibilityService);
export { NativeAccessibilityService };
registerSingleton(IAccessibilityService, NativeAccessibilityService, 1 /* InstantiationType.Delayed */);
// On linux we do not automatically detect that a screen reader is detected, thus we have to implicitly notify the renderer to enable accessibility when user configures it in settings
let LinuxAccessibilityContribution = class LinuxAccessibilityContribution {
    static { this.ID = 'workbench.contrib.linuxAccessibility'; }
    constructor(jsonEditingService, accessibilityService, environmentService) {
        const forceRendererAccessibility = () => {
            if (accessibilityService.isScreenReaderOptimized()) {
                jsonEditingService.write(environmentService.argvResource, [{ path: ['force-renderer-accessibility'], value: true }], true);
            }
        };
        forceRendererAccessibility();
        accessibilityService.onDidChangeScreenReaderOptimized(forceRendererAccessibility);
    }
};
LinuxAccessibilityContribution = __decorate([
    __param(0, IJSONEditingService),
    __param(1, IAccessibilityService),
    __param(2, INativeWorkbenchEnvironmentService)
], LinuxAccessibilityContribution);
if (isLinux) {
    registerWorkbenchContribution2(LinuxAccessibilityContribution.ID, LinuxAccessibilityContribution, 2 /* WorkbenchPhase.BlockRestore */);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJpbGl0eVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvYWNjZXNzaWJpbGl0eS9lbGVjdHJvbi1zYW5kYm94L2FjY2Vzc2liaWxpdHlTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFDTixxQkFBcUIsR0FFckIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxrQ0FBa0MsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzdHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLG9FQUFvRSxDQUFBO0FBQ3pHLE9BQU8sRUFFTixpQkFBaUIsR0FDakIsTUFBTSx5REFBeUQsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN0RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMvRSxPQUFPLEVBR04sOEJBQThCLEdBQzlCLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDakYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBZTlFLElBQU0sMEJBQTBCLEdBQWhDLE1BQU0sMEJBQ1osU0FBUSxvQkFBb0I7SUFNNUIsWUFDcUMsa0JBQXNELEVBQ3RFLGlCQUFxQyxFQUNsQyxvQkFBMkMsRUFDbEQsY0FBOEIsRUFD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