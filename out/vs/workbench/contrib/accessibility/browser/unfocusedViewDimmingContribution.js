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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5mb2N1c2VkVmlld0RpbW1pbmdDb250cmlidXRpb24uanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9hY2Nlc3NpYmlsaXR5L2Jyb3dzZXIvdW5mb2N1c2VkVmlld0RpbW1pbmdDb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDN0UsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hHLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQU8zRixJQUFNLGdDQUFnQyxHQUF0QyxNQUFNLGdDQUFpQyxTQUFRLFVBQVU7SUFJL0QsWUFBbUMsb0JBQTJDO1FBQzdFLEtBQUssRUFBRSxDQUFBO1FBSEEsNkJBQXdCLEdBQWdDLFNBQVMsQ0FBQTtRQUt4RSxJQUFJLENBQUMsU0FBUyxDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFOUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixLQUFLLENBQUMsZUFBZSxDQUFDLG9CQUFvQixDQUFDLHdCQUF3QixFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDMUUsSUFDQyxDQUFDO2dCQUNELENBQUMsQ0FBQyxDQUFDLG9CQUFvQixnR0FBcUQ7Z0JBQzVFLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixnR0FBcUQsRUFDM0UsQ0FBQztnQkFDRixPQUFNO1lB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