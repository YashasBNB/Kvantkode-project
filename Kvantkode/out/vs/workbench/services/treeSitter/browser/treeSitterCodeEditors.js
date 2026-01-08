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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHJlZVNpdHRlckNvZGVFZGl0b3JzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdHJlZVNpdHRlci9icm93c2VyL3RyZWVTaXR0ZXJDb2RlRWRpdG9ycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsYUFBYSxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRWpHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBRTdGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwrREFBK0QsQ0FBQTtBQU9qRyxJQUFNLHFCQUFxQixHQUEzQixNQUFNLHFCQUFzQixTQUFRLFVBQVU7SUFPcEQsWUFDa0IsV0FBbUIsRUFDaEIsa0JBQXVELEVBQ2pELHdCQUFtRTtRQUU3RixLQUFLLEVBQUUsQ0FBQTtRQUpVLGdCQUFXLEdBQVgsV0FBVyxDQUFRO1FBQ0MsdUJBQWtCLEdBQWxCLGtCQUFrQixDQUFvQjtRQUNoQyw2QkFBd0IsR0FBeEIsd0JBQXdCLENBQTBCO1FBVDdFLGdCQUFXLEdBQUcsSUFBSSxHQUFHLEVBQWMsQ0FBQTtRQUNuQyxxQkFBZ0IsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksYUFBYSxFQUFlLENBQUMsQ0FBQTtRQUNuRSxnQkFBVyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxhQUFhLEVBQWUsQ0FBQyxDQUFBO1FBQzlELHlCQUFvQixHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxPQUFPLEVBQXdCLENBQUMsQ0FBQTtRQUMzRSx3QkFBbUIsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFBO1FBUXBFLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGtCQUFrQixDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUNwRixJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsbUJBQW1CLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUMxRixJQUFJLENBQUMsa0JBQWtCLENBQUMsZUFBZSxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUMvRSxDQUFDO0lBRUQsSUFBSSxVQUFVO1FBQ2IsT0FBTyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQTtJQUMzQyxDQUFDO0lBRUQsaUJBQWlCLENBQUMsS0FBaUI7UUFDbEMsT0FBTyxJQUFJLENBQUMsa0JBQWtCLENBQUMsZUFBZSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEtBQUssS0FBSyxDQUFDLENBQUE7SUFDL0YsQ0FBQztJQUVNLEtBQUssQ0FBQyxtQkFBbUI7UUFDL0IsTUFBTSxJQUFJLENBQUMsd0JBQXdCLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQTtRQUNqRSxNQUFNLE9BQU8sR0FBRyxJQUFJLENBQUMsa0JBQWtCLENBQUMsZUFBZSxFQUFFLENBQUE7UUFDekQsTUFBTSxTQUFTLEdBQTJCLEVBQUUsQ0FBQTtRQUM1QyxLQUFLLE1BQU0sTUFBTSxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQzlCLE1BQU0sS0FBSyxHQUFHLE1BQU0sSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUMvQyxJQUFJLEtBQUssSUFBSSxLQUFLLENBQUMsYUFBYSxFQUFFLEtBQUssSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUN6RCxTQUFTLENBQUMsSUFBSSxDQUFDO29CQUNkLEtBQUs7b0JBQ0wsTUFBTSxFQUFFLElBQUksQ0FBQyw4QkFBOEIsQ0FBQyxNQUFNLENBQUM7aUJBQ25ELENBQUMsQ0FBQTtZQUNILENBQUM7UUFDRixDQUFDO1FBQ0QsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztJQUVPLG1CQUFtQixDQUFDLE1BQW1CO1FBQzlDLElBQUksQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDMUMsQ0FBQztJQUVPLEtBQUssQ0FBQyxjQUFjLENBQUMsTUFBbUI7UUFDL0MsSUFBSSxLQUFLLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRSxJQUFJLFNBQVMsQ0FBQTtRQUMxQyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixNQUFNLGVBQWUsR0FBb0IsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLGVBQWUsRUFBRSxDQUFDLENBQUE7WUFDOUUsTUFBTSxLQUFLLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLGdCQUFnQixDQUFDLEVBQUUsZUFBZSxDQUFDLENBQUE7WUFDM0UsS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsSUFBSSxTQUFTLENBQUE7UUFDdkMsQ0FBQztRQUNELE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUVPLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFtQjtRQUNqRCxNQUFNLHNCQUFzQixHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFDcEQsc0JBQXNCLENBQUMsR0FBRyxDQUN6QixNQUFNLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FDdEYsQ0FBQTtRQUNELElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxzQkFBc0IsQ0FBQyxDQUFBO1FBRXBELE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUMvQixJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ1gsSUFBSSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDbEMsQ0FBQztJQUNGLENBQUM7SUFFTyxhQUFhLENBQUMsTUFBbUIsRUFBRSxLQUFpQjtRQUMzRCxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsYUFBYSxFQUFFLENBQUE7UUFDdEMsSUFBSSxRQUFRLEtBQUssSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ25DLElBQUksQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNsQyxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUM1QixDQUFDO1lBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQztnQkFDeEMsTUFBTSx5QkFBeUIsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO2dCQUN2RCx5QkFBeUIsQ0FBQyxHQUFHLENBQzVCLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQ3BFLENBQUE7Z0JBQ0QsSUFBSSxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxNQUFNLEVBQUUseUJBQXlCLENBQUMsQ0FBQTtnQkFDNUQsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQy9CLENBQUM7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxNQUFtQixFQUFFLEtBQXdCO1FBQzVFLElBQUksS0FBSyxFQUFFLENBQUM7WUFDWCxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNsQyxDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUMvQyxDQUFDO0lBQ0YsQ0FBQztJQUVPLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxNQUFtQjtRQUNsRCxNQUFNLE1BQU0sR0FBRyxJQUFJLENBQUMsOEJBQThCLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDMUQsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFBO1FBQy9CLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsQ0FBQTtZQUM5QyxPQUFNO1FBQ1AsQ0FBQztRQUNELElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUE7SUFDekQsQ0FBQztJQUVPLDhCQUE4QixDQUFDLE1BQW1CO1FBQ3pELE1BQU0sY0FBYyxHQUFHLE1BQU0sQ0FBQyxzQ0FBc0MsRUFBRSxDQUFBO1FBQ3RFLE1BQU0scUJBQXFCLEdBQVksRUFBRSxDQUFBO1FBQ3pDLEtBQUssTUFBTSxLQUFLLElBQUksY0FBYyxFQUFFLENBQUM7WUFDcEMsSUFBSSxxQkFBcUIsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBQ3hDLE1BQU0sSUFBSSxHQUFHLHFCQUFxQixDQUFDLHFCQUFxQixDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsQ0FBQTtnQkFDcEUsSUFBSSxLQUFLLENBQUMsbUJBQW1CLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQzVDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLENBQUE7b0JBQ3RDLHFCQUFxQixDQUFDLHFCQUFxQixDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsR0FBRyxRQUFRLENBQUE7b0JBQ2xFLFNBQVE7Z0JBQ1QsQ0FBQztZQUNGLENBQUM7WUFDRCxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDbEMsQ0FBQztRQUNELE9BQU8scUJBQXFCLENBQUE7SUFDN0IsQ0FBQztDQUNELENBQUE7QUF4SFkscUJBQXFCO0lBUy9CLFdBQUEsa0JBQWtCLENBQUE7SUFDbEIsV0FBQSx3QkFBd0IsQ0FBQTtHQVZkLHFCQUFxQixDQXdIakMifQ==