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
import { IFileService } from '../../../../platform/files/common/files.js';
import { IModelService } from '../../../../editor/common/services/model.js';
import { ResourceMap } from '../../../../base/common/map.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../base/common/event.js';
import { ResourceFileEdit, ResourceTextEdit, } from '../../../../editor/browser/services/bulkEditService.js';
import { ResourceNotebookCellEdit } from './bulkCellEdits.js';
import { ILogService } from '../../../../platform/log/common/log.js';
let ConflictDetector = class ConflictDetector {
    constructor(edits, fileService, modelService, logService) {
        this._conflicts = new ResourceMap();
        this._disposables = new DisposableStore();
        this._onDidConflict = new Emitter();
        this.onDidConflict = this._onDidConflict.event;
        const _workspaceEditResources = new ResourceMap();
        for (const edit of edits) {
            if (edit instanceof ResourceTextEdit) {
                _workspaceEditResources.set(edit.resource, true);
                if (typeof edit.versionId === 'number') {
                    const model = modelService.getModel(edit.resource);
                    if (model && model.getVersionId() !== edit.versionId) {
                        this._conflicts.set(edit.resource, true);
                        this._onDidConflict.fire(this);
                    }
                }
            }
            else if (edit instanceof ResourceFileEdit) {
                if (edit.newResource) {
                    _workspaceEditResources.set(edit.newResource, true);
                }
                else if (edit.oldResource) {
                    _workspaceEditResources.set(edit.oldResource, true);
                }
            }
            else if (edit instanceof ResourceNotebookCellEdit) {
                _workspaceEditResources.set(edit.resource, true);
            }
            else {
                logService.warn('UNKNOWN edit type', edit);
            }
        }
        // listen to file changes
        this._disposables.add(fileService.onDidFilesChange((e) => {
            for (const uri of _workspaceEditResources.keys()) {
                // conflict happens when a file that we are working
                // on changes on disk. ignore changes for which a model
                // exists because we have a better check for models
                if (!modelService.getModel(uri) && e.contains(uri)) {
                    this._conflicts.set(uri, true);
                    this._onDidConflict.fire(this);
                    break;
                }
            }
        }));
        // listen to model changes...?
        const onDidChangeModel = (model) => {
            // conflict
            if (_workspaceEditResources.has(model.uri)) {
                this._conflicts.set(model.uri, true);
                this._onDidConflict.fire(this);
            }
        };
        for (const model of modelService.getModels()) {
            this._disposables.add(model.onDidChangeContent(() => onDidChangeModel(model)));
        }
    }
    dispose() {
        this._disposables.dispose();
        this._onDidConflict.dispose();
    }
    list() {
        return [...this._conflicts.keys()];
    }
    hasConflicts() {
        return this._conflicts.size > 0;
    }
};
ConflictDetector = __decorate([
    __param(1, IFileService),
    __param(2, IModelService),
    __param(3, ILogService)
], ConflictDetector);
export { ConflictDetector };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmxpY3RzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9idWxrRWRpdC9icm93c2VyL2NvbmZsaWN0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFFekUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQzNFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDdEUsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBRWpFLE9BQU8sRUFFTixnQkFBZ0IsRUFDaEIsZ0JBQWdCLEdBQ2hCLE1BQU0sd0RBQXdELENBQUE7QUFDL0QsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0QsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRTdELElBQU0sZ0JBQWdCLEdBQXRCLE1BQU0sZ0JBQWdCO0lBTzVCLFlBQ0MsS0FBcUIsRUFDUCxXQUF5QixFQUN4QixZQUEyQixFQUM3QixVQUF1QjtRQVZwQixlQUFVLEdBQUcsSUFBSSxXQUFXLEVBQVcsQ0FBQTtRQUN2QyxpQkFBWSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFFcEMsbUJBQWMsR0FBRyxJQUFJLE9BQU8sRUFBUSxDQUFBO1FBQzVDLGtCQUFhLEdBQWdCLElBQUksQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFBO1FBUTlELE1BQU0sdUJBQXVCLEdBQUcsSUFBSSxXQUFXLEVBQVcsQ0FBQTtRQUUxRCxLQUFLLE1BQU0sSUFB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