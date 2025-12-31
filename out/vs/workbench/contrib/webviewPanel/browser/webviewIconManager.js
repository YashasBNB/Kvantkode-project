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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2Vidmlld0ljb25NYW5hZ2VyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2Vidmlld1BhbmVsL2Jyb3dzZXIvd2Vidmlld0ljb25NYW5hZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sS0FBSyxRQUFRLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyxLQUFLLGNBQWMsTUFBTSw0Q0FBNEMsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFakUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDbEcsT0FBTyxFQUFFLGlCQUFpQixFQUFrQixNQUFNLGlEQUFpRCxDQUFBO0FBTzVGLElBQU0sa0JBQWtCLEdBQXhCLE1BQU0sa0JBQW1CLFNBQVEsVUFBVTtJQUtqRCxZQUNvQixpQkFBcUQsRUFDakQsY0FBc0Q7UUFFN0UsS0FBSyxFQUFFLENBQUE7UUFINkIsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFtQjtRQUNoQyxtQkFBYyxHQUFkLGNBQWMsQ0FBdUI7UUFON0QsV0FBTSxHQUFHLElBQUksR0FBRyxFQUF3QixDQUFBO1FBU3hELElBQUksQ0FBQyxTQUFTLENBQ2IsSUFBSSxDQUFDLGNBQWMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQ2xELElBQUksQ0FBQyxDQUFDLG9CQUFvQixDQUFDLHFCQUFxQixDQUFDLEVBQUUsQ0FBQztnQkFDbkQsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUE7WUFDeEIsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBQ1EsT0FBTztRQUNmLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNmLElBQUksQ0FBQyxhQUFhLEdBQUcsU0FBUyxDQUFBO0lBQy9CLENBQUM7SUFFRCxJQUFZLFlBQVk7UUFDdkIsSUFBSSxDQUFDLElBQUksQ0FBQyxhQUFhLEVBQUUsQ0FBQztZQUN6QixJQUFJLENBQUMsYUFBYSxHQUFHLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxTQUFTLEVBQUUsU0FBUyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUN2RixJQUFJLENBQUMsYUFBYSxDQUFDLFNBQVMsR0FBRyxlQUFlLENBQUE7UUFDL0MsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFDLGFBQWEsQ0FBQTtJQUMxQixDQUFDO0lBRU0sUUFBUSxDQUFDLFNBQWlCLEVBQUUsUUFBa0M7UUFDcEUsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUNkLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUNyQyxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQzlCLENBQUM7UUFFRCxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQTtJQUN4QixDQUFDO0lBRU8sS0FBSyxDQUFDLGdCQUFnQjtRQUM3QixNQUFNLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxJQUFJLGlDQUF5QixDQUFBO1FBRTFELE1BQU0sUUFBUSxHQUFhLEVBQUUsQ0FBQTtRQUM3QixJQUFJLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLHFCQUFxQixDQUFDLEtBQUssSUFBSSxFQUFFLENBQUM7WUFDbEUsS0FBSyxNQUFNLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDeEMsTUFBTSxlQUFlLEdBQUcsNkJBQTZCLEdBQUcseUJBQXlCLENBQUE7Z0JBQ2pGLElBQUksQ0FBQztvQkFDSixRQUFRLENBQUMsSUFBSSxDQUNaLHdCQUF3QixlQUFlLGdDQUFnQyxlQUFlLHFDQUFxQyxRQUFRLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxFQUM5Siw2QkFBNkIsZUFBZSxnQ0FBZ0MsZUFBZSxxQ0FBcUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FDbEssQ0FBQTtnQkFDRixDQUFDO2dCQUFDLE1BQU0sQ0FBQztvQkFDUixPQUFPO2dCQUNSLENBQUM7WUFDRixDQUFDO1FBQ0YsQ0FBQztRQUNELElBQUksQ0FBQyxZQUFZLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDcEQsQ0FBQztDQUNELENBQUE7QUE1RFksa0JBQWtCO0lBTTVCLFdBQUEsaUJBQWlCLENBQUE7SUFDakIsV0FBQSxxQkFBcUIsQ0FBQTtHQVBYLGtCQUFrQixDQTREOUIifQ==