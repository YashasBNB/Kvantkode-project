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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWNjZXNzaWJpbGl0eVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9hY2Nlc3NpYmlsaXR5L2VsZWN0cm9uLXNhbmRib3gvYWNjZXNzaWJpbGl0eVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUNOLHFCQUFxQixHQUVyQixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDeEUsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDN0csT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDekYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sb0VBQW9FLENBQUE7QUFDekcsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQy9FLE9BQU8sRUFHTiw4QkFBOEIsR0FDOUIsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFlOUUsSUFBTSwwQkFBMEIsR0FBaEMsTUFBTSwwQkFDWixTQUFRLG9CQUFvQjtJQU01QixZQUNxQyxrQkFBc0QsRUFDdEUsaUJBQXFDLEVBQ2xDLG9CQUEyQyxFQUNsRCxjQUE4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