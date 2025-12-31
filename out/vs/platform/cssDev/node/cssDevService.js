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
import { spawn } from 'child_process';
import { relative } from 'path';
import { FileAccess } from '../../../base/common/network.js';
import { StopWatch } from '../../../base/common/stopwatch.js';
import { IEnvironmentService } from '../../environment/common/environment.js';
import { createDecorator } from '../../instantiation/common/instantiation.js';
import { ILogService } from '../../log/common/log.js';
export const ICSSDevelopmentService = createDecorator('ICSSDevelopmentService');
let CSSDevelopmentService = class CSSDevelopmentService {
    constructor(envService, logService) {
        this.envService = envService;
        this.logService = logService;
    }
    get isEnabled() {
        return !this.envService.isBuilt;
    }
    getCssModules() {
        this._cssModules ??= this.computeCssModules();
        return this._cssModules;
    }
    async computeCssModules() {
        if (!this.isEnabled) {
            return [];
        }
        const rg = await import('@vscode/ripgrep');
        return await new Promise((resolve) => {
            const sw = StopWatch.create();
            const chunks = [];
            const decoder = new TextDecoder();
            const basePath = FileAccess.asFileUri('').fsPath;
            const process = spawn(rg.rgPath, ['-g', '**/*.css', '--files', '--no-ignore', basePath], {});
            process.stdout.on('data', (data) => {
                const chunk = decoder.decode(data, { stream: true });
                chunks.push(chunk.split('\n').filter(Boolean));
            });
            process.on('error', (err) => {
                this.logService.error('[CSS_DEV] FAILED to compute CSS data', err);
                resolve([]);
            });
            process.on('close', () => {
                const result = chunks
                    .flat()
                    .map((path) => relative(basePath, path).replace(/\\/g, '/'))
                    .filter(Boolean)
                    .sort();
                resolve(result);
                this.logService.info(`[CSS_DEV] DONE, ${result.length} css modules (${Math.round(sw.elapsed())}ms)`);
            });
        });
    }
};
CSSDevelopmentService = __decorate([
    __param(0, IEnvironmentService),
    __param(1, ILogService)
], CSSDevelopmentService);
export { CSSDevelopmentService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3NzRGV2U2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2Nzc0Rldi9ub2RlL2Nzc0RldlNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUNyQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sTUFBTSxDQUFBO0FBQy9CLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDN0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDN0UsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUVyRCxNQUFNLENBQUMsTUFBTSxzQkFBc0IsR0FDbEMsZUFBZSxDQUF5Qix3QkFBd0IsQ0FBQyxDQUFBO0FBUTNELElBQU0scUJBQXFCLEdBQTNCLE1BQU0scUJBQXFCO0lBS2pDLFlBQ3VDLFVBQStCLEVBQ3ZDLFVBQXVCO1FBRGYsZUFBVSxHQUFWLFVBQVUsQ0FBcUI7UUFDdkMsZUFBVSxHQUFWLFVBQVUsQ0FBYTtJQUNuRCxDQUFDO0lBRUosSUFBSSxTQUFTO1FBQ1osT0FBTyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFBO0lBQ2hDLENBQUM7SUFFRCxhQUFhO1FBQ1osSUFBSSxDQUFDLFdBQVcsS0FBSyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQTtRQUM3QyxPQUFPLElBQUksQ0FBQyxXQUFXLENBQUE7SUFDeEIsQ0FBQztJQUVPLEtBQUssQ0FBQyxpQkFBaUI7UUFDOUIsSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztZQUNyQixPQUFPLEVBQUUsQ0FBQTtRQUNWLENBQUM7UUFFRCxNQUFNLEVBQUUsR0FBRyxNQUFNLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBQzFDLE9BQU8sTUFBTSxJQUFJLE9BQU8sQ0FBVyxDQUFDLE9BQU8sRUFBRSxFQUFFO1lBQzlDLE1BQU0sRUFBRSxHQUFHLFNBQVMsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtZQUU3QixNQUFNLE1BQU0sR0FBZSxFQUFFLENBQUE7WUFDN0IsTUFBTSxPQUFPLEdBQUcsSUFBSSxXQUFXLEVBQUUsQ0FBQTtZQUNqQyxNQUFNLFFBQVEsR0FBRyxVQUFVLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQTtZQUNoRCxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLElBQUksRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFLGFBQWEsRUFBRSxRQUFRLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUU1RixPQUFPLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxJQUFJLEVBQUUsRUFBRTtnQkFDbEMsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtnQkFDcEQsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO1lBQy9DLENBQUMsQ0FBQyxDQUFBO1lBQ0YsT0FBTyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRTtnQkFDM0IsSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsc0NBQXNDLEVBQUUsR0FBRyxDQUFDLENBQUE7Z0JBQ2xFLE9BQU8sQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUNaLENBQUMsQ0FBQyxDQUFBO1lBQ0YsT0FBTyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFO2dCQUN4QixNQUFNLE1BQU0sR0FBRyxNQUFNO3FCQUNuQixJQUFJLEVBQUU7cUJBQ04sR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUM7cUJBQzNELE1BQU0sQ0FBQyxPQUFPLENBQUM7cUJBQ2YsSUFBSSxFQUFFLENBQUE7Z0JBQ1IsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFBO2dCQUNmLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUNuQixtQkFBbUIsTUFBTSxDQUFDLE1BQU0saUJBQWlCLElBQUksQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLEtBQUssQ0FDOUUsQ0FBQTtZQUNGLENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0NBQ0QsQ0FBQTtBQXREWSxxQkFBcUI7SUFNL0IsV0FBQSxtQkFBbUIsQ0FBQTtJQUNuQixXQUFBLFdBQVcsQ0FBQTtHQVBELHFCQUFxQixDQXNEakMifQ==