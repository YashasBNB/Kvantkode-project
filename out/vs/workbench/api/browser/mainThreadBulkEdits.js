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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZEJ1bGtFZGl0cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvYnJvd3Nlci9tYWluVGhyZWFkQnVsa0VkaXRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBWSxZQUFZLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDNUQsT0FBTyxFQUNOLGdCQUFnQixFQUNoQixnQkFBZ0IsRUFDaEIsZ0JBQWdCLEdBQ2hCLE1BQU0scURBQXFELENBQUE7QUFFNUQsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3pGLE9BQU8sRUFJTixXQUFXLEdBRVgsTUFBTSwrQkFBK0IsQ0FBQTtBQUN0QyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQUUxRixPQUFPLEVBRU4sb0JBQW9CLEdBQ3BCLE1BQU0sc0RBQXNELENBQUE7QUFJdEQsSUFBTSxtQkFBbUIsR0FBekIsTUFBTSxtQkFBbUI7SUFDL0IsWUFDQyxlQUFnQyxFQUNHLGdCQUFrQyxFQUN2QyxXQUF3QixFQUNoQixnQkFBcUM7UUFGeEMscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFrQjtRQUN2QyxnQkFBVyxHQUFYLFdBQVcsQ0FBYTtRQUNoQixxQkFBZ0IsR0FBaEIsZ0JBQWdCLENBQXFCO0lBQ3pFLENBQUM7SUFFSixPQUFPLEtBQVUsQ0FBQztJQUVsQixzQkFBc0IsQ0FDckIsR0FBcUQsRUFDckQsZUFBd0IsRUFDeEIsYUFBdUI7UUFFdkIsTUFBTSxLQUFLLEdBQUcsc0JBQXNCLENBQUMsR0FBRyxDQUFDLEtB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