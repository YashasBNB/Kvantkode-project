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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE5vdGVib29rRG9jdW1lbnRTYXZlUGFydGljaXBhbnQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL2NvbW1vbi9leHRIb3N0Tm90ZWJvb2tEb2N1bWVudFNhdmVQYXJ0aWNpcGFudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsWUFBWSxFQUFTLE1BQU0sK0JBQStCLENBQUE7QUFDbkUsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSw2QkFBNkIsQ0FBQTtBQVNoRSxPQUFPLEVBQ04sc0JBQXNCLEVBQ3RCLGFBQWEsSUFBSSxzQkFBc0IsR0FDdkMsTUFBTSw0QkFBNEIsQ0FBQTtBQUNuQyxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sbUJBQW1CLENBQUE7QUFFakQsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0scURBQXFELENBQUE7QUFRbkcsTUFBTSxPQUFPLHNDQUFzQztJQU1sRCxZQUNrQixXQUF3QixFQUN4QixvQkFBK0MsRUFDL0Msb0JBQThDLEVBQzlDLGNBQW1EO1FBQ25FLE9BQU8sRUFBRSxJQUFJO1FBQ2IsTUFBTSxFQUFFLENBQUM7S0FDVDtRQU5nQixnQkFBVyxHQUFYLFdBQVcsQ0FBYTtRQUN4Qix5QkFBb0IsR0FBcEIsb0JBQW9CLENBQTJCO1FBQy9DLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBMEI7UUFDOUMsZ0JBQVcsR0FBWCxXQUFXLENBRzNCO1FBVmUscUNBQWdDLEdBQ2hELElBQUksWUFBWSxFQUFpQyxDQUFBO0lBVS9DLENBQUM7SUFFSixPQUFPLEtBQVUsQ0FBQztJQUVsQixrQ0FBa0MsQ0FDakMsU0FBZ0M7UUFFaEMsT0FBTyxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsV0FBVyxFQUFFLEVBQUU7WUFDekMsTUFBTSxlQUFlLEdBQXNELFNBQVMsT0FBTyxDQUMxRixDQUFDO2dCQUVELFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQzFCLENBQUMsQ0FBQTtZQUNELGVBQWUsQ0FBQyxTQUFTLEdBQUcsU0FBUyxDQUFBO1lBQ3JDLE9BQU8sSUFBSSxDQUFDLGdDQUFnQyxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQzVGLENBQUMsQ0FBQTtJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsa0JBQWtCLENBQ3ZCLFFBQXVCLEVBQ3ZCLE1BQWtCLEVBQ2xCLEtBQXdCO1FBRXhCLE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDdkMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLG1CQUFtQixDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBRTFFLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztZQUNmLE1BQU0sSUFBSSxLQUFLLENBQUMscUNBQXFDLENBQUMsQ0FBQTtRQUN2RCxDQUFDO1FBRUQsTUFBTSxLQUFLLEdBQW9CLEVBQUUsQ0FBQTtRQUVqQyxNQUFNLElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyxTQUFTLENBQ3BELEVBQUUsUUFBUSxFQUFFLFFBQVEsQ0FBQyxXQUFXLEVBQUUsTUFBTSxFQUFFLHNCQUFzQixDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUM3RSxLQUFLLEVBQ0wsS0FBSyxFQUFFLFFBQTBCLEVBQUUsUUFBUSxFQUFFLEVBQUU7WUFDOUMsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFBO1lBQ3RCLE1BQU0sSUFBSSxHQUFHLE1BQU0sTUFBTSxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1lBQ2xELElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNqRCxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FDcEIsb0RBQW9ELEVBQ0EsUUFBUyxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQ2xGLENBQUE7WUFDRixDQUFDO1lBRUQsSUFBSSxLQUFLLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztnQkFDbkMsT0FBTTtZQUNQLENBQUM7WUFFRCxJQUFJLElBQUksRUFBRSxDQUFDO2dCQUNWLElBQUksSUFBSSxZQUFZLGFBQWEsRUFBRSxDQUFDO29CQUNuQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO2dCQUNqQixDQUFDO3FCQUFNLENBQUM7b0JBQ1Asc0JBQXNCO29CQUN0QixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FDcEIsb0RBQW9ELEVBQ0EsUUFBUyxDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQ2xGLDZCQUE2QixDQUM3QixDQUFBO2dCQUNGLENBQUM7WUFDRixDQUFDO1lBRUQsT0FBTTtRQUNQLENBQUMsQ0FDRCxDQUFBO1FBRUQsSUFBSSxLQUFLLENBQUMsdUJBQXVCLEVBQUUsQ0FBQztZQUNuQyxPQUFPLEtBQUssQ0FBQTtRQUNiLENBQUM7UUFFRCxJQUFJLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDeEIsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDO1FBRUQsTUFBTSxHQUFHLEdBQXNCLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxDQUFBO1FBQzVDLEtBQUssTUFBTSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7WUFDMUIsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLHNCQUFzQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUNuRCxHQUFHLENBQUMsS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ3BDLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxzQkFBc0IsQ0FBQyxJQUFJLDZCQUE2QixDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDaEcsQ0FBQztDQUNEIn0=