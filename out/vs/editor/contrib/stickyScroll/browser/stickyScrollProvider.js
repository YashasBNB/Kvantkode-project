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
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { CancellationTokenSource } from '../../../../base/common/cancellation.js';
import { RunOnceScheduler } from '../../../../base/common/async.js';
import { binarySearch } from '../../../../base/common/arrays.js';
import { Emitter } from '../../../../base/common/event.js';
import { ILanguageConfigurationService } from '../../../common/languages/languageConfigurationRegistry.js';
import { StickyModelProvider } from './stickyScrollModelProvider.js';
export class StickyLineCandidate {
    constructor(startLineNumber, endLineNumber, top, height) {
        this.startLineNumber = startLineNumber;
        this.endLineNumber = endLineNumber;
        this.top = top;
        this.height = height;
    }
}
let StickyLineCandidateProvider = class StickyLineCandidateProvider extends Disposable {
    static { this.ID = 'store.contrib.stickyScrollController'; }
    constructor(editor, _languageFeaturesService, _languageConfigurationService) {
        super();
        this._languageFeaturesService = _languageFeaturesService;
        this._languageConfigurationService = _languageConfigurationService;
        this._onDidChangeStickyScroll = this._register(new Emitter());
        this.onDidChangeStickyScroll = this._onDidChangeStickyScroll.event;
        this._model = null;
        this._cts = null;
        this._stickyModelProvider = null;
        this._editor = editor;
        this._sessionStore = this._register(new DisposableStore());
        this._updateSoon = this._register(new RunOnceScheduler(() => this.update(), 50));
        this._register(this._editor.onDidChangeConfiguration((e) => {
            if (e.hasChanged(120 /* EditorOption.stickyScroll */)) {
                this.readConfiguration();
            }
        }));
        this.readConfiguration();
    }
    readConfiguration() {
        this._sessionStore.clear();
        const options = this._editor.getOption(120 /* EditorOption.stickyScroll */);
        if (!options.enabled) {
            return;
        }
        this._sessionStore.add(this._editor.onDidChangeModel(() => {
            // We should not show an old model for a different file, it will always be wrong.
            // So we clear the model here immediately and then trigger an update.
            this._model = null;
            this.updateStickyModelProvider();
            this._onDidChangeStickyScroll.fire();
            this.update();
        }));
        this._sessionStore.add(this._editor.onDidChangeHiddenAreas(() => this.update()));
        this._sessionStore.add(this._editor.onDidChangeModelContent(() => this._updateSoon.schedule()));
        this._sessionStore.add(this._languageFeaturesService.documentSymbolProvider.onDidChange(() => this.update()));
        this._sessionStore.add(toDisposable(() => {
            this._stickyModelProvider?.dispose();
            this._stickyModelProvider = null;
        }));
        this.updateStickyModelProvider();
        this.update();
    }
    getVersionId() {
        return this._model?.version;
    }
    updateStickyModelProvider() {
        this._stickyModelProvider?.dispose();
        this._stickyModelProvider = null;
        const editor = this._editor;
        if (editor.hasModel()) {
            this._stickyModelProvider = new StickyModelProvider(editor, () => this._updateSoon.schedule(), this._languageConfigurationService, this._languageFeaturesService);
        }
    }
    async update() {
        this._cts?.dispose(true);
        this._cts = new CancellationTokenSource();
        await this.updateStickyModel(this._cts.token);
        this._onDidChangeStickyScroll.fire();
    }
    async updateStickyModel(token) {
        if (!this._editor.hasModel() ||
            !this._stickyModelProvider ||
            this._editor.getModel().isTooLargeForTokenization()) {
            this._model = null;
            return;
        }
        const model = await this._stickyModelProvider.update(token);
        if (token.isCancellationRequested) {
            // the computation was canceled, so do not overwrite the model
            return;
        }
        this._model = model;
    }
    updateIndex(index) {
        if (index === -1) {
            index = 0;
        }
        else if (index < 0) {
            index = -index - 2;
        }
        return index;
    }
    getCandidateStickyLinesIntersectingFromStickyModel(range, outlineModel, result, depth, top, lastStartLineNumber) {
        if (outlineModel.children.length === 0) {
            return;
        }
        let lastLine = lastStartLineNumber;
        const childrenStartLines = [];
        for (let i = 0; i < outlineModel.children.length; i++) {
            const child = outlineModel.children[i];
            if (child.range) {
                childrenStartLines.push(child.range.startLineNumber);
            }
        }
        const lowerBound = this.updateIndex(binarySearch(childrenStartLines, range.startLineNumber, (a, b) => {
            return a - b;
        }));
        const upperBound = this.updateIndex(binarySearch(childrenStartLines, range.startLineNumber + depth, (a, b) => {
            return a - b;
        }));
        for (let i = lowerBound; i <= upperBound; i++) {
            const child = outlineModel.children[i];
            if (!child) {
                return;
            }
            const childRange = child.range;
            if (childRange) {
                const childStartLine = childRange.startLineNumber;
                const childEndLine = childRange.endLineNumber;
                if (range.startLineNumber <= childEndLine + 1 &&
                    childStartLine - 1 <= range.endLineNumber &&
                    childStartLine !== lastLine) {
                    lastLine = childStartLine;
                    const lineHeight = this._editor.getOption(68 /* EditorOption.lineHeight */);
                    result.push(new StickyLineCandidate(childStartLine, childEndLine - 1, top, lineHeight));
                    this.getCandidateStickyLinesIntersectingFromStickyModel(range, child, result, depth + 1, top + lineHeight, childStartLine);
                }
            }
            else {
                this.getCandidateStickyLinesIntersectingFromStickyModel(range, child, result, depth, top, lastStartLineNumber);
            }
        }
    }
    getCandidateStickyLinesIntersecting(range) {
        if (!this._model?.element) {
            return [];
        }
        let stickyLineCandidates = [];
        this.getCandidateStickyLinesIntersectingFromStickyModel(range, this._model.element, stickyLineCandidates, 0, 0, -1);
        const hiddenRanges = this._editor._getViewModel()?.getHiddenAreas();
        if (hiddenRanges) {
            for (const hiddenRange of hiddenRanges) {
                stickyLineCandidates = stickyLineCandidates.filter((stickyLine) => !(stickyLine.startLineNumber >= hiddenRange.startLineNumber &&
                    stickyLine.endLineNumber <= hiddenRange.endLineNumber + 1));
            }
        }
        return stickyLineCandidates;
    }
};
StickyLineCandidateProvider = __decorate([
    __param(1, ILanguageFeaturesService),
    __param(2, ILanguageConfigurationService)
], StickyLineCandidateProvider);
export { StickyLineCandidateProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RpY2t5U2Nyb2xsUHJvdmlkZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9zdGlja3lTY3JvbGwvYnJvd3Nlci9zdGlja3lTY3JvbGxQcm92aWRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVoRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUN2RixPQUFPLEVBQXFCLHVCQUF1QixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFcEcsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFbkUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ2hFLE9BQU8sRUFBUyxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUMxRyxPQUFPLEVBQUUsbUJBQW1CLEVBQXdCLE1BQU0sZ0NBQWdDLENBQUE7QUFHMUYsTUFBTSxPQUFPLG1CQUFtQjtJQUMvQixZQUNpQixlQUF1QixFQUN2QixhQUFxQixFQUNyQixHQUFXLEVBQ1gsTUFBYztRQUhkLG9CQUFlLEdBQWYsZUFBZSxDQUFRO1FBQ3ZCLGtCQUFhLEdBQWIsYUFBYSxDQUFRO1FBQ3JCLFFBQUcsR0FBSCxHQUFHLENBQVE7UUFDWCxXQUFNLEdBQU4sTUFBTSxDQUFRO0lBQzVCLENBQUM7Q0FDSjtBQVVNLElBQU0sMkJBQTJCLEdBQWpDLE1BQU0sMkJBQ1osU0FBUSxVQUFVO2FBR0YsT0FBRSxHQUFHLHNDQUFzQyxBQUF6QyxDQUF5QztJQWEzRCxZQUNDLE1BQW1CLEVBQ08s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