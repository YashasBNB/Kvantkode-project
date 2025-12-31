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
import { Extensions as WorkbenchExtensions, } from '../../../common/contributions.js';
import { IMarkerService, MarkerSeverity, } from '../../../../platform/markers/common/markers.js';
import { IDecorationsService, } from '../../../services/decorations/common/decorations.js';
import { dispose } from '../../../../base/common/lifecycle.js';
import { localize } from '../../../../nls.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { listErrorForeground, listWarningForeground, } from '../../../../platform/theme/common/colorRegistry.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { Extensions as ConfigurationExtensions, } from '../../../../platform/configuration/common/configurationRegistry.js';
class MarkersDecorationsProvider {
    constructor(_markerService) {
        this._markerService = _markerService;
        this.label = localize('label', 'Problems');
        this.onDidChange = _markerService.onMarkerChanged;
    }
    provideDecorations(resource) {
        const markers = this._markerService.read({
            resource,
            severities: MarkerSeverity.Error | MarkerSeverity.Warning,
        });
        let first;
        for (const marker of markers) {
            if (!first || marker.severity > first.severity) {
                first = marker;
            }
        }
        if (!first) {
            return undefined;
        }
        return {
            weight: 100 * first.severity,
            bubble: true,
            tooltip: markers.length === 1
                ? localize('tooltip.1', '1 problem in this file')
                : localize('tooltip.N', '{0} problems in this file', markers.length),
            letter: markers.length < 10 ? markers.length.toString() : '9+',
            color: first.severity === MarkerSeverity.Error ? listErrorForeground : listWarningForeground,
        };
    }
}
let MarkersFileDecorations = class MarkersFileDecorations {
    constructor(_markerService, _decorationsService, _configurationService) {
        this._markerService = _markerService;
        this._decorationsService = _decorationsService;
        this._configurationService = _configurationService;
        this._disposables = [
            this._configurationService.onDidChangeConfiguration((e) => {
                if (e.affectsConfiguration('problems.visibility')) {
                    this._updateEnablement();
                }
            }),
        ];
        this._updateEnablement();
    }
    dispose() {
        dispose(this._provider);
        dispose(this._disposables);
    }
    _updateEnablement() {
        const problem = this._configurationService.getValue('problems.visibility');
        if (problem === undefined) {
            return;
        }
        const value = this._configurationService.getValue('problems');
        const shouldEnable = problem && value.decorations.enabled;
        if (shouldEnable === this._enabled) {
            if (!problem || !value.decorations.enabled) {
                this._provider?.dispose();
                this._provider = undefined;
            }
            return;
        }
        this._enabled = shouldEnable;
        if (this._enabled) {
            const provider = new MarkersDecorationsProvider(this._markerService);
            this._provider = this._decorationsService.registerDecorationsProvider(provider);
        }
        else if (this._provider) {
            this._provider.dispose();
        }
    }
};
MarkersFileDecorations = __decorate([
    __param(0, IMarkerService),
    __param(1, IDecorationsService),
    __param(2, IConfigurationService)
], MarkersFileDecorations);
Registry.as(ConfigurationExtensions.Configuration).registerConfiguration({
    id: 'problems',
    order: 101,
    type: 'object',
    properties: {
        'problems.decorations.enabled': {
            markdownDescription: localize('markers.showOnFile', 'Show Errors & Warnings on files and folder. Overwritten by {0} when it is off.', '`#problems.visibility#`'),
            type: 'boolean',
            default: true,
        },
    },
});
// register file decorations
Registry.as(WorkbenchExtensions.Workbench).registerWorkbenchContribution(MarkersFileDecorations, 3 /* LifecyclePhase.Restored */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFya2Vyc0ZpbGVEZWNvcmF0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL21hcmtlcnMvYnJvd3Nlci9tYXJrZXJzRmlsZURlY29yYXRpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFHTixVQUFVLElBQUksbUJBQW1CLEdBQ2pDLE1BQU0sa0NBQWtDLENBQUE7QUFDekMsT0FBTyxFQUNOLGNBQWMsRUFFZCxjQUFjLEdBQ2QsTUFBTSxnREFBZ0QsQ0FBQTtBQUN2RCxPQUFPLEVBQ04sbUJBQW1CLEdBR25CLE1BQU0scURBQXFELENBQUE7QUFDNUQsT0FBTyxFQUFlLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRzNFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDM0UsT0FBTyxFQUNOLG1CQUFtQixFQUNuQixxQkFBcUIsR0FDckIsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBRU4sVUFBVSxJQUFJLHVCQUF1QixHQUNyQyxNQUFNLG9FQUFvRSxDQUFBO0FBRzNFLE1BQU0sMEJBQTBCO0lBSS9CLFlBQTZCLGNBQThCO1FBQTlCLG1CQUFjLEdBQWQsY0FBYyxDQUFnQjtRQUhsRCxVQUFLLEdBQVcsUUFBUSxDQUFDLE9BQU8sRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUlyRCxJQUFJLENBQUMsV0FBVyxHQUFHLGNBQWMsQ0FBQyxlQUFlLENBQUE7SUFDbEQsQ0FBQztJQUVELGtCQUFrQixDQUFDLFFBQWE7UUFDL0IsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFD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