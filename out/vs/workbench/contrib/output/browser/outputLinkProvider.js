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
var OutputLinkProvider_1;
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { IWorkspaceContextService } from '../../../../platform/workspace/common/workspace.js';
import { OUTPUT_MODE_ID, LOG_MODE_ID } from '../../../services/output/common/output.js';
import { dispose, Disposable } from '../../../../base/common/lifecycle.js';
import { ILanguageFeaturesService } from '../../../../editor/common/services/languageFeatures.js';
import { createWebWorker } from '../../../../base/browser/webWorkerFactory.js';
import { WorkerTextModelSyncClient } from '../../../../editor/common/services/textModelSync/textModelSync.impl.js';
import { FileAccess } from '../../../../base/common/network.js';
let OutputLinkProvider = class OutputLinkProvider extends Disposable {
    static { OutputLinkProvider_1 = this; }
    static { this.DISPOSE_WORKER_TIME = 3 * 60 * 1000; } // dispose worker after 3 minutes of inactivity
    constructor(contextService, modelService, languageFeaturesService) {
        super();
        this.contextService = contextService;
        this.modelService = modelService;
        this.languageFeaturesService = languageFeaturesService;
        this.disposeWorkerScheduler = new RunOnceScheduler(() => this.disposeWorker(), OutputLinkProvider_1.DISPOSE_WORKER_TIME);
        this.registerListeners();
        this.updateLinkProviderWorker();
    }
    registerListeners() {
        this._register(this.contextService.onDidChangeWorkspaceFolders(() => this.updateLinkProviderWorker()));
    }
    updateLinkProviderWorker() {
        // Setup link provider depending on folders being opened or not
        const folders = this.contextService.getWorkspace().folders;
        if (folders.length > 0) {
            if (!this.linkProviderRegistration) {
                this.linkProviderRegistration = this.languageFeaturesService.linkProvider.register([
                    { language: OUTPUT_MODE_ID, scheme: '*' },
                    { language: LOG_MODE_ID, scheme: '*' },
                ], {
                    provideLinks: async (model) => {
                        const links = await this.provideLinks(model.uri);
                        return links && { links };
                    },
                });
            }
        }
        else {
            dispose(this.linkProviderRegistration);
            this.linkProviderRegistration = undefined;
        }
        // Dispose worker to recreate with folders on next provideLinks request
        this.disposeWorker();
        this.disposeWorkerScheduler.cancel();
    }
    getOrCreateWorker() {
        this.disposeWorkerScheduler.schedule();
        if (!this.worker) {
            this.worker = new OutputLinkWorkerClient(this.contextService, this.modelService);
        }
        return this.worker;
    }
    async provideLinks(modelUri) {
        return this.getOrCreateWorker().provideLinks(modelUri);
    }
    disposeWorker() {
        if (this.worker) {
            this.worker.dispose();
            this.worker = undefined;
        }
    }
};
OutputLinkProvider = OutputLinkProvider_1 = __decorate([
    __param(0, IWorkspaceContextService),
    __param(1, IModelService),
    __param(2, ILanguageFeaturesService)
], OutputLinkProvider);
export { OutputLinkProvider };
let OutputLinkWorkerClient = class OutputLinkWorkerClient extends Disposable {
    constructor(contextService, modelService) {
        super();
        this.contextService = contextService;
        this._workerClient = this._register(createWebWorker(FileAccess.asBrowserUri('vs/workbench/contrib/output/common/outputLinkComputerMain.js'), 'OutputLinkDetectionWorker'));
        this._workerTextModelSyncClient = WorkerTextModelSyncClient.create(this._workerClient, modelService);
        this._initializeBarrier = this._ensureWorkspaceFolders();
    }
    async _ensureWorkspaceFolders() {
        await this._workerClient.proxy.$setWorkspaceFolders(this.contextService.getWorkspace().folders.map((folder) => folder.uri.toString()));
    }
    async provideLinks(modelUri) {
        await this._initializeBarrier;
        await this._workerTextModelSyncClient.ensureSyncedResources([modelUri]);
        return this._workerClient.proxy.$computeLinks(modelUri.toString());
    }
};
OutputLinkWorkerClient = __decorate([
    __param(0, IWorkspaceContextService),
    __param(1, IModelService)
], OutputLinkWorkerClient);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0cHV0TGlua1Byb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvb3V0cHV0L2Jyb3dzZXIvb3V0cHV0TGlua1Byb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUdoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFFM0UsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDN0YsT0FBTyxFQUFFLGNBQWMsRUFBRSxXQUFXLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUV2RixPQUFPLEVBQWUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQ2pHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUU5RSxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSx3RUFBd0UsQ0FBQTtBQUNsSCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFeEQsSUFBTSxrQkFBa0IsR0FBeEIsTUFBTSxrQkFBbUIsU0FBUSxVQUFVOzthQUN6Qix3QkFBbUIsR0FBRyxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQUFBaEIsQ0FBZ0IsR0FBQywrQ0FBK0M7SUFNM0csWUFDNEMsY0FBd0MsRUFDbkQsWUFBMkIsRUFDaEIsdUJBQWlEO1FBRTVGLEtBQUssRUFBRSxDQUFBO1FBSm9DLG1CQUFjLEdBQWQsY0FBYyxDQUEwQjtRQUNuRCxpQkFBWSxHQUFaLFlBQVksQ0FBZTtRQUNoQiw0QkFBdUIsR0FBdkIsdUJBQXVCLENB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