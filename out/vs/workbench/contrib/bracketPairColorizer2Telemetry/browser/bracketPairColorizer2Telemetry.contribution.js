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
import { onUnexpectedError } from '../../../../base/common/errors.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { Extensions as WorkbenchExtensions, } from '../../../common/contributions.js';
import { IExtensionsWorkbenchService } from '../../extensions/common/extensions.js';
let BracketPairColorizer2TelemetryContribution = class BracketPairColorizer2TelemetryContribution {
    constructor(configurationService, extensionsWorkbenchService, telemetryService) {
        this.configurationService = configurationService;
        this.extensionsWorkbenchService = extensionsWorkbenchService;
        this.telemetryService = telemetryService;
        this.init().catch(onUnexpectedError);
    }
    async init() {
        const bracketPairColorizerId = 'coenraads.bracket-pair-colorizer-2';
        await this.extensionsWorkbenchService.queryLocal();
        const extension = this.extensionsWorkbenchService.installed.find((e) => e.identifier.id === bracketPairColorizerId);
        if (!extension ||
            (extension.enablementState !== 11 /* EnablementState.EnabledGlobally */ &&
                extension.enablementState !== 12 /* EnablementState.EnabledWorkspace */)) {
            return;
        }
        const nativeBracketPairColorizationEnabledKey = 'editor.bracketPairColorization.enabled';
        const nativeColorizationEnabled = !!this.configurationService.getValue(nativeBracketPairColorizationEnabledKey);
        this.telemetryService.publicLog2('bracketPairColorizerTwoUsage', {
            nativeColorizationEnabled,
        });
    }
};
BracketPairColorizer2TelemetryContribution = __decorate([
    __param(0, IConfigurationService),
    __param(1, IExtensionsWorkbenchService),
    __param(2, ITelemetryService)
], BracketPairColorizer2TelemetryContribution);
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(BracketPairColorizer2TelemetryContribution, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJhY2tldFBhaXJDb2xvcml6ZXIyVGVsZW1ldHJ5LmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2JyYWNrZXRQYWlyQ29sb3JpemVyMlRlbGVtZXRyeS9icm93c2VyL2JyYWNrZXRQYWlyQ29sb3JpemVyMlRlbGVtZXRyeS5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDckUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQzNFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFDTixVQUFVLElBQUksbUJBQW1CLEdBRWpDLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUFFLDJCQUEyQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFJbkYsSUFBTSwwQ0FBMEMsR0FBaEQsTUFBTSwwQ0FBMEM7SUFDL0MsWUFDeUMsb0JBQTJDLEVBRWxFLDBCQUF1RCxFQUNwQyxnQkFBbUM7UUFIL0IseUJBQW9CLEdBQXBCLG9CQUFvQixDQUF1QjtRQUVsRSwrQkFBMEIsR0FBMUIsMEJBQTBCLENBQTZCO1FBQ3BDLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBbUI7UUFFdkUsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO0lBQ3JDLENBQUM7SUFFTyxLQUFLLENBQUMsSUFBSTtRQUNqQixNQUFNLHNCQUFzQixHQUFHLG9DQUFvQyxDQUFBO1FBRW5FLE1BQU0sSUFBSSxDQUFDLDBCQUEwQixDQUFDLFVBQVUsRUFBRSxDQUFBO1FBQ2xELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQywwQkFBMEIsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUMvRCxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEtBQUssc0JBQXNCLENBQ2pELENBQUE7UUFDRCxJQUNDLENBQUMsU0FBUztZQUNWLENBQUMsU0FBUyxDQUFDLGVBQWUsNkNBQW9DO2dCQUM3RCxTQUFTLENBQUMsZUFBZSw4Q0FBcUMsQ0FBQyxFQUMvRCxDQUFDO1lBQ0YsT0FBTTtRQUNQLENBQUM7UUFFRCxNQUFNLHVDQUF1QyxHQUFHLHdDQUF3QyxDQUFBO1FBQ3hGLE1BQU0seUJBQXlCLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxRQUFRLENBQ3JFLHVDQUF1QyxDQUN2QyxDQUFBO1FBY0QsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FHOUIsOEJBQThCLEVBQUU7WUFDakMseUJBQXlCO1NBQ3pCLENBQUMsQ0FBQTtJQUNILENBQUM7Q0FDRCxDQUFBO0FBakRLLDBDQUEwQztJQUU3QyxXQUFBLHFCQUFxQixDQUFBO0lBQ3JCLFdBQUEsMkJBQTJCLENBQUE7SUFFM0IsV0FBQSxpQkFBaUIsQ0FBQTtHQUxkLDBDQUEwQyxDQWlEL0M7QUFFRCxRQUFRLENBQUMsRUFBRSxDQUNWLG1CQUFtQixDQUFDLFNBQVMsQ0FDN0IsQ0FBQyw2QkFBNkIsQ0FBQywwQ0FBMEMsa0NBQTBCLENBQUEifQ==