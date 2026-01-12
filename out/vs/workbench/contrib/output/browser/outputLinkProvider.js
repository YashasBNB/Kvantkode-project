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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0cHV0TGlua1Byb3ZpZGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9vdXRwdXQvYnJvd3Nlci9vdXRwdXRMaW5rUHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUUzRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUM3RixPQUFPLEVBQUUsY0FBYyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBRXZGLE9BQU8sRUFBZSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDdkYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDakcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBRTlFLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLHdFQUF3RSxDQUFBO0FBQ2xILE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUV4RCxJQUFNLGtCQUFrQixHQUF4QixNQUFNLGtCQUFtQixTQUFRLFVBQVU7O2FBQ3pCLHdCQUFtQixHQUFHLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxBQUFoQixDQUFnQixHQUFDLCtDQUErQztJQU0zRyxZQUM0QyxjQUF3QyxFQUNuRCxZQUEyQixFQUNoQix1QkFBaUQ7UUFFNUYsS0FBSyxFQUFFLENBQUE7UUFKb0MsbUJBQWMsR0FBZCxjQUFjLENBQTBCO1FBQ25ELGlCQUFZLEdBQVosWUFBWSxDQUFlO1FBQ2hCLDRCQUF1QixHQUF2Qix1QkFB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