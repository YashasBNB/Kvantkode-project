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
import { ITreeSitterImporter, } from '../treeSitterParserService.js';
import { Disposable, DisposableStore, dispose, } from '../../../../base/common/lifecycle.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { setTimeout0 } from '../../../../base/common/platform.js';
import { Emitter, Event } from '../../../../base/common/event.js';
import { cancelOnDispose } from '../../../../base/common/cancellation.js';
import { Range } from '../../core/range.js';
import { LimitedQueue } from '../../../../base/common/async.js';
import { TextLength } from '../../core/textLength.js';
import { FileAccess } from '../../../../base/common/network.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { CancellationError, isCancellationError } from '../../../../base/common/errors.js';
import { getClosestPreviousNodes, gotoNthChild, gotoParent, nextSiblingOrParentSibling, } from './cursorUtils.js';
var TelemetryParseType;
(function (TelemetryParseType) {
    TelemetryParseType["Full"] = "fullParse";
    TelemetryParseType["Incremental"] = "incrementalParse";
})(TelemetryParseType || (TelemetryParseType = {}));
let TextModelTreeSitter = class TextModelTreeSitter extends Disposable {
    get parseResult() {
        return this._rootTreeSitterTree;
    }
    constructor(textModel, _treeSitterLanguages, parseImmediately = true, _treeSitterImporter, _logService, _telemetryService, _fileService) {
        super();
        this.textModel = textModel;
        this._treeSitterLanguages = _treeSitterLanguages;
        this._treeSitterImporter = _treeSitterImporter;
        this._logService = _logService;
        this._telemetryService = _telemetryService;
        this._fileService = _fileService;
        this._onDidChangeParseResult = this._register(new Emitter());
        this.onDidChangeParseResult = this._onDidChangeParseResult.event;
        // TODO: @alexr00 use a better data structure for this
        this._injectionTreeSitterTrees = new Map();
        this._versionId = 0;
        this._parseSessionDisposables = this._register(new DisposableStore());
        if (parseImmediately) {
            this._register(Event.runAndSubscribe(this.textModel.onDidChangeLanguage, (e) => this._onDidChangeLanguage(e ? e.newLanguage : this.textModel.getLanguageId())));
        }
        else {
            this._register(this.textModel.onDidChangeLanguage((e) => this._onDidChangeLanguage(e ? e.newLanguage : this.textModel.getLanguageId())));
        }
    }
    async _onDidChangeLanguage(languageId) {
        this.parse(languageId);
    }
    /**
     * Be very careful when making changes to this method as it is easy to introduce race conditions.
     */
    async parse(languageId = this.textModel.getLanguageId()) {
        this._parseSessionDisposables.clear();
        this._rootTreeSitterTree = undefined;
        const token = cancelOnDispose(this._parseSessionDisposables);
        let language;
        try {
            language = await this._getLanguage(languageId, token);
        }
        catch (e) {
            if (isCancellationError(e)) {
                return;
            }
            throw e;
        }
        const Parser = await this._treeSitterImporter.getParserClass();
        if (token.isCancellationRequested) {
            return;
        }
        const treeSitterTree = this._parseSessionDisposables.add(new TreeSitterParseResult(new Parser(), languageId, language, this._logService, this._telemetryService));
        this._rootTreeSitterTree = treeSitterTree;
        this._parseSessionDisposables.add(treeSitterTree.onDidUpdate((e) => this._handleTreeUpdate(e)));
        this._parseSessionDisposables.add(this.textModel.onDidChangeContent((e) => this._onDidChangeContent(treeSitterTree, [e])));
        this._onDidChangeContent(treeSitterTree, undefined);
        if (token.isCancellationRequested) {
            return;
        }
        return this._rootTreeSitterTree;
    }
    _getLanguage(languageId, token) {
        const language = this._treeSitterLanguages.getOrInitLanguage(languageId);
        if (language) {
            return Promise.resolve(language);
        }
        const disposables = [];
        return new Promise((resolve, reject) => {
            disposables.push(this._treeSitterLanguages.onDidAddLanguage((e) => {
                if (e.id === languageId) {
                    dispose(disposables);
                    resolve(e.language);
                }
            }));
            token.onCancellationRequested(() => {
                dispose(disposables);
                reject(new CancellationError());
            }, undefined, disposables);
        });
    }
    async _handleTreeUpdate(e, parentTreeResult, parentLanguage) {
        if (e.ranges && e.versionId >= this._versionId) {
            this._versionId = e.versionId;
            const tree = parentTreeResult ?? this._rootTreeSitterTree;
            let injections;
            if (tree.tree) {
                injections = await this._collectInjections(tree.tree);
                // kick off check for injected languages
                if (injections) {
                    this._processInjections(injections, tree, parentLanguage ?? this.textModel.getLanguageId(), e.includedModelChanges);
                }
            }
            this._onDidChangeParseResult.fire({
                ranges: e.ranges,
                versionId: e.versionId,
                tree: this,
                languageId: this.textModel.getLanguageId(),
                hasInjections: !!injections && injections.size > 0,
            });
        }
    }
    async _ensureInjectionQueries() {
        if (!this._queries) {
            const injectionsQueriesLocation = `vs/editor/common/languages/injections/${this.textModel.getLanguageId()}.scm`;
            const uri = FileAccess.asFileUri(injectionsQueriesLocation);
            if (!(await this._fileService.exists(uri))) {
                this._queries = '';
            }
            else if (this._fileService.hasProvider(uri)) {
                const query = await this._fileService.readFile(uri);
                this._queries = query.value.toString();
            }
            else {
                this._queries = '';
            }
        }
        return this._queries;
    }
    async _getQuery() {
        if (!this._query) {
            const language = await this._treeSitterLanguages.getLanguage(this.textModel.getLanguageId());
            if (!language) {
                return;
            }
            const queries = await this._ensureInjectionQueries();
            if (queries === '') {
                return;
            }
            const Query = await this._treeSitterImporter.getQueryClass();
            this._query = new Query(language, queries);
        }
        return this._query;
    }
    async _collectInjections(tree) {
        const query = await this._getQuery();
        if (!query) {
            return;
        }
        if (!tree?.rootNode) {
            // need to check the root node here as `walk` will throw if not defined.
            return;
        }
        const cursor = tree.walk();
        const injections = new Map();
        let hasNext = true;
        while (hasNext) {
            hasNext = await this._processNode(cursor, query, injections);
            // Yield periodically
            await new Promise((resolve) => setTimeout0(resolve));
        }
        return this._mergeAdjacentRanges(injections);
    }
    _processNode(cursor, query, injections) {
        const node = cursor.currentNode;
        const nodeLineCount = node.endPosition.row - node.startPosition.row;
        // We check the node line count to avoid processing large nodes in one go as that can cause performance issues.
        if (nodeLineCount <= 1000) {
            this._processCaptures(query, node, injections);
            // Move to next sibling or up and over
            return cursor.gotoNextSibling() || this.gotoNextSiblingOfAncestor(cursor);
        }
        else {
            // Node is too large, go to first child or next sibling
            return (cursor.gotoFirstChild() ||
                cursor.gotoNextSibling() ||
                this.gotoNextSiblingOfAncestor(cursor));
        }
    }
    _processCaptures(query, node, injections) {
        const captures = query.captures(node);
        for (const capture of captures) {
            const injectionLanguage = capture.setProperties?.['injection.language'];
            if (injectionLanguage) {
                const range = this._createRangeFromNode(capture.node);
                if (!injections.has(injectionLanguage)) {
                    injections.set(injectionLanguage, []);
                }
                injections.get(injectionLanguage)?.push(range);
            }
        }
    }
    _createRangeFromNode(node) {
        return {
            startIndex: node.startIndex,
            endIndex: node.endIndex,
            startPosition: { row: node.startPosition.row, column: node.startPosition.column },
            endPosition: { row: node.endPosition.row, column: node.endPosition.column },
        };
    }
    _mergeAdjacentRanges(injections) {
        for (const [languageId, ranges] of injections) {
            if (ranges.length <= 1) {
                continue;
            }
            const mergedRanges = [];
            let current = ranges[0];
            for (let i = 1; i < ranges.length; i++) {
                const next = ranges[i];
                if (next.startIndex <= current.endIndex) {
                    current = this._mergeRanges(current, next);
                }
                else {
                    mergedRanges.push(current);
                    current = next;
                }
            }
            mergedRanges.push(current);
            injections.set(languageId, mergedRanges);
        }
        return injections;
    }
    _mergeRanges(current, next) {
        return {
            startIndex: current.startIndex,
            endIndex: Math.max(current.endIndex, next.endIndex),
            startPosition: current.startPosition,
            endPosition: next.endPosition.row > current.endPosition.row ? next.endPosition : current.endPosition,
        };
    }
    async _processInjections(injections, parentTree, parentLanguage, modelChanges) {
        for (const [languageId, ranges] of injections) {
            const language = await this._treeSitterLanguages.getLanguage(languageId);
            if (!language) {
                continue;
            }
            const treeSitterTree = await this._getOrCreateInjectedTree(languageId, language, parentTree, parentLanguage);
            if (treeSitterTree) {
                this._onDidChangeContent(treeSitterTree, modelChanges, ranges);
            }
        }
    }
    async _getOrCreateInjectedTree(languageId, language, parentTree, parentLanguage) {
        let treeSitterTree = this._injectionTreeSitterTrees.get(languageId);
        if (!treeSitterTree) {
            const Parser = await this._treeSitterImporter.getParserClass();
            treeSitterTree = new TreeSitterParseResult(new Parser(), languageId, language, this._logService, this._telemetryService);
            this._parseSessionDisposables.add(treeSitterTree.onDidUpdate((e) => this._handleTreeUpdate(e, parentTree, parentLanguage)));
            this._injectionTreeSitterTrees.set(languageId, treeSitterTree);
        }
        return treeSitterTree;
    }
    gotoNextSiblingOfAncestor(cursor) {
        while (cursor.gotoParent()) {
            if (cursor.gotoNextSibling()) {
                return true;
            }
        }
        return false;
    }
    getInjection(offset, parentLanguage) {
        if (this._injectionTreeSitterTrees.size === 0) {
            return undefined;
        }
        let hasFoundParentLanguage = parentLanguage === this.textModel.getLanguageId();
        for (const [_, treeSitterTree] of this._injectionTreeSitterTrees) {
            if (treeSitterTree.tree) {
                if (hasFoundParentLanguage &&
                    treeSitterTree.ranges?.find((r) => r.startIndex <= offset && r.endIndex >= offset)) {
                    return treeSitterTree;
                }
                if (!hasFoundParentLanguage && treeSitterTree.languageId === parentLanguage) {
                    hasFoundParentLanguage = true;
                }
            }
        }
        return undefined;
    }
    _onDidChangeContent(treeSitterTree, change, ranges) {
        treeSitterTree.onDidChangeContent(this.textModel, change, ranges);
    }
};
TextModelTreeSitter = __decorate([
    __param(3, ITreeSitterImporter),
    __param(4, ILogService),
    __param(5, ITelemetryService),
    __param(6, IFileService)
], TextModelTreeSitter);
export { TextModelTreeSitter };
export class TreeSitterParseResult {
    get versionId() {
        return this._versionId;
    }
    constructor(parser, languageId, language, _logService, _telemetryService) {
        this.parser = parser;
        this.languageId = languageId;
        this.language = language;
        this._logService = _logService;
        this._telemetryService = _telemetryService;
        this._onDidUpdate = new Emitter();
        this.onDidUpdate = this._onDidUpdate.event;
        this._versionId = 0;
        this._editVersion = 0;
        this._isDisposed = false;
        this._onDidChangeContentQueue = new LimitedQueue();
        this._lastYieldTime = 0;
        this.parser.setLanguage(language);
    }
    dispose() {
        this._isDisposed = true;
        this._onDidUpdate.dispose();
        this._tree?.delete();
        this._lastFullyParsed?.delete();
        this._lastFullyParsedWithEdits?.delete();
        this.parser?.delete();
    }
    get tree() {
        return this._lastFullyParsed;
    }
    get isDisposed() {
        return this._isDisposed;
    }
    findChangedNodes(newTree, oldTree) {
        const newCursor = newTree.walk();
        const oldCursor = oldTree.walk();
        const nodes = [];
        let next = true;
        do {
            if (newCursor.currentNode.hasChanges) {
                // Check if only one of the children has changes.
                // If it's only one, then we go to that child.
                // If it's more then, we need to go to each child
                // If it's none, then we've found one of our ranges
                const newChildren = newCursor.currentNode.children;
                const indexChangedChildren = [];
                const changedChildren = newChildren.filter((c, index) => {
                    if (c?.hasChanges || oldCursor.currentNode.children.length <= index) {
                        indexChangedChildren.push(index);
                        return true;
                    }
                    return false;
                });
                // If we have changes and we *had* an error, the whole node should be refreshed.
                if (changedChildren.length === 0 ||
                    newCursor.currentNode.hasError !== oldCursor.currentNode.hasError) {
                    // walk up again until we get to the first one that's named as unnamed nodes can be too granular
                    while (newCursor.currentNode.parent && next && !newCursor.currentNode.isNamed) {
                        next = gotoParent(newCursor, oldCursor);
                    }
                    // Use the end position of the previous node and the start position of the current node
                    const newNode = newCursor.currentNode;
                    const closestPreviousNode = getClosestPreviousNodes(newCursor, newTree) ?? newNode;
                    nodes.push({
                        startIndex: closestPreviousNode.startIndex,
                        endIndex: newNode.endIndex,
                        startPosition: closestPreviousNode.startPosition,
                        endPosition: newNode.endPosition,
                    });
                    next = nextSiblingOrParentSibling(newCursor, oldCursor);
                }
                else if (changedChildren.length >= 1) {
                    next = gotoNthChild(newCursor, oldCursor, indexChangedChildren[0]);
                }
            }
            else {
                next = nextSiblingOrParentSibling(newCursor, oldCursor);
            }
        } while (next);
        return nodes;
    }
    findTreeChanges(newTree, changedNodes, newRanges) {
        let newRangeIndex = 0;
        const mergedChanges = [];
        // Find the parent in the new tree of the changed node
        for (let nodeIndex = 0; nodeIndex < changedNodes.length; nodeIndex++) {
            const node = changedNodes[nodeIndex];
            if (mergedChanges.length > 0) {
                if (node.startIndex >= mergedChanges[mergedChanges.length - 1].newRangeStartOffset &&
                    node.endIndex <= mergedChanges[mergedChanges.length - 1].newRangeEndOffset) {
                    // This node is within the previous range, skip it
                    continue;
                }
            }
            const cursor = newTree.walk();
            const cursorContainersNode = () => cursor.startIndex < node.startIndex && cursor.endIndex > node.endIndex;
            while (cursorContainersNode()) {
                // See if we can go to a child
                let child = cursor.gotoFirstChild();
                let foundChild = false;
                while (child) {
                    if (cursorContainersNode() && cursor.currentNode.isNamed) {
                        foundChild = true;
                        break;
                    }
                    else {
                        child = cursor.gotoNextSibling();
                    }
                }
                if (!foundChild) {
                    cursor.gotoParent();
                    break;
                }
                if (cursor.currentNode.childCount === 0) {
                    break;
                }
            }
            let nodesInRange;
            // It's possible we end up with a really large range if the parent node is big
            // Try to avoid this large range by finding several smaller nodes that together encompass the range of the changed node.
            const foundNodeSize = cursor.endIndex - cursor.startIndex;
            if (foundNodeSize > 5000) {
                // Try to find 3 consecutive nodes that together encompass the changed node.
                let child = cursor.gotoFirstChild();
                nodesInRange = [];
                while (child) {
                    if (cursor.endIndex > node.startIndex) {
                        // Found the starting point of our nodes
                        nodesInRange.push(cursor.currentNode);
                        do {
                            child = cursor.gotoNextSibling();
                        } while (child && cursor.endIndex < node.endIndex);
                        nodesInRange.push(cursor.currentNode);
                        break;
                    }
                    child = cursor.gotoNextSibling();
                }
            }
            else {
                nodesInRange = [cursor.currentNode];
            }
            // Fill in gaps between nodes
            // Reset the cursor to the first node in the range;
            while (cursor.currentNode.id !== nodesInRange[0].id) {
                cursor.gotoPreviousSibling();
            }
            const previousNode = getClosestPreviousNodes(cursor, newTree);
            const startPosition = previousNode ? previousNode.endPosition : nodesInRange[0].startPosition;
            const startIndex = previousNode ? previousNode.endIndex : nodesInRange[0].startIndex;
            const endPosition = nodesInRange[nodesInRange.length - 1].endPosition;
            const endIndex = nodesInRange[nodesInRange.length - 1].endIndex;
            const newChange = {
                newRange: new Range(startPosition.row + 1, startPosition.column + 1, endPosition.row + 1, endPosition.column + 1),
                newRangeStartOffset: startIndex,
                newRangeEndOffset: endIndex,
            };
            if (newRangeIndex < newRanges.length &&
                rangesIntersect(newRanges[newRangeIndex], {
                    startIndex,
                    endIndex,
                    startPosition,
                    endPosition,
                })) {
                // combine the new change with the range
                if (newRanges[newRangeIndex].startIndex < newChange.newRangeStartOffset) {
                    newChange.newRange = newChange.newRange.setStartPosition(newRanges[newRangeIndex].startPosition.row + 1, newRanges[newRangeIndex].startPosition.column + 1);
                    newChange.newRangeStartOffset = newRanges[newRangeIndex].startIndex;
                }
                if (newRanges[newRangeIndex].endIndex > newChange.newRangeEndOffset) {
                    newChange.newRange = newChange.newRange.setEndPosition(newRanges[newRangeIndex].endPosition.row + 1, newRanges[newRangeIndex].endPosition.column + 1);
                    newChange.newRangeEndOffset = newRanges[newRangeIndex].endIndex;
                }
                newRangeIndex++;
            }
            else if (newRangeIndex < newRanges.length &&
                newRanges[newRangeIndex].endIndex < newChange.newRangeStartOffset) {
                // add the full range to the merged changes
                mergedChanges.push({
                    newRange: new Range(newRanges[newRangeIndex].startPosition.row + 1, newRanges[newRangeIndex].startPosition.column + 1, newRanges[newRangeIndex].endPosition.row + 1, newRanges[newRangeIndex].endPosition.column + 1),
                    newRangeStartOffset: newRanges[newRangeIndex].startIndex,
                    newRangeEndOffset: newRanges[newRangeIndex].endIndex,
                });
            }
            if (mergedChanges.length > 0 &&
                mergedChanges[mergedChanges.length - 1].newRangeEndOffset >= newChange.newRangeStartOffset) {
                // Merge the changes
                mergedChanges[mergedChanges.length - 1].newRange = Range.fromPositions(mergedChanges[mergedChanges.length - 1].newRange.getStartPosition(), newChange.newRange.getEndPosition());
                mergedChanges[mergedChanges.length - 1].newRangeEndOffset = newChange.newRangeEndOffset;
            }
            else {
                mergedChanges.push(newChange);
            }
        }
        return this._constrainRanges(mergedChanges);
    }
    _constrainRanges(changes) {
        if (!this.ranges) {
            return changes;
        }
        const constrainedChanges = [];
        let changesIndex = 0;
        let rangesIndex = 0;
        while (changesIndex < changes.length && rangesIndex < this.ranges.length) {
            const change = changes[changesIndex];
            const range = this.ranges[rangesIndex];
            if (change.newRangeEndOffset < range.startIndex) {
                // Change is before the range, move to the next change
                changesIndex++;
            }
            else if (change.newRangeStartOffset > range.endIndex) {
                // Change is after the range, move to the next range
                rangesIndex++;
            }
            else {
                // Change is within the range, constrain it
                const newRangeStartOffset = Math.max(change.newRangeStartOffset, range.startIndex);
                const newRangeEndOffset = Math.min(change.newRangeEndOffset, range.endIndex);
                const newRange = change.newRange.intersectRanges(new Range(range.startPosition.row + 1, range.startPosition.column + 1, range.endPosition.row + 1, range.endPosition.column + 1));
                constrainedChanges.push({
                    newRange,
                    newRangeEndOffset,
                    newRangeStartOffset,
                });
                // Remove the intersected range from the current change
                if (newRangeEndOffset < change.newRangeEndOffset) {
                    change.newRange = Range.fromPositions(newRange.getEndPosition(), change.newRange.getEndPosition());
                    change.newRangeStartOffset = newRangeEndOffset + 1;
                }
                else {
                    // Move to the next change
                    changesIndex++;
                }
            }
        }
        return constrainedChanges;
    }
    onDidChangeContent(model, changes, ranges) {
        const version = model.getVersionId();
        if (version === this._editVersion) {
            return;
        }
        let newRanges = [];
        if (ranges) {
            newRanges = this._setRanges(ranges);
        }
        if (changes && changes.length > 0) {
            if (this._unfiredChanges) {
                this._unfiredChanges.push(...changes);
            }
            else {
                this._unfiredChanges = changes;
            }
            for (const change of changes) {
                this._applyEdits(change.changes, version);
            }
        }
        else {
            this._applyEdits([], version);
        }
        this._onDidChangeContentQueue.queue(async () => {
            if (this.isDisposed) {
                // No need to continue the queue if we are disposed
                return;
            }
            const oldTree = this._lastFullyParsed;
            let changedNodes;
            if (this._lastFullyParsedWithEdits && this._lastFullyParsed) {
                changedNodes = this.findChangedNodes(this._lastFullyParsedWithEdits, this._lastFullyParsed);
            }
            const completed = await this._parseAndUpdateTree(model, version);
            if (completed) {
                let ranges;
                if (!changedNodes) {
                    if (this._ranges) {
                        ranges = this._ranges.map((r) => ({
                            newRange: new Range(r.startPosition.row + 1, r.startPosition.column + 1, r.endPosition.row + 1, r.endPosition.column + 1),
                            oldRangeLength: r.endIndex - r.startIndex,
                            newRangeStartOffset: r.startIndex,
                            newRangeEndOffset: r.endIndex,
                        }));
                    }
                    else {
                        ranges = [
                            {
                                newRange: model.getFullModelRange(),
                                newRangeStartOffset: 0,
                                newRangeEndOffset: model.getValueLength(),
                            },
                        ];
                    }
                }
                else if (oldTree && changedNodes) {
                    ranges = this.findTreeChanges(completed, changedNodes, newRanges);
                }
                const changes = this._unfiredChanges ?? [];
                this._unfiredChanges = undefined;
                this._onDidUpdate.fire({
                    language: this.languageId,
                    ranges,
                    versionId: version,
                    tree: completed,
                    includedModelChanges: changes,
                });
            }
        });
    }
    _applyEdits(changes, version) {
        for (const change of changes) {
            const originalTextLength = TextLength.ofRange(Range.lift(change.range));
            const newTextLength = TextLength.ofText(change.text);
            const summedTextLengths = change.text.length === 0 ? newTextLength : originalTextLength.add(newTextLength);
            const edit = {
                startIndex: change.rangeOffset,
                oldEndIndex: change.rangeOffset + change.rangeLength,
                newEndIndex: change.rangeOffset + change.text.length,
                startPosition: {
                    row: change.range.startLineNumber - 1,
                    column: change.range.startColumn - 1,
                },
                oldEndPosition: { row: change.range.endLineNumber - 1, column: change.range.endColumn - 1 },
                newEndPosition: {
                    row: change.range.startLineNumber + summedTextLengths.lineCount - 1,
                    column: summedTextLengths.lineCount
                        ? summedTextLengths.columnCount
                        : change.range.endColumn + summedTextLengths.columnCount,
                },
            };
            this._tree?.edit(edit);
            this._lastFullyParsedWithEdits?.edit(edit);
        }
        this._editVersion = version;
    }
    async _parseAndUpdateTree(model, version) {
        const tree = await this._parse(model);
        if (tree) {
            this._tree?.delete();
            this._tree = tree;
            this._lastFullyParsed?.delete();
            this._lastFullyParsed = tree.copy();
            this._lastFullyParsedWithEdits?.delete();
            this._lastFullyParsedWithEdits = tree.copy();
            this._versionId = version;
            return tree;
        }
        else if (!this._tree) {
            // No tree means this is the initial parse and there were edits
            // parse function doesn't handle this well and we can end up with an incorrect tree, so we reset
            this.parser.reset();
        }
        return undefined;
    }
    _parse(model) {
        let parseType = "fullParse" /* TelemetryParseType.Full */;
        if (this.tree) {
            parseType = "incrementalParse" /* TelemetryParseType.Incremental */;
        }
        return this._parseAndYield(model, parseType);
    }
    async _parseAndYield(model, parseType) {
        let time = 0;
        let passes = 0;
        const inProgressVersion = this._editVersion;
        let newTree;
        this._lastYieldTime = performance.now();
        do {
            const timer = performance.now();
            try {
                newTree = this.parser.parse((index, position) => this._parseCallback(model, index), this._tree, {
                    progressCallback: this._parseProgressCallback.bind(this),
                    includedRanges: this._ranges,
                });
            }
            catch (e) {
                // parsing can fail when the timeout is reached, will resume upon next loop
            }
            finally {
                time += performance.now() - timer;
                passes++;
            }
            // So long as this isn't the initial parse, even if the model changes and edits are applied, the tree parsing will continue correctly after the await.
            await new Promise((resolve) => setTimeout0(resolve));
        } while (!model.isDisposed() &&
            !this.isDisposed &&
            !newTree &&
            inProgressVersion === model.getVersionId());
        this.sendParseTimeTelemetry(parseType, time, passes);
        return newTree && inProgressVersion === model.getVersionId() ? newTree : undefined;
    }
    _parseProgressCallback(state) {
        const now = performance.now();
        if (now - this._lastYieldTime > 50) {
            this._lastYieldTime = now;
            return true;
        }
        return false;
    }
    _parseCallback(textModel, index) {
        try {
            return textModel.getTextBuffer().getNearestChunk(index);
        }
        catch (e) {
            this._logService.debug('Error getting chunk for tree-sitter parsing', e);
        }
        return undefined;
    }
    _setRanges(newRanges) {
        const unKnownRanges = [];
        // If we have existing ranges, find the parts of the new ranges that are not included in the existing ones
        if (this._ranges) {
            for (const newRange of newRanges) {
                let isFullyIncluded = false;
                for (let i = 0; i < this._ranges.length; i++) {
                    const existingRange = this._ranges[i];
                    if (rangesEqual(existingRange, newRange) || rangesIntersect(existingRange, newRange)) {
                        isFullyIncluded = true;
                        break;
                    }
                }
                if (!isFullyIncluded) {
                    unKnownRanges.push(newRange);
                }
            }
        }
        else {
            // No existing ranges, all new ranges are unknown
            unKnownRanges.push(...newRanges);
        }
        this._ranges = newRanges;
        return unKnownRanges;
    }
    get ranges() {
        return this._ranges;
    }
    sendParseTimeTelemetry(parseType, time, passes) {
        this._logService.debug(`Tree parsing (${parseType}) took ${time} ms and ${passes} passes.`);
        if (parseType === "fullParse" /* TelemetryParseType.Full */) {
            this._telemetryService.publicLog2(`treeSitter.fullParse`, { languageId: this.languageId, time, passes });
        }
        else {
            this._telemetryService.publicLog2(`treeSitter.incrementalParse`, { languageId: this.languageId, time, passes });
        }
    }
}
function rangesEqual(a, b) {
    return (a.startPosition.row === b.startPosition.row &&
        a.startPosition.column === b.startPosition.column &&
        a.endPosition.row === b.endPosition.row &&
        a.endPosition.column === b.endPosition.column &&
        a.startIndex === b.startIndex &&
        a.endIndex === b.endIndex);
}
function rangesIntersect(a, b) {
    return ((a.startIndex <= b.startIndex && a.endIndex >= b.startIndex) ||
        (b.startIndex <= a.startIndex && b.endIndex >= a.startIndex));
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsVHJlZVNpdHRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbW1vbi9zZXJ2aWNlcy90cmVlU2l0dGVyL3RleHRNb2RlbFRyZWVTaXR0ZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUtOLG1CQUFtQixHQUVuQixNQUFNLCtCQUErQixDQUFBO0FBQ3RDLE9BQU8sRUFDTixVQUFVLEVBQ1YsZUFBZSxFQUNmLE9BQU8sR0FFUCxNQUFNLHNDQUFzQyxDQUFBO0FBRzdDLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDakUsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQXFCLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQzVGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUMzQyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDL0QsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBRXJELE9BQU8sRUFBbUIsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDaEYsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzFGLE9BQU8sRUFDTix1QkFBdUIsRUFDdkIsWUFBWSxFQUNaLFVBQVUsRUFDViwwQkFBMEIsR0FD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