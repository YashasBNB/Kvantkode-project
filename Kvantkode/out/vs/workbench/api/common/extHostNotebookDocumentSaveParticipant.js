/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AsyncEmitter } from '../../../base/common/event.js';
import { URI } from '../../../base/common/uri.js';
import { TextDocumentSaveReason, WorkspaceEdit as WorksapceEditConverter, } from './extHostTypeConverters.js';
import { WorkspaceEdit } from './extHostTypes.js';
import { SerializableObjectWithBuffers } from '../../services/extensions/common/proxyIdentifier.js';
export class ExtHostNotebookDocumentSaveParticipant {
    constructor(_logService, _notebooksAndEditors, _mainThreadBulkEdits, _thresholds = {
        timeout: 1500,
        errors: 3,
    }) {
        this._logService = _logService;
        this._notebooksAndEditors = _notebooksAndEditors;
        this._mainThreadBulkEdits = _mainThreadBulkEdits;
        this._thresholds = _thresholds;
        this._onWillSaveNotebookDocumentEvent = new AsyncEmitter();
    }
    dispose() { }
    getOnWillSaveNotebookDocumentEvent(extension) {
        return (listener, thisArg, disposables) => {
            const wrappedListener = function wrapped(e) {
                listener.call(thisArg, e);
            };
            wrappedListener.extension = extension;
            return this._onWillSaveNotebookDocumentEvent.event(wrappedListener, undefined, disposables);
        };
    }
    async $participateInSave(resource, reason, token) {
        const revivedUri = URI.revive(resource);
        const document = this._notebooksAndEditors.getNotebookDocument(revivedUri);
        if (!document) {
            throw new Error('Unable to resolve notebook document');
        }
        const edits = [];
        await this._onWillSaveNotebookDocumentEvent.fireAsync({ notebook: document.apiNotebook, reason: TextDocumentSaveReason.to(reason) }, token, async (thenable, listener) => {
            const now = Date.now();
            const data = await await Promise.resolve(thenable);
            if (Date.now() - now > this._thresholds.timeout) {
                this._logService.warn('onWillSaveNotebookDocument-listener from extension', listener.extension.identifier);
            }
            if (token.isCancellationRequested) {
                return;
            }
            if (data) {
                if (data instanceof WorkspaceEdit) {
                    edits.push(data);
                }
                else {
                    // ignore invalid data
                    this._logService.warn('onWillSaveNotebookDocument-listener from extension', listener.extension.identifier, 'ignored due to invalid data');
                }
            }
            return;
        });
        if (token.isCancellationRequested) {
            return false;
        }
        if (edits.length === 0) {
            return true;
        }
        const dto = { edits: [] };
        for (const edit of edits) {
            const { edits } = WorksapceEditConverter.from(edit);
            dto.edits = dto.edits.concat(edits);
        }
        return this._mainThreadBulkEdits.$tryApplyWorkspaceEdit(new SerializableObjectWithBuffers(dto));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE5vdGVib29rRG9jdW1lbnRTYXZlUGFydGljaXBhbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvY29tbW9uL2V4dEhvc3ROb3RlYm9va0RvY3VtZW50U2F2ZVBhcnRpY2lwYW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxZQUFZLEVBQVMsTUFBTSwrQkFBK0IsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFBO0FBU2hFLE9BQU8sRUFDTixzQkFBc0IsRUFDdEIsYUFBYSxJQUFJLHNCQUFzQixHQUN2QyxNQUFNLDRCQUE0QixDQUFBO0FBQ25DLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxtQkFBbUIsQ0FBQTtBQUVqRCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQVFuRyxNQUFNLE9BQU8sc0NBQXNDO0lBTWxELFlBQ2tCLFdBQXdCLEVBQ3hCLG9CQUErQyxFQUMvQyxvQkFBOEMsRUFDOUMsY0FBbUQ7UUFDbkUsT0FBTyxFQUFFLElBQUk7UUFDYixNQUFNLEVBQUUsQ0FBQztLQUNUO1FBTmdCLGdCQUFXLEdBQVgsV0FBVyxDQUFhO1FBQ3hCLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBMkI7UUFDL0MseUJBQW9CLEdBQXBCLG9CQUFvQixDQUEwQjtRQUM5QyxnQkFBVyxHQUFYLFdBQVcsQ0FHM0I7UUFWZSxxQ0FBZ0MsR0FDaEQsSUFBSSxZQUFZLEVBQWlDLENBQUE7SUFVL0MsQ0FBQztJQUVKLE9BQU8sS0FBVSxDQUFDO0lBRWxCLGtDQUFrQyxDQUNqQyxTQUFnQztRQUVoQyxPQUFPLENBQUMsUUFBUSxFQUFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsRUFBRTtZ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