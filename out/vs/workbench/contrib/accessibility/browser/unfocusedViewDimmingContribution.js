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
import { createStyleSheet } from '../../../../base/browser/domStylesheets.js';
import { Event } from '../../../../base/common/event.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { clamp } from '../../../../base/common/numbers.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
let UnfocusedViewDimmingContribution = class UnfocusedViewDimmingContribution extends Disposable {
    constructor(configurationService) {
        super();
        this._styleElementDisposables = undefined;
        this._register(toDisposable(() => this._removeStyleElement()));
        this._register(Event.runAndSubscribe(configurationService.onDidChangeConfiguration, (e) => {
            if (e &&
                !e.affectsConfiguration("accessibility.dimUnfocused.enabled" /* AccessibilityWorkbenchSettingId.DimUnfocusedEnabled */) &&
                !e.affectsConfiguration("accessibility.dimUnfocused.opacity" /* AccessibilityWorkbenchSettingId.DimUnfocusedOpacity */)) {
                return;
            }
            let cssTextContent = '';
            const enabled = ensureBoolean(configurationService.getValue("accessibility.dimUnfocused.enabled" /* AccessibilityWorkbenchSettingId.DimUnfocusedEnabled */), false);
            if (enabled) {
                const opacity = clamp(ensureNumber(configurationService.getValue("accessibility.dimUnfocused.opacity" /* AccessibilityWorkbenchSettingId.DimUnfocusedOpacity */), 0.75 /* ViewDimUnfocusedOpacityProperties.Default */), 0.2 /* ViewDimUnfocusedOpacityProperties.Minimum */, 1 /* ViewDimUnfocusedOpacityProperties.Maximum */);
                if (opacity !== 1) {
                    // These filter rules are more specific than may be expected as the `filter`
                    // rule can cause problems if it's used inside the element like on editor hovers
                    const rules = new Set();
                    const filterRule = `filter: opacity(${opacity});`;
                    // Terminal tabs
                    rules.add(`.monaco-workbench .pane-body.integrated-terminal:not(:focus-within) .tabs-container { ${filterRule} }`);
                    // Terminals
                    rules.add(`.monaco-workbench .pane-body.integrated-terminal .terminal-wrapper:not(:focus-within) { ${filterRule} }`);
                    // Text editors
                    rules.add(`.monaco-workbench .editor-instance:not(:focus-within) .monaco-editor { ${filterRule} }`);
                    // Breadcrumbs
                    rules.add(`.monaco-workbench .editor-instance:not(:focus-within) .breadcrumbs-below-tabs { ${filterRule} }`);
                    // Terminal editors
                    rules.add(`.monaco-workbench .editor-instance:not(:focus-within) .terminal-wrapper { ${filterRule} }`);
                    // Settings editor
                    rules.add(`.monaco-workbench .editor-instance:not(:focus-within) .settings-editor { ${filterRule} }`);
                    // Keybindings editor
                    rules.add(`.monaco-workbench .editor-instance:not(:focus-within) .keybindings-editor { ${filterRule} }`);
                    // Editor placeholder (error case)
                    rules.add(`.monaco-workbench .editor-instance:not(:focus-within) .monaco-editor-pane-placeholder { ${filterRule} }`);
                    // Welcome editor
                    rules.add(`.monaco-workbench .editor-instance:not(:focus-within) .gettingStartedContainer { ${filterRule} }`);
                    cssTextContent = [...rules].join('\n');
                }
            }
            if (cssTextContent.length === 0) {
                this._removeStyleElement();
            }
            else {
                this._getStyleElement().textContent = cssTextContent;
            }
        }));
    }
    _getStyleElement() {
        if (!this._styleElement) {
            this._styleElementDisposables = new DisposableStore();
            this._styleElement = createStyleSheet(undefined, undefined, this._styleElementDisposables);
            this._styleElement.className = 'accessibilityUnfocusedViewOpacity';
        }
        return this._styleElement;
    }
    _removeStyleElement() {
        this._styleElementDisposables?.dispose();
        this._styleElementDisposables = undefined;
        this._styleElement = undefined;
    }
};
UnfocusedViewDimmingContribution = __decorate([
    __param(0, IConfigurationService)
], UnfocusedViewDimmingContribution);
export { UnfocusedViewDimmingContribution };
function ensureBoolean(value, defaultValue) {
    return typeof value === 'boolean' ? value : defaultValue;
}
function ensureNumber(value, defaultValue) {
    return typeof value === 'number' ? value : defaultValue;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5mb2N1c2VkVmlld0RpbW1pbmdDb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2FjY2Vzc2liaWxpdHkvYnJvd3Nlci91bmZvY3VzZWRWaWV3RGltbWluZ0NvbnRyaWJ1dGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxlQUFlLEVBQUUsWUFBWSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBTzNGLElBQU0sZ0NBQWdDLEdBQXRDLE1BQU0sZ0NBQWlDLFNBQVEsVUFBVTtJQUkvRCxZQUFtQyxvQkFBMkM7UUFDN0UsS0FBSyxFQUFFLENBQUE7UUFIQSw2QkFBd0IsR0FBZ0MsU0FBUyxDQUFBO1FBS3hFLElBQUksQ0FBQyxTQUFTLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUU5RCxJQUFJLENBQUMsU0FBUyxDQUNiLEtBQUssQ0FBQyxlQUFlLENBQUMsb0JBQW9CLENBQUMsd0JBQXdCLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRTtZQUMxRSxJQUNDLENBQUM7Z0JBQ0QsQ0FBQyxDQUFDLENBQUMsb0JBQW9CLGdHQUFxRDtnQkFDNUUsQ0FBQyxDQUFDLENBQUMsb0JBQW9CLGdHQUFxRCxF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