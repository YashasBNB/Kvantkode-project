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
import { isObject } from '../../../../base/common/types.js';
import { ResourceEdit } from '../../../../editor/browser/services/bulkEditService.js';
import { IUndoRedoService, } from '../../../../platform/undoRedo/common/undoRedo.js';
export class ResourceAttachmentEdit extends ResourceEdit {
    static is(candidate) {
        if (candidate instanceof ResourceAttachmentEdit) {
            return true;
        }
        else {
            return (isObject(candidate) &&
                Boolean(candidate.undo && candidate.redo));
        }
    }
    static lift(edit) {
        if (edit instanceof ResourceAttachmentEdit) {
            return edit;
        }
        else {
            return new ResourceAttachmentEdit(edit.resource, edit.undo, edit.redo, edit.metadata);
        }
    }
    constructor(resource, undo, redo, metadata) {
        super(metadata);
        this.resource = resource;
        this.undo = undo;
        this.redo = redo;
    }
}
let OpaqueEdits = class OpaqueEdits {
    constructor(_undoRedoGroup, _undoRedoSource, _progress, _token, _edits, _undoRedoService) {
        this._undoRedoGroup = _undoRedoGroup;
        this._undoRedoSource = _undoRedoSource;
        this._progress = _progress;
        this._token = _token;
        this._edits = _edits;
        this._undoRedoService = _undoRedoService;
    }
    async apply() {
        const resources = [];
        for (const edit of this._edits) {
            if (this._token.isCancellationRequested) {
                break;
            }
            await edit.redo();
            this._undoRedoService.pushElement({
                type: 0 /* UndoRedoElementType.Resource */,
                resource: edit.resource,
                label: edit.metadata?.label || 'Custom Edit',
                code: 'paste',
                undo: edit.undo,
                redo: edit.redo,
            }, this._undoRedoGroup, this._undoRedoSource);
            this._progress.report(undefined);
            resources.push(edit.resource);
        }
        return resources;
    }
};
OpaqueEdits = __decorate([
    __param(5, IUndoRedoService)
], OpaqueEdits);
export { OpaqueEdits };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3BhcXVlRWRpdHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2J1bGtFZGl0L2Jyb3dzZXIvb3BhcXVlRWRpdHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFHaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRTNELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUdyRixPQUFPLEVBQ04sZ0JBQWdCLEdBSWhCLE1BQU0sa0RBQWtELENBQUE7QUFFekQsTUFBTSxPQUFPLHNCQUF1QixTQUFRLFlBQVk7SUFDdkQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxTQUFjO1FBQ3ZCLElBQUksU0FBUyxZQUFZLHNCQUFzQixFQUFFLENBQUM7WUFDakQsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sQ0FDTixRQUFRLENBQUMsU0FBUyxDQUFDO2dCQUNuQixPQUFPLENBQWUsU0FBVSxDQUFDLElBQUksSUFBa0IsU0FBVSxDQUFDLElBQUksQ0FBQyxDQUN2RSxDQUFBO1FBQ0YsQ0FBQztJQUNGLENBQUM7SUFFRCxNQUFNLENBQUMsSUFBSSxDQUFDLElBQWlCO1FBQzVCLElBQUksSUFBSSxZQUFZLHNCQUFzQixFQUFFLENBQUM7WUFDNUMsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO2FBQU0sQ0FBQztZQUNQLE9BQU8sSUFBSSxzQkFBc0IsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDdEYsQ0FBQztJQUNGLENBQUM7SUFFRCxZQUNVLFFBQWEsRUFDYixJQUFnQyxFQUNoQyxJQUFnQyxFQUN6QyxRQUFnQztRQUVoQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUE7UUFMTixhQUFRLEdBQVIsUUFBUSxDQUFLO1FBQ2IsU0FBSSxHQUFKLElBQUksQ0FBNEI7UUFDaEMsU0FBSSxHQUFKLElBQUksQ0FBNEI7SUFJMUMsQ0FBQztDQUNEO0FBRU0sSUFBTSxXQUFXLEdBQWpCLE1BQU0sV0FBVztJQUN2QixZQUNrQixjQUE2QixFQUM3QixlQUEyQyxFQUMzQyxTQUEwQixFQUMxQixNQUF5QixFQUN6QixNQUFnQyxFQUNkLGdCQUFrQztRQUxwRCxtQkFBYyxHQUFkLGNBQWMsQ0FBZTtRQUM3QixvQkFBZSxHQUFmLGVBQWUsQ0FBNEI7UUFDM0MsY0FBUyxHQUFULFNBQVMsQ0FBaUI7UUFDMUIsV0FBTSxHQUFOLE1BQU0sQ0FBbUI7UUFDekIsV0FBTSxHQUFOLE1BQU0sQ0FBMEI7UUFDZCxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQWtCO0lBQ25FLENBQUM7SUFFSixLQUFLLENBQUMsS0FBSztRQUNWLE1BQU0sU0FBUyxHQUFVLEVBQUUsQ0FBQTtRQUUzQixLQUFLLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNoQyxJQUFJLElBQUksQ0FBQyxNQUFNLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztnQkFDekMsTUFBSztZQUNOLENBQUM7WUFFRCxNQUFNLElBQUksQ0FBQyxJQUFJLEVBQUUsQ0FBQTtZQUVqQixJQUFJLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUNoQztnQkFDQyxJQUFJLHNDQUE4QjtnQkFDbEMsUUFBUSxFQUFFLElBQUksQ0FBQyxRQUFRO2dCQUN2QixLQUFLLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxLQUFLLElBQUksYUFBYTtnQkFDNUMsSUFBSSxFQUFFLE9BQU87Z0JBQ2IsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJO2dCQUNmLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTthQUNmLEVBQ0QsSUFBSSxDQUFDLGNBQWMsRUFDbkIsSUFBSSxDQUFDLGVBQWUsQ0FDcEIsQ0FBQTtZQUVELElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1lBQ2hDLFNBQVMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQzlCLENBQUM7UUFFRCxPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0NBQ0QsQ0FBQTtBQXZDWSxXQUFXO0lBT3JCLFdBQUEsZ0JBQWdCLENBQUE7R0FQTixXQUFXLENBdUN2QiJ9