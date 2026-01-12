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
import { decodeBase64 } from '../../../base/common/buffer.js';
import { revive } from '../../../base/common/marshalling.js';
import { IBulkEditService, ResourceFileEdit, ResourceTextEdit, } from '../../../editor/browser/services/bulkEditService.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { IUriIdentityService } from '../../../platform/uriIdentity/common/uriIdentity.js';
import { MainContext, } from '../common/extHost.protocol.js';
import { ResourceNotebookCellEdit } from '../../contrib/bulkEdit/browser/bulkCellEdits.js';
import { extHostNamedCustomer, } from '../../services/extensions/common/extHostCustomers.js';
let MainThreadBulkEdits = class MainThreadBulkEdits {
    constructor(_extHostContext, _bulkEditService, _logService, _uriIdentService) {
        this._bulkEditService = _bulkEditService;
        this._logService = _logService;
        this._uriIdentService = _uriIdentService;
    }
    dispose() { }
    $tryApplyWorkspaceEdit(dto, undoRedoGroupId, isRefactoring) {
        const edits = reviveWorkspaceEditDto(dto.value, this._uriIdentService);
        return this._bulkEditService
            .apply(edits, { undoRedoGroupId, respectAutoSaveConfig: isRefactoring })
            .then((res) => res.isApplied, (err) => {
            this._logService.warn(`IGNORING workspace edit: ${err}`);
            return false;
        });
    }
};
MainThreadBulkEdits = __decorate([
    extHostNamedCustomer(MainContext.MainThreadBulkEdits),
    __param(1, IBulkEditService),
    __param(2, ILogService),
    __param(3, IUriIdentityService)
], MainThreadBulkEdits);
export { MainThreadBulkEdits };
export function reviveWorkspaceEditDto(data, uriIdentityService, resolveDataTransferFile) {
    if (!data || !data.edits) {
        return data;
    }
    const result = revive(data);
    for (const edit of result.edits) {
        if (ResourceTextEdit.is(edit)) {
            edit.resource = uriIdentityService.asCanonicalUri(edit.resource);
        }
        if (ResourceFileEdit.is(edit)) {
            if (edit.options) {
                const inContents = edit.options?.contents;
                if (inContents) {
                    if (inContents.type === 'base64') {
                        edit.options.contents = Promise.resolve(decodeBase64(inContents.value));
                    }
                    else {
                        if (resolveDataTransferFile) {
                            edit.options.contents = resolveDataTransferFile(inContents.id);
                        }
                        else {
                            throw new Error('Could not revive data transfer file');
                        }
                    }
                }
            }
            edit.newResource = edit.newResource && uriIdentityService.asCanonicalUri(edit.newResource);
            edit.oldResource = edit.oldResource && uriIdentityService.asCanonicalUri(edit.oldResource);
        }
        if (ResourceNotebookCellEdit.is(edit)) {
            edit.resource = uriIdentityService.asCanonicalUri(edit.resource);
            const cellEdit = edit.cellEdit;
            if (cellEdit.editType === 1 /* CellEditType.Replace */) {
                edit.cellEdit = {
                    ...cellEdit,
                    cells: cellEdit.cells.map((cell) => ({
                        ...cell,
                        outputs: cell.outputs.map((output) => ({
                            ...output,
                            outputs: output.items.map((item) => {
                                return {
                                    mime: item.mime,
                                    data: item.valueBytes,
                                };
                            }),
                        })),
                    })),
                };
            }
        }
    }
    return data;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEJ1bGtFZGl0cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9icm93c2VyL21haW5UaHJlYWRCdWxrRWRpdHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFZLFlBQVksRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM1RCxPQUFPLEVBQ04sZ0JBQWdCLEVBQ2hCLGdCQUFnQixFQUNoQixnQkFBZ0IsR0FDaEIsTUFBTSxxREFBcUQsQ0FBQTtBQUU1RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDakUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDekYsT0FBTyxFQUlOLFdBQVcsR0FFWCxNQUFNLCtCQUErQixDQUFBO0FBQ3RDLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBRTFGLE9BQU8sRUFFTixvQkFBb0IsR0FDcEIsTUFBTSxzREFBc0QsQ0FBQTtBQUl0RCxJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFtQjtJQUMvQixZQUNDLGVBQWdDLEVBQ0csZ0JBQWtDLEVBQ3ZDLFdBQXdCLEVBQ2hCLGdCQUFxQztRQUZ4QyxxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQWtCO1FBQ3ZDLGdCQUFXLEdBQVgsV0FBVyxDQUFhO1FBQ2hCLHFCQUFnQixHQUFoQixnQkFBZ0IsQ0FBcUI7SUFDekUsQ0FBQztJQUVKLE9BQU8sS0FBVSxDQUFDO0lBRWxCLHNCQUFzQixDQUNyQixHQUFxRCxFQUNyRCxlQUF3QixFQUN4QixhQUF1QjtRQUV2QixNQUFNLEtBQUssR0FBRyxzQkFBc0IsQ0FBQyxHQUFHLENB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