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
import { timeout } from '../../../../base/common/async.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { joinPath } from '../../../../base/common/resources.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { IProfileAnalysisWorkerService, } from '../../../../platform/profiling/electron-sandbox/profileAnalysisWorkerService.js';
import { INativeWorkbenchEnvironmentService } from '../../../services/environment/electron-sandbox/environmentService.js';
import { parseExtensionDevOptions } from '../../../services/extensions/common/extensionDevOptions.js';
import { ITimerService } from '../../../services/timer/browser/timerService.js';
let RendererProfiling = class RendererProfiling {
    constructor(_environmentService, _fileService, _logService, nativeHostService, timerService, configService, profileAnalysisService) {
        this._environmentService = _environmentService;
        this._fileService = _fileService;
        this._logService = _logService;
        const devOpts = parseExtensionDevOptions(_environmentService);
        if (devOpts.isExtensionDevTestFromCli) {
            // disabled when running extension tests
            return;
        }
        timerService.perfBaseline.then((perfBaseline) => {
            ;
            (_environmentService.isBuilt ? _logService.info : _logService.trace).apply(_logService, [
                `[perf] Render performance baseline is ${perfBaseline}ms`,
            ]);
            if (perfBaseline < 0) {
                // too slow
                return;
            }
            // SLOW threshold
            const slowThreshold = perfBaseline * 10; // ~10 frames at 64fps on MY machine
            const obs = new PerformanceObserver(async (list) => {
                obs.takeRecords();
                const maxDuration = list
                    .getEntries()
                    .map((e) => e.duration)
                    .reduce((p, c) => Math.max(p, c), 0);
                if (maxDuration < slowThreshold) {
                    return;
                }
                if (!configService.getValue('application.experimental.rendererProfiling')) {
                    _logService.debug(`[perf] SLOW task detected (${maxDuration}ms) but renderer profiling is disabled via 'application.experimental.rendererProfiling'`);
                    return;
                }
                const sessionId = generateUuid();
                _logService.warn(`[perf] Renderer reported VERY LONG TASK (${maxDuration}ms), starting profiling session '${sessionId}'`);
                // pause observation, we'll take a detailed look
                obs.disconnect();
                // profile renderer for 5secs, analyse, and take action depending on the result
                for (let i = 0; i < 3; i++) {
                    try {
                        const profile = await nativeHostService.profileRenderer(sessionId, 5000);
                        const output = await profileAnalysisService.analyseBottomUp(profile, (_url) => '<<renderer>>', perfBaseline, true);
                        if (output === 2 /* ProfilingOutput.Interesting */) {
                            this._store(profile, sessionId);
                            break;
                        }
                        timeout(15000); // wait 15s
                    }
                    catch (err) {
                        _logService.error(err);
                        break;
                    }
                }
                // reconnect the observer
                obs.observe({ entryTypes: ['longtask'] });
            });
            obs.observe({ entryTypes: ['longtask'] });
            this._observer = obs;
        });
    }
    dispose() {
        this._observer?.disconnect();
    }
    async _store(profile, sessionId) {
        const path = joinPath(this._environmentService.tmpDir, `renderer-${Math.random().toString(16).slice(2, 8)}.cpuprofile.json`);
        await this._fileService.writeFile(path, VSBuffer.fromString(JSON.stringify(profile)));
        this._logService.info(`[perf] stored profile to DISK '${path}'`, sessionId);
    }
};
RendererProfiling = __decorate([
    __param(0, INativeWorkbenchEnvironmentService),
    __param(1, IFileService),
    __param(2, ILogService),
    __param(3, INativeHostService),
    __param(4, ITimerService),
    __param(5, IConfigurationService),
    __param(6, IProfileAnalysisWorkerService)
], RendererProfiling);
export { RendererProfiling };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVuZGVyZXJBdXRvUHJvZmlsZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9wZXJmb3JtYW5jZS9lbGVjdHJvbi1zYW5kYm94L3JlbmRlcmVyQXV0b1Byb2ZpbGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDekUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBRWpGLE9BQU8sRUFDTiw2QkFBNkIsR0FFN0IsTUFBTSxpRkFBaUYsQ0FBQTtBQUN4RixPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQTtBQUN6SCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0saURBQWlELENBQUE7QUFFeEUsSUFBTSxpQkFBaUIsR0FBdkIsTUFBTSxpQkFBaUI7SUFHN0IsWUFFa0IsbUJBQXVELEVBQ3pDLFlBQTBCLEVBQzNCLFdBQXdCLEVBQ2xDLGlCQUFxQyxFQUMxQyxZQUEyQixFQUNuQixhQUFvQyxFQUM1QixzQkFBcUQ7UUFO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