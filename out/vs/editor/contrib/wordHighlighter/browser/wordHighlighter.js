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
var WordHighlighter_1, WordHighlighterContribution_1;
import * as nls from '../../../../nls.js';
import { alert } from '../../../../base/browser/ui/aria/aria.js';
import { createCancelablePromise, Delayer, first, } from '../../../../base/common/async.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { onUnexpectedError, onUnexpectedExternalError } from '../../../../base/common/errors.js';
import { Disposable, DisposableStore } from '../../../../base/common/lifecycle.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { matchesScheme, Schemas } from '../../../../base/common/network.js';
import { isEqual } from '../../../../base/common/resources.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService, RawContextKey, } from '../../../../platform/contextkey/common/contextkey.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { isDiffEditor } from '../../../browser/editorBrowser.js';
import { EditorAction, registerEditorAction, registerEditorContribution, registerModelAndPositionCommand, } from '../../../browser/editorExtensions.js';
import { ICodeEditorService } from '../../../browser/services/codeEditorService.js';
import { Range } from '../../../common/core/range.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import { registerEditorFeature } from '../../../common/editorFeatures.js';
import { score } from '../../../common/languageSelector.js';
import { shouldSynchronizeModel } from '../../../common/model.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { ITextModelService } from '../../../common/services/resolverService.js';
import { getHighlightDecorationOptions } from './highlightDecorations.js';
import { TextualMultiDocumentHighlightFeature } from './textualHighlightProvider.js';
const ctxHasWordHighlights = new RawContextKey('hasWordHighlights', false);
export function getOccurrencesAtPosition(registry, model, position, token) {
    const orderedByScore = registry.ordered(model);
    // in order of score ask the occurrences provider
    // until someone response with a good result
    // (good = non undefined and non null value)
    // (result of size == 0 is valid, no highlights is a valid/expected result -- not a signal to fall back to other providers)
    return first(orderedByScore.map((provider) => () => {
        return Promise.resolve(provider.provideDocumentHighlights(model, position, token)).then(undefined, onUnexpectedExternalError);
    }), (result) => result !== undefined && result !== null).then((result) => {
        if (result) {
            const map = new ResourceMap();
            map.set(model.uri, result);
            return map;
        }
        return new ResourceMap();
    });
}
export function getOccurrencesAcrossMultipleModels(registry, model, position, token, otherModels) {
    const orderedByScore = registry.ordered(model);
    // in order of score ask the occurrences provider
    // until someone response with a good result
    // (good = non undefined and non null ResourceMap)
    // (result of size == 0 is valid, no highlights is a valid/expected result -- not a signal to fall back to other providers)
    return first(orderedByScore.map((provider) => () => {
        const filteredModels = otherModels
            .filter((otherModel) => {
            return shouldSynchronizeModel(otherModel);
        })
            .filter((otherModel) => {
            return (score(provider.selector, otherModel.uri, otherModel.getLanguageId(), true, undefined, undefined) > 0);
        });
        return Promise.resolve(provider.provideMultiDocumentHighlights(model, position, filteredModels, token)).then(undefined, onUnexpectedExternalError);
    }), (result) => result !== undefined && result !== null);
}
class OccurenceAtPositionRequest {
    constructor(_model, _selection, _wordSeparators) {
        this._model = _model;
        this._selection = _selection;
        this._wordSeparators = _wordSeparators;
        this._wordRange = this._getCurrentWordRange(_model, _selection);
        this._result = null;
    }
    get result() {
        if (!this._result) {
            this._result = createCancelablePromise((token) => this._compute(this._model, this._selection, this._wordSeparators, token));
        }
        return this._result;
    }
    _getCurrentWordRange(model, selection) {
        const word = model.getWordAtPosition(selection.getPosition());
        if (word) {
            return new Range(selection.startLineNumber, word.startColumn, selection.startLineNumber, word.endColumn);
        }
        return null;
    }
    isValid(model, selection, decorations) {
        const lineNumber = selection.startLineNumber;
        const startColumn = selection.startColumn;
        const endColumn = selection.endColumn;
        const currentWordRange = this._getCurrentWordRange(model, selection);
        let requestIsValid = Boolean(this._wordRange && this._wordRange.equalsRange(currentWordRange));
        // Even if we are on a different word, if that word is in the decorations ranges, the request is still valid
        // (Same symbol)
        for (let i = 0, len = decorations.length; !requestIsValid && i < len; i++) {
            const range = decorations.getRange(i);
            if (range && range.startLineNumber === lineNumber) {
                if (range.startColumn <= startColumn && range.endColumn >= endColumn) {
                    requestIsValid = true;
                }
            }
        }
        return requestIsValid;
    }
    cancel() {
        this.result.cancel();
    }
}
class SemanticOccurenceAtPositionRequest extends OccurenceAtPositionRequest {
    constructor(model, selection, wordSeparators, providers) {
        super(model, selection, wordSeparators);
        this._providers = providers;
    }
    _compute(model, selection, wordSeparators, token) {
        return getOccurrencesAtPosition(this._providers, model, selection.getPosition(), token).then((value) => {
            if (!value) {
                return new ResourceMap();
            }
            return value;
        });
    }
}
class MultiModelOccurenceRequest extends OccurenceAtPositionRequest {
    constructor(model, selection, wordSeparators, providers, otherModels) {
        super(model, selection, wordSeparators);
        this._providers = providers;
        this._otherModels = otherModels;
    }
    _compute(model, selection, wordSeparators, token) {
        return getOccurrencesAcrossMultipleModels(this._providers, model, selection.getPosition(), token, this._otherModels).then((value) => {
            if (!value) {
                return new ResourceMap();
            }
            return value;
        });
    }
}
function computeOccurencesAtPosition(registry, model, selection, wordSeparators) {
    return new SemanticOccurenceAtPositionRequest(model, selection, wordSeparators, registry);
}
function computeOccurencesMultiModel(registry, model, selection, wordSeparators, otherModels) {
    return new MultiModelOccurenceRequest(model, selection, wordSeparators, registry, otherModels);
}
registerModelAndPositionCommand('_executeDocumentHighlights', async (accessor, model, position) => {
    const languageFeaturesService = accessor.get(ILanguageFeaturesService);
    const map = await getOccurrencesAtPosition(languageFeaturesService.documentHighlightProvider, model, position, CancellationToken.None);
    return map?.get(model.uri);
});
let WordHighlighter = class WordHighlighter {
    static { WordHighlighter_1 = this; }
    static { this.storedDecorationIDs = new ResourceMap(); }
    static { this.query = null; }
    constructor(editor, providers, multiProviders, contextKeyService, textModelService, codeEditorService, configurationService, logService) {
        this.toUnhook = new DisposableStore();
        this.workerRequestTokenId = 0;
        this.workerRequestCompleted = false;
        this.workerRequestValue = new ResourceMap();
        this.lastCursorPositionChangeTime = 0;
        this.renderDecorationsTimer = -1;
        this.runDelayer = this.toUnhook.add(new Delayer(50));
        this.editor = editor;
        this.providers = providers;
        this.multiDocumentProviders = multiProviders;
        this.codeEditorService = codeEditorService;
        this.textModelService = textModelService;
        this.configurationService = configurationService;
        this.logService = logService;
        this._hasWordHighlights = ctxHasWordHighlights.bindTo(contextKeyService);
        this._ignorePositionChangeEvent = false;
        this.occurrencesHighlightEnablement = this.editor.getOption(82 /* EditorOption.occurrencesHighlight */);
        this.occurrencesHighlightDelay = this.configurationService.getValue('editor.occurrencesHighlightDelay');
        this.model = this.editor.getModel();
        this.toUnhook.add(editor.onDidChangeCursorPosition((e) => {
            if (this._ignorePositionChangeEvent) {
                // We are changing the position => ignore this event
                return;
            }
            if (this.occurrencesHighlightEnablement === 'off') {
                // Early exit if nothing needs to be done!
                // Leave some form of early exit check here if you wish to continue being a cursor position change listener ;)
                return;
            }
            this.runDelayer.trigger(() => {
                this._onPositionChanged(e);
            });
        }));
        this.toUnhook.add(editor.onDidFocusEditorText((e) => {
            if (this.occurrencesHighlightEnablement === 'off') {
                // Early exit if nothing needs to be done
                return;
            }
            if (!this.workerRequest) {
                this.runDelayer.trigger(() => {
                    this._run();
                });
            }
        }));
        this.toUnhook.add(editor.onDidChangeModelContent((e) => {
            if (!matchesScheme(this.model.uri, 'output')) {
                this._stopAll();
            }
        }));
        this.toUnhook.add(editor.onDidChangeModel((e) => {
            if (!e.newModelUrl && e.oldModelUrl) {
                this._stopSingular();
            }
            else if (WordHighlighter_1.query) {
                this._run();
            }
        }));
        this.toUnhook.add(editor.onDidChangeConfiguration((e) => {
            const newEnablement = this.editor.getOption(82 /* EditorOption.occurrencesHighlight */);
            if (this.occurrencesHighlightEnablement !== newEnablement) {
                this.occurrencesHighlightEnablement = newEnablement;
                switch (newEnablement) {
                    case 'off':
                        this._stopAll();
                        break;
                    case 'singleFile':
                        this._stopAll(WordHighlighter_1.query?.modelInfo?.modelURI);
                        break;
                    case 'multiFile':
                        if (WordHighlighter_1.query) {
                            this._run(true);
                        }
                        break;
                    default:
                        console.warn('Unknown occurrencesHighlight setting value:', newEnablement);
                        break;
                }
            }
        }));
        this.toUnhook.add(this.configurationService.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration('editor.occurrencesHighlightDelay')) {
                const newDelay = configurationService.getValue('editor.occurrencesHighlightDelay');
                if (this.occurrencesHighlightDelay !== newDelay) {
                    this.occurrencesHighlightDelay = newDelay;
                }
            }
        }));
        this.toUnhook.add(editor.onDidBlurEditorWidget(() => {
            // logic is as follows
            // - didBlur => active null => stopall
            // - didBlur => active nb   => if this.editor is notebook, do nothing (new cell, so we don't want to stopAll)
            //              active nb   => if this.editor is NOT nb,   stopAll
            const activeEditor = this.codeEditorService.getFocusedCodeEditor();
            if (!activeEditor) {
                // clicked into nb cell list, outline, terminal, etc
                this._stopAll();
            }
            else if (activeEditor.getModel()?.uri.scheme === Schemas.vscodeNotebookCell &&
                this.editor.getModel()?.uri.scheme !== Schemas.vscodeNotebookCell) {
                // switched tabs from non-nb to nb
                this._stopAll();
            }
        }));
        this.decorations = this.editor.createDecorationsCollection();
        this.workerRequestTokenId = 0;
        this.workerRequest = null;
        this.workerRequestCompleted = false;
        this.lastCursorPositionChangeTime = 0;
        this.renderDecorationsTimer = -1;
        // if there is a query already, highlight off that query
        if (WordHighlighter_1.query) {
            this._run();
        }
    }
    hasDecorations() {
        return this.decorations.length > 0;
    }
    restore(delay) {
        if (this.occurrencesHighlightEnablement === 'off') {
            return;
        }
        this.runDelayer.cancel();
        this.runDelayer.trigger(() => {
            this._run(false, delay);
        });
    }
    trigger() {
        this.runDelayer.cancel();
        this._run(false, 0); // immediate rendering (delay = 0)
    }
    stop() {
        if (this.occurrencesHighlightEnablement === 'off') {
            return;
        }
        this._stopAll();
    }
    _getSortedHighlights() {
        return this.decorations.getRanges().sort(Range.compareRangesUsingStarts);
    }
    moveNext() {
        const highlights = this._getSortedHighlights();
        const index = highlights.findIndex((range) => range.containsPosition(this.editor.getPosition()));
        const newIndex = (index + 1) % highlights.length;
        const dest = highlights[newIndex];
        try {
            this._ignorePositionChangeEvent = true;
            this.editor.setPosition(dest.getStartPosition());
            this.editor.revealRangeInCenterIfOutsideViewport(dest);
            const word = this._getWord();
            if (word) {
                const lineContent = this.editor.getModel().getLineContent(dest.startLineNumber);
                alert(`${lineContent}, ${newIndex + 1} of ${highlights.length} for '${word.word}'`);
            }
        }
        finally {
            this._ignorePositionChangeEvent = false;
        }
    }
    moveBack() {
        const highlights = this._getSortedHighlights();
        const index = highlights.findIndex((range) => range.containsPosition(this.editor.getPosition()));
        const newIndex = (index - 1 + highlights.length) % highlights.length;
        const dest = highlights[newIndex];
        try {
            this._ignorePositionChangeEvent = true;
            this.editor.setPosition(dest.getStartPosition());
            this.editor.revealRangeInCenterIfOutsideViewport(dest);
            const word = this._getWord();
            if (word) {
                const lineContent = this.editor.getModel().getLineContent(dest.startLineNumber);
                alert(`${lineContent}, ${newIndex + 1} of ${highlights.length} for '${word.word}'`);
            }
        }
        finally {
            this._ignorePositionChangeEvent = false;
        }
    }
    _removeSingleDecorations() {
        // return if no model
        if (!this.editor.hasModel()) {
            return;
        }
        const currentDecorationIDs = WordHighlighter_1.storedDecorationIDs.get(this.editor.getModel().uri);
        if (!currentDecorationIDs) {
            return;
        }
        this.editor.removeDecorations(currentDecorationIDs);
        WordHighlighter_1.storedDecorationIDs.delete(this.editor.getModel().uri);
        if (this.decorations.length > 0) {
            this.decorations.clear();
            this._hasWordHighlights.set(false);
        }
    }
    _removeAllDecorations(preservedModel) {
        const currentEditors = this.codeEditorService.listCodeEditors();
        const deleteURI = [];
        // iterate over editors and store models in currentModels
        for (const editor of currentEditors) {
            if (!editor.hasModel() || isEqual(editor.getModel().uri, preservedModel)) {
                continue;
            }
            const currentDecorationIDs = WordHighlighter_1.storedDecorationIDs.get(editor.getModel().uri);
            if (!currentDecorationIDs) {
                continue;
            }
            editor.removeDecorations(currentDecorationIDs);
            deleteURI.push(editor.getModel().uri);
            const editorHighlighterContrib = WordHighlighterContribution.get(editor);
            if (!editorHighlighterContrib?.wordHighlighter) {
                continue;
            }
            if (editorHighlighterContrib.wordHighlighter.decorations.length > 0) {
                editorHighlighterContrib.wordHighlighter.decorations.clear();
                editorHighlighterContrib.wordHighlighter.workerRequest = null;
                editorHighlighterContrib.wordHighlighter._hasWordHighlights.set(false);
            }
        }
        for (const uri of deleteURI) {
            WordHighlighter_1.storedDecorationIDs.delete(uri);
        }
    }
    _stopSingular() {
        // Remove any existing decorations + a possible query, and re - run to update decorations
        this._removeSingleDecorations();
        if (this.editor.hasTextFocus()) {
            if (this.editor.getModel()?.uri.scheme !== Schemas.vscodeNotebookCell &&
                WordHighlighter_1.query?.modelInfo?.modelURI.scheme !== Schemas.vscodeNotebookCell) {
                // clear query if focused non-nb editor
                WordHighlighter_1.query = null;
                this._run(); // TODO: @Yoyokrazy -- investigate why we need a full rerun here. likely addressed a case/patch in the first iteration of this feature
            }
            else {
                // remove modelInfo to account for nb cell being disposed
                if (WordHighlighter_1.query?.modelInfo) {
                    WordHighlighter_1.query.modelInfo = null;
                }
            }
        }
        // Cancel any renderDecorationsTimer
        if (this.renderDecorationsTimer !== -1) {
            clearTimeout(this.renderDecorationsTimer);
            this.renderDecorationsTimer = -1;
        }
        // Cancel any worker request
        if (this.workerRequest !== null) {
            this.workerRequest.cancel();
            this.workerRequest = null;
        }
        // Invalidate any worker request callback
        if (!this.workerRequestCompleted) {
            this.workerRequestTokenId++;
            this.workerRequestCompleted = true;
        }
    }
    _stopAll(preservedModel) {
        // Remove any existing decorations
        // TODO: @Yoyokrazy -- this triggers as notebooks scroll, causing highlights to disappear momentarily.
        // maybe a nb type check?
        this._removeAllDecorations(preservedModel);
        // Cancel any renderDecorationsTimer
        if (this.renderDecorationsTimer !== -1) {
            clearTimeout(this.renderDecorationsTimer);
            this.renderDecorationsTimer = -1;
        }
        // Cancel any worker request
        if (this.workerRequest !== null) {
            this.workerRequest.cancel();
            this.workerRequest = null;
        }
        // Invalidate any worker request callback
        if (!this.workerRequestCompleted) {
            this.workerRequestTokenId++;
            this.workerRequestCompleted = true;
        }
    }
    _onPositionChanged(e) {
        // disabled
        if (this.occurrencesHighlightEnablement === 'off') {
            this._stopAll();
            return;
        }
        // ignore typing & other
        // need to check if the model is a notebook cell, should not stop if nb
        if (e.source !== 'api' && e.reason !== 3 /* CursorChangeReason.Explicit */) {
            this._stopAll();
            return;
        }
        this._run();
    }
    _getWord() {
        const editorSelection = this.editor.getSelection();
        const lineNumber = editorSelection.startLineNumber;
        const startColumn = editorSelection.startColumn;
        if (this.model.isDisposed()) {
            return null;
        }
        return this.model.getWordAtPosition({
            lineNumber: lineNumber,
            column: startColumn,
        });
    }
    getOtherModelsToHighlight(model) {
        if (!model) {
            return [];
        }
        // notebook case
        const isNotebookEditor = model.uri.scheme === Schemas.vscodeNotebookCell;
        if (isNotebookEditor) {
            const currentModels = [];
            const currentEditors = this.codeEditorService.listCodeEditors();
            for (const editor of currentEditors) {
                const tempModel = editor.getModel();
                if (tempModel &&
                    tempModel !== model &&
                    tempModel.uri.scheme === Schemas.vscodeNotebookCell) {
                    currentModels.push(tempModel);
                }
            }
            return currentModels;
        }
        // inline case
        // ? current works when highlighting outside of an inline diff, highlighting in.
        // ? broken when highlighting within a diff editor. highlighting the main editor does not work
        // ? editor group service could be useful here
        const currentModels = [];
        const currentEditors = this.codeEditorService.listCodeEditors();
        for (const editor of currentEditors) {
            if (!isDiffEditor(editor)) {
                continue;
            }
            const diffModel = editor.getModel();
            if (!diffModel) {
                continue;
            }
            if (model === diffModel.modified) {
                // embedded inline chat diff would pass this, allowing highlights
                //? currentModels.push(diffModel.original);
                currentModels.push(diffModel.modified);
            }
        }
        if (currentModels.length) {
            // no matching editors have been found
            return currentModels;
        }
        // multi-doc OFF
        if (this.occurrencesHighlightEnablement === 'singleFile') {
            return [];
        }
        // multi-doc ON
        for (const editor of currentEditors) {
            const tempModel = editor.getModel();
            const isValidModel = tempModel && tempModel !== model;
            if (isValidModel) {
                currentModels.push(tempModel);
            }
        }
        return currentModels;
    }
    async _run(multiFileConfigChange, delay) {
        const hasTextFocus = this.editor.hasTextFocus();
        if (!hasTextFocus) {
            // new nb cell scrolled in, didChangeModel fires
            if (!WordHighlighter_1.query) {
                // no previous query, nothing to highlight off of
                this._stopAll();
                return;
            }
        }
        else {
            // has text focus
            const editorSelection = this.editor.getSelection();
            // ignore multiline selection
            if (!editorSelection || editorSelection.startLineNumber !== editorSelection.endLineNumber) {
                WordHighlighter_1.query = null;
                this._stopAll();
                return;
            }
            const startColumn = editorSelection.startColumn;
            const endColumn = editorSelection.endColumn;
            const word = this._getWord();
            // The selection must be inside a word or surround one word at most
            if (!word || word.startColumn > startColumn || word.endColumn < endColumn) {
                // no previous query, nothing to highlight
                WordHighlighter_1.query = null;
                this._stopAll();
                return;
            }
            WordHighlighter_1.query = {
                modelInfo: {
                    modelURI: this.model.uri,
                    selection: editorSelection,
                },
            };
        }
        this.lastCursorPositionChangeTime = new Date().getTime();
        if (isEqual(this.editor.getModel().uri, WordHighlighter_1.query.modelInfo?.modelURI)) {
            // only trigger new worker requests from the primary model that initiated the query
            // case d)
            // check if the new queried word is contained in the range of a stored decoration for this model
            if (!multiFileConfigChange) {
                const currentModelDecorationRanges = this.decorations.getRanges();
                for (const storedRange of currentModelDecorationRanges) {
                    if (storedRange.containsPosition(this.editor.getPosition())) {
                        return;
                    }
                }
            }
            // stop all previous actions if new word is highlighted
            // if we trigger the run off a setting change -> multifile highlighting, we do not want to remove decorations from this model
            this._stopAll(multiFileConfigChange ? this.model.uri : undefined);
            const myRequestId = ++this.workerRequestTokenId;
            this.workerRequestCompleted = false;
            const otherModelsToHighlight = this.getOtherModelsToHighlight(this.editor.getModel());
            // when reaching here, there are two possible states.
            // 		1) we have text focus, and a valid query was updated.
            // 		2) we do not have text focus, and a valid query is cached.
            // the query will ALWAYS have the correct data for the current highlight request, so it can always be passed to the workerRequest safely
            if (!WordHighlighter_1.query || !WordHighlighter_1.query.modelInfo) {
                return;
            }
            const queryModelRef = await this.textModelService.createModelReference(WordHighlighter_1.query.modelInfo.modelURI);
            try {
                this.workerRequest = this.computeWithModel(queryModelRef.object.textEditorModel, WordHighlighter_1.query.modelInfo.selection, otherModelsToHighlight);
                this.workerRequest?.result.then((data) => {
                    if (myRequestId === this.workerRequestTokenId) {
                        this.workerRequestCompleted = true;
                        this.workerRequestValue = data || [];
                        this._beginRenderDecorations(delay ?? this.occurrencesHighlightDelay);
                    }
                }, onUnexpectedError);
            }
            catch (e) {
                this.logService.error('Unexpected error during occurrence request. Log: ', e);
            }
            finally {
                queryModelRef.dispose();
            }
        }
        else if (this.model.uri.scheme === Schemas.vscodeNotebookCell) {
            // new wordHighlighter coming from a different model, NOT the query model, need to create a textModel ref
            const myRequestId = ++this.workerRequestTokenId;
            this.workerRequestCompleted = false;
            if (!WordHighlighter_1.query || !WordHighlighter_1.query.modelInfo) {
                return;
            }
            const queryModelRef = await this.textModelService.createModelReference(WordHighlighter_1.query.modelInfo.modelURI);
            try {
                this.workerRequest = this.computeWithModel(queryModelRef.object.textEditorModel, WordHighlighter_1.query.modelInfo.selection, [this.model]);
                this.workerRequest?.result.then((data) => {
                    if (myRequestId === this.workerRequestTokenId) {
                        this.workerRequestCompleted = true;
                        this.workerRequestValue = data || [];
                        this._beginRenderDecorations(delay ?? this.occurrencesHighlightDelay);
                    }
                }, onUnexpectedError);
            }
            catch (e) {
                this.logService.error('Unexpected error during occurrence request. Log: ', e);
            }
            finally {
                queryModelRef.dispose();
            }
        }
    }
    computeWithModel(model, selection, otherModels) {
        if (!otherModels.length) {
            return computeOccurencesAtPosition(this.providers, model, selection, this.editor.getOption(136 /* EditorOption.wordSeparators */));
        }
        else {
            return computeOccurencesMultiModel(this.multiDocumentProviders, model, selection, this.editor.getOption(136 /* EditorOption.wordSeparators */), otherModels);
        }
    }
    _beginRenderDecorations(delay) {
        const currentTime = new Date().getTime();
        const minimumRenderTime = this.lastCursorPositionChangeTime + delay;
        if (currentTime >= minimumRenderTime) {
            // Synchronous
            this.renderDecorationsTimer = -1;
            this.renderDecorations();
        }
        else {
            // Asynchronous
            this.renderDecorationsTimer = setTimeout(() => {
                this.renderDecorations();
            }, minimumRenderTime - currentTime);
        }
    }
    renderDecorations() {
        this.renderDecorationsTimer = -1;
        // create new loop, iterate over current editors using this.codeEditorService.listCodeEditors(),
        // if the URI of that codeEditor is in the map, then add the decorations to the decorations array
        // then set the decorations for the editor
        const currentEditors = this.codeEditorService.listCodeEditors();
        for (const editor of currentEditors) {
            const editorHighlighterContrib = WordHighlighterContribution.get(editor);
            if (!editorHighlighterContrib) {
                continue;
            }
            const newDecorations = [];
            const uri = editor.getModel()?.uri;
            if (uri && this.workerRequestValue.has(uri)) {
                const oldDecorationIDs = WordHighlighter_1.storedDecorationIDs.get(uri);
                const newDocumentHighlights = this.workerRequestValue.get(uri);
                if (newDocumentHighlights) {
                    for (const highlight of newDocumentHighlights) {
                        if (!highlight.range) {
                            continue;
                        }
                        newDecorations.push({
                            range: highlight.range,
                            options: getHighlightDecorationOptions(highlight.kind),
                        });
                    }
                }
                let newDecorationIDs = [];
                editor.changeDecorations((changeAccessor) => {
                    newDecorationIDs = changeAccessor.deltaDecorations(oldDecorationIDs ?? [], newDecorations);
                });
                WordHighlighter_1.storedDecorationIDs = WordHighlighter_1.storedDecorationIDs.set(uri, newDecorationIDs);
                if (newDecorations.length > 0) {
                    editorHighlighterContrib.wordHighlighter?.decorations.set(newDecorations);
                    editorHighlighterContrib.wordHighlighter?._hasWordHighlights.set(true);
                }
            }
        }
        // clear the worker request when decorations are completed
        this.workerRequest = null;
    }
    dispose() {
        this._stopSingular();
        this.toUnhook.dispose();
    }
};
WordHighlighter = WordHighlighter_1 = __decorate([
    __param(4, ITextModelService),
    __param(5, ICodeEditorService),
    __param(6, IConfigurationService),
    __param(7, ILogService)
], WordHighlighter);
let WordHighlighterContribution = class WordHighlighterContribution extends Disposable {
    static { WordHighlighterContribution_1 = this; }
    static { this.ID = 'editor.contrib.wordHighlighter'; }
    static get(editor) {
        return editor.getContribution(WordHighlighterContribution_1.ID);
    }
    constructor(editor, contextKeyService, languageFeaturesService, codeEditorService, textModelService, configurationService, logService) {
        super();
        this._wordHighlighter = null;
        const createWordHighlighterIfPossible = () => {
            if (editor.hasModel() &&
                !editor.getModel().isTooLargeForTokenization() &&
                editor.getModel().uri.scheme !== Schemas.accessibleView) {
                this._wordHighlighter = new WordHighlighter(editor, languageFeaturesService.documentHighlightProvider, languageFeaturesService.multiDocumentHighlightProvider, contextKeyService, textModelService, codeEditorService, configurationService, logService);
            }
        };
        this._register(editor.onDidChangeModel((e) => {
            if (this._wordHighlighter) {
                if (!e.newModelUrl && e.oldModelUrl?.scheme !== Schemas.vscodeNotebookCell) {
                    // happens when switching tabs to a notebook that has focus in the cell list, no new model URI (this also doesn't make it to the wordHighlighter, bc no editor.hasModel)
                    this.wordHighlighter?.stop();
                }
                this._wordHighlighter.dispose();
                this._wordHighlighter = null;
            }
            createWordHighlighterIfPossible();
        }));
        createWordHighlighterIfPossible();
    }
    get wordHighlighter() {
        return this._wordHighlighter;
    }
    saveViewState() {
        if (this._wordHighlighter && this._wordHighlighter.hasDecorations()) {
            return true;
        }
        return false;
    }
    moveNext() {
        this._wordHighlighter?.moveNext();
    }
    moveBack() {
        this._wordHighlighter?.moveBack();
    }
    restoreViewState(state) {
        if (this._wordHighlighter && state) {
            this._wordHighlighter.restore(250); // 250 ms delay to restoring view state, since only exts call this
        }
    }
    stopHighlighting() {
        this._wordHighlighter?.stop();
    }
    dispose() {
        if (this._wordHighlighter) {
            this._wordHighlighter.dispose();
            this._wordHighlighter = null;
        }
        super.dispose();
    }
};
WordHighlighterContribution = WordHighlighterContribution_1 = __decorate([
    __param(1, IContextKeyService),
    __param(2, ILanguageFeaturesService),
    __param(3, ICodeEditorService),
    __param(4, ITextModelService),
    __param(5, IConfigurationService),
    __param(6, ILogService)
], WordHighlighterContribution);
export { WordHighlighterContribution };
class WordHighlightNavigationAction extends EditorAction {
    constructor(next, opts) {
        super(opts);
        this._isNext = next;
    }
    run(accessor, editor) {
        const controller = WordHighlighterContribution.get(editor);
        if (!controller) {
            return;
        }
        if (this._isNext) {
            controller.moveNext();
        }
        else {
            controller.moveBack();
        }
    }
}
class NextWordHighlightAction extends WordHighlightNavigationAction {
    constructor() {
        super(true, {
            id: 'editor.action.wordHighlight.next',
            label: nls.localize2('wordHighlight.next.label', 'Go to Next Symbol Highlight'),
            precondition: ctxHasWordHighlights,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 65 /* KeyCode.F7 */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
}
class PrevWordHighlightAction extends WordHighlightNavigationAction {
    constructor() {
        super(false, {
            id: 'editor.action.wordHighlight.prev',
            label: nls.localize2('wordHighlight.previous.label', 'Go to Previous Symbol Highlight'),
            precondition: ctxHasWordHighlights,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 1024 /* KeyMod.Shift */ | 65 /* KeyCode.F7 */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
}
class TriggerWordHighlightAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.wordHighlight.trigger',
            label: nls.localize2('wordHighlight.trigger.label', 'Trigger Symbol Highlight'),
            precondition: undefined,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 0,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    run(accessor, editor, args) {
        const controller = WordHighlighterContribution.get(editor);
        if (!controller) {
            return;
        }
        controller.restoreViewState(true);
    }
}
registerEditorContribution(WordHighlighterContribution.ID, WordHighlighterContribution, 0 /* EditorContributionInstantiation.Eager */); // eager because it uses `saveViewState`/`restoreViewState`
registerEditorAction(NextWordHighlightAction);
registerEditorAction(PrevWordHighlightAction);
registerEditorAction(TriggerWordHighlightAction);
registerEditorFeature(TextualMultiDocumentHighlightFeature);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29yZEhpZ2hsaWdodGVyLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvd29yZEhpZ2hsaWdodGVyL2Jyb3dzZXIvd29yZEhpZ2hsaWdodGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNoRSxPQUFPLEVBRU4sdUJBQXVCLEVBQ3ZCLE9BQU8sRUFDUCxLQUFLLEdBQ0wsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsYUFBYSxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUU5RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBRU4sa0JBQWtCLEVBQ2xCLGFBQWEsR0FDYixNQUFNLHNEQUFzRCxDQUFBO0FBRzdELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNwRSxPQUFPLEVBQWtDLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ2hHLE9BQU8sRUFDTixZQUFZLEVBR1osb0JBQW9CLEVBQ3BCLDBCQUEwQixF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