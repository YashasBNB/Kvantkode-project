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
var WebviewViewPane_1;
import { addDisposableListener, Dimension, EventType, findParentWithClass, getWindow, } from '../../../../base/browser/dom.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { Emitter } from '../../../../base/common/event.js';
import { DisposableStore, MutableDisposable, toDisposable, } from '../../../../base/common/lifecycle.js';
import { MenuId } from '../../../../platform/actions/common/actions.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IProgressService } from '../../../../platform/progress/common/progress.js';
import { IStorageService, } from '../../../../platform/storage/common/storage.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { ViewPane, ViewPaneShowActions } from '../../../browser/parts/views/viewPane.js';
import { Memento } from '../../../common/memento.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { ExtensionKeyedWebviewOriginStore, IWebviewService, } from '../../webview/browser/webview.js';
import { WebviewWindowDragMonitor } from '../../webview/browser/webviewWindowDragMonitor.js';
import { IWebviewViewService } from './webviewViewService.js';
import { IActivityService, NumberBadge } from '../../../services/activity/common/activity.js';
import { IExtensionService } from '../../../services/extensions/common/extensions.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
const storageKeys = {
    webviewState: 'webviewState',
};
let WebviewViewPane = class WebviewViewPane extends ViewPane {
    static { WebviewViewPane_1 = this; }
    static getOriginStore(storageService) {
        this._originStore ??= new ExtensionKeyedWebviewOriginStore('webviewViews.origins', storageService);
        return this._originStore;
    }
    constructor(options, configurationService, contextKeyService, contextMenuService, instantiationService, keybindingService, openerService, hoverService, themeService, viewDescriptorService, activityService, extensionService, progressService, storageService, viewService, webviewService, webviewViewService) {
        super({ ...options, titleMenuId: MenuId.ViewTitle, showActions: ViewPaneShowActions.WhenExpanded }, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);
        this.activityService = activityService;
        this.extensionService = extensionService;
        this.progressService = progressService;
        this.storageService = storageService;
        this.viewService = viewService;
        this.webviewService = webviewService;
        this.webviewViewService = webviewViewService;
        this._webview = this._register(new MutableDisposable());
        this._webviewDisposables = this._register(new DisposableStore());
        this._activated = false;
        this.activity = this._register(new MutableDisposable());
        this._onDidChangeVisibility = this._register(new Emitter());
        this.onDidChangeVisibility = this._onDidChangeVisibility.event;
        this._onDispose = this._register(new Emitter());
        this.onDispose = this._onDispose.event;
        this.extensionId = options.fromExtensionId;
        this.defaultTitle = this.title;
        this.memento = new Memento(`webviewView.${this.id}`, storageService);
        this.viewState = this.memento.getMemento(1 /* StorageScope.WORKSPACE */, 1 /* StorageTarget.MACHINE */);
        this._register(this.onDidChangeBodyVisibility(() => this.updateTreeVisibility()));
        this._register(this.webviewViewService.onNewResolverRegistered((e) => {
            if (e.viewType === this.id) {
                // Potentially re-activate if we have a new resolver
                this.updateTreeVisibility();
            }
        }));
        this.updateTreeVisibility();
    }
    dispose() {
        this._onDispose.fire();
        clearTimeout(this._repositionTimeout);
        super.dispose();
    }
    focus() {
        super.focus();
        this._webview.value?.focus();
    }
    renderBody(container) {
        super.renderBody(container);
        this._container = container;
        this._rootContainer = undefined;
        if (!this._resizeObserver) {
            this._resizeObserver = new ResizeObserver(() => {
                setTimeout(() => {
                    this.layoutWebview();
                }, 0);
            });
            this._register(toDisposable(() => {
                this._resizeObserver.disconnect();
            }));
            this._resizeObserver.observe(container);
        }
    }
    saveState() {
        if (this._webview.value) {
            this.viewState[storageKeys.webviewState] = this._webview.value.state;
        }
        this.memento.saveMemento();
        super.saveState();
    }
    layoutBody(height, width) {
        super.layoutBody(height, width);
        this.layoutWebview(new Dimension(width, height));
    }
    updateTreeVisibility() {
        if (this.isBodyVisible()) {
            this.activate();
            this._webview.value?.claim(this, getWindow(this.element), undefined);
        }
        else {
            this._webview.value?.release(this);
        }
    }
    activate() {
        if (this._activated) {
            return;
        }
        this._activated = true;
        const origin = this.extensionId
            ? WebviewViewPane_1.getOriginStore(this.storageService).getOrigin(this.id, this.extensionId)
            : undefined;
        const webview = this.webviewService.createWebviewOverlay({
            origin,
            providedViewType: this.id,
            title: this.title,
            options: { purpose: "webviewView" /* WebviewContentPurpose.WebviewView */ },
            contentOptions: {},
            extension: this.extensionId ? { id: this.extensionId } : undefined,
        });
        webview.state = this.viewState[storageKeys.webviewState];
        this._webview.value = webview;
        if (this._container) {
            this.layoutWebview();
        }
        this._webviewDisposables.add(toDisposable(() => {
            this._webview.value?.release(this);
        }));
        this._webviewDisposables.add(webview.onDidUpdateState(() => {
            this.viewState[storageKeys.webviewState] = webview.state;
        }));
        // Re-dispatch all drag events back to the drop target to support view drag drop
        for (const event of [
            EventType.DRAG,
            EventType.DRAG_END,
            EventType.DRAG_ENTER,
            EventType.DRAG_LEAVE,
            EventType.DRAG_START,
        ]) {
            this._webviewDisposables.add(addDisposableListener(this._webview.value.container, event, (e) => {
                e.preventDefault();
                e.stopImmediatePropagation();
                this.dropTargetElement.dispatchEvent(new DragEvent(e.type, e));
            }));
        }
        this._webviewDisposables.add(new WebviewWindowDragMonitor(getWindow(this.element), () => this._webview.value));
        const source = this._webviewDisposables.add(new CancellationTokenSource());
        this.withProgress(async () => {
            await this.extensionService.activateByEvent(`onView:${this.id}`);
            const self = this;
            const webviewView = {
                webview,
                onDidChangeVisibility: this.onDidChangeBodyVisibility,
                onDispose: this.onDispose,
                get title() {
                    return self.setTitle;
                },
                set title(value) {
                    self.updateTitle(value);
                },
                get description() {
                    return self.titleDescription;
                },
                set description(value) {
                    self.updateTitleDescription(value);
                },
                get badge() {
                    return self.badge;
                },
                set badge(badge) {
                    self.updateBadge(badge);
                },
                dispose: () => {
                    // Only reset and clear the webview itself. Don't dispose of the view container
                    this._activated = false;
                    this._webview.clear();
                    this._webviewDisposables.clear();
                },
                show: (preserveFocus) => {
                    this.viewService.openView(this.id, !preserveFocus);
                },
            };
            await this.webviewViewService.resolve(this.id, webviewView, source.token);
        });
    }
    updateTitle(value) {
        this.setTitle = value;
        super.updateTitle(typeof value === 'string' ? value : this.defaultTitle);
    }
    updateBadge(badge) {
        if (this.badge?.value === badge?.value && this.badge?.tooltip === badge?.tooltip) {
            return;
        }
        this.badge = badge;
        if (badge) {
            const activity = {
                badge: new NumberBadge(badge.value, () => badge.tooltip),
                priority: 150,
            };
            this.activity.value = this.activityService.showViewActivity(this.id, activity);
        }
    }
    async withProgress(task) {
        return this.progressService.withProgress({ location: this.id, delay: 500 }, task);
    }
    onDidScrollRoot() {
        this.layoutWebview();
    }
    doLayoutWebview(dimension) {
        const webviewEntry = this._webview.value;
        if (!this._container || !webviewEntry) {
            return;
        }
        if (!this._rootContainer || !this._rootContainer.isConnected) {
            this._rootContainer = this.findRootContainer(this._container);
        }
        webviewEntry.layoutWebviewOverElement(this._container, dimension, this._rootContainer);
    }
    layoutWebview(dimension) {
        this.doLayoutWebview(dimension);
        // Temporary fix for https://github.com/microsoft/vscode/issues/110450
        // There is an animation that lasts about 200ms, update the webview positioning once this animation is complete.
        clearTimeout(this._repositionTimeout);
        this._repositionTimeout = setTimeout(() => this.doLayoutWebview(dimension), 200);
    }
    findRootContainer(container) {
        return findParentWithClass(container, 'monaco-scrollable-element') ?? undefined;
    }
};
WebviewViewPane = WebviewViewPane_1 = __decorate([
    __param(1, IConfigurationService),
    __param(2, IContextKeyService),
    __param(3, IContextMenuService),
    __param(4, IInstantiationService),
    __param(5, IKeybindingService),
    __param(6, IOpenerService),
    __param(7, IHoverService),
    __param(8, IThemeService),
    __param(9, IViewDescriptorService),
    __param(10, IActivityService),
    __param(11, IExtensionService),
    __param(12, IProgressService),
    __param(13, IStorageService),
    __param(14, IViewsService),
    __param(15, IWebviewService),
    __param(16, IWebviewViewService)
], WebviewViewPane);
export { WebviewViewPane };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld1ZpZXdQYW5lLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWJ2aWV3Vmlldy9icm93c2VyL3dlYnZpZXdWaWV3UGFuZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUNOLHFCQUFxQixFQUNyQixTQUFTLEVBQ1QsU0FBUyxFQUNULG1CQUFtQixFQUNuQixTQUFTLEdBQ1QsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4QyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUNOLGVBQWUsRUFFZixpQkFBaUIsRUFDakIsWUFBWSxHQUNaLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBRTdGLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3pGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNuRixPQUFPLEVBQ04sZUFBZSxHQUdmLE1BQU0sZ0RBQWdELENBQUE7QUFDdkQsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFN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