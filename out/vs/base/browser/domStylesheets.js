/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DisposableStore, toDisposable } from '../common/lifecycle.js';
import { getWindows, sharedMutationObserver } from './dom.js';
import { mainWindow } from './window.js';
const globalStylesheets = new Map();
export function isGlobalStylesheet(node) {
    return globalStylesheets.has(node);
}
/**
 * A version of createStyleSheet which has a unified API to initialize/set the style content.
 */
export function createStyleSheet2() {
    return new WrappedStyleElement();
}
class WrappedStyleElement {
    constructor() {
        this._currentCssStyle = '';
        this._styleSheet = undefined;
    }
    setStyle(cssStyle) {
        if (cssStyle === this._currentCssStyle) {
            return;
        }
        this._currentCssStyle = cssStyle;
        if (!this._styleSheet) {
            this._styleSheet = createStyleSheet(mainWindow.document.head, (s) => (s.innerText = cssStyle));
        }
        else {
            this._styleSheet.innerText = cssStyle;
        }
    }
    dispose() {
        if (this._styleSheet) {
            this._styleSheet.remove();
            this._styleSheet = undefined;
        }
    }
}
export function createStyleSheet(container = mainWindow.document.head, beforeAppend, disposableStore) {
    const style = document.createElement('style');
    style.type = 'text/css';
    style.media = 'screen';
    beforeAppend?.(style);
    container.appendChild(style);
    if (disposableStore) {
        disposableStore.add(toDisposable(() => style.remove()));
    }
    // With <head> as container, the stylesheet becomes global and is tracked
    // to support auxiliary windows to clone the stylesheet.
    if (container === mainWindow.document.head) {
        const globalStylesheetClones = new Set();
        globalStylesheets.set(style, globalStylesheetClones);
        for (const { window: targetWindow, disposables } of getWindows()) {
            if (targetWindow === mainWindow) {
                continue; // main window is already tracked
            }
            const cloneDisposable = disposables.add(cloneGlobalStyleSheet(style, globalStylesheetClones, targetWindow));
            disposableStore?.add(cloneDisposable);
        }
    }
    return style;
}
export function cloneGlobalStylesheets(targetWindow) {
    const disposables = new DisposableStore();
    for (const [globalStylesheet, clonedGlobalStylesheets] of globalStylesheets) {
        disposables.add(cloneGlobalStyleSheet(globalStylesheet, clonedGlobalStylesheets, targetWindow));
    }
    return disposables;
}
function cloneGlobalStyleSheet(globalStylesheet, globalStylesheetClones, targetWindow) {
    const disposables = new DisposableStore();
    const clone = globalStylesheet.cloneNode(true);
    targetWindow.document.head.appendChild(clone);
    disposables.add(toDisposable(() => clone.remove()));
    for (const rule of getDynamicStyleSheetRules(globalStylesheet)) {
        clone.sheet?.insertRule(rule.cssText, clone.sheet?.cssRules.length);
    }
    disposables.add(sharedMutationObserver.observe(globalStylesheet, disposables, { childList: true })(() => {
        clone.textContent = globalStylesheet.textContent;
    }));
    globalStylesheetClones.add(clone);
    disposables.add(toDisposable(() => globalStylesheetClones.delete(clone)));
    return disposables;
}
let _sharedStyleSheet = null;
function getSharedStyleSheet() {
    if (!_sharedStyleSheet) {
        _sharedStyleSheet = createStyleSheet();
    }
    return _sharedStyleSheet;
}
function getDynamicStyleSheetRules(style) {
    if (style?.sheet?.rules) {
        // Chrome, IE
        return style.sheet.rules;
    }
    if (style?.sheet?.cssRules) {
        // FF
        return style.sheet.cssRules;
    }
    return [];
}
export function createCSSRule(selector, cssText, style = getSharedStyleSheet()) {
    if (!style || !cssText) {
        return;
    }
    style.sheet?.insertRule(`${selector} {${cssText}}`, 0);
    // Apply rule also to all cloned global stylesheets
    for (const clonedGlobalStylesheet of globalStylesheets.get(style) ?? []) {
        createCSSRule(selector, cssText, clonedGlobalStylesheet);
    }
}
export function removeCSSRulesContainingSelector(ruleName, style = getSharedStyleSheet()) {
    if (!style) {
        return;
    }
    const rules = getDynamicStyleSheetRules(style);
    const toDelete = [];
    for (let i = 0; i < rules.length; i++) {
        const rule = rules[i];
        if (isCSSStyleRule(rule) && rule.selectorText.indexOf(ruleName) !== -1) {
            toDelete.push(i);
        }
    }
    for (let i = toDelete.length - 1; i >= 0; i--) {
        style.sheet?.deleteRule(toDelete[i]);
    }
    // Remove rules also from all cloned global stylesheets
    for (const clonedGlobalStylesheet of globalStylesheets.get(style) ?? []) {
        removeCSSRulesContainingSelector(ruleName, clonedGlobalStylesheet);
    }
}
function isCSSStyleRule(rule) {
    return typeof rule.selectorText === 'string';
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tU3R5bGVzaGVldHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvZG9tU3R5bGVzaGVldHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQWUsTUFBTSx3QkFBd0IsQ0FBQTtBQUNuRixPQUFPLEVBQUUsVUFBVSxFQUFFLHNCQUFzQixFQUFFLE1BQU0sVUFBVSxDQUFBO0FBQzdELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxhQUFhLENBQUE7QUFFeEMsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLEdBQUcsRUFHOUIsQ0FBQTtBQUVILE1BQU0sVUFBVSxrQkFBa0IsQ0FBQyxJQUFVO0lBQzVDLE9BQU8saUJBQWlCLENBQUMsR0FBRyxDQUFDLElBQXdCLENBQUMsQ0FBQTtBQUN2RCxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxNQUFNLFVBQVUsaUJBQWlCO0lBQ2hDLE9BQU8sSUFBSSxtQkFBbUIsRUFBRSxDQUFBO0FBQ2pDLENBQUM7QUFFRCxNQUFNLG1CQUFtQjtJQUF6QjtRQUNTLHFCQUFnQixHQUFHLEVBQUUsQ0FBQTtRQUNyQixnQkFBVyxHQUFpQyxTQUFTLENBQUE7SUFxQjlELENBQUM7SUFuQk8sUUFBUSxDQUFDLFFBQWdCO1FBQy9CLElBQUksUUFBUSxLQUFLLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3hDLE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxDQUFDLGdCQUFnQixHQUFHLFFBQVEsQ0FBQTtRQUVoQyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3ZCLElBQUksQ0FBQyxXQUFXLEdBQUcsZ0JBQWdCLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENB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