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
import { URI } from '../../../../base/common/uri.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { IWorkbenchThemeService, } from '../../../services/themes/common/workbenchThemeService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { EditorResourceAccessor } from '../../../common/editor.js';
import { ITextMateTokenizationService } from '../../../services/textMate/browser/textMateTokenizationFeature.js';
import { TokenizationRegistry, TreeSitterTokenizationRegistry, } from '../../../../editor/common/languages.js';
import { TokenMetadata } from '../../../../editor/common/encodedTokenAttributes.js';
import { findMatchingThemeRule } from '../../../services/textMate/common/TMHelper.js';
import { Color } from '../../../../base/common/color.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { basename } from '../../../../base/common/resources.js';
import { Schemas } from '../../../../base/common/network.js';
import { splitLines } from '../../../../base/common/strings.js';
import { ITreeSitterParserService, } from '../../../../editor/common/services/treeSitterParserService.js';
import { findMetadata } from '../../../services/themes/common/colorThemeData.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { Event } from '../../../../base/common/event.js';
import { Range } from '../../../../editor/common/core/range.js';
class ThemeDocument {
    constructor(theme) {
        this._theme = theme;
        this._cache = Object.create(null);
        this._defaultColor = '#000000';
        for (let i = 0, len = this._theme.tokenColors.length; i < len; i++) {
            const rule = this._theme.tokenColors[i];
            if (!rule.scope) {
                this._defaultColor = rule.settings.foreground;
            }
        }
    }
    _generateExplanation(selector, color) {
        return `${selector}: ${Color.Format.CSS.formatHexA(color, true).toUpperCase()}`;
    }
    explainTokenColor(scopes, color) {
        const matchingRule = this._findMatchingThemeRule(scopes);
        if (!matchingRule) {
            const expected = Color.fromHex(this._defaultColor);
            // No matching rule
            if (!color.equals(expected)) {
                throw new Error(`[${this._theme.label}]: Unexpected color ${Color.Format.CSS.formatHexA(color)} for ${scopes}. Expected default ${Color.Format.CSS.formatHexA(expected)}`);
            }
            return this._generateExplanation('default', color);
        }
        const expected = Color.fromHex(matchingRule.settings.foreground);
        if (!color.equals(expected)) {
            throw new Error(`[${this._theme.label}]: Unexpected color ${Color.Format.CSS.formatHexA(color)} for ${scopes}. Expected ${Color.Format.CSS.formatHexA(expected)} coming in from ${matchingRule.rawSelector}`);
        }
        return this._generateExplanation(matchingRule.rawSelector, color);
    }
    _findMatchingThemeRule(scopes) {
        if (!this._cache[scopes]) {
            this._cache[scopes] = findMatchingThemeRule(this._theme, scopes.split(' '));
        }
        return this._cache[scopes];
    }
}
let Snapper = class Snapper {
    constructor(languageService, themeService, textMateService, treeSitterParserService, modelService) {
        this.languageService = languageService;
        this.themeService = themeService;
        this.textMateService = textMateService;
        this.treeSitterParserService = treeSitterParserService;
        this.modelService = modelService;
    }
    _themedTokenize(grammar, lines) {
        const colorMap = TokenizationRegistry.getColorMap();
        let state = null;
        const result = [];
        let resultLen = 0;
        for (let i = 0, len = lines.length; i < len; i++) {
            const line = lines[i];
            const tokenizationResult = grammar.tokenizeLine2(line, state);
            for (let j = 0, lenJ = tokenizationResult.tokens.length >>> 1; j < lenJ; j++) {
                const startOffset = tokenizationResult.tokens[j << 1];
                const metadata = tokenizationResult.tokens[(j << 1) + 1];
                const endOffset = j + 1 < lenJ ? tokenizationResult.tokens[(j + 1) << 1] : line.length;
                const tokenText = line.substring(startOffset, endOffset);
                const color = TokenMetadata.getForeground(metadata);
                result[resultLen++] = {
                    text: tokenText,
                    color: colorMap[color],
                };
            }
            state = tokenizationResult.ruleStack;
        }
        return result;
    }
    _themedTokenizeTreeSitter(tokens, languageId) {
        const colorMap = TokenizationRegistry.getColorMap();
        const result = Array(tokens.length);
        const colorThemeData = this.themeService.getColorTheme();
        for (let i = 0, len = tokens.length; i < len; i++) {
            const token = tokens[i];
            const scopes = token.t.split(' ');
            const metadata = findMetadata(colorThemeData, scopes, this.languageService.languageIdCodec.encodeLanguageId(languageId), false);
            const color = TokenMetadata.getForeground(metadata);
            result[i] = {
                text: token.c,
                color: colorMap[color],
            };
        }
        return result;
    }
    _tokenize(grammar, lines) {
        let state = null;
        const result = [];
        let resultLen = 0;
        for (let i = 0, len = lines.length; i < len; i++) {
            const line = lines[i];
            const tokenizationResult = grammar.tokenizeLine(line, state);
            let lastScopes = null;
            for (let j = 0, lenJ = tokenizationResult.tokens.length; j < lenJ; j++) {
                const token = tokenizationResult.tokens[j];
                const tokenText = line.substring(token.startIndex, token.endIndex);
                const tokenScopes = token.scopes.join(' ');
                if (lastScopes === tokenScopes) {
                    result[resultLen - 1].c += tokenText;
                }
                else {
                    lastScopes = tokenScopes;
                    result[resultLen++] = {
                        c: tokenText,
                        t: tokenScopes,
                        r: {
                            dark_plus: undefined,
                            light_plus: undefined,
                            dark_vs: undefined,
                            light_vs: undefined,
                            hc_black: undefined,
                        },
                    };
                }
            }
            state = tokenizationResult.ruleStack;
        }
        return result;
    }
    async _getThemesResult(grammar, lines) {
        const currentTheme = this.themeService.getColorTheme();
        const getThemeName = (id) => {
            const part = 'vscode-theme-defaults-themes-';
            const startIdx = id.indexOf(part);
            if (startIdx !== -1) {
                return id.substring(startIdx + part.length, id.length - 5);
            }
            return undefined;
        };
        const result = {};
        const themeDatas = await this.themeService.getColorThemes();
        const defaultThemes = themeDatas.filter((themeData) => !!getThemeName(themeData.id));
        for (const defaultTheme of defaultThemes) {
            const themeId = defaultTheme.id;
            const success = await this.themeService.setColorTheme(themeId, undefined);
            if (success) {
                const themeName = getThemeName(themeId);
                result[themeName] = {
                    document: new ThemeDocument(this.themeService.getColorTheme()),
                    tokens: this._themedTokenize(grammar, lines),
                };
            }
        }
        await this.themeService.setColorTheme(currentTheme.id, undefined);
        return result;
    }
    async _getTreeSitterThemesResult(tokens, languageId) {
        const currentTheme = this.themeService.getColorTheme();
        const getThemeName = (id) => {
            const part = 'vscode-theme-defaults-themes-';
            const startIdx = id.indexOf(part);
            if (startIdx !== -1) {
                return id.substring(startIdx + part.length, id.length - 5);
            }
            return undefined;
        };
        const result = {};
        const themeDatas = await this.themeService.getColorThemes();
        const defaultThemes = themeDatas.filter((themeData) => !!getThemeName(themeData.id));
        for (const defaultTheme of defaultThemes) {
            const themeId = defaultTheme.id;
            const success = await this.themeService.setColorTheme(themeId, undefined);
            if (success) {
                const themeName = getThemeName(themeId);
                result[themeName] = {
                    document: new ThemeDocument(this.themeService.getColorTheme()),
                    tokens: this._themedTokenizeTreeSitter(tokens, languageId),
                };
            }
        }
        await this.themeService.setColorTheme(currentTheme.id, undefined);
        return result;
    }
    _enrichResult(result, themesResult) {
        const index = {};
        const themeNames = Object.keys(themesResult);
        for (const themeName of themeNames) {
            index[themeName] = 0;
        }
        for (let i = 0, len = result.length; i < len; i++) {
            const token = result[i];
            for (const themeName of themeNames) {
                const themedToken = themesResult[themeName].tokens[index[themeName]];
                themedToken.text = themedToken.text.substr(token.c.length);
                if (themedToken.color) {
                    token.r[themeName] = themesResult[themeName].document.explainTokenColor(token.t, themedToken.color);
                }
                if (themedToken.text.length === 0) {
                    index[themeName]++;
                }
            }
        }
    }
    _moveInjectionCursorToRange(cursor, injectionRange) {
        let continueCursor = cursor.gotoFirstChild();
        // Get into the first "real" child node, as the root nodes can extend outside the range.
        while ((cursor.startIndex < injectionRange.startIndex ||
            cursor.endIndex > injectionRange.endIndex) &&
            continueCursor) {
            if (cursor.endIndex < injectionRange.startIndex) {
                continueCursor = cursor.gotoNextSibling();
            }
            else {
                continueCursor = cursor.gotoFirstChild();
            }
        }
    }
    _treeSitterTokenize(textModelTreeSitter, tree, languageId) {
        const cursor = tree.walk();
        cursor.gotoFirstChild();
        let cursorResult = true;
        const tokens = [];
        const tokenizationSupport = TreeSitterTokenizationRegistry.get(languageId);
        const cursors = [
            {
                cursor,
                languageId,
                startOffset: 0,
                endOffset: textModelTreeSitter.textModel.getValueLength(),
            },
        ];
        do {
            const current = cursors[cursors.length - 1];
            const currentCursor = current.cursor;
            const currentLanguageId = current.languageId;
            const isOutsideRange = currentCursor.currentNode.endIndex > current.endOffset;
            if (!isOutsideRange && currentCursor.currentNode.childCount === 0) {
                const range = new Range(currentCursor.currentNode.startPosition.row + 1, currentCursor.currentNode.startPosition.column + 1, currentCursor.currentNode.endPosition.row + 1, currentCursor.currentNode.endPosition.column + 1);
                const injection = textModelTreeSitter.getInjection(currentCursor.currentNode.startIndex, currentLanguageId);
                const treeSitterRange = injection?.ranges.find((r) => r.startIndex <= currentCursor.currentNode.startIndex &&
                    r.endIndex >= currentCursor.currentNode.endIndex);
                if (injection?.tree &&
                    treeSitterRange &&
                    treeSitterRange.startIndex === currentCursor.currentNode.startIndex) {
                    const injectionLanguageId = injection.languageId;
                    const injectionTree = injection.tree;
                    const injectionCursor = injectionTree.walk();
                    this._moveInjectionCursorToRange(injectionCursor, treeSitterRange);
                    cursors.push({
                        cursor: injectionCursor,
                        languageId: injectionLanguageId,
                        startOffset: treeSitterRange.startIndex,
                        endOffset: treeSitterRange.endIndex,
                    });
                    while (currentCursor.endIndex <= treeSitterRange.endIndex &&
                        (currentCursor.gotoNextSibling() || currentCursor.gotoParent())) { }
                }
                else {
                    const capture = tokenizationSupport?.captureAtRangeTree(range, tree, textModelTreeSitter);
                    tokens.push({
                        c: currentCursor.currentNode.text.replace(/\r/g, ''),
                        t: capture?.map((cap) => cap.name).join(' ') ?? '',
                        r: {
                            dark_plus: undefined,
                            light_plus: undefined,
                            dark_vs: undefined,
                            light_vs: undefined,
                            hc_black: undefined,
                        },
                    });
                    while (!(cursorResult = currentCursor.gotoNextSibling())) {
                        if (!(cursorResult = currentCursor.gotoParent())) {
                            break;
                        }
                    }
                }
            }
            else {
                cursorResult = currentCursor.gotoFirstChild();
            }
            if (cursors.length > 1 &&
                ((!cursorResult && currentCursor === cursors[cursors.length - 1].cursor) || isOutsideRange)) {
                cursors.pop();
                cursorResult = true;
            }
        } while (cursorResult);
        return tokens;
    }
    captureSyntaxTokens(fileName, content) {
        const languageId = this.languageService.guessLanguageIdByFilepathOrFirstLine(URI.file(fileName));
        return this.textMateService.createTokenizer(languageId).then((grammar) => {
            if (!grammar) {
                return [];
            }
            const lines = splitLines(content);
            const result = this._tokenize(grammar, lines);
            return this._getThemesResult(grammar, lines).then((themesResult) => {
                this._enrichResult(result, themesResult);
                return result.filter((t) => t.c.length > 0);
            });
        });
    }
    async captureTreeSitterSyntaxTokens(resource, content) {
        const languageId = this.languageService.guessLanguageIdByFilepathOrFirstLine(resource);
        if (languageId) {
            const hasLanguage = TreeSitterTokenizationRegistry.get(languageId);
            if (!hasLanguage) {
                return [];
            }
            const model = this.modelService.getModel(resource) ??
                this.modelService.createModel(content, { languageId, onDidChange: Event.None }, resource);
            let textModelTreeSitter = this.treeSitterParserService.getParseResult(model);
            let tree = textModelTreeSitter?.parseResult?.tree;
            if (!textModelTreeSitter) {
                return [];
            }
            if (!tree) {
                let e = await Event.toPromise(this.treeSitterParserService.onDidUpdateTree);
                // Once more for injections
                if (e.hasInjections) {
                    e = await Event.toPromise(this.treeSitterParserService.onDidUpdateTree);
                }
                textModelTreeSitter = e.tree;
                tree = textModelTreeSitter.parseResult?.tree;
            }
            if (!tree) {
                return [];
            }
            const result = (await this._treeSitterTokenize(textModelTreeSitter, tree, languageId)).filter((t) => t.c.length > 0);
            const themeTokens = await this._getTreeSitterThemesResult(result, languageId);
            this._enrichResult(result, themeTokens);
            return result;
        }
        return [];
    }
};
Snapper = __decorate([
    __param(0, ILanguageService),
    __param(1, IWorkbenchThemeService),
    __param(2, ITextMateTokenizationService),
    __param(3, ITreeSitterParserService),
    __param(4, IModelService)
], Snapper);
async function captureTokens(accessor, resource, treeSitter = false) {
    const process = (resource) => {
        const fileService = accessor.get(IFileService);
        const fileName = basename(resource);
        const snapper = accessor.get(IInstantiationService).createInstance(Snapper);
        return fileService.readFile(resource).then((content) => {
            if (treeSitter) {
                return snapper.captureTreeSitterSyntaxTokens(resource, content.value.toString());
            }
            else {
                return snapper.captureSyntaxTokens(fileName, content.value.toString());
            }
        });
    };
    if (!resource) {
        const editorService = accessor.get(IEditorService);
        const file = editorService.activeEditor
            ? EditorResourceAccessor.getCanonicalUri(editorService.activeEditor, {
                filterByScheme: Schemas.file,
            })
            : null;
        if (file) {
            process(file).then((result) => {
                console.log(result);
            });
        }
        else {
            console.log('No file editor active');
        }
    }
    else {
        const processResult = await process(resource);
        return processResult;
    }
    return undefined;
}
CommandsRegistry.registerCommand('_workbench.captureSyntaxTokens', function (accessor, resource) {
    return captureTokens(accessor, resource);
});
CommandsRegistry.registerCommand('_workbench.captureTreeSitterSyntaxTokens', function (accessor, resource) {
    // If no resource is provided, use the active editor's resource
    // This is useful for testing the command
    if (!resource) {
        const editorService = accessor.get(IEditorService);
        resource = editorService.activeEditor?.resource;
    }
    return captureTokens(accessor, resource, true);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhlbWVzLnRlc3QuY29udHJpYnV0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGhlbWVzL2Jyb3dzZXIvdGhlbWVzLnRlc3QuY29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUVwRCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNsRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNuRixPQUFPLEVBQ04scUJBQXFCLEdBRXJCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUNOLHNCQUFzQixHQUV0QixNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNqRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsNEJBQTRCLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQTtBQUVoSCxPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLDhCQUE4QixHQUM5QixNQUFNLHdDQUF3QyxDQUFBO0FBQy9DLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNuRixPQUFPLEVBQWEscUJBQXFCLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDeEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0s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