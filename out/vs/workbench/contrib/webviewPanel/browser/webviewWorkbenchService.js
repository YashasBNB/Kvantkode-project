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
import { createCancelablePromise, DeferredPromise, } from '../../../../base/common/async.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { memoize } from '../../../../base/common/decorators.js';
import { isCancellationError } from '../../../../base/common/errors.js';
import { Emitter } from '../../../../base/common/event.js';
import { Iterable } from '../../../../base/common/iterator.js';
import { combinedDisposable, Disposable, toDisposable, } from '../../../../base/common/lifecycle.js';
import { EditorActivation } from '../../../../platform/editor/common/editor.js';
import { createDecorator, IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { DiffEditorInput } from '../../../common/editor/diffEditorInput.js';
import { IWebviewService } from '../../webview/browser/webview.js';
import { CONTEXT_ACTIVE_WEBVIEW_PANEL_ID } from './webviewEditor.js';
import { WebviewIconManager } from './webviewIconManager.js';
import { IEditorGroupsService, } from '../../../services/editor/common/editorGroupsService.js';
import { IEditorService, } from '../../../services/editor/common/editorService.js';
import { WebviewInput } from './webviewEditorInput.js';
export const IWebviewWorkbenchService = createDecorator('webviewEditorService');
function canRevive(reviver, webview) {
    return reviver.canResolve(webview);
}
let LazilyResolvedWebviewEditorInput = class LazilyResolvedWebviewEditorInput extends WebviewInput {
    constructor(init, webview, _webviewWorkbenchService) {
        super(init, webview, _webviewWorkbenchService.iconManager);
        this._webviewWorkbenchService = _webviewWorkbenchService;
        this._resolved = false;
    }
    dispose() {
        super.dispose();
        this._resolvePromise?.cancel();
        this._resolvePromise = undefined;
    }
    async resolve() {
        if (!this._resolved) {
            this._resolved = true;
            this._resolvePromise = createCancelablePromise((token) => this._webviewWorkbenchService.resolveWebview(this, token));
            try {
                await this._resolvePromise;
            }
            catch (e) {
                if (!isCancellationError(e)) {
                    throw e;
                }
            }
        }
        return super.resolve();
    }
    transfer(other) {
        if (!super.transfer(other)) {
            return;
        }
        other._resolved = this._resolved;
        return other;
    }
};
__decorate([
    memoize
], LazilyResolvedWebviewEditorInput.prototype, "resolve", null);
LazilyResolvedWebviewEditorInput = __decorate([
    __param(2, IWebviewWorkbenchService)
], LazilyResolvedWebviewEditorInput);
export { LazilyResolvedWebviewEditorInput };
class RevivalPool {
    constructor() {
        this._awaitingRevival = [];
    }
    enqueueForRestoration(input, token) {
        const promise = new DeferredPromise();
        const remove = () => {
            const index = this._awaitingRevival.findIndex((entry) => input === entry.input);
            if (index >= 0) {
                this._awaitingRevival.splice(index, 1);
            }
        };
        const disposable = combinedDisposable(input.webview.onDidDispose(remove), token.onCancellationRequested(() => {
            remove();
            promise.cancel();
        }));
        this._awaitingRevival.push({ input, promise, disposable });
        return promise.p;
    }
    reviveFor(reviver, token) {
        const toRevive = this._awaitingRevival.filter(({ input }) => canRevive(reviver, input));
        this._awaitingRevival = this._awaitingRevival.filter(({ input }) => !canRevive(reviver, input));
        for (const { input, promise: resolve, disposable } of toRevive) {
            reviver
                .resolveWebview(input, token)
                .then((x) => resolve.complete(x), (err) => resolve.error(err))
                .finally(() => {
                disposable.dispose();
            });
        }
    }
}
let WebviewEditorService = class WebviewEditorService extends Disposable {
    constructor(editorGroupsService, _editorService, _instantiationService, _webviewService) {
        super();
        this._editorService = _editorService;
        this._instantiationService = _instantiationService;
        this._webviewService = _webviewService;
        this._revivers = new Set();
        this._revivalPool = new RevivalPool();
        this._onDidChangeActiveWebviewEditor = this._register(new Emitter());
        this.onDidChangeActiveWebviewEditor = this._onDidChangeActiveWebviewEditor.event;
        this._iconManager = this._register(this._instantiationService.createInstance(WebviewIconManager));
        this._register(editorGroupsService.registerContextKeyProvider({
            contextKey: CONTEXT_ACTIVE_WEBVIEW_PANEL_ID,
            getGroupContextKeyValue: (group) => this.getWebviewId(group.activeEditor),
        }));
        this._register(_editorService.onDidActiveEditorChange(() => {
            this.updateActiveWebview();
        }));
        // The user may have switched focus between two sides of a diff editor
        this._register(_webviewService.onDidChangeActiveWebview(() => {
            this.updateActiveWebview();
        }));
        this.updateActiveWebview();
    }
    get iconManager() {
        return this._iconManager;
    }
    getWebviewId(input) {
        let webviewInput;
        if (input instanceof WebviewInput) {
            webviewInput = input;
        }
        else if (input instanceof DiffEditorInput) {
            if (input.primary instanceof WebviewInput) {
                webviewInput = input.primary;
            }
            else if (input.secondary instanceof WebviewInput) {
                webviewInput = input.secondary;
            }
        }
        return webviewInput?.webview.providedViewType ?? '';
    }
    updateActiveWebview() {
        const activeInput = this._editorService.activeEditor;
        let newActiveWebview;
        if (activeInput instanceof WebviewInput) {
            newActiveWebview = activeInput;
        }
        else if (activeInput instanceof DiffEditorInput) {
            if (activeInput.primary instanceof WebviewInput &&
                activeInput.primary.webview === this._webviewService.activeWebview) {
                newActiveWebview = activeInput.primary;
            }
            else if (activeInput.secondary instanceof WebviewInput &&
                activeInput.secondary.webview === this._webviewService.activeWebview) {
                newActiveWebview = activeInput.secondary;
            }
        }
        if (newActiveWebview !== this._activeWebview) {
            this._activeWebview = newActiveWebview;
            this._onDidChangeActiveWebviewEditor.fire(newActiveWebview);
        }
    }
    openWebview(webviewInitInfo, viewType, title, showOptions) {
        const webview = this._webviewService.createWebviewOverlay(webviewInitInfo);
        const webviewInput = this._instantiationService.createInstance(WebviewInput, { viewType, name: title, providedId: webviewInitInfo.providedViewType }, webview, this.iconManager);
        this._editorService.openEditor(webviewInput, {
            pinned: true,
            preserveFocus: showOptions.preserveFocus,
            // preserve pre 1.38 behaviour to not make group active when preserveFocus: true
            // but make sure to restore the editor to fix https://github.com/microsoft/vscode/issues/79633
            activation: showOptions.preserveFocus ? EditorActivation.RESTORE : undefined,
        }, showOptions.group);
        return webviewInput;
    }
    revealWebview(webview, group, preserveFocus) {
        const topLevelEditor = this.findTopLevelEditorForWebview(webview);
        this._editorService.openEditor(topLevelEditor, {
            preserveFocus,
            // preserve pre 1.38 behaviour to not make group active when preserveFocus: true
            // but make sure to restore the editor to fix https://github.com/microsoft/vscode/issues/79633
            activation: preserveFocus ? EditorActivation.RESTORE : undefined,
        }, group);
    }
    findTopLevelEditorForWebview(webview) {
        for (const editor of this._editorService.editors) {
            if (editor === webview) {
                return editor;
            }
            if (editor instanceof DiffEditorInput) {
                if (webview === editor.primary || webview === editor.secondary) {
                    return editor;
                }
            }
        }
        return webview;
    }
    openRevivedWebview(options) {
        const webview = this._webviewService.createWebviewOverlay(options.webviewInitInfo);
        webview.state = options.state;
        const webviewInput = this._instantiationService.createInstance(LazilyResolvedWebviewEditorInput, {
            viewType: options.viewType,
            providedId: options.webviewInitInfo.providedViewType,
            name: options.title,
        }, webview);
        webviewInput.iconPath = options.iconPath;
        if (typeof options.group === 'number') {
            webviewInput.updateGroup(options.group);
        }
        return webviewInput;
    }
    registerResolver(reviver) {
        this._revivers.add(reviver);
        const cts = new CancellationTokenSource();
        this._revivalPool.reviveFor(reviver, cts.token);
        return toDisposable(() => {
            this._revivers.delete(reviver);
            cts.dispose(true);
        });
    }
    shouldPersist(webview) {
        // Revived webviews may not have an actively registered reviver but we still want to persist them
        // since a reviver should exist when it is actually needed.
        if (webview instanceof LazilyResolvedWebviewEditorInput) {
            return true;
        }
        return Iterable.some(this._revivers.values(), (reviver) => canRevive(reviver, webview));
    }
    async tryRevive(webview, token) {
        for (const reviver of this._revivers.values()) {
            if (canRevive(reviver, webview)) {
                await reviver.resolveWebview(webview, token);
                return true;
            }
        }
        return false;
    }
    async resolveWebview(webview, token) {
        const didRevive = await this.tryRevive(webview, token);
        if (!didRevive && !token.isCancellationRequested) {
            // A reviver may not be registered yet. Put into pool and resolve promise when we can revive
            return this._revivalPool.enqueueForRestoration(webview, token);
        }
    }
    setIcons(id, iconPath) {
        this._iconManager.setIcons(id, iconPath);
    }
};
WebviewEditorService = __decorate([
    __param(0, IEditorGroupsService),
    __param(1, IEditorService),
    __param(2, IInstantiationService),
    __param(3, IWebviewService)
], WebviewEditorService);
export { WebviewEditorService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld1dvcmtiZW5jaFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWJ2aWV3UGFuZWwvYnJvd3Nlci93ZWJ2aWV3V29ya2JlbmNoU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBRU4sdUJBQXVCLEVBQ3ZCLGVBQWUsR0FDZixNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFBcUIsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0QsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkUsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM5RCxPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLFVBQVUsRUFFVixZQUFZLEdBQ1osTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUMvRSxPQUFPLEVBQ04sZUFBZSxFQUNmLHFCQUFxQixHQUNyQixNQUFNLDREQUE0RCxDQUFBO0FBRW5FLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUUzRSxPQUFPLEVBQW1CLGVBQWUsRUFBbUIsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsK0JBQStCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsa0JBQWtCLEVBQWdCLE1BQU0seUJBQXlCLENBQUE7QUFDMUUsT0FBTyxFQUVOLG9CQUFvQixHQUNwQixNQUFNLHdEQUF3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