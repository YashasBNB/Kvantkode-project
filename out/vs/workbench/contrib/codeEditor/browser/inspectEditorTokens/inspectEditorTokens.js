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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zcGVjdEVkaXRvclRva2Vucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvZGVFZGl0b3IvYnJvd3Nlci9pbnNwZWN0RWRpdG9yVG9rZW5zL2luc3BlY3RFZGl0b3JUb2tlbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sMkJBQTJCLENBQUE7QUFDbEMsT0FBTyxLQUFLLEdBQUcsTUFBTSx1QkFBdUIsQ0FBQTtBQUM1QyxPQUFPLEtBQUssR0FBRyxNQUFNLG9DQUFvQyxDQUFBO0FBRXpELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUUzRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFRcEUsT0FBTyxFQUNOLFlBQVksRUFFWixvQkFBb0IsRUFDcEIsMEJBQTBCLEdBRTFCLE1BQU0sbURBQW1ELENBQUE7QUFFMUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBR2xFLE9BQU8sRUFHTiw4QkFBOEIsR0FDOUIsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNsRCxPQUFPLEVBSU4sYUFBYSxHQUNiLE1BQU0sd0RBQXdELENBQUE7QUFDL0QsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDckYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDbEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDeEYsT0FBTyxFQUFFLDRCQUE0QixFQUFFLE1BQU0sc0VBQXNFLENBQUE7QUFFbkgsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDcEcsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sNENBQTRD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