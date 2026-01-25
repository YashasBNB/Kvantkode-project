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
var InspectEditorTokensController_1;
import './inspectEditorTokens.css';
import * as nls from '../../../../../nls.js';
import * as dom from '../../../../../base/browser/dom.js';
import { Color } from '../../../../../base/common/color.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { EditorAction, registerEditorAction, registerEditorContribution, } from '../../../../../editor/browser/editorExtensions.js';
import { Range } from '../../../../../editor/common/core/range.js';
import { TreeSitterTokenizationRegistry, } from '../../../../../editor/common/languages.js';
import { TokenMetadata, } from '../../../../../editor/common/encodedTokenAttributes.js';
import { ILanguageService } from '../../../../../editor/common/languages/language.js';
import { INotificationService } from '../../../../../platform/notification/common/notification.js';
import { findMatchingThemeRule } from '../../../../services/textMate/common/TMHelper.js';
import { ITextMateTokenizationService } from '../../../../services/textMate/browser/textMateTokenizationFeature.js';
import { IWorkbenchThemeService } from '../../../../services/themes/common/workbenchThemeService.js';
import { CancellationTokenSource } from '../../../../../base/common/cancellation.js';
import { SemanticTokenRule, } from '../../../../../platform/theme/common/tokenClassificationRegistry.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { SEMANTIC_HIGHLIGHTING_SETTING_ID, } from '../../../../../editor/contrib/semanticTokens/common/semanticTokensConfig.js';
import { Schemas } from '../../../../../base/common/network.js';
import { ILanguageFeaturesService } from '../../../../../editor/common/services/languageFeatures.js';
import { ITreeSitterParserService, } from '../../../../../editor/common/services/treeSitterParserService.js';
const $ = dom.$;
let InspectEditorTokensController = class InspectEditorTokensController extends Disposable {
    static { InspectEditorTokensController_1 = this; }
    static { this.ID = 'editor.contrib.inspectEditorTokens'; }
    static get(editor) {
        return editor.getContribution(InspectEditorTokensController_1.ID);
    }
    constructor(editor, textMateService, treeSitterService, languageService, themeService, notificationService, configurationService, languageFeaturesService) {
        super();
        this._editor = editor;
        this._textMateService = textMateService;
        this._treeSitterService = treeSitterService;
        this._themeService = themeService;
        this._languageService = languageService;
        this._notificationService = notificationService;
        this._configurationService = configurationService;
        this._languageFeaturesService = languageFeaturesService;
        this._widget = null;
        this._register(this._editor.onDidChangeModel((e) => this.stop()));
        this._register(this._editor.onDidChangeModelLanguage((e) => this.stop()));
        this._register(this._editor.onKeyUp((e) => e.keyCode === 9 /* KeyCode.Escape */ && this.stop()));
    }
    dispose() {
        this.stop();
        super.dispose();
    }
    launch() {
        if (this._widget) {
            return;
        }
        if (!this._editor.hasModel()) {
            return;
        }
        if (this._editor.getModel().uri.scheme === Schemas.vscodeNotebookCell) {
            // disable in notebooks
            return;
        }
        this._widget = new InspectEditorTokensWidget(this._editor, this._textMateService, this._treeSitterService, this._languageService, this._themeService, this._notificationService, this._configurationService, this._languageFeaturesService);
    }
    stop() {
        if (this._widget) {
            this._widget.dispose();
            this._widget = null;
        }
    }
    toggle() {
        if (!this._widget) {
            this.launch();
        }
        else {
            this.stop();
        }
    }
};
InspectEditorTokensController = InspectEditorTokensController_1 = __decorate([
    __param(1, ITextMateTokenizationService),
    __param(2, ITreeSitterParserService),
    __param(3, ILanguageService),
    __param(4, IWorkbenchThemeService),
    __param(5, INotificationService),
    __param(6, IConfigurationService),
    __param(7, ILanguageFeaturesService)
], InspectEditorTokensController);
export { InspectEditorTokensController };
class InspectEditorTokens extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.inspectTMScopes',
            label: nls.localize2('inspectEditorTokens', 'Developer: Inspect Editor Tokens and Scopes'),
            precondition: undefined,
        });
    }
    run(accessor, editor) {
        const controller = InspectEditorTokensController.get(editor);
        controller?.toggle();
    }
}
function renderTokenText(tokenText) {
    if (tokenText.length > 40) {
        tokenText = tokenText.substr(0, 20) + '…' + tokenText.substr(tokenText.length - 20);
    }
    let result = '';
    for (let charIndex = 0, len = tokenText.length; charIndex < len; charIndex++) {
        const charCode = tokenText.charCodeAt(charIndex);
        switch (charCode) {
            case 9 /* CharCode.Tab */:
                result += '\u2192'; // &rarr;
                break;
            case 32 /* CharCode.Space */:
                result += '\u00B7'; // &middot;
                break;
            default:
                result += String.fromCharCode(charCode);
        }
    }
    return result;
}
class InspectEditorTokensWidget extends Disposable {
    static { this._ID = 'editor.contrib.inspectEditorTokensWidget'; }
    constructor(editor, textMateService, treeSitterService, languageService, themeService, notificationService, configurationService, languageFeaturesService) {
        super();
        // Editor.IContentWidget.allowEditorOverflow
        this.allowEditorOverflow = true;
        this._isDisposed = false;
        this._editor = editor;
        this._languageService = languageService;
        this._themeService = themeService;
        this._textMateService = textMateService;
        this._treeSitterService = treeSitterService;
        this._notificationService = notificationService;
        this._configurationService = configurationService;
        this._languageFeaturesService = languageFeaturesService;
        this._model = this._editor.getModel();
        this._domNode = document.createElement('div');
        this._domNode.className = 'token-inspect-widget';
        this._currentRequestCancellationTokenSource = new CancellationTokenSource();
        this._beginCompute(this._editor.getPosition());
        this._register(this._editor.onDidChangeCursorPosition((e) => this._beginCompute(this._editor.getPosition())));
        this._register(themeService.onDidColorThemeChange((_) => this._beginCompute(this._editor.getPosition())));
        this._register(configurationService.onDidChangeConfiguration((e) => e.affectsConfiguration('editor.semanticHighlighting.enabled') &&
            this._beginCompute(this._editor.getPosition())));
        this._editor.addContentWidget(this);
    }
    dispose() {
        this._isDisposed = true;
        this._editor.removeContentWidget(this);
        this._currentRequestCancellationTokenSource.cancel();
        super.dispose();
    }
    getId() {
        return InspectEditorTokensWidget._ID;
    }
    _beginCompute(position) {
        const grammar = this._textMateService.createTokenizer(this._model.getLanguageId());
        const semanticTokens = this._computeSemanticTokens(position);
        const tree = this._treeSitterService.getParseResult(this._model);
        dom.clearNode(this._domNode);
        this._domNode.appendChild(document.createTextNode(nls.localize('inspectTMScopesWidget.loading', 'Loading...')));
        Promise.all([grammar, semanticTokens]).then(([grammar, semanticTokens]) => {
            if (this._isDisposed) {
                return;
            }
            this._compute(grammar, semanticTokens, tree, position);
            this._domNode.style.maxWidth = `${Math.max(this._editor.getLayoutInfo().width * 0.66, 500)}px`;
            this._editor.layoutContentWidget(this);
        }, (err) => {
            this._notificationService.warn(err);
            setTimeout(() => {
                InspectEditorTokensController.get(this._editor)?.stop();
            });
        });
    }
    _isSemanticColoringEnabled() {
        const setting = this._configurationService.getValue(SEMANTIC_HIGHLIGHTING_SETTING_ID, { overrideIdentifier: this._model.getLanguageId(), resource: this._model.uri })?.enabled;
        if (typeof setting === 'boolean') {
            return setting;
        }
        return this._themeService.getColorTheme().semanticHighlighting;
    }
    _compute(grammar, semanticTokens, tree, position) {
        const textMateTokenInfo = grammar && this._getTokensAtPosition(grammar, position);
        const semanticTokenInfo = semanticTokens && this._getSemanticTokenAtPosition(semanticTokens, position);
        const treeSitterTokenInfo = tree && this._getTreeSitterTokenAtPosition(tree, position);
        if (!textMateTokenInfo && !semanticTokenInfo && !treeSitterTokenInfo) {
            dom.reset(this._domNode, 'No grammar or semantic tokens available.');
            return;
        }
        const tmMetadata = textMateTokenInfo?.metadata;
        const semMetadata = semanticTokenInfo?.metadata;
        const semTokenText = semanticTokenInfo && renderTokenText(this._model.getValueInRange(semanticTokenInfo.range));
        const tmTokenText = textMateTokenInfo &&
            renderTokenText(this._model
                .getLineContent(position.lineNumber)
                .substring(textMateTokenInfo.token.startIndex, textMateTokenInfo.token.endIndex));
        const tokenText = semTokenText || tmTokenText || '';
        dom.reset(this._domNode, $('h2.tiw-token', undefined, tokenText, $('span.tiw-token-length', undefined, `${tokenText.length} ${tokenText.length === 1 ? 'char' : 'chars'}`)));
        dom.append(this._domNode, $('hr.tiw-metadata-separator', { style: 'clear:both' }));
        dom.append(this._domNode, $('table.tiw-metadata-table', undefined, $('tbody', undefined, $('tr', undefined, $('td.tiw-metadata-key', undefined, 'language'), $('td.tiw-metadata-value', undefined, tmMetadata?.languageId || '')), $('tr', undefined, $('td.tiw-metadata-key', undefined, 'standard token type'), $('td.tiw-metadata-value', undefined, this._tokenTypeToString(tmMetadata?.tokenType || 0 /* StandardTokenType.Other */))), ...this._formatMetadata(semMetadata, tmMetadata))));
        if (semanticTokenInfo) {
            dom.append(this._domNode, $('hr.tiw-metadata-separator'));
            const table = dom.append(this._domNode, $('table.tiw-metadata-table', undefined));
            const tbody = dom.append(table, $('tbody', undefined, $('tr', undefined, $('td.tiw-metadata-key', undefined, 'semantic token type'), $('td.tiw-metadata-value', undefined, semanticTokenInfo.type))));
            if (semanticTokenInfo.modifiers.length) {
                dom.append(tbody, $('tr', undefined, $('td.tiw-metadata-key', undefined, 'modifiers'), $('td.tiw-metadata-value', undefined, semanticTokenInfo.modifiers.join(' '))));
            }
            if (semanticTokenInfo.metadata) {
                const properties = [
                    'foreground',
                    'bold',
                    'italic',
                    'underline',
                    'strikethrough',
                ];
                const propertiesByDefValue = {};
                const allDefValues = new Array(); // remember the order
                // first collect to detect when the same rule is used for multiple properties
                for (const property of properties) {
                    if (semanticTokenInfo.metadata[property] !== undefined) {
                        const definition = semanticTokenInfo.definitions[property];
                        const defValue = this._renderTokenStyleDefinition(definition, property);
                        const defValueStr = defValue
                            .map((el) => (dom.isHTMLElement(el) ? el.outerHTML : el))
                            .join();
                        let properties = propertiesByDefValue[defValueStr];
                        if (!properties) {
                            propertiesByDefValue[defValueStr] = properties = [];
                            allDefValues.push([defValue, defValueStr]);
                        }
                        properties.push(property);
                    }
                }
                for (const [defValue, defValueStr] of allDefValues) {
                    dom.append(tbody, $('tr', undefined, $('td.tiw-metadata-key', undefined, propertiesByDefValue[defValueStr].join(', ')), $('td.tiw-metadata-value', undefined, ...defValue)));
                }
            }
        }
        if (textMateTokenInfo) {
            const theme = this._themeService.getColorTheme();
            dom.append(this._domNode, $('hr.tiw-metadata-separator'));
            const table = dom.append(this._domNode, $('table.tiw-metadata-table'));
            const tbody = dom.append(table, $('tbody'));
            if (tmTokenText && tmTokenText !== tokenText) {
                dom.append(tbody, $('tr', undefined, $('td.tiw-metadata-key', undefined, 'textmate token'), $('td.tiw-metadata-value', undefined, `${tmTokenText} (${tmTokenText.length})`)));
            }
            const scopes = new Array();
            for (let i = textMateTokenInfo.token.scopes.length - 1; i >= 0; i--) {
                scopes.push(textMateTokenInfo.token.scopes[i]);
                if (i > 0) {
                    scopes.push($('br'));
                }
            }
            dom.append(tbody, $('tr', undefined, $('td.tiw-metadata-key', undefined, 'textmate scopes'), $('td.tiw-metadata-value.tiw-metadata-scopes', undefined, ...scopes)));
            const matchingRule = findMatchingThemeRule(theme, textMateTokenInfo.token.scopes, false);
            const semForeground = semanticTokenInfo?.metadata?.foreground;
            if (matchingRule) {
                if (semForeground !== textMateTokenInfo.metadata.foreground) {
                    let defValue = $('code.tiw-theme-selector', undefined, matchingRule.rawSelector, $('br'), JSON.stringify(matchingRule.settings, null, '\t'));
                    if (semForeground) {
                        defValue = $('s', undefined, defValue);
                    }
                    dom.append(tbody, $('tr', undefined, $('td.tiw-metadata-key', undefined, 'foreground'), $('td.tiw-metadata-value', undefined, defValue)));
                }
            }
            else if (!semForeground) {
                dom.append(tbody, $('tr', undefined, $('td.tiw-metadata-key', undefined, 'foreground'), $('td.tiw-metadata-value', undefined, 'No theme selector')));
            }
        }
        if (treeSitterTokenInfo) {
            const lastTokenInfo = treeSitterTokenInfo[treeSitterTokenInfo.length - 1];
            dom.append(this._domNode, $('hr.tiw-metadata-separator'));
            const table = dom.append(this._domNode, $('table.tiw-metadata-table'));
            const tbody = dom.append(table, $('tbody'));
            dom.append(tbody, $('tr', undefined, $('td.tiw-metadata-key', undefined, `tree-sitter token ${lastTokenInfo.id}`), $('td.tiw-metadata-value', undefined, `${lastTokenInfo.text}`)));
            const scopes = new Array();
            let i = treeSitterTokenInfo.length - 1;
            let node = treeSitterTokenInfo[i];
            while (node.parent || i > 0) {
                scopes.push(node.type);
                node = node.parent ?? treeSitterTokenInfo[--i];
                if (node) {
                    scopes.push($('br'));
                }
            }
            dom.append(tbody, $('tr', undefined, $('td.tiw-metadata-key', undefined, 'tree-sitter tree'), $('td.tiw-metadata-value.tiw-metadata-scopes', undefined, ...scopes)));
            const tokenizationSupport = TreeSitterTokenizationRegistry.get(this._model.getLanguageId());
            const captures = tokenizationSupport?.captureAtPosition(position.lineNumber, position.column, this._model);
            if (captures && captures.length > 0) {
                dom.append(tbody, $('tr', undefined, $('td.tiw-metadata-key', undefined, 'foreground'), $('td.tiw-metadata-value', undefined, captures.map((cap) => cap.name).join(' '))));
            }
        }
    }
    _formatMetadata(semantic, tm) {
        const elements = new Array();
        function render(property) {
            const value = semantic?.[property] || tm?.[property];
            if (value !== undefined) {
                const semanticStyle = semantic?.[property] ? 'tiw-metadata-semantic' : '';
                elements.push($('tr', undefined, $('td.tiw-metadata-key', undefined, property), $(`td.tiw-metadata-value.${semanticStyle}`, undefined, value)));
            }
            return value;
        }
        const foreground = render('foreground');
        const background = render('background');
        if (foreground && background) {
            const backgroundColor = Color.fromHex(background), foregroundColor = Color.fromHex(foreground);
            if (backgroundColor.isOpaque()) {
                elements.push($('tr', undefined, $('td.tiw-metadata-key', undefined, 'contrast ratio'), $('td.tiw-metadata-value', undefined, backgroundColor
                    .getContrastRatio(foregroundColor.makeOpaque(backgroundColor))
                    .toFixed(2))));
            }
            else {
                elements.push($('tr', undefined, $('td.tiw-metadata-key', undefined, 'Contrast ratio cannot be precise for background colors that use transparency'), $('td.tiw-metadata-value')));
            }
        }
        const fontStyleLabels = new Array();
        function addStyle(key) {
            let label;
            if (semantic && semantic[key]) {
                label = $('span.tiw-metadata-semantic', undefined, key);
            }
            else if (tm && tm[key]) {
                label = key;
            }
            if (label) {
                if (fontStyleLabels.length) {
                    fontStyleLabels.push(' ');
                }
                fontStyleLabels.push(label);
            }
        }
        addStyle('bold');
        addStyle('italic');
        addStyle('underline');
        addStyle('strikethrough');
        if (fontStyleLabels.length) {
            elements.push($('tr', undefined, $('td.tiw-metadata-key', undefined, 'font style'), $('td.tiw-metadata-value', undefined, ...fontStyleLabels)));
        }
        return elements;
    }
    _decodeMetadata(metadata) {
        const colorMap = this._themeService.getColorTheme().tokenColorMap;
        const languageId = TokenMetadata.getLanguageId(metadata);
        const tokenType = TokenMetadata.getTokenType(metadata);
        const fontStyle = TokenMetadata.getFontStyle(metadata);
        const foreground = TokenMetadata.getForeground(metadata);
        const background = TokenMetadata.getBackground(metadata);
        return {
            languageId: this._languageService.languageIdCodec.decodeLanguageId(languageId),
            tokenType: tokenType,
            bold: fontStyle & 2 /* FontStyle.Bold */ ? true : undefined,
            italic: fontStyle & 1 /* FontStyle.Italic */ ? true : undefined,
            underline: fontStyle & 4 /* FontStyle.Underline */ ? true : undefined,
            strikethrough: fontStyle & 8 /* FontStyle.Strikethrough */ ? true : undefined,
            foreground: colorMap[foreground],
            background: colorMap[background],
        };
    }
    _tokenTypeToString(tokenType) {
        switch (tokenType) {
            case 0 /* StandardTokenType.Other */:
                return 'Other';
            case 1 /* StandardTokenType.Comment */:
                return 'Comment';
            case 2 /* StandardTokenType.String */:
                return 'String';
            case 3 /* StandardTokenType.RegEx */:
                return 'RegEx';
            default:
                return '??';
        }
    }
    _getTokensAtPosition(grammar, position) {
        const lineNumber = position.lineNumber;
        const stateBeforeLine = this._getStateBeforeLine(grammar, lineNumber);
        const tokenizationResult1 = grammar.tokenizeLine(this._model.getLineContent(lineNumber), stateBeforeLine);
        const tokenizationResult2 = grammar.tokenizeLine2(this._model.getLineContent(lineNumber), stateBeforeLine);
        let token1Index = 0;
        for (let i = tokenizationResult1.tokens.length - 1; i >= 0; i--) {
            const t = tokenizationResult1.tokens[i];
            if (position.column - 1 >= t.startIndex) {
                token1Index = i;
                break;
            }
        }
        let token2Index = 0;
        for (let i = tokenizationResult2.tokens.length >>> 1; i >= 0; i--) {
            if (position.column - 1 >= tokenizationResult2.tokens[i << 1]) {
                token2Index = i;
                break;
            }
        }
        return {
            token: tokenizationResult1.tokens[token1Index],
            metadata: this._decodeMetadata(tokenizationResult2.tokens[(token2Index << 1) + 1]),
        };
    }
    _getStateBeforeLine(grammar, lineNumber) {
        let state = null;
        for (let i = 1; i < lineNumber; i++) {
            const tokenizationResult = grammar.tokenizeLine(this._model.getLineContent(i), state);
            state = tokenizationResult.ruleStack;
        }
        return state;
    }
    isSemanticTokens(token) {
        return token && token.data;
    }
    async _computeSemanticTokens(position) {
        if (!this._isSemanticColoringEnabled()) {
            return null;
        }
        const tokenProviders = this._languageFeaturesService.documentSemanticTokensProvider.ordered(this._model);
        if (tokenProviders.length) {
            const provider = tokenProviders[0];
            const tokens = await Promise.resolve(provider.provideDocumentSemanticTokens(this._model, null, this._currentRequestCancellationTokenSource.token));
            if (this.isSemanticTokens(tokens)) {
                return { tokens, legend: provider.getLegend() };
            }
        }
        const rangeTokenProviders = this._languageFeaturesService.documentRangeSemanticTokensProvider.ordered(this._model);
        if (rangeTokenProviders.length) {
            const provider = rangeTokenProviders[0];
            const lineNumber = position.lineNumber;
            const range = new Range(lineNumber, 1, lineNumber, this._model.getLineMaxColumn(lineNumber));
            const tokens = await Promise.resolve(provider.provideDocumentRangeSemanticTokens(this._model, range, this._currentRequestCancellationTokenSource.token));
            if (this.isSemanticTokens(tokens)) {
                return { tokens, legend: provider.getLegend() };
            }
        }
        return null;
    }
    _getSemanticTokenAtPosition(semanticTokens, pos) {
        const tokenData = semanticTokens.tokens.data;
        const defaultLanguage = this._model.getLanguageId();
        let lastLine = 0;
        let lastCharacter = 0;
        const posLine = pos.lineNumber - 1, posCharacter = pos.column - 1; // to 0-based position
        for (let i = 0; i < tokenData.length; i += 5) {
            const lineDelta = tokenData[i], charDelta = tokenData[i + 1], len = tokenData[i + 2], typeIdx = tokenData[i + 3], modSet = tokenData[i + 4];
            const line = lastLine + lineDelta; // 0-based
            const character = lineDelta === 0 ? lastCharacter + charDelta : charDelta; // 0-based
            if (posLine === line && character <= posCharacter && posCharacter < character + len) {
                const type = semanticTokens.legend.tokenTypes[typeIdx] || 'not in legend (ignored)';
                const modifiers = [];
                let modifierSet = modSet;
                for (let modifierIndex = 0; modifierSet > 0 && modifierIndex < semanticTokens.legend.tokenModifiers.length; modifierIndex++) {
                    if (modifierSet & 1) {
                        modifiers.push(semanticTokens.legend.tokenModifiers[modifierIndex]);
                    }
                    modifierSet = modifierSet >> 1;
                }
                if (modifierSet > 0) {
                    modifiers.push('not in legend (ignored)');
                }
                const range = new Range(line + 1, character + 1, line + 1, character + 1 + len);
                const definitions = {};
                const colorMap = this._themeService.getColorTheme().tokenColorMap;
                const theme = this._themeService.getColorTheme();
                const tokenStyle = theme.getTokenStyleMetadata(type, modifiers, defaultLanguage, true, definitions);
                let metadata = undefined;
                if (tokenStyle) {
                    metadata = {
                        languageId: undefined,
                        tokenType: 0 /* StandardTokenType.Other */,
                        bold: tokenStyle?.bold,
                        italic: tokenStyle?.italic,
                        underline: tokenStyle?.underline,
                        strikethrough: tokenStyle?.strikethrough,
                        foreground: colorMap[tokenStyle?.foreground || 0 /* ColorId.None */],
                        background: undefined,
                    };
                }
                return { type, modifiers, range, metadata, definitions };
            }
            lastLine = line;
            lastCharacter = character;
        }
        return null;
    }
    _walkTreeforPosition(cursor, pos) {
        const offset = this._model.getOffsetAt(pos);
        cursor.gotoFirstChild();
        let goChild = false;
        let lastGoodNode = null;
        do {
            if (cursor.currentNode.startIndex <= offset && offset < cursor.currentNode.endIndex) {
                goChild = true;
                lastGoodNode = cursor.currentNode;
            }
            else {
                goChild = false;
            }
        } while (goChild ? cursor.gotoFirstChild() : cursor.gotoNextSibling());
        return lastGoodNode;
    }
    _getTreeSitterTokenAtPosition(textModelTreeSitter, pos) {
        let tree = textModelTreeSitter.parseResult;
        if (!tree?.tree) {
            return null;
        }
        const nodes = [];
        do {
            const cursor = tree.tree.walk();
            const node = this._walkTreeforPosition(cursor, pos);
            if (node) {
                nodes.push(node);
                tree = textModelTreeSitter.getInjection(node.startIndex, tree.languageId);
            }
            else {
                tree = undefined;
            }
        } while (tree?.tree);
        return nodes.length > 0 ? nodes : null;
    }
    _renderTokenStyleDefinition(definition, property) {
        const elements = new Array();
        if (definition === undefined) {
            return elements;
        }
        const theme = this._themeService.getColorTheme();
        if (Array.isArray(definition)) {
            const scopesDefinition = {};
            theme.resolveScopes(definition, scopesDefinition);
            const matchingRule = scopesDefinition[property];
            if (matchingRule && scopesDefinition.scope) {
                const scopes = $('ul.tiw-metadata-values');
                const strScopes = Array.isArray(matchingRule.scope)
                    ? matchingRule.scope
                    : [String(matchingRule.scope)];
                for (const strScope of strScopes) {
                    scopes.appendChild($('li.tiw-metadata-value.tiw-metadata-scopes', undefined, strScope));
                }
                elements.push(scopesDefinition.scope.join(' '), scopes, $('code.tiw-theme-selector', undefined, JSON.stringify(matchingRule.settings, null, '\t')));
                return elements;
            }
            return elements;
        }
        else if (SemanticTokenRule.is(definition)) {
            const scope = theme.getTokenStylingRuleScope(definition);
            if (scope === 'setting') {
                elements.push(`User settings: ${definition.selector.id} - ${this._renderStyleProperty(definition.style, property)}`);
                return elements;
            }
            else if (scope === 'theme') {
                elements.push(`Color theme: ${definition.selector.id} - ${this._renderStyleProperty(definition.style, property)}`);
                return elements;
            }
            return elements;
        }
        else {
            const style = theme.resolveTokenStyleValue(definition);
            elements.push(`Default: ${style ? this._renderStyleProperty(style, property) : ''}`);
            return elements;
        }
    }
    _renderStyleProperty(style, property) {
        switch (property) {
            case 'foreground':
                return style.foreground ? Color.Format.CSS.formatHexA(style.foreground, true) : '';
            default:
                return style[property] !== undefined ? String(style[property]) : '';
        }
    }
    getDomNode() {
        return this._domNode;
    }
    getPosition() {
        return {
            position: this._editor.getPosition(),
            preference: [2 /* ContentWidgetPositionPreference.BELOW */, 1 /* ContentWidgetPositionPreference.ABOVE */],
        };
    }
}
registerEditorContribution(InspectEditorTokensController.ID, InspectEditorTokensController, 4 /* EditorContributionInstantiation.Lazy */);
registerEditorAction(InspectEditorTokens);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zcGVjdEVkaXRvclRva2Vucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY29kZUVkaXRvci9icm93c2VyL2luc3BlY3RFZGl0b3JUb2tlbnMvaW5zcGVjdEVkaXRvclRva2Vucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTywyQkFBMkIsQ0FBQTtBQUNsQyxPQUFPLEtBQUssR0FBRyxNQUFNLHVCQUF1QixDQUFBO0FBQzVDLE9BQU8sS0FBSyxHQUFHLE1BQU0sb0NBQW9DLENBQUE7QUFFekQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRTNELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQVFwRSxPQUFPLEVBQ04sWUFBWSxFQUVaLG9CQUFvQixFQUNwQiwwQkFBMEIsR0FFMUIsTUFBTSxtREFBbUQsQ0FBQTtBQUUxRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFHbEUsT0FBTyxFQUdOLDhCQUE4QixHQUM5QixNQUFNLDJDQUEyQyxDQUFBO0FBQ2xELE9BQU8sRUFJTixhQUFhLEdBQ2IsTUFBTSx3REFBd0QsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUNyRixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUN4RixPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxzRUFBc0UsQ0FBQTtBQUVuSCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSw0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