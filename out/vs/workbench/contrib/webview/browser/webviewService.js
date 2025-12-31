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
import { Emitter } from '../../../../base/common/event.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { WebviewThemeDataProvider } from './themeing.js';
import { WebviewElement } from './webviewElement.js';
import { OverlayWebview } from './overlayWebview.js';
let WebviewService = class WebviewService extends Disposable {
    constructor(_instantiationService) {
        super();
        this._instantiationService = _instantiationService;
        this._webviews = new Set();
        this._onDidChangeActiveWebview = this._register(new Emitter());
        this.onDidChangeActiveWebview = this._onDidChangeActiveWebview.event;
        this._webviewThemeDataProvider =
            this._instantiationService.createInstance(WebviewThemeDataProvider);
    }
    get activeWebview() {
        return this._activeWebview;
    }
    _updateActiveWebview(value) {
        if (value !== this._activeWebview) {
            this._activeWebview = value;
            this._onDidChangeActiveWebview.fire(value);
        }
    }
    get webviews() {
        return this._webviews.values();
    }
    createWebviewElement(initInfo) {
        const webview = this._instantiationService.createInstance(WebviewElement, initInfo, this._webviewThemeDataProvider);
        this.registerNewWebview(webview);
        return webview;
    }
    createWebviewOverlay(initInfo) {
        const webview = this._instantiationService.createInstance(OverlayWebview, initInfo);
        this.registerNewWebview(webview);
        return webview;
    }
    registerNewWebview(webview) {
        this._webviews.add(webview);
        const store = new DisposableStore();
        store.add(webview.onDidFocus(() => {
            this._updateActiveWebview(webview);
        }));
        const onBlur = () => {
            if (this._activeWebview === webview) {
                this._updateActiveWebview(undefined);
            }
        };
        store.add(webview.onDidBlur(onBlur));
        store.add(webview.onDidDispose(() => {
            onBlur();
            store.dispose();
            this._webviews.delete(webview);
        }));
    }
};
WebviewService = __decorate([
    __param(0, IInstantiationService)
], WebviewService);
export { WebviewService };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld1NlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWJ2aWV3L2Jyb3dzZXIvd2Vidmlld1NlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDbEYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sZUFBZSxDQUFBO0FBUXhELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFFN0MsSUFBTSxjQUFjLEdBQXBCLE1BQU0sY0FBZSxTQUFRLFVBQVU7SUFLN0MsWUFDd0IscUJBQStEO1FBRXRGLEtBQUssRUFBRSxDQUFBO1FBRm1DLDBCQUFxQixHQUFyQixxQkFBcUIsQ0FBdUI7UUFvQi9FLGNBQVMsR0FBRyxJQUFJLEdBQUcsRUFBWSxDQUFBO1FBTXRCLDhCQUF5QixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQXdCLENBQUMsQ0FBQTtRQUNoRiw2QkFBd0IsR0FBRyxJQUFJLENBQUMseUJBQXlCLENBQUMsS0FBSyxDQUFBO1FBeEI5RSxJQUFJLENBQUMseUJBQXlCO1lBQzdCLElBQUksQ0FBQyxxQkFBcUIsQ0FBQyxjQUFjLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtJQUNyRSxDQUFDO0lBSUQsSUFBVyxhQUFhO1FBQ3ZCLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQTtJQUMzQixDQUFDO0lBRU8sb0JBQW9CLENBQUMsS0FBMkI7UUFDdkQsSUFBSSxLQUFLLEtBQUssSUFBSSxDQUFDLGNBQWMsRUFBRSxDQUFDO1lBQ25DLElBQUksQ0FBQyxjQUFjLEdBQUcsS0FBSyxDQUFBO1lBQzNCLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDM0MsQ0FBQztJQUNGLENBQUM7SUFJRCxJQUFXLFFBQVE7UUFDbEIsT0FBTyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sRUFBRSxDQUFBO0lBQy9CLENBQUM7SUFLRCxvQkFBb0IsQ0FBQyxRQUF5QjtRQUM3QyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUN4RCxjQUFjLEVBQ2QsUUFBUSxFQUNSLElBQUksQ0FBQyx5QkFBeUIsQ0FDOUIsQ0FBQTtRQUNELElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNoQyxPQUFPLE9BQU8sQ0FBQTtJQUNmLENBQUM7SUFFRCxvQkFBb0IsQ0FBQyxRQUF5QjtRQUM3QyxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMscUJBQXFCLENBQUMsY0FBYyxDQUFDLGNBQWMsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUNuRixJQUFJLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDaEMsT0FBTyxPQUFPLENBQUE7SUFDZixDQUFDO0lBRVMsa0JBQWtCLENBQUMsT0FBaUI7UUFDN0MsSUFBSSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUE7UUFFM0IsTUFBTSxLQUFLLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUVuQyxLQUFLLENBQUMsR0FBRyxDQUNSLE9BQU8sQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFO1lBQ3ZCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUNuQyxDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsTUFBTSxNQUFNLEdBQUcsR0FBRyxFQUFFO1lBQ25CLElBQUksSUFBSSxDQUFDLGNBQWMsS0FBSyxPQUFPLEVBQUUsQ0FBQztnQkFDckMsSUFBSSxDQUFDLG9CQUFvQixDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ3JDLENBQUM7UUFDRixDQUFDLENBQUE7UUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUNwQyxLQUFLLENBQUMsR0FBRyxDQUNSLE9BQU8sQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFO1lBQ3pCLE1BQU0sRUFBRSxDQUFBO1lBQ1IsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQ2YsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDL0IsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7Q0FDRCxDQUFBO0FBN0VZLGNBQWM7SUFNeEIsV0FBQSxxQkFBcUIsQ0FBQTtHQU5YLGNBQWMsQ0E2RTFCIn0=