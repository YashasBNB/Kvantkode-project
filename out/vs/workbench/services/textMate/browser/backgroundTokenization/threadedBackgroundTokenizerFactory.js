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
var ThreadedBackgroundTokenizerFactory_1;
import { canASAR } from '../../../../../amdX.js';
import { DisposableStore, toDisposable } from '../../../../../base/common/lifecycle.js';
import { FileAccess, nodeModulesAsarPath, nodeModulesPath, } from '../../../../../base/common/network.js';
import { isWeb } from '../../../../../base/common/platform.js';
import { URI } from '../../../../../base/common/uri.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IEnvironmentService } from '../../../../../platform/environment/common/environment.js';
import { IExtensionResourceLoaderService } from '../../../../../platform/extensionResourceLoader/common/extensionResourceLoader.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { ITelemetryService } from '../../../../../platform/telemetry/common/telemetry.js';
import { TextMateWorkerHost } from './worker/textMateWorkerHost.js';
import { TextMateWorkerTokenizerController } from './textMateWorkerTokenizerController.js';
import { createWebWorker } from '../../../../../base/browser/webWorkerFactory.js';
let ThreadedBackgroundTokenizerFactory = class ThreadedBackgroundTokenizerFactory {
    static { ThreadedBackgroundTokenizerFactory_1 = this; }
    static { this._reportedMismatchingTokens = false; }
    constructor(_reportTokenizationTime, _shouldTokenizeAsync, _extensionResourceLoaderService, _configurationService, _languageService, _environmentService, _notificationService, _telemetryService) {
        this._reportTokenizationTime = _reportTokenizationTime;
        this._shouldTokenizeAsync = _shouldTokenizeAsync;
        this._extensionResourceLoaderService = _extensionResourceLoaderService;
        this._configurationService = _configurationService;
        this._languageService = _languageService;
        this._environmentService = _environmentService;
        this._notificationService = _notificationService;
        this._telemetryService = _telemetryService;
        this._workerProxyPromise = null;
        this._worker = null;
        this._workerProxy = null;
        this._workerTokenizerControllers = new Map();
        this._currentTheme = null;
        this._currentTokenColorMap = null;
        this._grammarDefinitions = [];
    }
    dispose() {
        this._disposeWorker();
    }
    // Will be recreated after worker is disposed (because tokenizer is re-registered when languages change)
    createBackgroundTokenizer(textModel, tokenStore, maxTokenizationLineLength) {
        // fallback to default sync background tokenizer
        if (!this._shouldTokenizeAsync() || textModel.isTooLargeForSyncing()) {
            return undefined;
        }
        const store = new DisposableStore();
        const controllerContainer = this._getWorkerProxy().then((workerProxy) => {
            if (store.isDisposed || !workerProxy) {
                return undefined;
            }
            const controllerContainer = {
                controller: undefined,
                worker: this._worker,
            };
            store.add(keepAliveWhenAttached(textModel, () => {
                const controller = new TextMateWorkerTokenizerController(textModel, workerProxy, this._languageService.languageIdCodec, tokenStore, this._configurationService, maxTokenizationLineLength);
                controllerContainer.controller = controller;
                this._workerTokenizerControllers.set(controller.controllerId, controller);
                return toDisposable(() => {
                    controllerContainer.controller = undefined;
                    this._workerTokenizerControllers.delete(controller.controllerId);
                    controller.dispose();
                });
            }));
            return controllerContainer;
        });
        return {
            dispose() {
                store.dispose();
            },
            requestTokens: async (startLineNumber, endLineNumberExclusive) => {
                const container = await controllerContainer;
                // If there is no controller, the model has been detached in the meantime.
                // Only request the proxy object if the worker is the same!
                if (container?.controller && container.worker === this._worker) {
                    container.controller.requestTokens(startLineNumber, endLineNumberExclusive);
                }
            },
            reportMismatchingTokens: (lineNumber) => {
                if (ThreadedBackgroundTokenizerFactory_1._reportedMismatchingTokens) {
                    return;
                }
                ThreadedBackgroundTokenizerFactory_1._reportedMismatchingTokens = true;
                this._notificationService.error({
                    message: 'Async Tokenization Token Mismatch in line ' + lineNumber,
                    name: 'Async Tokenization Token Mismatch',
                });
                this._telemetryService.publicLog2('asyncTokenizationMismatchingTokens', {});
            },
        };
    }
    setGrammarDefinitions(grammarDefinitions) {
        this._grammarDefinitions = grammarDefinitions;
        this._disposeWorker();
    }
    acceptTheme(theme, colorMap) {
        this._currentTheme = theme;
        this._currentTokenColorMap = colorMap;
        if (this._currentTheme && this._currentTokenColorMap && this._workerProxy) {
            this._workerProxy.$acceptTheme(this._currentTheme, this._currentTokenColorMap);
        }
    }
    _getWorkerProxy() {
        if (!this._workerProxyPromise) {
            this._workerProxyPromise = this._createWorkerProxy();
        }
        return this._workerProxyPromise;
    }
    async _createWorkerProxy() {
        const onigurumaModuleLocation = `${nodeModulesPath}/vscode-oniguruma`;
        const onigurumaModuleLocationAsar = `${nodeModulesAsarPath}/vscode-oniguruma`;
        const useAsar = canASAR && this._environmentService.isBuilt && !isWeb;
        const onigurumaLocation = useAsar
            ? onigurumaModuleLocationAsar
            : onigurumaModuleLocation;
        const onigurumaWASM = `${onigurumaLocation}/release/onig.wasm`;
        const createData = {
            grammarDefinitions: this._grammarDefinitions,
            onigurumaWASMUri: FileAccess.asBrowserUri(onigurumaWASM).toString(true),
        };
        const worker = (this._worker = createWebWorker(FileAccess.asBrowserUri('vs/workbench/services/textMate/browser/backgroundTokenization/worker/textMateTokenizationWorker.workerMain.js'), 'TextMateWorker'));
        TextMateWorkerHost.setChannel(worker, {
            $readFile: async (_resource) => {
                const resource = URI.revive(_resource);
                return this._extensionResourceLoaderService.readExtensionResource(resource);
            },
            $setTokensAndStates: async (controllerId, versionId, tokens, lineEndStateDeltas) => {
                const controller = this._workerTokenizerControllers.get(controllerId);
                // When a model detaches, it is removed synchronously from the map.
                // However, the worker might still be sending tokens for that model,
                // so we ignore the event when there is no controller.
                if (controller) {
                    controller.setTokensAndStates(controllerId, versionId, tokens, lineEndStateDeltas);
                }
            },
            $reportTokenizationTime: (timeMs, languageId, sourceExtensionId, lineLength, isRandomSample) => {
                this._reportTokenizationTime(timeMs, languageId, sourceExtensionId, lineLength, isRandomSample);
            },
        });
        await worker.proxy.$init(createData);
        if (this._worker !== worker) {
            // disposed in the meantime
            return null;
        }
        this._workerProxy = worker.proxy;
        if (this._currentTheme && this._currentTokenColorMap) {
            this._workerProxy.$acceptTheme(this._currentTheme, this._currentTokenColorMap);
        }
        return worker.proxy;
    }
    _disposeWorker() {
        for (const controller of this._workerTokenizerControllers.values()) {
            controller.dispose();
        }
        this._workerTokenizerControllers.clear();
        if (this._worker) {
            this._worker.dispose();
            this._worker = null;
        }
        this._workerProxy = null;
        this._workerProxyPromise = null;
    }
};
ThreadedBackgroundTokenizerFactory = ThreadedBackgroundTokenizerFactory_1 = __decorate([
    __param(2, IExtensionResourceLoaderService),
    __param(3, IConfigurationService),
    __param(4, ILanguageService),
    __param(5, IEnvironmentService),
    __param(6, INotificationService),
    __param(7, ITelemetryService)
], ThreadedBackgroundTokenizerFactory);
export { ThreadedBackgroundTokenizerFactory };
function keepAliveWhenAttached(textModel, factory) {
    const disposableStore = new DisposableStore();
    const subStore = disposableStore.add(new DisposableStore());
    function checkAttached() {
        if (textModel.isAttachedToEditor()) {
            subStore.add(factory());
        }
        else {
            subStore.clear();
        }
    }
    checkAttached();
    disposableStore.add(textModel.onDidChangeAttached(() => {
        checkAttached();
    }));
    return disposableStore;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhyZWFkZWRCYWNrZ3JvdW5kVG9rZW5pemVyRmFjdG9yeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90ZXh0TWF0ZS9icm93c2VyL2JhY2tncm91bmRUb2tlbml6YXRpb24vdGhyZWFkZWRCYWNrZ3JvdW5kVG9rZW5pemVyRmFjdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQ2hELE9BQU8sRUFBRSxlQUFlLEVBQWUsWUFBWSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEcsT0FBTyxFQUVOLFVBQVUsRUFDVixtQkFBbUIsRUFDbkIsZUFBZSxHQUNmLE1BQU0sdUNBQXVDLENBQUE7QUFFOUMsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQzlELE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sbUNBQW1DLENBQUE7QUFLdEUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFFckYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDL0YsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sbUZBQW1GLENBQUE7QUFDbkksT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDbEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdURBQXVELENBQUE7QUFNekYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDbkUsT0FBTyxFQUFFLGlDQUFpQyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFHMUYsT0FB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