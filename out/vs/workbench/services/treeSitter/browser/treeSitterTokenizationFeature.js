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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVNpdHRlclRva2VuaXphdGlvbkZlYXR1cmUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdHJlZVNpdHRlci9icm93c2VyL3RyZWVTaXR0ZXJUb2tlbml6YXRpb25GZWF0dXJlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUNOLFVBQVUsRUFDVixhQUFhLEVBQ2IsZUFBZSxHQUVmLE1BQU0sc0NBQXNDLENBQUE7QUFDN0MsT0FBTyxFQUFtQixVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNoRixPQUFPLEVBR04sdUJBQXVCLEVBRXZCLDhCQUE4QixHQUM5QixNQUFNLHdDQUF3QyxDQUFBO0FBRS9DLE9BQU8sRUFDTixxQ0FBcUMsRUFDckMsd0JBQXdCLEVBRXhCLG1CQUFtQixFQUNuQiwwQkFBMEIsR0FHMUIsTUFBTSwrREFBK0QsQ0FBQTtBQUV0RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDekUsT0FBTyxFQUVOLGlCQUFpQixHQUNqQixNQUFNLHlEQUF5RCxDQUFBO0FBQ2hFLE9BQU8sRUFDTixlQUFlLEVBQ2YscUJBQXFCLEdBQ3JCLE1BQU0sNERBQTRELENBQUE7QUFDbkUsT0FBTyxFQUFrQixZQUFZLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNwRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUNsRixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyxFQUFFLG1DQUFtQyxF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