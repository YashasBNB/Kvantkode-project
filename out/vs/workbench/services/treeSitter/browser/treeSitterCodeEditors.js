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
import { Disposable, DisposableMap, DisposableStore } from '../../../../base/common/lifecycle.js';
import { ICodeEditorService } from '../../../../editor/browser/services/codeEditorService.js';
import { Range } from '../../../../editor/common/core/range.js';
import { ITreeSitterParserService } from '../../../../editor/common/services/treeSitterParserService.js';
let TreeSitterCodeEditors = class TreeSitterCodeEditors extends Disposable {
    constructor(_languageId, _codeEditorService, _treeSitterParserService) {
        super();
        this._languageId = _languageId;
        this._codeEditorService = _codeEditorService;
        this._treeSitterParserService = _treeSitterParserService;
        this._textModels = new Set();
        this._languageEditors = this._register(new DisposableMap());
        this._allEditors = this._register(new DisposableMap());
        this._onDidChangeViewport = this._register(new Emitter());
        this.onDidChangeViewport = this._onDidChangeViewport.event;
        this._register(this._codeEditorService.onCodeEditorAdd(this._onCodeEditorAdd, this));
        this._register(this._codeEditorService.onCodeEditorRemove(this._onCodeEditorRemove, this));
        this._codeEditorService.listCodeEditors().forEach(this._onCodeEditorAdd, this);
    }
    get textModels() {
        return Array.from(this._textModels.keys());
    }
    getEditorForModel(model) {
        return this._codeEditorService.listCodeEditors().find((editor) => editor.getModel() === model);
    }
    async getInitialViewPorts() {
        await this._treeSitterParserService.getLanguage(this._languageId);
        const editors = this._codeEditorService.listCodeEditors();
        const viewports = [];
        for (const editor of editors) {
            const model = await this.getEditorModel(editor);
            if (model && model.getLanguageId() === this._languageId) {
                viewports.push({
                    model,
                    ranges: this._nonIntersectingViewPortRanges(editor),
                });
            }
        }
        return viewports;
    }
    _onCodeEditorRemove(editor) {
        this._allEditors.deleteAndDispose(editor);
    }
    async getEditorModel(editor) {
        let model = editor.getModel() ?? undefined;
        if (!model) {
            const disposableStore = this._register(new DisposableStore());
            await Event.toPromise(Event.once(editor.onDidChangeModel), disposableStore);
            model = editor.getModel() ?? undefined;
        }
        return model;
    }
    async _onCodeEditorAdd(editor) {
        const otherEditorDisposables = new DisposableStore();
        otherEditorDisposables.add(editor.onDidChangeModel(() => this._onDidChangeModel(editor, editor.getModel()), this));
        this._allEditors.set(editor, otherEditorDisposables);
        const model = editor.getModel();
        if (model) {
            this._tryAddEditor(editor, model);
        }
    }
    _tryAddEditor(editor, model) {
        const language = model.getLanguageId();
        if (language === this._languageId) {
            if (!this._textModels.has(model)) {
                this._textModels.add(model);
            }
            if (!this._languageEditors.has(editor)) {
                const langaugeEditorDisposables = new DisposableStore();
                langaugeEditorDisposables.add(editor.onDidScrollChange(() => this._onViewportChange(editor), this));
                this._languageEditors.set(editor, langaugeEditorDisposables);
                this._onViewportChange(editor);
            }
        }
    }
    async _onDidChangeModel(editor, model) {
        if (model) {
            this._tryAddEditor(editor, model);
        }
        else {
            this._languageEditors.deleteAndDispose(editor);
        }
    }
    async _onViewportChange(editor) {
        const ranges = this._nonIntersectingViewPortRanges(editor);
        const model = editor.getModel();
        if (!model) {
            this._languageEditors.deleteAndDispose(editor);
            return;
        }
        this._onDidChangeViewport.fire({ model: model, ranges });
    }
    _nonIntersectingViewPortRanges(editor) {
        const viewportRanges = editor.getVisibleRangesPlusViewportAboveBelow();
        const nonIntersectingRanges = [];
        for (const range of viewportRanges) {
            if (nonIntersectingRanges.length !== 0) {
                const prev = nonIntersectingRanges[nonIntersectingRanges.length - 1];
                if (Range.areOnlyIntersecting(prev, range)) {
                    const newRange = prev.plusRange(range);
                    nonIntersectingRanges[nonIntersectingRanges.length - 1] = newRange;
                    continue;
                }
            }
            nonIntersectingRanges.push(range);
        }
        return nonIntersectingRanges;
    }
};
TreeSitterCodeEditors = __decorate([
    __param(1, ICodeEditorService),
    __param(2, ITreeSitterParserService)
], TreeSitterCodeEditors);
export { TreeSitterCodeEditors };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVNpdHRlckNvZGVFZGl0b3JzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RyZWVTaXR0ZXIvYnJvd3Nlci90cmVlU2l0dGVyQ29kZUVkaXRvcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLGFBQWEsRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVqRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUU3RixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDL0QsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFPakcsSUFBTSxxQkFBcUIsR0FBM0IsTUFBTSxxQkFBc0IsU0FBUSxVQUFVO0lBT3BELFlBQ2tCLFdBQW1CLEVBQ2hCLGtCQUF1RCxFQUNqRCx3QkFBbUU7UUFFN0YsS0FBSyxFQUFFLENBQUE7UUFKVSxnQkFBVyxHQUFYLFdBQVcsQ0FBUTtRQUNDLHVCQUFrQixHQUFsQixrQkFBa0IsQ0FBb0I7UUFDaEMsNkJBQXdCLEdBQXhCLHdCQUF3QixDQUEwQjtRQVQ3RSxnQkFBVyxHQUFHLElBQUksR0FBRyxFQUFjLENBQUE7UUFDbkMscUJBQWdCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGFBQWEsRUFBZSxDQUFDLENBQUE7UUFDbkUsZ0JBQVcsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksYUFBYSxFQUFlLENBQUMsQ0FBQTtRQUM5RCx5QkFBb0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxFQUF3QixD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