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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJhY2tldFBhaXJDb2xvcml6ZXIyVGVsZW1ldHJ5LmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYnJhY2tldFBhaXJDb2xvcml6ZXIyVGVsZW1ldHJ5L2Jyb3dzZXIvYnJhY2tldFBhaXJDb2xvcml6ZXIyVGVsZW1ldHJ5LmNvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUNyRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdEYsT0FBTyxFQUNOLFVBQVUsSUFBSSxtQkFBbUIsR0FFakMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUluRixJQUFNLDBDQUEwQyxHQUFoRCxNQUFNLDBDQUEwQztJQUMvQyxZQUN5QyxvQkFBMkMsRUFFbEUsMEJBQXVELEVBQ3BDLGdCQUFtQztRQUgvQix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQXVCO1FBRWxFLCtCQUEwQixHQUExQiwwQkFBMEIsQ0FBNkI7UUFDcEMscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFtQjtRQUV2RSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUE7SUFDckMsQ0FBQztJQUVPLEtBQUssQ0FBQyxJQUFJO1FBQ2pCLE1BQU0sc0JBQXNCLEdBQUcsb0NBQW9DLENBQUE7UUFFbkUsTUFBTSxJQUFJLENBQUMsMEJBQTBCLENBQUMsVUFBVSxFQUFFLENBQUE7UUFDbEQsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQy9ELENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEVBQUUsS0FBSyxzQkFBc0IsQ0FDakQsQ0FBQTtRQUNELElBQ0MsQ0FBQyxTQUFTO1lBQ1YsQ0FBQyxTQUFTLENBQUMsZUFBZSw2Q0FBb0M7Z0JBQzdELFNBQVMsQ0FBQyxlQUFlLDhDQUFxQyxDQUFDLEVBQy9ELENBQUM7WUFDRixPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sdUNBQXVDLEdBQUcsd0NBQXdDLENBQUE7UUFDeEYsTUFBTSx5QkFBeUIsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFFBQVEsQ0FDckUsdUNBQXVDLENBQ3ZDLENBQUE7UUFjRCxJQUFJLENBQUMsZ0JBQWdCLENBQUMsVUFBVSxDQUc5Qiw4QkFBOEIsRUFBRTtZQUNqQyx5QkFBeUI7U0FDekIsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztDQUNELENBQUE7QUFqREssMENBQTBDO0lBRTdDLFdBQUEscUJBQXFCLENBQUE7SUFDckIsV0FBQSwyQkFBMkIsQ0FBQTtJQUUzQixXQUFBLGlCQUFpQixDQUFBO0dBTGQsMENBQTBDLENBaUQvQztBQUVELFFBQVEsQ0FBQyxFQUFFLENBQ1YsbUJBQW1CLENBQUMsU0FBUyxDQUM3QixDQUFDLDZCQUE2QixDQUFDLDBDQUEwQyxrQ0FBMEIsQ0FBQSJ9