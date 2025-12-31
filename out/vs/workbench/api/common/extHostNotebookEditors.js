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
import { Emitter } from '../../../base/common/event.js';
import { ILogService } from '../../../platform/log/common/log.js';
import * as typeConverters from './extHostTypeConverters.js';
let ExtHostNotebookEditors = class ExtHostNotebookEditors {
    constructor(_logService, _notebooksAndEditors) {
        this._logService = _logService;
        this._notebooksAndEditors = _notebooksAndEditors;
        this._onDidChangeNotebookEditorSelection = new Emitter();
        this._onDidChangeNotebookEditorVisibleRanges = new Emitter();
        this.onDidChangeNotebookEditorSelection = this._onDidChangeNotebookEditorSelection.event;
        this.onDidChangeNotebookEditorVisibleRanges = this._onDidChangeNotebookEditorVisibleRanges.event;
    }
    $acceptEditorPropertiesChanged(id, data) {
        this._logService.debug('ExtHostNotebook#$acceptEditorPropertiesChanged', id, data);
        const editor = this._notebooksAndEditors.getEditorById(id);
        // ONE: make all state updates
        if (data.visibleRanges) {
            editor._acceptVisibleRanges(data.visibleRanges.ranges.map(typeConverters.NotebookRange.to));
        }
        if (data.selections) {
            editor._acceptSelections(data.selections.selections.map(typeConverters.NotebookRange.to));
        }
        // TWO: send all events after states have been updated
        if (data.visibleRanges) {
            this._onDidChangeNotebookEditorVisibleRanges.fire({
                notebookEditor: editor.apiEditor,
                visibleRanges: editor.apiEditor.visibleRanges,
            });
        }
        if (data.selections) {
            this._onDidChangeNotebookEditorSelection.fire(Object.freeze({
                notebookEditor: editor.apiEditor,
                selections: editor.apiEditor.selections,
            }));
        }
    }
    $acceptEditorViewColumns(data) {
        for (const id in data) {
            const editor = this._notebooksAndEditors.getEditorById(id);
            editor._acceptViewColumn(typeConverters.ViewColumn.to(data[id]));
        }
    }
};
ExtHostNotebookEditors = __decorate([
    __param(0, ILogService)
], ExtHostNotebookEditors);
export { ExtHostNotebookEditors };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE5vdGVib29rRWRpdG9ycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3ROb3RlYm9va0VkaXRvcnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQU9qRSxPQUFPLEtBQUssY0FBYyxNQUFNLDRCQUE0QixDQUFBO0FBR3JELElBQU0sc0JBQXNCLEdBQTVCLE1BQU0sc0JBQXNCO0lBVWxDLFlBQ2MsV0FBeUMsRUFDckMsb0JBQStDO1FBRGxDLGdCQUFXLEdBQVgsV0FBVyxDQUFhO1FBQ3JDLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBMkI7UUFYaEQsd0NBQW1DLEdBQ25ELElBQUksT0FBTyxFQUE2QyxDQUFBO1FBQ3hDLDRDQUF1QyxHQUN2RCxJQUFJLE9BQU8sRUFBaUQsQ0FBQTtRQUVwRCx1Q0FBa0MsR0FBRyxJQUFJLENBQUMsbUNBQW1DLENBQUMsS0FBSyxDQUFBO1FBQ25GLDJDQUFzQyxHQUM5QyxJQUFJLENBQUMsdUNBQXVDLENBQUMsS0FBSyxDQUFBO0lBS2hELENBQUM7SUFFSiw4QkFBOEIsQ0FBQyxFQUFVLEVBQUUsSUFBeUM7UUFDbkYsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsZ0RBQWdELEVBQUUsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ2xGLE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDMUQsOEJBQThCO1FBQzlCLElBQUksSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3hCLE1BQU0sQ0FBQyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzVGLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNyQixNQUFNLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMxRixDQUFDO1FBRUQsc0RBQXNEO1FBQ3RELElBQUksSUFBSSxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQ3hCLElBQUksQ0FBQyx1Q0FBdUMsQ0FBQyxJQUFJLENBQUM7Z0JBQ2pELGNBQWMsRUFBRSxNQUFNLENBQUMsU0FBUztnQkFDaEMsYUFBYSxFQUFFLE1BQU0sQ0FBQyxTQUFTLENBQUMsYUFBYTthQUM3QyxDQUFDLENBQUE7UUFDSCxDQUFDO1FBQ0QsSUFBSSxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDckIsSUFBSSxDQUFDLG1DQUFtQyxDQUFDLElBQUksQ0FDNUMsTUFBTSxDQUFDLE1BQU0sQ0FBQztnQkFDYixjQUFjLEVBQUUsTUFBTSxDQUFDLFNBQVM7Z0JBQ2hDLFVBQVUsRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLFVBQVU7YUFDdkMsQ0FBQyxDQUNGLENBQUE7UUFDRixDQUFDO0lBQ0YsQ0FBQztJQUVELHdCQUF3QixDQUFDLElBQW1DO1FBQzNELEtBQUssTUFBTSxFQUFFLElBQUksSUFBSSxFQUFFLENBQUM7WUFDdkIsTUFBTSxNQUFNLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLGFBQWEsQ0FBQyxFQUFFLENBQUMsQ0FBQTtZQUMxRCxNQUFNLENBQUMsaUJBQWlCLENBQUMsY0FBYyxDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNqRSxDQUFDO0lBQ0YsQ0FBQztDQUNELENBQUE7QUFqRFksc0JBQXNCO0lBV2hDLFdBQUEsV0FBVyxDQUFBO0dBWEQsc0JBQXNCLENBaURsQyJ9