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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhyZWFkZWRCYWNrZ3JvdW5kVG9rZW5pemVyRmFjdG9yeS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RleHRNYXRlL2Jyb3dzZXIvYmFja2dyb3VuZFRva2VuaXphdGlvbi90aHJlYWRlZEJhY2tncm91bmRUb2tlbml6ZXJGYWN0b3J5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0JBQXdCLENBQUE7QUFDaEQsT0FBTyxFQUFFLGVBQWUsRUFBZSxZQUFZLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRyxPQUFPLEVBRU4sVUFBVSxFQUNWLG1CQUFtQixFQUNuQixlQUFlLEdBQ2YsTUFBTSx1Q0FBdUMsQ0FBQTtBQUU5QyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDOUQsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSxtQ0FBbUMsQ0FBQTtBQUt0RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUVyRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUMvRixPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxtRkFBbUYsQ0FBQTtBQUNuSSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQU16RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsaUNBQWlDLEVBQUUsTUFB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