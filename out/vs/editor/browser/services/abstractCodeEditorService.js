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
import * as dom from '../../../base/browser/dom.js';
import * as domStylesheets from '../../../base/browser/domStylesheets.js';
import * as cssJs from '../../../base/browser/cssValue.js';
import { Emitter } from '../../../base/common/event.js';
import { DisposableStore, Disposable, toDisposable, DisposableMap, } from '../../../base/common/lifecycle.js';
import { LinkedList } from '../../../base/common/linkedList.js';
import * as strings from '../../../base/common/strings.js';
import { URI } from '../../../base/common/uri.js';
import { isThemeColor, } from '../../common/editorCommon.js';
import { OverviewRulerLane, } from '../../common/model.js';
import { IThemeService } from '../../../platform/theme/common/themeService.js';
let AbstractCodeEditorService = class AbstractCodeEditorService extends Disposable {
    constructor(_themeService) {
        super();
        this._themeService = _themeService;
        this._onWillCreateCodeEditor = this._register(new Emitter());
        this.onWillCreateCodeEditor = this._onWillCreateCodeEditor.event;
        this._onCodeEditorAdd = this._register(new Emitter());
        this.onCodeEditorAdd = this._onCodeEditorAdd.event;
        this._onCodeEditorRemove = this._register(new Emitter());
        this.onCodeEditorRemove = this._onCodeEditorRemove.event;
        this._onWillCreateDiffEditor = this._register(new Emitter());
        this.onWillCreateDiffEditor = this._onWillCreateDiffEditor.event;
        this._onDiffEditorAdd = this._register(new Emitter());
        this.onDiffEditorAdd = this._onDiffEditorAdd.event;
        this._onDiffEditorRemove = this._register(new Emitter());
        this.onDiffEditorRemove = this._onDiffEditorRemove.event;
        this._onDidChangeTransientModelProperty = this._register(new Emitter());
        this.onDidChangeTransientModelProperty = this._onDidChangeTransientModelProperty.event;
        this._onDecorationTypeRegistered = this._register(new Emitter());
        this.onDecorationTypeRegistered = this._onDecorationTypeRegistered.event;
        this._decorationOptionProviders = new Map();
        this._editorStyleSheets = new Map();
        this._codeEditorOpenHandlers = new LinkedList();
        this._transientWatchers = this._register(new DisposableMap());
        this._modelProperties = new Map();
        this._codeEditors = Object.create(null);
        this._diffEditors = Object.create(null);
        this._globalStyleSheet = null;
    }
    willCreateCodeEditor() {
        this._onWillCreateCodeEditor.fire();
    }
    addCodeEditor(editor) {
        this._codeEditors[editor.getId()] = editor;
        this._onCodeEditorAdd.fire(editor);
    }
    removeCodeEditor(editor) {
        if (delete this._codeEditors[editor.getId()]) {
            this._onCodeEditorRemove.fire(editor);
        }
    }
    listCodeEditors() {
        return Object.keys(this._codeEditors).map((id) => this._codeEditors[id]);
    }
    willCreateDiffEditor() {
        this._onWillCreateDiffEditor.fire();
    }
    addDiffEditor(editor) {
        this._diffEditors[editor.getId()] = editor;
        this._onDiffEditorAdd.fire(editor);
    }
    removeDiffEditor(editor) {
        if (delete this._diffEditors[editor.getId()]) {
            this._onDiffEditorRemove.fire(editor);
        }
    }
    listDiffEditors() {
        return Object.keys(this._diffEditors).map((id) => this._diffEditors[id]);
    }
    getFocusedCodeEditor() {
        let editorWithWidgetFocus = null;
        const editors = this.listCodeEditors();
        for (const editor of editors) {
            if (editor.hasTextFocus()) {
                // bingo!
                return editor;
            }
            if (editor.hasWidgetFocus()) {
                editorWithWidgetFocus = editor;
            }
        }
        return editorWithWidgetFocus;
    }
    _getOrCreateGlobalStyleSheet() {
        if (!this._globalStyleSheet) {
            this._globalStyleSheet = this._createGlobalStyleSheet();
        }
        return this._globalStyleSheet;
    }
    _createGlobalStyleSheet() {
        return new GlobalStyleSheet(domStylesheets.createStyleSheet());
    }
    _getOrCreateStyleSheet(editor) {
        if (!editor) {
            return this._getOrCreateGlobalStyleSheet();
        }
        const domNode = editor.getContainerDomNode();
        if (!dom.isInShadowDOM(domNode)) {
            return this._getOrCreateGlobalStyleSheet();
        }
        const editorId = editor.getId();
        if (!this._editorStyleSheets.has(editorId)) {
            const refCountedStyleSheet = new RefCountedStyleSheet(this, editorId, domStylesheets.createStyleSheet(domNode));
            this._editorStyleSheets.set(editorId, refCountedStyleSheet);
        }
        return this._editorStyleSheets.get(editorId);
    }
    _removeEditorStyleSheets(editorId) {
        this._editorStyleSheets.delete(editorId);
    }
    registerDecorationType(description, key, options, parentTypeKey, editor) {
        let provider = this._decorationOptionProviders.get(key);
        if (!provider) {
            const styleSheet = this._getOrCreateStyleSheet(editor);
            const providerArgs = {
                styleSheet: styleSheet,
                key: key,
                parentTypeKey: parentTypeKey,
                options: options || Object.create(null),
            };
            if (!parentTypeKey) {
                provider = new DecorationTypeOptionsProvider(description, this._themeService, styleSheet, providerArgs);
            }
            else {
                provider = new DecorationSubTypeOptionsProvider(this._themeService, styleSheet, providerArgs);
            }
            this._decorationOptionProviders.set(key, provider);
            this._onDecorationTypeRegistered.fire(key);
        }
        provider.refCount++;
        return {
            dispose: () => {
                this.removeDecorationType(key);
            },
        };
    }
    listDecorationTypes() {
        return Array.from(this._decorationOptionProviders.keys());
    }
    removeDecorationType(key) {
        const provider = this._decorationOptionProviders.get(key);
        if (provider) {
            provider.refCount--;
            if (provider.refCount <= 0) {
                this._decorationOptionProviders.delete(key);
                provider.dispose();
                this.listCodeEditors().forEach((ed) => ed.removeDecorationsByType(key));
            }
        }
    }
    resolveDecorationOptions(decorationTypeKey, writable) {
        const provider = this._decorationOptionProviders.get(decorationTypeKey);
        if (!provider) {
            throw new Error('Unknown decoration type key: ' + decorationTypeKey);
        }
        return provider.getOptions(this, writable);
    }
    resolveDecorationCSSRules(decorationTypeKey) {
        const provider = this._decorationOptionProviders.get(decorationTypeKey);
        if (!provider) {
            return null;
        }
        return provider.resolveDecorationCSSRules();
    }
    setModelProperty(resource, key, value) {
        const key1 = resource.toString();
        let dest;
        if (this._modelProperties.has(key1)) {
            dest = this._modelProperties.get(key1);
        }
        else {
            dest = new Map();
            this._modelProperties.set(key1, dest);
        }
        dest.set(key, value);
    }
    getModelProperty(resource, key) {
        const key1 = resource.toString();
        if (this._modelProperties.has(key1)) {
            const innerMap = this._modelProperties.get(key1);
            return innerMap.get(key);
        }
        return undefined;
    }
    setTransientModelProperty(model, key, value) {
        const uri = model.uri.toString();
        let w = this._transientWatchers.get(uri);
        if (!w) {
            w = new ModelTransientSettingWatcher(uri, model, this);
            this._transientWatchers.set(uri, w);
        }
        const previousValue = w.get(key);
        if (previousValue !== value) {
            w.set(key, value);
            this._onDidChangeTransientModelProperty.fire(model);
        }
    }
    getTransientModelProperty(model, key) {
        const uri = model.uri.toString();
        const watcher = this._transientWatchers.get(uri);
        if (!watcher) {
            return undefined;
        }
        return watcher.get(key);
    }
    getTransientModelProperties(model) {
        const uri = model.uri.toString();
        const watcher = this._transientWatchers.get(uri);
        if (!watcher) {
            return undefined;
        }
        return watcher.keys().map((key) => [key, watcher.get(key)]);
    }
    _removeWatcher(w) {
        this._transientWatchers.deleteAndDispose(w.uri);
    }
    async openCodeEditor(input, source, sideBySide) {
        for (const handler of this._codeEditorOpenHandlers) {
            const candidate = await handler(input, source, sideBySide);
            if (candidate !== null) {
                return candidate;
            }
        }
        return null;
    }
    registerCodeEditorOpenHandler(handler) {
        const rm = this._codeEditorOpenHandlers.unshift(handler);
        return toDisposable(rm);
    }
};
AbstractCodeEditorService = __decorate([
    __param(0, IThemeService)
], AbstractCodeEditorService);
export { AbstractCodeEditorService };
export class ModelTransientSettingWatcher extends Disposable {
    constructor(uri, model, owner) {
        super();
        this.uri = uri;
        this._values = {};
        this._register(model.onWillDispose(() => owner._removeWatcher(this)));
    }
    set(key, value) {
        this._values[key] = value;
    }
    get(key) {
        return this._values[key];
    }
    keys() {
        return Object.keys(this._values);
    }
}
class RefCountedStyleSheet {
    get sheet() {
        return this._styleSheet.sheet;
    }
    constructor(parent, editorId, styleSheet) {
        this._parent = parent;
        this._editorId = editorId;
        this._styleSheet = styleSheet;
        this._refCount = 0;
    }
    ref() {
        this._refCount++;
    }
    unref() {
        this._refCount--;
        if (this._refCount === 0) {
            this._styleSheet.remove();
            this._parent._removeEditorStyleSheets(this._editorId);
        }
    }
    insertRule(selector, rule) {
        domStylesheets.createCSSRule(selector, rule, this._styleSheet);
    }
    removeRulesContainingSelector(ruleName) {
        domStylesheets.removeCSSRulesContainingSelector(ruleName, this._styleSheet);
    }
}
export class GlobalStyleSheet {
    get sheet() {
        return this._styleSheet.sheet;
    }
    constructor(styleSheet) {
        this._styleSheet = styleSheet;
    }
    ref() { }
    unref() { }
    insertRule(selector, rule) {
        domStylesheets.createCSSRule(selector, rule, this._styleSheet);
    }
    removeRulesContainingSelector(ruleName) {
        domStylesheets.removeCSSRulesContainingSelector(ruleName, this._styleSheet);
    }
}
class DecorationSubTypeOptionsProvider {
    constructor(themeService, styleSheet, providerArgs) {
        this._styleSheet = styleSheet;
        this._styleSheet.ref();
        this._parentTypeKey = providerArgs.parentTypeKey;
        this.refCount = 0;
        this._beforeContentRules = new DecorationCSSRules(3 /* ModelDecorationCSSRuleType.BeforeContentClassName */, providerArgs, themeService);
        this._afterContentRules = new DecorationCSSRules(4 /* ModelDecorationCSSRuleType.AfterContentClassName */, providerArgs, themeService);
    }
    getOptions(codeEditorService, writable) {
        const options = codeEditorService.resolveDecorationOptions(this._parentTypeKey, true);
        if (this._beforeContentRules) {
            options.beforeContentClassName = this._beforeContentRules.className;
        }
        if (this._afterContentRules) {
            options.afterContentClassName = this._afterContentRules.className;
        }
        return options;
    }
    resolveDecorationCSSRules() {
        return this._styleSheet.sheet.cssRules;
    }
    dispose() {
        if (this._beforeContentRules) {
            this._beforeContentRules.dispose();
            this._beforeContentRules = null;
        }
        if (this._afterContentRules) {
            this._afterContentRules.dispose();
            this._afterContentRules = null;
        }
        this._styleSheet.unref();
    }
}
class DecorationTypeOptionsProvider {
    constructor(description, themeService, styleSheet, providerArgs) {
        this._disposables = new DisposableStore();
        this.description = description;
        this._styleSheet = styleSheet;
        this._styleSheet.ref();
        this.refCount = 0;
        const createCSSRules = (type) => {
            const rules = new DecorationCSSRules(type, providerArgs, themeService);
            this._disposables.add(rules);
            if (rules.hasContent) {
                return rules.className;
            }
            return undefined;
        };
        const createInlineCSSRules = (type) => {
            const rules = new DecorationCSSRules(type, providerArgs, themeService);
            this._disposables.add(rules);
            if (rules.hasContent) {
                return { className: rules.className, hasLetterSpacing: rules.hasLetterSpacing };
            }
            return null;
        };
        this.className = createCSSRules(0 /* ModelDecorationCSSRuleType.ClassName */);
        const inlineData = createInlineCSSRules(1 /* ModelDecorationCSSRuleType.InlineClassName */);
        if (inlineData) {
            this.inlineClassName = inlineData.className;
            this.inlineClassNameAffectsLetterSpacing = inlineData.hasLetterSpacing;
        }
        this.beforeContentClassName = createCSSRules(3 /* ModelDecorationCSSRuleType.BeforeContentClassName */);
        this.afterContentClassName = createCSSRules(4 /* ModelDecorationCSSRuleType.AfterContentClassName */);
        if (providerArgs.options.beforeInjectedText &&
            providerArgs.options.beforeInjectedText.contentText) {
            const beforeInlineData = createInlineCSSRules(5 /* ModelDecorationCSSRuleType.BeforeInjectedTextClassName */);
            this.beforeInjectedText = {
                content: providerArgs.options.beforeInjectedText.contentText,
                inlineClassName: beforeInlineData?.className,
                inlineClassNameAffectsLetterSpacing: beforeInlineData?.hasLetterSpacing ||
                    providerArgs.options.beforeInjectedText.affectsLetterSpacing,
            };
        }
        if (providerArgs.options.afterInjectedText &&
            providerArgs.options.afterInjectedText.contentText) {
            const afterInlineData = createInlineCSSRules(6 /* ModelDecorationCSSRuleType.AfterInjectedTextClassName */);
            this.afterInjectedText = {
                content: providerArgs.options.afterInjectedText.contentText,
                inlineClassName: afterInlineData?.className,
                inlineClassNameAffectsLetterSpacing: afterInlineData?.hasLetterSpacing ||
                    providerArgs.options.afterInjectedText.affectsLetterSpacing,
            };
        }
        this.glyphMarginClassName = createCSSRules(2 /* ModelDecorationCSSRuleType.GlyphMarginClassName */);
        const options = providerArgs.options;
        this.isWholeLine = Boolean(options.isWholeLine);
        this.stickiness = options.rangeBehavior;
        const lightOverviewRulerColor = (options.light && options.light.overviewRulerColor) || options.overviewRulerColor;
        const darkOverviewRulerColor = (options.dark && options.dark.overviewRulerColor) || options.overviewRulerColor;
        if (typeof lightOverviewRulerColor !== 'undefined' ||
            typeof darkOverviewRulerColor !== 'undefined') {
            this.overviewRuler = {
                color: lightOverviewRulerColor || darkOverviewRulerColor,
                darkColor: darkOverviewRulerColor || lightOverviewRulerColor,
                position: options.overviewRulerLane || OverviewRulerLane.Center,
            };
        }
    }
    getOptions(codeEditorService, writable) {
        if (!writable) {
            return this;
        }
        return {
            description: this.description,
            inlineClassName: this.inlineClassName,
            beforeContentClassName: this.beforeContentClassName,
            afterContentClassName: this.afterContentClassName,
            className: this.className,
            glyphMarginClassName: this.glyphMarginClassName,
            isWholeLine: this.isWholeLine,
            overviewRuler: this.overviewRuler,
            stickiness: this.stickiness,
            before: this.beforeInjectedText,
            after: this.afterInjectedText,
        };
    }
    resolveDecorationCSSRules() {
        return this._styleSheet.sheet.rules;
    }
    dispose() {
        this._disposables.dispose();
        this._styleSheet.unref();
    }
}
export const _CSS_MAP = {
    color: 'color:{0} !important;',
    opacity: 'opacity:{0};',
    backgroundColor: 'background-color:{0};',
    outline: 'outline:{0};',
    outlineColor: 'outline-color:{0};',
    outlineStyle: 'outline-style:{0};',
    outlineWidth: 'outline-width:{0};',
    border: 'border:{0};',
    borderColor: 'border-color:{0};',
    borderRadius: 'border-radius:{0};',
    borderSpacing: 'border-spacing:{0};',
    borderStyle: 'border-style:{0};',
    borderWidth: 'border-width:{0};',
    fontStyle: 'font-style:{0};',
    fontWeight: 'font-weight:{0};',
    fontSize: 'font-size:{0};',
    fontFamily: 'font-family:{0};',
    textDecoration: 'text-decoration:{0};',
    cursor: 'cursor:{0};',
    letterSpacing: 'letter-spacing:{0};',
    gutterIconPath: 'background:{0} center center no-repeat;',
    gutterIconSize: 'background-size:{0};',
    contentText: "content:'{0}';",
    contentIconPath: 'content:{0};',
    margin: 'margin:{0};',
    padding: 'padding:{0};',
    width: 'width:{0};',
    height: 'height:{0};',
    verticalAlign: 'vertical-align:{0};',
};
class DecorationCSSRules {
    constructor(ruleType, providerArgs, themeService) {
        this._theme = themeService.getColorTheme();
        this._ruleType = ruleType;
        this._providerArgs = providerArgs;
        this._usesThemeColors = false;
        this._hasContent = false;
        this._hasLetterSpacing = false;
        let className = CSSNameHelper.getClassName(this._providerArgs.key, ruleType);
        if (this._providerArgs.parentTypeKey) {
            className =
                className + ' ' + CSSNameHelper.getClassName(this._providerArgs.parentTypeKey, ruleType);
        }
        this._className = className;
        this._unThemedSelector = CSSNameHelper.getSelector(this._providerArgs.key, this._providerArgs.parentTypeKey, ruleType);
        this._buildCSS();
        if (this._usesThemeColors) {
            this._themeListener = themeService.onDidColorThemeChange((theme) => {
                this._theme = themeService.getColorTheme();
                this._removeCSS();
                this._buildCSS();
            });
        }
        else {
            this._themeListener = null;
        }
    }
    dispose() {
        if (this._hasContent) {
            this._removeCSS();
            this._hasContent = false;
        }
        if (this._themeListener) {
            this._themeListener.dispose();
            this._themeListener = null;
        }
    }
    get hasContent() {
        return this._hasContent;
    }
    get hasLetterSpacing() {
        return this._hasLetterSpacing;
    }
    get className() {
        return this._className;
    }
    _buildCSS() {
        const options = this._providerArgs.options;
        let unthemedCSS, lightCSS, darkCSS;
        switch (this._ruleType) {
            case 0 /* ModelDecorationCSSRuleType.ClassName */:
                unthemedCSS = this.getCSSTextForModelDecorationClassName(options);
                lightCSS = this.getCSSTextForModelDecorationClassName(options.light);
                darkCSS = this.getCSSTextForModelDecorationClassName(options.dark);
                break;
            case 1 /* ModelDecorationCSSRuleType.InlineClassName */:
                unthemedCSS = this.getCSSTextForModelDecorationInlineClassName(options);
                lightCSS = this.getCSSTextForModelDecorationInlineClassName(options.light);
                darkCSS = this.getCSSTextForModelDecorationInlineClassName(options.dark);
                break;
            case 2 /* ModelDecorationCSSRuleType.GlyphMarginClassName */:
                unthemedCSS = this.getCSSTextForModelDecorationGlyphMarginClassName(options);
                lightCSS = this.getCSSTextForModelDecorationGlyphMarginClassName(options.light);
                darkCSS = this.getCSSTextForModelDecorationGlyphMarginClassName(options.dark);
                break;
            case 3 /* ModelDecorationCSSRuleType.BeforeContentClassName */:
                unthemedCSS = this.getCSSTextForModelDecorationContentClassName(options.before);
                lightCSS = this.getCSSTextForModelDecorationContentClassName(options.light && options.light.before);
                darkCSS = this.getCSSTextForModelDecorationContentClassName(options.dark && options.dark.before);
                break;
            case 4 /* ModelDecorationCSSRuleType.AfterContentClassName */:
                unthemedCSS = this.getCSSTextForModelDecorationContentClassName(options.after);
                lightCSS = this.getCSSTextForModelDecorationContentClassName(options.light && options.light.after);
                darkCSS = this.getCSSTextForModelDecorationContentClassName(options.dark && options.dark.after);
                break;
            case 5 /* ModelDecorationCSSRuleType.BeforeInjectedTextClassName */:
                unthemedCSS = this.getCSSTextForModelDecorationContentClassName(options.beforeInjectedText);
                lightCSS = this.getCSSTextForModelDecorationContentClassName(options.light && options.light.beforeInjectedText);
                darkCSS = this.getCSSTextForModelDecorationContentClassName(options.dark && options.dark.beforeInjectedText);
                break;
            case 6 /* ModelDecorationCSSRuleType.AfterInjectedTextClassName */:
                unthemedCSS = this.getCSSTextForModelDecorationContentClassName(options.afterInjectedText);
                lightCSS = this.getCSSTextForModelDecorationContentClassName(options.light && options.light.afterInjectedText);
                darkCSS = this.getCSSTextForModelDecorationContentClassName(options.dark && options.dark.afterInjectedText);
                break;
            default:
                throw new Error('Unknown rule type: ' + this._ruleType);
        }
        const sheet = this._providerArgs.styleSheet;
        let hasContent = false;
        if (unthemedCSS.length > 0) {
            sheet.insertRule(this._unThemedSelector, unthemedCSS);
            hasContent = true;
        }
        if (lightCSS.length > 0) {
            sheet.insertRule(`.vs${this._unThemedSelector}, .hc-light${this._unThemedSelector}`, lightCSS);
            hasContent = true;
        }
        if (darkCSS.length > 0) {
            sheet.insertRule(`.vs-dark${this._unThemedSelector}, .hc-black${this._unThemedSelector}`, darkCSS);
            hasContent = true;
        }
        this._hasContent = hasContent;
    }
    _removeCSS() {
        this._providerArgs.styleSheet.removeRulesContainingSelector(this._unThemedSelector);
    }
    /**
     * Build the CSS for decorations styled via `className`.
     */
    getCSSTextForModelDecorationClassName(opts) {
        if (!opts) {
            return '';
        }
        const cssTextArr = [];
        this.collectCSSText(opts, ['backgroundColor'], cssTextArr);
        this.collectCSSText(opts, ['outline', 'outlineColor', 'outlineStyle', 'outlineWidth'], cssTextArr);
        this.collectBorderSettingsCSSText(opts, cssTextArr);
        return cssTextArr.join('');
    }
    /**
     * Build the CSS for decorations styled via `inlineClassName`.
     */
    getCSSTextForModelDecorationInlineClassName(opts) {
        if (!opts) {
            return '';
        }
        const cssTextArr = [];
        this.collectCSSText(opts, ['fontStyle', 'fontWeight', 'textDecoration', 'cursor', 'color', 'opacity', 'letterSpacing'], cssTextArr);
        if (opts.letterSpacing) {
            this._hasLetterSpacing = true;
        }
        return cssTextArr.join('');
    }
    /**
     * Build the CSS for decorations styled before or after content.
     */
    getCSSTextForModelDecorationContentClassName(opts) {
        if (!opts) {
            return '';
        }
        const cssTextArr = [];
        if (typeof opts !== 'undefined') {
            this.collectBorderSettingsCSSText(opts, cssTextArr);
            if (typeof opts.contentIconPath !== 'undefined') {
                cssTextArr.push(strings.format(_CSS_MAP.contentIconPath, cssJs.asCSSUrl(URI.revive(opts.contentIconPath))));
            }
            if (typeof opts.contentText === 'string') {
                const truncated = opts.contentText.match(/^.*$/m)[0]; // only take first line
                const escaped = truncated.replace(/['\\]/g, '\\$&');
                cssTextArr.push(strings.format(_CSS_MAP.contentText, escaped));
            }
            this.collectCSSText(opts, [
                'verticalAlign',
                'fontStyle',
                'fontWeight',
                'fontSize',
                'fontFamily',
                'textDecoration',
                'color',
                'opacity',
                'backgroundColor',
                'margin',
                'padding',
            ], cssTextArr);
            if (this.collectCSSText(opts, ['width', 'height'], cssTextArr)) {
                cssTextArr.push('display:inline-block;');
            }
        }
        return cssTextArr.join('');
    }
    /**
     * Build the CSS for decorations styled via `glyphMarginClassName`.
     */
    getCSSTextForModelDecorationGlyphMarginClassName(opts) {
        if (!opts) {
            return '';
        }
        const cssTextArr = [];
        if (typeof opts.gutterIconPath !== 'undefined') {
            cssTextArr.push(strings.format(_CSS_MAP.gutterIconPath, cssJs.asCSSUrl(URI.revive(opts.gutterIconPath))));
            if (typeof opts.gutterIconSize !== 'undefined') {
                cssTextArr.push(strings.format(_CSS_MAP.gutterIconSize, opts.gutterIconSize));
            }
        }
        return cssTextArr.join('');
    }
    collectBorderSettingsCSSText(opts, cssTextArr) {
        if (this.collectCSSText(opts, ['border', 'borderColor', 'borderRadius', 'borderSpacing', 'borderStyle', 'borderWidth'], cssTextArr)) {
            cssTextArr.push(strings.format('box-sizing: border-box;'));
            return true;
        }
        return false;
    }
    collectCSSText(opts, properties, cssTextArr) {
        const lenBefore = cssTextArr.length;
        for (const property of properties) {
            const value = this.resolveValue(opts[property]);
            if (typeof value === 'string') {
                cssTextArr.push(strings.format(_CSS_MAP[property], value));
            }
        }
        return cssTextArr.length !== lenBefore;
    }
    resolveValue(value) {
        if (isThemeColor(value)) {
            this._usesThemeColors = true;
            const color = this._theme.getColor(value.id);
            if (color) {
                return color.toString();
            }
            return 'transparent';
        }
        return value;
    }
}
var ModelDecorationCSSRuleType;
(function (ModelDecorationCSSRuleType) {
    ModelDecorationCSSRuleType[ModelDecorationCSSRuleType["ClassName"] = 0] = "ClassName";
    ModelDecorationCSSRuleType[ModelDecorationCSSRuleType["InlineClassName"] = 1] = "InlineClassName";
    ModelDecorationCSSRuleType[ModelDecorationCSSRuleType["GlyphMarginClassName"] = 2] = "GlyphMarginClassName";
    ModelDecorationCSSRuleType[ModelDecorationCSSRuleType["BeforeContentClassName"] = 3] = "BeforeContentClassName";
    ModelDecorationCSSRuleType[ModelDecorationCSSRuleType["AfterContentClassName"] = 4] = "AfterContentClassName";
    ModelDecorationCSSRuleType[ModelDecorationCSSRuleType["BeforeInjectedTextClassName"] = 5] = "BeforeInjectedTextClassName";
    ModelDecorationCSSRuleType[ModelDecorationCSSRuleType["AfterInjectedTextClassName"] = 6] = "AfterInjectedTextClassName";
})(ModelDecorationCSSRuleType || (ModelDecorationCSSRuleType = {}));
class CSSNameHelper {
    static getClassName(key, type) {
        return 'ced-' + key + '-' + type;
    }
    static getSelector(key, parentKey, ruleType) {
        let selector = '.monaco-editor .' + this.getClassName(key, ruleType);
        if (parentKey) {
            selector = selector + '.' + this.getClassName(parentKey, ruleType);
        }
        if (ruleType === 3 /* ModelDecorationCSSRuleType.BeforeContentClassName */) {
            selector += '::before';
        }
        else if (ruleType === 4 /* ModelDecorationCSSRuleType.AfterContentClassName */) {
            selector += '::after';
        }
        return selector;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWJzdHJhY3RDb2RlRWRpdG9yU2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9icm93c2VyL3NlcnZpY2VzL2Fic3RyYWN0Q29kZUVkaXRvclNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSw4QkFBOEIsQ0FBQTtBQUNuRCxPQUFPLEtBQUssY0FBYyxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sS0FBSyxLQUFLLE1BQU0sbUNBQW1DLENBQUE7QUFDMUQsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLCtCQUErQixDQUFBO0FBQzlELE9BQU8sRUFFTixlQUFlLEVBQ2YsVUFBVSxFQUNWLFlBQVksRUFDWixhQUFhLEdBQ2IsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDL0QsT0FBTyxLQUFLLE9BQU8sTUFBTSxpQ0FBaUMsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFHakQsT0FBTyxFQUlOLFlBQVksR0FDWixNQUFNLDhCQUE4QixDQUFBO0FBQ3JDLE9BQU8sRUFLTixpQkFBaUIsR0FFakIsTUFBTSx1QkFBdUIsQ0FBQTtBQUU5QixPQUFPLEVBQWUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFHcEYsSUFBZSx5QkFBeUIsR0FBeEMsTUFBZSx5QkFBMEIsU0FBUSxVQUFVO0lBK0NqRSxZQUEyQixhQUE2QztRQUN2RSxLQUFLLEVBQUUsQ0FBQTtRQURvQyxrQkFBYSxHQUFiLGFBQWEsQ0FBZTtRQTVDdkQsNEJBQXVCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLE9BQU8sRUFBUSxDQUFDLENBQUE7UUFDOUQsMkJB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