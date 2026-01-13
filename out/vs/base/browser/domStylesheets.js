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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZG9tU3R5bGVzaGVldHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvYnJvd3Nlci9kb21TdHlsZXNoZWV0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBZSxNQUFNLHdCQUF3QixDQUFBO0FBQ25GLE9BQU8sRUFBRSxVQUFVLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxVQUFVLENBQUE7QUFDN0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGFBQWEsQ0FBQTtBQUV4QyxNQUFNLGlCQUFpQixHQUFHLElBQUksR0FBRyxFQUc5QixDQUFBO0FBRUgsTUFBTSxVQUFVLGtCQUFrQixDQUFDLElBQVU7SUFDNUMsT0FBTyxpQkFBaUIsQ0FBQyxHQUFHLENBQUMsSUFBd0IsQ0FBQyxDQUFBO0FBQ3ZELENBQUM7QUFFRDs7R0FFRztBQUNILE1BQU0sVUFBVSxpQkFBaUI7SUFDaEMsT0FBTyxJQUFJLG1CQUFtQixFQUFFLENBQUE7QUFDakMsQ0FBQztBQUVELE1BQU0sbUJBQW1CO0lBQXpCO1FBQ1MscUJBQWdCLEdBQUcsRUFBRSxDQUFBO1FBQ3JCLGdCQUFXLEdBQWlDLFNBQVMsQ0FBQTtJQXFCOUQsQ0FBQztJQW5CTyxRQUFRLENBQUMsUUFBZ0I7UUFDL0IsSUFBSSxRQUFRLEtBQUssSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDeEMsT0FBTTtRQUNQLENBQUM7UUFDRCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsUUFBUSxDQUFBO1FBRWhDLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7WUFDdkIsSUFBSSxDQUFDLFdBQVcsR0FBRyxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxDQUFD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