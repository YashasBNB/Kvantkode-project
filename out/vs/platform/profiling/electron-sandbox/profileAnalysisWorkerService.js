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
import { createWebWorker } from '../../../base/browser/webWorkerFactory.js';
import { registerSingleton } from '../../instantiation/common/extensions.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { ILogService } from '../../log/common/log.js';
import { reportSample } from '../common/profilingTelemetrySpec.js';
import { ITelemetryService } from '../../telemetry/common/telemetry.js';
import { FileAccess } from '../../../base/common/network.js';
export var ProfilingOutput;
(function (ProfilingOutput) {
    ProfilingOutput[ProfilingOutput["Failure"] = 0] = "Failure";
    ProfilingOutput[ProfilingOutput["Irrelevant"] = 1] = "Irrelevant";
    ProfilingOutput[ProfilingOutput["Interesting"] = 2] = "Interesting";
})(ProfilingOutput || (ProfilingOutput = {}));
export const IProfileAnalysisWorkerService = createDecorator('IProfileAnalysisWorkerService');
// ---- impl
let ProfileAnalysisWorkerService = class ProfileAnalysisWorkerService {
    constructor(_telemetryService, _logService) {
        this._telemetryService = _telemetryService;
        this._logService = _logService;
    }
    async _withWorker(callback) {
        const worker = createWebWorker(FileAccess.asBrowserUri('vs/platform/profiling/electron-sandbox/profileAnalysisWorkerMain.js'), 'CpuProfileAnalysisWorker');
        try {
            const r = await callback(worker.proxy);
            return r;
        }
        finally {
            worker.dispose();
        }
    }
    async analyseBottomUp(profile, callFrameClassifier, perfBaseline, sendAsErrorTelemtry) {
        return this._withWorker(async (worker) => {
            const result = await worker.$analyseBottomUp(profile);
            if (result.kind === 2 /* ProfilingOutput.Interesting */) {
                for (const sample of result.samples) {
                    reportSample({
                        sample,
                        perfBaseline,
                        source: callFrameClassifier(sample.url),
                    }, this._telemetryService, this._logService, sendAsErrorTelemtry);
                }
            }
            return result.kind;
        });
    }
    async analyseByLocation(profile, locations) {
        return this._withWorker(async (worker) => {
            const result = await worker.$analyseByUrlCategory(profile, locations);
            return result;
        });
    }
};
ProfileAnalysisWorkerService = __decorate([
    __param(0, ITelemetryService),
    __param(1, ILogService)
], ProfileAnalysisWorkerService);
registerSingleton(IProfileAnalysisWorkerService, ProfileAnalysisWorkerService, 1 /* InstantiationType.Delayed */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZmlsZUFuYWx5c2lzV29ya2VyU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL3Byb2ZpbGluZy9lbGVjdHJvbi1zYW5kYm94L3Byb2ZpbGVBbmFseXNpc1dvcmtlclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBRzNFLE9BQU8sRUFBcUIsaUJBQWlCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUMvRixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDN0UsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBR3JELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFNUQsTUFBTSxDQUFOLElBQWtCLGVBSWpCO0FBSkQsV0FBa0IsZUFBZTtJQUNoQywyREFBTyxDQUFBO0lBQ1AsaUVBQVUsQ0FBQTtJQUNWLG1FQUFXLENBQUE7QUFDWixDQUFDLEVBSmlCLGVBQWUsS0FBZixlQUFlLFFBSWhDO0FBTUQsTUFBTSxDQUFDLE1BQU0sNkJBQTZCLEdBQUcsZUFBZSxDQUMzRCwrQkFBK0IsQ0FDL0IsQ0FBQTtBQWdCRCxZQUFZO0FBRVosSUFBTSw0QkFBNEIsR0FBbEMsTUFBTSw0QkFBNEI7SUFHakMsWUFDcUMsaUJBQW9DLEVBQzFDLFdBQXdCO1FBRGxCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFDMUMsZ0JBQVcsR0FBWCxXQUFXLENBQWE7SUFDcEQsQ0FBQztJQUVJLEtBQUssQ0FBQyxXQUFXLENBQ3hCLFFBQWlFO1FBRWpFLE1BQU0sTUFBTSxHQUFHLGVBQWUsQ0FDN0IsVUFBVSxDQUFDLFlBQVksQ0FDdEIscUVBQXFFLENBQ3JFLEVBQ0QsMEJBQTBCLENBQzFCLENBQUE7UUFFRCxJQUFJLENBQUM7WUFDSixNQUFNLENBQUMsR0FBRyxNQUFNLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDdEMsT0FBTyxDQUFDLENBQUE7UUFDVCxDQUFDO2dCQUFTLENBQUM7WUFDVixNQUFNLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDakIsQ0FBQztJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsZUFBZSxDQUNwQixPQUFtQixFQUNuQixtQkFBeUMsRUFDekMsWUFBb0IsRUFDcEIsbUJBQTRCO1FBRTVCLE9BQU8sSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDeEMsTUFBTSxNQUFNLEdBQUcsTUFBTSxNQUFNLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDckQsSUFBSSxNQUFNLENBQUMsSUFBSSx3Q0FBZ0MsRUFBRSxDQUFDO2dCQUNqRCxLQUFLLE1BQU0sTUFBTSxJQUFJLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQztvQkFDckMsWUFBWSxDQUNYO3dCQUNDLE1BQU07d0JBQ04sWUFBWTt3QkFDWixNQUFNLEVBQUUsbUJBQW1CLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQztxQkFDdkMsRUFDRCxJQUFJLENBQUMsaUJBQWlCLEVBQ3RCLElBQUksQ0FBQyxXQUFXLEVBQ2hCLG1CQUFtQixDQUNuQixDQUFBO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBQ0QsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFBO1FBQ25CLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxpQkFBaUIsQ0FDdEIsT0FBbUIsRUFDbkIsU0FBd0M7UUFFeEMsT0FBTyxJQUFJLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUN4QyxNQUFNLE1BQU0sR0FBRyxNQUFNLE1BQU0sQ0FBQyxxQkFBcUIsQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUE7WUFDckUsT0FBTyxNQUFNLENBQUE7UUFDZCxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7Q0FDRCxDQUFBO0FBN0RLLDRCQUE0QjtJQUkvQixXQUFBLGlCQUFpQixDQUFBO0lBQ2pCLFdBQUEsV0FBVyxDQUFBO0dBTFIsNEJBQTRCLENBNkRqQztBQXdCRCxpQkFBaUIsQ0FDaEIsNkJBQTZCLEVBQzdCLDRCQUE0QixvQ0FFNUIsQ0FBQSJ9