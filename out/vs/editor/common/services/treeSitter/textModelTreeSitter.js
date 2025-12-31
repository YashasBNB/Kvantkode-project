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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGV4dE1vZGVsVHJlZVNpdHRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb21tb24vc2VydmljZXMvdHJlZVNpdHRlci90ZXh0TW9kZWxUcmVlU2l0dGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFLTixtQkFBbUIsR0FFbkIsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBQ04sVUFBVSxFQUNWLGVBQWUsRUFDZixPQUFPLEdBRVAsTUFBTSxzQ0FBc0MsQ0FBQTtBQUc3QyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN0RixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDcEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDakUsT0FBTyxFQUFxQixlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUM1RixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDM0MsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUVyRCxPQUFPLEVBQW1CLFVBQVUsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ2hGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxRixPQUFPLEVBQ04sdUJBQXVCLEVBQ3ZCLFlBQVksRUFDWixVQUFVLEVBQ1YsMEJBQTBCLEdBQzFCLE1B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