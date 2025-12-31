/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { illegalArgument } from '../../../base/common/errors.js';
import * as extHostConverter from './extHostTypeConverters.js';
import * as extHostTypes from './extHostTypes.js';
export class ExtHostNotebookEditor {
    static { this.apiEditorsToExtHost = new WeakMap(); }
    constructor(id, _proxy, notebookData, _visibleRanges, _selections, _viewColumn, viewType) {
        this.id = id;
        this._proxy = _proxy;
        this.notebookData = notebookData;
        this._visibleRanges = _visibleRanges;
        this._selections = _selections;
        this._viewColumn = _viewColumn;
        this.viewType = viewType;
        this._visible = false;
    }
    get apiEditor() {
        if (!this._editor) {
            const that = this;
            this._editor = {
                get notebook() {
                    return that.notebookData.apiNotebook;
                },
                get selection() {
                    return that._selections[0];
                },
                set selection(selection) {
                    this.selections = [selection];
                },
                get selections() {
                    return that._selections;
                },
                set selections(value) {
                    if (!Array.isArray(value) || !value.every(extHostTypes.NotebookRange.isNotebookRange)) {
                        throw illegalArgument('selections');
                    }
                    that._selections = value;
                    that._trySetSelections(value);
                },
                get visibleRanges() {
                    return that._visibleRanges;
                },
                revealRange(range, revealType) {
                    that._proxy.$tryRevealRange(that.id, extHostConverter.NotebookRange.from(range), revealType ?? extHostTypes.NotebookEditorRevealType.Default);
                },
                get viewColumn() {
                    return that._viewColumn;
                },
                get replOptions() {
                    if (that.viewType === 'repl') {
                        return { appendIndex: this.notebook.cellCount - 1 };
                    }
                    return undefined;
                },
                [Symbol.for('debug.description')]() {
                    return `NotebookEditor(${this.notebook.uri.toString()})`;
                },
            };
            ExtHostNotebookEditor.apiEditorsToExtHost.set(this._editor, this);
        }
        return this._editor;
    }
    get visible() {
        return this._visible;
    }
    _acceptVisibility(value) {
        this._visible = value;
    }
    _acceptVisibleRanges(value) {
        this._visibleRanges = value;
    }
    _acceptSelections(selections) {
        this._selections = selections;
    }
    _trySetSelections(value) {
        this._proxy.$trySetSelections(this.id, value.map(extHostConverter.NotebookRange.from));
    }
    _acceptViewColumn(value) {
        this._viewColumn = value;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE5vdGVib29rRWRpdG9yLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdE5vdGVib29rRWRpdG9yLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUVoRSxPQUFPLEtBQUssZ0JBQWdCLE1BQU0sNEJBQTRCLENBQUE7QUFDOUQsT0FBTyxLQUFLLFlBQVksTUFBTSxtQkFBbUIsQ0FBQTtBQUlqRCxNQUFNLE9BQU8scUJBQXFCO2FBQ1Ysd0JBQW1CLEdBQUcsSUFBSSxPQUFPLEVBR3JELEFBSHVDLENBR3ZDO0lBTUgsWUFDVSxFQUFVLEVBQ0YsTUFBc0MsRUFDOUMsWUFBcUMsRUFDdEMsY0FBc0MsRUFDdEMsV0FBbUMsRUFDbkMsV0FBMEMsRUFDakMsUUFBZ0I7UUFOeEIsT0FBRSxHQUFGLEVBQUUsQ0FBUTtRQUNGLFdBQU0sR0FBTixNQUFNLENBQWdDO1FBQzlDLGlCQUFZLEdBQVosWUFBWSxDQUF5QjtRQUN0QyxtQkFBYyxHQUFkLGNBQWMsQ0FBd0I7UUFDdEMsZ0JBQVcsR0FBWCxXQUFXLENBQXdCO1FBQ25DLGdCQUFXLEdBQVgsV0FBVyxDQUErQjtRQUNqQyxhQUFRLEdBQVIsUUFBUSxDQUFRO1FBWDFCLGFBQVEsR0FBWSxLQUFLLENBQUE7SUFZOUIsQ0FBQztJQUVKLElBQUksU0FBUztRQUNaLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbkIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFBO1lBQ2pCLElBQUksQ0FBQyxPQUFPLEdBQUc7Z0JBQ2QsSUFBSSxRQUFRO29CQUNYLE9BQU8sSUFBSSxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUE7Z0JBQ3JDLENBQUM7Z0JBQ0QsSUFB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