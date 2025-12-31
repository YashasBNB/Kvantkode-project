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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmxpY3RzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvYnVsa0VkaXQvYnJvd3Nlci9jb25mbGljdHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBRXpFLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDNUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUVqRSxPQUFPLEVBRU4sZ0JBQWdCLEVBQ2hCLGdCQUFnQixHQUNoQixNQUFNLHdEQUF3RCxDQUFBO0FBQy9ELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUU3RCxJQUFNLGdCQUFnQixHQUF0QixNQUFNLGdCQUFnQjtJQU81QixZQUNDLEtBQXFCLEVBQ1AsV0FBeUIsRUFDeEIsWUFBMkIsRUFDN0IsVUFBdUI7UUFWcEIsZUFBVSxHQUFHLElBQUksV0FBVyxFQUFXLENBQUE7UUFDdkMsaUJBQVksR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBRXBDLG1CQUFjLEdBQUcsSUFBSSxPQUFPLEVBQVEsQ0FBQTtRQUM1QyxrQkFBYSxHQUFnQixJQUFJLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQTtRQVE5RCxNQUFNLHVCQUF1QixHQUFHLElBQUksV0FBVyxFQUFXLENBQUE7UUFFMUQsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztZ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