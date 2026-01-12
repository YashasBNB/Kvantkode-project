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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVNpdHRlclRva2VuaXphdGlvbkZlYXR1cmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90cmVlU2l0dGVyL2Jyb3dzZXIvdHJlZVNpdHRlclRva2VuaXphdGlvbkZlYXR1cmUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQ04sVUFBVSxFQUNWLGFBQWEsRUFDYixlQUFlLEdBRWYsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM3QyxPQUFPLEVBQW1CLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ2hGLE9BQU8sRUFHTix1QkFBdUIsRUFFdkIsOEJBQThCLEdBQzlCLE1BQU0sd0NBQXdDLENBQUE7QUFFL0MsT0FBTyxFQUNOLHFDQUFxQyxFQUNyQyx3QkFBd0IsRUFFeEIsbUJBQW1CLEVBQ25CLDBCQUEwQixHQUcxQixNQUFNLCtEQUErRCxDQUFBO0FBRXRFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFPLEVBRU4saUJBQWlCLEdBQ2pCLE1BQU0seURBQXlELENBQUE7QUFDaEUsT0FBTyxFQUNOLGVBQWUsRUFDZixxQkFBcUIsR0FDckIsTUFBTSw0REFBNEQsQ0FBQTtBQUNuRSxPQUFPLEVBQWtCLFlBQVksRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxTQUFTLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsbUNB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