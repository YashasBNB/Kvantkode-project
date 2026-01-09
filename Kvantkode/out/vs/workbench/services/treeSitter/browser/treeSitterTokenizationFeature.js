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
import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable, DisposableMap, DisposableStore, } from '../../../../base/common/lifecycle.js';
import { FileAccess } from '../../../../base/common/network.js';
import { LazyTokenizationSupport, TreeSitterTokenizationRegistry, } from '../../../../editor/common/languages.js';
import { EDITOR_EXPERIMENTAL_PREFER_TREESITTER, ITreeSitterParserService, ITreeSitterImporter, TREESITTER_ALLOWED_SUPPORT, } from '../../../../editor/common/services/treeSitterParserService.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { registerSingleton, } from '../../../../platform/instantiation/common/extensions.js';
import { createDecorator, IInstantiationService, } from '../../../../platform/instantiation/common/instantiation.js';
import { findMetadata } from '../../themes/common/colorThemeData.js';
import { ILanguageService } from '../../../../editor/common/languages/language.js';
import { StopWatch } from '../../../../base/common/stopwatch.js';
import { ITreeSitterTokenizationStoreService } from '../../../../editor/common/model/treeSitterTokenStoreService.js';
import { TokenQuality } from '../../../../editor/common/model/tokenStore.js';
import { Range } from '../../../../editor/common/core/range.js';
import { setTimeout0 } from '../../../../base/common/platform.js';
import { findLikelyRelevantLines } from '../../../../editor/common/model/textModelTokens.js';
import { TreeSitterCodeEditors } from './treeSitterCodeEditors.js';
import { IWorkbenchThemeService, } from '../../themes/common/workbenchThemeService.js';
import { Position } from '../../../../editor/common/core/position.js';
export const ITreeSitterTokenizationFeature = createDecorator('treeSitterTokenizationFeature');
export const TREESITTER_BASE_SCOPES = {
    css: 'source.css',
    typescript: 'source.ts',
    ini: 'source.ini',
    regex: 'source.regex',
};
const BRACKETS = /[\{\}\[\]\<\>\(\)]/g;
let TreeSitterTokenizationFeature = class TreeSitterTokenizationFeature extends Disposable {
    constructor(_treeSitterImporter, _languageService, _configurationService, _instantiationService, _fileService) {
        super();
        this._treeSitterImporter = _treeSitterImporter;
        this._languageService = _languageService;
        this._configurationService = _configurationService;
        this._instantiationService = _instantiationService;
        this._fileService = _fileService;
        this._tokenizersRegistrations = this._register(new DisposableMap());
        this._handleGrammarsExtPoint();
        this._register(this._configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(EDITOR_EXPERIMENTAL_PREFER_TREESITTER)) {
                this._handleGrammarsExtPoint();
            }
        }));
    }
    _getSetting(languageId) {
        return this._configurationService.getValue(`${EDITOR_EXPERIMENTAL_PREFER_TREESITTER}.${languageId}`);
    }
    _handleGrammarsExtPoint() {
        // Eventually, this should actually use an extension point to add tree sitter grammars, but for now they are hard coded in core
        for (const languageId of TREESITTER_ALLOWED_SUPPORT) {
            const setting = this._getSetting(languageId);
            if (setting && !this._tokenizersRegistrations.has(languageId)) {
                const lazyTokenizationSupport = new LazyTokenizationSupport(() => this._createTokenizationSupport(languageId));
                const disposableStore = new DisposableStore();
                disposableStore.add(lazyTokenizationSupport);
                disposableStore.add(TreeSitterTokenizationRegistry.registerFactory(languageId, lazyTokenizationSupport));
                this._tokenizersRegistrations.set(languageId, disposableStore);
                TreeSitterTokenizationRegistry.getOrCreate(languageId);
            }
        }
        const languagesToUnregister = [...this._tokenizersRegistrations.keys()].filter((languageId) => !this._getSetting(languageId));
        for (const languageId of languagesToUnregister) {
            this._tokenizersRegistrations.deleteAndDispose(languageId);
        }
    }
    async _fetchQueries(newLanguage) {
        const languageLocation = `vs/editor/common/languages/highlights/${newLanguage}.scm`;
        const query = await this._fileService.readFile(FileAccess.asFileUri(languageLocation));
        return query.value.toString();
    }
    async _createTokenizationSupport(languageId) {
        const queries = await this._fetchQueries(languageId);
        const Query = await this._treeSitterImporter.getQueryClass();
        return this._instantiationService.createInstance(TreeSitterTokenizationSupport, queries, Query, languageId, this._languageService.languageIdCodec);
    }
};
TreeSitterTokenizationFeature = __decorate([
    __param(0, ITreeSitterImporter),
    __param(1, ILanguageService),
    __param(2, IConfigurationService),
    __param(3, IInstantiationService),
    __param(4, IFileService)
], TreeSitterTokenizationFeature);
export { TreeSitterTokenizationFeature };
let TreeSitterTokenizationSupport = class TreeSitterTokenizationSupport extends Disposable {
    constructor(_queries, Query, _languageId, _languageIdCodec, _treeSitterService, _themeService, _tokenizationStoreService, _instantiationService) {
        super();
        this._queries = _queries;
        this.Query = Query;
        this._languageId = _languageId;
        this._languageIdCodec = _languageIdCodec;
        this._treeSitterService = _treeSitterService;
        this._themeService = _themeService;
        this._tokenizationStoreService = _tokenizationStoreService;
        this._instantiationService = _instantiationService;
        this._onDidChangeTokens = this._register(new Emitter());
        this.onDidChangeTokens = this._onDidChangeTokens.event;
        this._onDidCompleteBackgroundTokenization = this._register(new Emitter());
        this.onDidChangeBackgroundTokenization = this._onDidCompleteBackgroundTokenization.event;
        this._codeEditors = this._instantiationService.createInstance(TreeSitterCodeEditors, this._languageId);
        this._register(this._codeEditors.onDidChangeViewport((e) => {
            this._parseAndTokenizeViewPort(e.model, e.ranges);
        }));
        this._codeEditors.getInitialViewPorts().then(async (viewports) => {
            for (const viewport of viewports) {
                this._parseAndTokenizeViewPort(viewport.model, viewport.ranges);
            }
        });
        this._register(Event.runAndSubscribe(this._themeService.onDidColorThemeChange, (e) => this._updateTheme(e)));
        this._register(this._treeSitterService.onDidUpdateTree((e) => {
            if (e.languageId !== this._languageId) {
                return;
            }
            if (this._tokenizationStoreService.hasTokens(e.textModel)) {
                // Mark the range for refresh immediately
                for (const range of e.ranges) {
                    this._tokenizationStoreService.markForRefresh(e.textModel, range.newRange);
                }
            }
            if (e.versionId !== e.textModel.getVersionId()) {
                return;
            }
            // First time we see a tree we need to build a token store.
            if (!this._tokenizationStoreService.hasTokens(e.textModel)) {
                // This will likely not happen as we first handle all models, which are ready before trees.
                this._firstTreeUpdate(e.textModel, e.versionId, e.tree);
            }
            else {
                this._handleTreeUpdate(e.ranges, e.textModel, e.versionId, e.tree);
            }
        }));
    }
    get _encodedLanguageId() {
        if (!this._encodedLanguage) {
            this._encodedLanguage = this._languageIdCodec.encodeLanguageId(this._languageId);
        }
        return this._encodedLanguage;
    }
    _setInitialTokens(textModel) {
        const tokens = this._createEmptyTokens(textModel);
        this._tokenizationStoreService.setTokens(textModel, tokens, TokenQuality.None);
    }
    _forceParseAndTokenizeContent(model, range, startOffsetOfRangeInDocument, endOffsetOfRangeInDocument, content, asUpdate) {
        const likelyRelevantLines = findLikelyRelevantLines(model, range.startLineNumber).likelyRelevantLines;
        const likelyRelevantPrefix = likelyRelevantLines.join(model.getEOL());
        const tree = this._treeSitterService.getTreeSync(`${likelyRelevantPrefix}${content}`, this._languageId);
        if (!tree) {
            return;
        }
        const treeRange = new Range(1, 1, range.endLineNumber - range.startLineNumber + 1 + likelyRelevantLines.length, range.endColumn);
        const captures = this._captureAtRange(treeRange, tree);
        const tokens = this._tokenizeCapturesWithMetadata(tree, captures, likelyRelevantPrefix.length, endOffsetOfRangeInDocument - startOffsetOfRangeInDocument + likelyRelevantPrefix.length);
        if (!tokens) {
            return;
        }
        if (asUpdate) {
            return this._rangeTokensAsUpdates(startOffsetOfRangeInDocument, tokens.endOffsetsAndMetadata, likelyRelevantPrefix.length);
        }
        else {
            return tokens.endOffsetsAndMetadata;
        }
    }
    async _parseAndTokenizeViewPort(model, viewportRanges) {
        if (!this._tokenizationStoreService.hasTokens(model)) {
            this._setInitialTokens(model);
        }
        for (const range of viewportRanges) {
            const startOffsetOfRangeInDocument = model.getOffsetAt(range.getStartPosition());
            const endOffsetOfRangeInDocument = model.getOffsetAt(range.getEndPosition());
            const version = model.getVersionId();
            if (this._tokenizationStoreService.rangeHasTokens(model, range, TokenQuality.ViewportGuess)) {
                continue;
            }
            const content = model.getValueInRange(range);
            const tokenUpdates = await this._forceParseAndTokenizeContent(model, range, startOffsetOfRangeInDocument, endOffsetOfRangeInDocument, content, true);
            if (!tokenUpdates ||
                this._tokenizationStoreService.rangeHasTokens(model, range, TokenQuality.ViewportGuess)) {
                continue;
            }
            if (tokenUpdates.length === 0) {
                continue;
            }
            const lastToken = tokenUpdates[tokenUpdates.length - 1];
            const oldRangeLength = lastToken.startOffsetInclusive + lastToken.length - tokenUpdates[0].startOffsetInclusive;
            this._tokenizationStoreService.updateTokens(model, version, [{ newTokens: tokenUpdates, oldRangeLength }], TokenQuality.ViewportGuess);
            this._onDidChangeTokens.fire({
                textModel: model,
                changes: {
                    semanticTokensApplied: false,
                    ranges: [{ fromLineNumber: range.startLineNumber, toLineNumber: range.endLineNumber }],
                },
            });
        }
    }
    guessTokensForLinesContent(lineNumber, textModel, lines) {
        if (lines.length === 0) {
            return undefined;
        }
        const lineContent = lines.join(textModel.getEOL());
        const range = new Range(1, 1, lineNumber + lines.length, lines[lines.length - 1].length + 1);
        const startOffset = textModel.getOffsetAt({ lineNumber, column: 1 });
        const tokens = this._forceParseAndTokenizeContent(textModel, range, startOffset, startOffset + lineContent.length, lineContent, false);
        if (!tokens) {
            return undefined;
        }
        const tokensByLine = new Array(lines.length);
        let tokensIndex = 0;
        let tokenStartOffset = 0;
        let lineStartOffset = 0;
        for (let i = 0; i < lines.length; i++) {
            const tokensForLine = [];
            let moveToNextLine = false;
            for (let j = tokensIndex; !moveToNextLine && j < tokens.length; j++) {
                const token = tokens[j];
                const lineAdjustedEndOffset = token.endOffset - lineStartOffset;
                const lineAdjustedStartOffset = tokenStartOffset - lineStartOffset;
                if (lineAdjustedEndOffset <= lines[i].length) {
                    tokensForLine.push({ endOffset: lineAdjustedEndOffset, metadata: token.metadata });
                    tokensIndex++;
                }
                else if (lineAdjustedStartOffset < lines[i].length) {
                    const partialToken = {
                        endOffset: lines[i].length,
                        metadata: token.metadata,
                    };
                    tokensForLine.push(partialToken);
                    moveToNextLine = true;
                }
                else {
                    moveToNextLine = true;
                }
                tokenStartOffset = token.endOffset;
            }
            tokensByLine[i] = this._endOffsetTokensToUint32Array(tokensForLine);
            lineStartOffset += lines[i].length + textModel.getEOL().length;
        }
        return tokensByLine;
    }
    _emptyTokensForOffsetAndLength(offset, length, emptyToken) {
        return { token: emptyToken, length: offset + length, startOffsetInclusive: 0 };
    }
    _createEmptyTokens(textModel) {
        const emptyToken = this._emptyToken();
        const modelEndOffset = textModel.getValueLength();
        const emptyTokens = [
            this._emptyTokensForOffsetAndLength(0, modelEndOffset, emptyToken),
        ];
        return emptyTokens;
    }
    _firstTreeUpdate(textModel, versionId, tree) {
        this._setInitialTokens(textModel);
        return this._setViewPortTokens(textModel, versionId, tree);
    }
    _setViewPortTokens(textModel, versionId, tree) {
        const maxLine = textModel.getLineCount();
        let rangeChanges;
        const editor = this._codeEditors.getEditorForModel(textModel);
        if (editor) {
            const viewPort = editor.getVisibleRangesPlusViewportAboveBelow();
            const ranges = new Array(viewPort.length);
            rangeChanges = new Array(viewPort.length);
            for (let i = 0; i < viewPort.length; i++) {
                const range = viewPort[i];
                ranges[i] = {
                    fromLineNumber: range.startLineNumber,
                    toLineNumber: range.endLineNumber < maxLine ? range.endLineNumber : maxLine,
                };
                const newRangeStartOffset = textModel.getOffsetAt(range.getStartPosition());
                const newRangeEndOffset = textModel.getOffsetAt(range.getEndPosition());
                rangeChanges[i] = {
                    newRange: range,
                    newRangeStartOffset,
                    newRangeEndOffset,
                };
            }
        }
        else {
            const valueLength = textModel.getValueLength();
            rangeChanges = [
                {
                    newRange: new Range(1, 1, maxLine, textModel.getLineMaxColumn(maxLine)),
                    newRangeStartOffset: 0,
                    newRangeEndOffset: valueLength,
                },
            ];
        }
        return this._handleTreeUpdate(rangeChanges, textModel, versionId, tree);
    }
    /**
     * Do not await in this method, it will cause a race
     */
    _handleTreeUpdate(ranges, textModel, versionId, textModelTreeSitter) {
        const tree = textModelTreeSitter.parseResult?.tree;
        if (!tree) {
            return;
        }
        const rangeChanges = [];
        const chunkSize = 1000;
        for (let i = 0; i < ranges.length; i++) {
            const rangeLinesLength = ranges[i].newRange.endLineNumber - ranges[i].newRange.startLineNumber;
            if (rangeLinesLength > chunkSize) {
                // Split the range into chunks to avoid long operations
                const fullRangeEndLineNumber = ranges[i].newRange.endLineNumber;
                let chunkLineStart = ranges[i].newRange.startLineNumber;
                let chunkColumnStart = ranges[i].newRange.startColumn;
                let chunkLineEnd = chunkLineStart + chunkSize;
                do {
                    const chunkStartingPosition = new Position(chunkLineStart, chunkColumnStart);
                    const chunkEndColumn = chunkLineEnd === ranges[i].newRange.endLineNumber
                        ? ranges[i].newRange.endColumn
                        : textModel.getLineMaxColumn(chunkLineEnd);
                    const chunkEndPosition = new Position(chunkLineEnd, chunkEndColumn);
                    const chunkRange = Range.fromPositions(chunkStartingPosition, chunkEndPosition);
                    rangeChanges.push({
                        range: chunkRange,
                        startOffset: textModel.getOffsetAt(chunkRange.getStartPosition()),
                        endOffset: textModel.getOffsetAt(chunkRange.getEndPosition()),
                    });
                    chunkLineStart = chunkLineEnd + 1;
                    chunkColumnStart = 1;
                    if (chunkLineEnd < fullRangeEndLineNumber &&
                        chunkLineEnd + chunkSize > fullRangeEndLineNumber) {
                        chunkLineEnd = fullRangeEndLineNumber;
                    }
                    else {
                        chunkLineEnd = chunkLineEnd + chunkSize;
                    }
                } while (chunkLineEnd <= fullRangeEndLineNumber);
            }
            else {
                // Check that the previous range doesn't overlap
                if (i === 0 || rangeChanges[i - 1].endOffset < ranges[i].newRangeStartOffset) {
                    rangeChanges.push({
                        range: ranges[i].newRange,
                        startOffset: ranges[i].newRangeStartOffset,
                        endOffset: ranges[i].newRangeEndOffset,
                    });
                }
                else if (rangeChanges[i - 1].endOffset < ranges[i].newRangeEndOffset) {
                    // clip the range to the previous range
                    const startPosition = textModel.getPositionAt(rangeChanges[i - 1].endOffset + 1);
                    const range = new Range(startPosition.lineNumber, startPosition.column, ranges[i].newRange.endLineNumber, ranges[i].newRange.endColumn);
                    rangeChanges.push({
                        range,
                        startOffset: rangeChanges[i - 1].endOffset + 1,
                        endOffset: ranges[i].newRangeEndOffset,
                    });
                }
            }
        }
        // Get the captures immediately while the text model is correct
        const captures = rangeChanges.map((range) => this._getCaptures(range.range, textModelTreeSitter, tree));
        // Don't block
        return this._updateTreeForRanges(textModel, rangeChanges, versionId, tree, captures).then(() => {
            const tree = this._getTree(textModel);
            if (!textModel.isDisposed() && tree?.parseResult?.versionId === textModel.getVersionId()) {
                this._refreshNeedsRefresh(textModel, versionId);
            }
        });
    }
    async _updateTreeForRanges(textModel, rangeChanges, versionId, tree, captures) {
        let tokenUpdate;
        for (let i = 0; i < rangeChanges.length; i++) {
            if (!textModel.isDisposed() && versionId !== textModel.getVersionId()) {
                // Our captures have become invalid and we need to re-capture
                break;
            }
            const capture = captures[i];
            const range = rangeChanges[i];
            const updates = this.getTokensInRange(textModel, range.range, range.startOffset, range.endOffset, tree, capture);
            if (updates) {
                tokenUpdate = { newTokens: updates };
            }
            else {
                tokenUpdate = { newTokens: [] };
            }
            this._tokenizationStoreService.updateTokens(textModel, versionId, [tokenUpdate], TokenQuality.Accurate);
            this._onDidChangeTokens.fire({
                textModel: textModel,
                changes: {
                    semanticTokensApplied: false,
                    ranges: [
                        {
                            fromLineNumber: range.range.getStartPosition().lineNumber,
                            toLineNumber: range.range.getEndPosition().lineNumber,
                        },
                    ],
                },
            });
            await new Promise((resolve) => setTimeout0(resolve));
        }
        this._onDidCompleteBackgroundTokenization.fire({ textModel });
    }
    _refreshNeedsRefresh(textModel, versionId) {
        const rangesToRefresh = this._tokenizationStoreService.getNeedsRefresh(textModel);
        if (rangesToRefresh.length === 0) {
            return;
        }
        const rangeChanges = new Array(rangesToRefresh.length);
        for (let i = 0; i < rangesToRefresh.length; i++) {
            const range = rangesToRefresh[i];
            rangeChanges[i] = {
                newRange: range.range,
                newRangeStartOffset: range.startOffset,
                newRangeEndOffset: range.endOffset,
            };
        }
        const tree = this._getTree(textModel);
        if (tree?.parseResult?.tree && tree.parseResult.versionId === versionId) {
            this._handleTreeUpdate(rangeChanges, textModel, versionId, tree);
        }
    }
    _rangeTokensAsUpdates(rangeOffset, endOffsetToken, startingOffsetInArray) {
        const updates = [];
        let lastEnd = 0;
        for (const token of endOffsetToken) {
            if (token.endOffset <= lastEnd ||
                (startingOffsetInArray && token.endOffset < startingOffsetInArray)) {
                continue;
            }
            let tokenUpdate;
            if (startingOffsetInArray && lastEnd < startingOffsetInArray) {
                tokenUpdate = {
                    startOffsetInclusive: rangeOffset + startingOffsetInArray,
                    length: token.endOffset - startingOffsetInArray,
                    token: token.metadata,
                };
            }
            else {
                tokenUpdate = {
                    startOffsetInclusive: rangeOffset + lastEnd,
                    length: token.endOffset - lastEnd,
                    token: token.metadata,
                };
            }
            updates.push(tokenUpdate);
            lastEnd = token.endOffset;
        }
        return updates;
    }
    getTokensInRange(textModel, range, rangeStartOffset, rangeEndOffset, tree, captures) {
        const tokens = captures
            ? this._tokenizeCapturesWithMetadata(tree, captures, rangeStartOffset, rangeEndOffset)
            : this._tokenize(range, rangeStartOffset, rangeEndOffset, textModel);
        if (tokens?.endOffsetsAndMetadata) {
            return this._rangeTokensAsUpdates(rangeStartOffset, tokens.endOffsetsAndMetadata);
        }
        return undefined;
    }
    _getTree(textModel) {
        return this._treeSitterService.getParseResult(textModel);
    }
    _ensureQuery() {
        if (!this._query) {
            const language = this._treeSitterService.getOrInitLanguage(this._languageId);
            if (!language) {
                if (!this._languageAddedListener) {
                    this._languageAddedListener = this._register(Event.onceIf(this._treeSitterService.onDidAddLanguage, (e) => e.id === this._languageId)((e) => {
                        this._query = new this.Query(e.language, this._queries);
                    }));
                }
                return;
            }
            this._query = new this.Query(language, this._queries);
        }
        return this._query;
    }
    _updateTheme(e) {
        this._colorThemeData = this._themeService.getColorTheme();
        for (const model of this._codeEditors.textModels) {
            const modelRange = model.getFullModelRange();
            this._tokenizationStoreService.markForRefresh(model, modelRange);
            const editor = this._codeEditors.getEditorForModel(model);
            if (editor) {
                this._parseAndTokenizeViewPort(model, editor.getVisibleRangesPlusViewportAboveBelow());
            }
        }
    }
    captureAtPosition(lineNumber, column, textModel) {
        const textModelTreeSitter = this._getTree(textModel);
        if (!textModelTreeSitter?.parseResult?.tree) {
            return [];
        }
        const captures = this._captureAtRangeWithInjections(new Range(lineNumber, column, lineNumber, column + 1), textModelTreeSitter, textModelTreeSitter.parseResult.tree);
        return captures;
    }
    captureAtRangeTree(range, tree, textModelTreeSitter) {
        const captures = textModelTreeSitter
            ? this._captureAtRangeWithInjections(range, textModelTreeSitter, tree)
            : this._captureAtRange(range, tree);
        return captures;
    }
    _captureAtRange(range, tree) {
        const query = this._ensureQuery();
        if (!tree || !query) {
            return [];
        }
        // Tree sitter row is 0 based, column is 0 based
        return query
            .captures(tree.rootNode, {
            startPosition: { row: range.startLineNumber - 1, column: range.startColumn - 1 },
            endPosition: { row: range.endLineNumber - 1, column: range.endColumn - 1 },
        })
            .map((capture) => ({
            name: capture.name,
            text: capture.node.text,
            node: {
                startIndex: capture.node.startIndex,
                endIndex: capture.node.endIndex,
                startPosition: {
                    lineNumber: capture.node.startPosition.row + 1,
                    column: capture.node.startPosition.column + 1,
                },
                endPosition: {
                    lineNumber: capture.node.endPosition.row + 1,
                    column: capture.node.endPosition.column + 1,
                },
            },
            encodedLanguageId: this._encodedLanguageId,
        }));
    }
    _captureAtRangeWithInjections(range, textModelTreeSitter, tree) {
        const query = this._ensureQuery();
        if (!textModelTreeSitter?.parseResult || !query) {
            return [];
        }
        const captures = this._captureAtRange(range, tree);
        for (let i = 0; i < captures.length; i++) {
            const capture = captures[i];
            const capStartLine = capture.node.startPosition.lineNumber;
            const capEndLine = capture.node.endPosition.lineNumber;
            const capStartColumn = capture.node.startPosition.column;
            const capEndColumn = capture.node.endPosition.column;
            const startLine = capStartLine > range.startLineNumber && capStartLine < range.endLineNumber
                ? capStartLine
                : range.startLineNumber;
            const endLine = capEndLine > range.startLineNumber && capEndLine < range.endLineNumber
                ? capEndLine
                : range.endLineNumber;
            const startColumn = capStartLine === range.startLineNumber
                ? capStartColumn < range.startColumn
                    ? range.startColumn
                    : capStartColumn
                : capStartLine < range.startLineNumber
                    ? range.startColumn
                    : capStartColumn;
            const endColumn = capEndLine === range.endLineNumber
                ? capEndColumn > range.endColumn
                    ? range.endColumn
                    : capEndColumn
                : capEndLine > range.endLineNumber
                    ? range.endColumn
                    : capEndColumn;
            const injectionRange = new Range(startLine, startColumn, endLine, endColumn);
            const injection = this._getInjectionCaptures(textModelTreeSitter, capture, injectionRange);
            if (injection && injection.length > 0) {
                captures.splice(i + 1, 0, ...injection);
                i += injection.length;
            }
        }
        return captures;
    }
    /**
     * Gets the tokens for a given line.
     * Each token takes 2 elements in the array. The first element is the offset of the end of the token *in the line, not in the document*, and the second element is the metadata.
     *
     * @param lineNumber
     * @returns
     */
    tokenizeEncoded(lineNumber, textModel) {
        const tokens = this._tokenizeEncoded(lineNumber, textModel);
        if (!tokens) {
            return undefined;
        }
        const updates = this._rangeTokensAsUpdates(textModel.getOffsetAt({ lineNumber, column: 1 }), tokens.result);
        if (tokens.versionId === textModel.getVersionId()) {
            this._tokenizationStoreService.updateTokens(textModel, tokens.versionId, [{ newTokens: updates, oldRangeLength: textModel.getLineLength(lineNumber) }], TokenQuality.Accurate);
        }
    }
    tokenizeEncodedInstrumented(lineNumber, textModel) {
        const tokens = this._tokenizeEncoded(lineNumber, textModel);
        if (!tokens) {
            return undefined;
        }
        return {
            result: this._endOffsetTokensToUint32Array(tokens.result),
            captureTime: tokens.captureTime,
            metadataTime: tokens.metadataTime,
        };
    }
    _getCaptures(range, textModelTreeSitter, tree) {
        const captures = this._captureAtRangeWithInjections(range, textModelTreeSitter, tree);
        return captures;
    }
    _tokenize(range, rangeStartOffset, rangeEndOffset, textModel) {
        const tree = this._getTree(textModel);
        if (!tree?.parseResult?.tree) {
            return undefined;
        }
        const captures = this._getCaptures(range, tree, tree.parseResult.tree);
        const result = this._tokenizeCapturesWithMetadata(tree.parseResult.tree, captures, rangeStartOffset, rangeEndOffset);
        if (!result) {
            return undefined;
        }
        return { ...result, versionId: tree.parseResult.versionId };
    }
    _createTokensFromCaptures(tree, captures, rangeStartOffset, rangeEndOffset) {
        const stopwatch = StopWatch.create();
        const rangeLength = rangeEndOffset - rangeStartOffset;
        const encodedLanguageId = this._languageIdCodec.encodeLanguageId(this._languageId);
        const baseScope = TREESITTER_BASE_SCOPES[this._languageId] || 'source';
        if (captures.length === 0) {
            if (tree) {
                stopwatch.stop();
                const endOffsetsAndMetadata = [{ endOffset: rangeLength, scopes: [], encodedLanguageId }];
                return { endOffsets: endOffsetsAndMetadata, captureTime: stopwatch.elapsed() };
            }
            return undefined;
        }
        const endOffsetsAndScopes = Array(captures.length);
        endOffsetsAndScopes.fill({ endOffset: 0, scopes: [baseScope], encodedLanguageId });
        let tokenIndex = 0;
        const increaseSizeOfTokensByOneToken = () => {
            endOffsetsAndScopes.push({ endOffset: 0, scopes: [baseScope], encodedLanguageId });
        };
        const brackets = (capture, startOffset) => {
            return capture.name.includes('punctuation') && capture.text
                ? Array.from(capture.text.matchAll(BRACKETS)).map((match) => startOffset + match.index)
                : undefined;
        };
        const addCurrentTokenToArray = (capture, startOffset, endOffset, position) => {
            if (position !== undefined) {
                const oldScopes = endOffsetsAndScopes[position].scopes;
                let oldBracket = endOffsetsAndScopes[position].bracket;
                // Check that the previous token ends at the same point that the current token starts
                const prevEndOffset = position > 0 ? endOffsetsAndScopes[position - 1].endOffset : 0;
                if (prevEndOffset !== startOffset) {
                    let preInsertBracket = undefined;
                    if (oldBracket && oldBracket.length > 0) {
                        preInsertBracket = [];
                        const postInsertBracket = [];
                        for (let i = 0; i < oldBracket.length; i++) {
                            const bracket = oldBracket[i];
                            if (bracket < startOffset) {
                                preInsertBracket.push(bracket);
                            }
                            else if (bracket > endOffset) {
                                postInsertBracket.push(bracket);
                            }
                        }
                        if (preInsertBracket.length === 0) {
                            preInsertBracket = undefined;
                        }
                        if (postInsertBracket.length === 0) {
                            oldBracket = undefined;
                        }
                        else {
                            oldBracket = postInsertBracket;
                        }
                    }
                    // We need to add some of the position token to cover the space
                    endOffsetsAndScopes.splice(position, 0, {
                        endOffset: startOffset,
                        scopes: [...oldScopes],
                        bracket: preInsertBracket,
                        encodedLanguageId: capture.encodedLanguageId,
                    });
                    position++;
                    increaseSizeOfTokensByOneToken();
                    tokenIndex++;
                }
                endOffsetsAndScopes.splice(position, 0, {
                    endOffset: endOffset,
                    scopes: [...oldScopes, capture.name],
                    bracket: brackets(capture, startOffset),
                    encodedLanguageId: capture.encodedLanguageId,
                });
                endOffsetsAndScopes[tokenIndex].bracket = oldBracket;
            }
            else {
                endOffsetsAndScopes[tokenIndex] = {
                    endOffset: endOffset,
                    scopes: [baseScope, capture.name],
                    bracket: brackets(capture, startOffset),
                    encodedLanguageId: capture.encodedLanguageId,
                };
            }
            tokenIndex++;
        };
        for (let captureIndex = 0; captureIndex < captures.length; captureIndex++) {
            const capture = captures[captureIndex];
            const tokenEndIndex = capture.node.endIndex < rangeEndOffset
                ? capture.node.endIndex < rangeStartOffset
                    ? rangeStartOffset
                    : capture.node.endIndex
                : rangeEndOffset;
            const tokenStartIndex = capture.node.startIndex < rangeStartOffset ? rangeStartOffset : capture.node.startIndex;
            const endOffset = tokenEndIndex - rangeStartOffset;
            // Not every character will get captured, so we need to make sure that our current capture doesn't bleed toward the start of the line and cover characters that it doesn't apply to.
            // We do this by creating a new token in the array if the previous token ends before the current token starts.
            let previousEndOffset;
            const currentTokenLength = tokenEndIndex - tokenStartIndex;
            if (captureIndex > 0) {
                previousEndOffset = endOffsetsAndScopes[tokenIndex - 1].endOffset;
            }
            else {
                previousEndOffset = tokenStartIndex - rangeStartOffset - 1;
            }
            const startOffset = endOffset - currentTokenLength;
            if (previousEndOffset >= 0 && previousEndOffset < startOffset) {
                // Add en empty token to cover the space where there were no captures
                endOffsetsAndScopes[tokenIndex] = {
                    endOffset: startOffset,
                    scopes: [baseScope],
                    encodedLanguageId: this._encodedLanguageId,
                };
                tokenIndex++;
                increaseSizeOfTokensByOneToken();
            }
            if (currentTokenLength < 0) {
                // This happens when we have a token "gap" right at the end of the capture range. The last capture isn't used because it's start index isn't included in the range.
                continue;
            }
            if (previousEndOffset >= endOffset) {
                // walk back through the tokens until we find the one that contains the current token
                let withinTokenIndex = tokenIndex - 1;
                let previousTokenEndOffset = endOffsetsAndScopes[withinTokenIndex].endOffset;
                let previousTokenStartOffset = withinTokenIndex >= 2 ? endOffsetsAndScopes[withinTokenIndex - 1].endOffset : 0;
                do {
                    // Check that the current token doesn't just replace the last token
                    if (previousTokenStartOffset + currentTokenLength === previousTokenEndOffset) {
                        if (previousTokenStartOffset === startOffset) {
                            // Current token and previous token span the exact same characters, add the scopes to the previous token
                            endOffsetsAndScopes[withinTokenIndex].scopes.push(capture.name);
                            const oldBracket = endOffsetsAndScopes[withinTokenIndex].bracket;
                            endOffsetsAndScopes[withinTokenIndex].bracket =
                                oldBracket && oldBracket.length > 0 ? oldBracket : brackets(capture, startOffset);
                        }
                    }
                    else if (previousTokenStartOffset <= startOffset) {
                        addCurrentTokenToArray(capture, startOffset, endOffset, withinTokenIndex);
                        break;
                    }
                    withinTokenIndex--;
                    previousTokenStartOffset =
                        withinTokenIndex >= 1 ? endOffsetsAndScopes[withinTokenIndex - 1].endOffset : 0;
                    previousTokenEndOffset =
                        withinTokenIndex >= 0 ? endOffsetsAndScopes[withinTokenIndex].endOffset : 0;
                } while (previousTokenEndOffset > startOffset);
            }
            else {
                // Just add the token to the array
                addCurrentTokenToArray(capture, startOffset, endOffset);
            }
        }
        // Account for uncaptured characters at the end of the line
        if (endOffsetsAndScopes[tokenIndex - 1].endOffset < rangeLength) {
            if (rangeLength - endOffsetsAndScopes[tokenIndex - 1].endOffset > 0) {
                increaseSizeOfTokensByOneToken();
                endOffsetsAndScopes[tokenIndex] = {
                    endOffset: rangeLength,
                    scopes: endOffsetsAndScopes[tokenIndex].scopes,
                    encodedLanguageId: this._encodedLanguageId,
                };
                tokenIndex++;
            }
        }
        for (let i = 0; i < endOffsetsAndScopes.length; i++) {
            const token = endOffsetsAndScopes[i];
            if (token.endOffset === 0 && token.scopes.length === 0 && i !== 0) {
                endOffsetsAndScopes.splice(i, endOffsetsAndScopes.length - i);
                break;
            }
        }
        const captureTime = stopwatch.elapsed();
        return {
            endOffsets: endOffsetsAndScopes,
            captureTime,
        };
    }
    _getInjectionCaptures(textModelTreeSitter, parentCapture, range) {
        const injection = textModelTreeSitter.getInjection(parentCapture.node.startIndex, this._languageId);
        if (!injection?.tree || injection.versionId !== textModelTreeSitter.parseResult?.versionId) {
            return undefined;
        }
        const feature = TreeSitterTokenizationRegistry.get(injection.languageId);
        if (!feature) {
            return undefined;
        }
        return feature.captureAtRangeTree(range, injection.tree, textModelTreeSitter);
    }
    _tokenizeCapturesWithMetadata(tree, captures, rangeStartOffset, rangeEndOffset) {
        const stopwatch = StopWatch.create();
        const emptyTokens = this._createTokensFromCaptures(tree, captures, rangeStartOffset, rangeEndOffset);
        if (!emptyTokens) {
            return undefined;
        }
        const endOffsetsAndScopes = emptyTokens.endOffsets;
        for (let i = 0; i < endOffsetsAndScopes.length; i++) {
            const token = endOffsetsAndScopes[i];
            token.metadata = findMetadata(this._colorThemeData, token.scopes, token.encodedLanguageId, !!token.bracket && token.bracket.length > 0);
        }
        const metadataTime = stopwatch.elapsed();
        return {
            endOffsetsAndMetadata: endOffsetsAndScopes,
            captureTime: emptyTokens.captureTime,
            metadataTime,
        };
    }
    _emptyToken() {
        return findMetadata(this._colorThemeData, [], this._encodedLanguageId, false);
    }
    _tokenizeEncoded(lineNumber, textModel) {
        const lineOffset = textModel.getOffsetAt({ lineNumber: lineNumber, column: 1 });
        const maxLine = textModel.getLineCount();
        const lineEndOffset = lineNumber + 1 <= maxLine
            ? textModel.getOffsetAt({ lineNumber: lineNumber + 1, column: 1 })
            : textModel.getValueLength();
        const lineLength = lineEndOffset - lineOffset;
        const result = this._tokenize(new Range(lineNumber, 1, lineNumber, lineLength + 1), lineOffset, lineEndOffset, textModel);
        if (!result) {
            return undefined;
        }
        return {
            result: result.endOffsetsAndMetadata,
            captureTime: result.captureTime,
            metadataTime: result.metadataTime,
            versionId: result.versionId,
        };
    }
    _endOffsetTokensToUint32Array(endOffsetsAndMetadata) {
        const uint32Array = new Uint32Array(endOffsetsAndMetadata.length * 2);
        for (let i = 0; i < endOffsetsAndMetadata.length; i++) {
            uint32Array[i * 2] = endOffsetsAndMetadata[i].endOffset;
            uint32Array[i * 2 + 1] = endOffsetsAndMetadata[i].metadata;
        }
        return uint32Array;
    }
    dispose() {
        super.dispose();
        this._query?.delete();
        this._query = undefined;
    }
};
TreeSitterTokenizationSupport = __decorate([
    __param(4, ITreeSitterParserService),
    __param(5, IWorkbenchThemeService),
    __param(6, ITreeSitterTokenizationStoreService),
    __param(7, IInstantiationService)
], TreeSitterTokenizationSupport);
export { TreeSitterTokenizationSupport };
registerSingleton(ITreeSitterTokenizationFeature, TreeSitterTokenizationFeature, 0 /* InstantiationType.Eager */);
