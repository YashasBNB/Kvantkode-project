/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
export const IInteractiveDocumentService = createDecorator('IInteractiveDocumentService');
export class InteractiveDocumentService extends Disposable {
    constructor() {
        super();
        this._onWillAddInteractiveDocument = this._register(new Emitter());
        this.onWillAddInteractiveDocument = this._onWillAddInteractiveDocument.event;
        this._onWillRemoveInteractiveDocument = this._register(new Emitter());
        this.onWillRemoveInteractiveDocument = this._onWillRemoveInteractiveDocument.event;
    }
    willCreateInteractiveDocument(notebookUri, inputUri, languageId) {
        this._onWillAddInteractiveDocument.fire({
            notebookUri,
            inputUri,
            languageId,
        });
    }
    willRemoveInteractiveDocument(notebookUri, inputUri) {
        this._onWillRemoveInteractiveDocument.fire({
            notebookUri,
            inputUri,
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZXJhY3RpdmVEb2N1bWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9pbnRlcmFjdGl2ZS9icm93c2VyL2ludGVyYWN0aXZlRG9jdW1lbnRTZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFakUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBRTVGLE1BQU0sQ0FBQyxNQUFNLDJCQUEyQixHQUFHLGVBQWUsQ0FDekQsNkJBQTZCLENBQzdCLENBQUE7QUFVRCxNQUFNLE9BQU8sMEJBQTJCLFNBQVEsVUFBVTtJQVd6RDtRQUNDLEtBQUssRUFBRSxDQUFBO1FBVlMsa0NBQTZCLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDOUQsSUFBSSxPQUFPLEVBQTJELENBQ3RFLENBQUE7UUFDRCxpQ0FBNEIsR0FBRyxJQUFJLENBQUMsNkJBQTZCLENBQUMsS0FBSyxDQUFBO1FBQ3RELHFDQUFnQyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQ2pFLElBQUksT0FBTyxFQUF1QyxDQUNsRCxDQUFBO1FBQ0Qsb0NBQStCLEdBQUcsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLEtBQUssQ0FBQTtJQUk3RSxDQUFDO0lBRUQsNkJBQTZCLENBQUMsV0FBZ0IsRUFBRSxRQUFhLEVBQUUsVUFBa0I7UUFDaEYsSUFBSSxDQUFDLDZCQUE2QixDQUFDLElBQUksQ0FBQztZQUN2QyxXQUFXO1lBQ1gsUUFBUTtZQUNSLFVBQVU7U0FDVixDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsNkJBQTZCLENBQUMsV0FBZ0IsRUFBRSxRQUFhO1FBQzVELElBQUksQ0FBQyxnQ0FBZ0MsQ0FBQyxJQUFJLENBQUM7WUFDMUMsV0FBVztZQUNYLFFBQVE7U0FDUixDQUFDLENBQUE7SUFDSCxDQUFDO0NBQ0QifQ==