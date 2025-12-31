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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3BhcXVlRWRpdHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9idWxrRWRpdC9icm93c2VyL29wYXF1ZUVkaXRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUUzRCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFHckYsT0FBTyxFQUNOLGdCQUFnQixHQUloQixNQUFNLGtEQUFrRCxDQUFBO0FBRXpELE1BQU0sT0FBTyxzQkFBdUIsU0FBUSxZQUFZO0lBQ3ZELE1BQU0sQ0FBQyxFQUFFLENBQUMsU0FBYztRQUN2QixJQUFJLFNBQVMsWUFBWSxzQkFBc0IsRUFBRSxDQUFDO1lBQ2pELE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLENBQ04sUUFBUSxDQUFDLFNBQVMsQ0FBQztnQkFDbkIsT0FBTyxDQUFlLFNBQVUsQ0FBQyxJQUFJLElBQWtCLFNBQVUsQ0FBQyxJQUFJLENBQUMsQ0FDdkUsQ0FBQTtRQUNGLENBQUM7SUFDRixDQUFDO0lBRUQsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFpQjtRQUM1QixJQUFJLElBQUksWUFBWSxzQkFBc0IsRUFBRSxDQUFDO1lBQzVDLE9BQU8sSUFBSSxDQUFBO1FBQ1osQ0FBQzthQUFNLENBQUM7WUFDUCxPQUFPLElBQUksc0JBQXNCLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3RGLENBQUM7SUFDRixDQUFDO0lBRUQsWUFDVSxRQUFhLEVBQ2IsSUFBZ0MsRUFDaEMsSUFBZ0MsRUFDekMsUUFBZ0M7UUFFaEMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBTE4sYUFBUSxHQUFSLFFBQVEsQ0FBSztRQUNiLFNBQUksR0FBSixJQUFJLENBQTRCO1FBQ2hDLFNBQUksR0FBSixJQUFJLENBQTRCO0lBSTFDLENBQUM7Q0FDRDtBQUVNLElBQU0sV0FBVyxHQUFqQixNQUFNLFdBQVc7SUFDdkIsWUFDa0IsY0FBNkIsRUFDN0IsZUFBMkMsRUFDM0MsU0FBMEIsRUFDMUIsTUFBeUIsRUFDekIsTUFBZ0MsRUFDZCxnQkFBa0M7UUFMcEQsbUJBQWMsR0FBZCxjQUFjLENBQWU7UUFDN0Isb0JBQWUsR0FBZixlQUFlLENBQTRCO1FBQzNDLGNBQVMsR0FBVCxTQUFTLENBQWlCO1FBQzFCLFdBQU0sR0FBTixNQUFNLENBQW1CO1FBQ3pCLFdBQU0sR0FBTixNQUFNLENBQTBCO1FBQ2QscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFrQjtJQUNuRSxDQUFDO0lBRUosS0FBSyxDQUFDLEtBQUs7UUFDVixNQUFNLFNBQVMsR0FBVSxFQUFFLENBQUE7UUFFM0IsS0FBSyxNQUFNLElBQUksSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDaEMsSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLHVCQUF1QixFQUFFLENBQUM7Z0JBQ3pDLE1BQUs7WUFDTixDQUFDO1lBRUQsTUFBTSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUE7WUFFakIsSUFBSSxDQUFDLGdCQUFnQixDQUFDLFdBQVcsQ0FDaEM7Z0JBQ0MsSUFBSSxzQ0FBOEI7Z0JBQ2xDLFFBQVEsRUFBRSxJQUFJLENBQUMsUUFBUTtnQkFDdkIsS0FBSyxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsS0FBSyxJQUFJLGFBQWE7Z0JBQzVDLElBQUksRUFBRSxPQUFPO2dCQUNiLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSTtnQkFDZixJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUk7YUFDZixFQUNELElBQUksQ0FBQyxjQUFjLEVBQ25CLElBQUksQ0FBQyxlQUFlLENBQ3BCLENBQUE7WUFFRCxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQTtZQUNoQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUM5QixDQUFDO1FBRUQsT0FBTyxTQUFTLENBQUE7SUFDakIsQ0FBQztDQUNELENBQUE7QUF2Q1ksV0FBVztJQU9yQixXQUFBLGdCQUFnQixDQUFBO0dBUE4sV0FBVyxDQXVDdkIifQ==