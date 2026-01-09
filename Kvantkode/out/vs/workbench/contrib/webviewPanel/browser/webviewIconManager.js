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
import * as cssValue from '../../../../base/browser/cssValue.js';
import * as domStylesheets from '../../../../base/browser/domStylesheets.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { ILifecycleService } from '../../../services/lifecycle/common/lifecycle.js';
let WebviewIconManager = class WebviewIconManager extends Disposable {
    constructor(_lifecycleService, _configService) {
        super();
        this._lifecycleService = _lifecycleService;
        this._configService = _configService;
        this._icons = new Map();
        this._register(this._configService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('workbench.iconTheme')) {
                this.updateStyleSheet();
            }
        }));
    }
    dispose() {
        super.dispose();
        this._styleElement = undefined;
    }
    get styleElement() {
        if (!this._styleElement) {
            this._styleElement = domStylesheets.createStyleSheet(undefined, undefined, this._store);
            this._styleElement.className = 'webview-icons';
        }
        return this._styleElement;
    }
    setIcons(webviewId, iconPath) {
        if (iconPath) {
            this._icons.set(webviewId, iconPath);
        }
        else {
            this._icons.delete(webviewId);
        }
        this.updateStyleSheet();
    }
    async updateStyleSheet() {
        await this._lifecycleService.when(1 /* LifecyclePhase.Starting */);
        const cssRules = [];
        if (this._configService.getValue('workbench.iconTheme') !== null) {
            for (const [key, value] of this._icons) {
                const webviewSelector = `.show-file-icons .webview-${key}-name-file-icon::before`;
                try {
                    cssRules.push(`.monaco-workbench.vs ${webviewSelector}, .monaco-workbench.hc-light ${webviewSelector} { content: ""; background-image: ${cssValue.asCSSUrl(value.light)}; }`, `.monaco-workbench.vs-dark ${webviewSelector}, .monaco-workbench.hc-black ${webviewSelector} { content: ""; background-image: ${cssValue.asCSSUrl(value.dark)}; }`);
                }
                catch {
                    // noop
                }
            }
        }
        this.styleElement.textContent = cssRules.join('\n');
    }
};
WebviewIconManager = __decorate([
    __param(0, ILifecycleService),
    __param(1, IConfigurationService)
], WebviewIconManager);
export { WebviewIconManager };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld0ljb25NYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi93ZWJ2aWV3UGFuZWwvYnJvd3Nlci93ZWJ2aWV3SWNvbk1hbmFnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLFFBQVEsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEtBQUssY0FBYyxNQUFNLDRDQUE0QyxDQUFBO0FBQzVFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVqRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsaUJBQWlCLEVBQWtCLE1BQU0saURBQWlELENBQUE7QUFPNUYsSUFBTSxrQkFBa0IsR0FBeEIsTUFBTSxrQkFBbUIsU0FBUSxVQUFVO0lBS2pELFlBQ29CLGlCQUFxRCxFQUNqRCxjQUFzRDtRQUU3RSxLQUFLLEVBQUUsQ0FBQTtRQUg2QixzQkFBaUIsR0FBakIsaUJBQWlCLENBQW1CO1FBQ2hDLG1CQUFjLEdBQWQsY0FBYyxDQUF1QjtRQU43RCxXQUFNLEdBQUcsSUFBSSxHQUFHLEVBQXdCLENBQUE7UUFTeEQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsY0FBYyxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDbEQsSUFBSSxDQUFDLENBQUMsb0JBQW9CLENBQUMscUJBQXFCLENBQUMsRUFBRSxDQUFDO2dCQUNuRCxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtZQUN4QixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFDUSxPQUFPO1FBQ2YsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ2YsSUFBSSxDQUFDLGFBQWEsR0FBRyxTQUFTLENBQUE7SUFDL0IsQ0FBQztJQUVELElBQVksWUFBWTtRQUN2QixJQUFJLENBQUMsSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3pCLElBQUksQ0FBQyxhQUFhLEdBQUcsY0FBYyxDQUFDLGdCQUFnQixDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ3ZGLElBQUksQ0FBQyxhQUFhLENBQUMsU0FBUyxHQUFHLGVBQWUsQ0FBQTtRQUMvQyxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsYUFBYSxDQUFBO0lBQzFCLENBQUM7SUFFTSxRQUFRLENBQUMsU0FBaUIsRUFBRSxRQUFrQztRQUNwRSxJQUFJLFFBQVEsRUFBRSxDQUFDO1lBQ2QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLFFBQVEsQ0FBQyxDQUFBO1FBQ3JDLENBQUM7YUFBTSxDQUFDO1lBQ1AsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDOUIsQ0FBQztRQUVELElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFBO0lBQ3hCLENBQUM7SUFFTyxLQUFLLENBQUMsZ0JBQWdCO1FBQzdCLE1BQU0sSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksaUNBQXlCLENBQUE7UUFFMUQsTUFBTSxRQUFRLEdBQWEsRUFBRSxDQUFBO1FBQzdCLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRLENBQUMscUJBQXFCLENBQUMsS0FBSyxJQUFJLEVBQUUsQ0FBQztZQUNsRSxLQUFLLE1BQU0sQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUN4QyxNQUFNLGVBQWUsR0FBRyw2QkFBNkIsR0FBRyx5QkFBeUIsQ0FBQTtnQkFDakYsSUFBSSxDQUFDO29CQUNKLFFBQVEsQ0FBQyxJQUFJLENBQ1osd0JBQXdCLGVBQWUsZ0NBQWdDLGVBQWUscUNBQXFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLEVBQzlKLDZCQUE2QixlQUFlLGdDQUFnQyxlQUFlLHFDQUFxQyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUNsSyxDQUFBO2dCQUNGLENBQUM7Z0JBQUMsTUFBTSxDQUFDO29CQUNSLE9BQU87Z0JBQ1IsQ0FBQztZQUNGLENBQUM7UUFDRixDQUFDO1FBQ0QsSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtJQUNwRCxDQUFDO0NBQ0QsQ0FBQTtBQTVEWSxrQkFBa0I7SUFNNUIsV0FBQSxpQkFBaUIsQ0FBQTtJQUNqQixXQUFBLHFCQUFxQixDQUFBO0dBUFgsa0JBQWtCLENBNEQ5QiJ9