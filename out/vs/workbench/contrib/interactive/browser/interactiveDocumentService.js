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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZXJhY3RpdmVEb2N1bWVudFNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2ludGVyYWN0aXZlL2Jyb3dzZXIvaW50ZXJhY3RpdmVEb2N1bWVudFNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLGtDQUFrQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVqRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFNUYsTUFBTSxDQUFDLE1BQU0sMkJBQTJCLEdBQUcsZUFBZSxDQUN6RCw2QkFBNkIsQ0FDN0IsQ0FBQTtBQVVELE1BQU0sT0FBTywwQkFBMkIsU0FBUSxVQUFVO0lBV3pEO1FBQ0MsS0FBSyxFQUFFLENBQUE7UUFWUyxrQ0FBNkIsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUM5RCxJQUFJLE9BQU8sRUFBMkQsQ0FDdEUsQ0FBQTtRQUNELGlDQUE0QixHQUFHLElBQUksQ0FBQyw2QkFBNkIsQ0FBQyxLQUFLLENBQUE7UUFDdEQscUNBQWdDLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FDakUsSUFBSSxPQUFPLEVBQXVDLENBQ2xELENBQUE7UUFDRCxvQ0FBK0IsR0FBRyxJQUFJLENBQUMsZ0NBQWdDLENBQUMsS0FBSyxDQUFBO0lBSTdFLENBQUM7SUFFRCw2QkFBNkIsQ0FBQyxXQUFnQixFQUFFLFFBQWEsRUFBRSxVQUFrQjtRQUNoRixJQUFJLENBQUMsNkJBQTZCLENBQUMsSUFBSSxDQUFDO1lBQ3ZDLFdBQVc7WUFDWCxRQUFRO1lBQ1IsVUFBVTtTQUNWLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCw2QkFBNkIsQ0FBQyxXQUFnQixFQUFFLFFBQWE7UUFDNUQsSUFBSSxDQUFDLGdDQUFnQyxDQUFDLElBQUksQ0FBQztZQUMxQyxXQUFXO1lBQ1gsUUFBUTtTQUNSLENBQUMsQ0FBQTtJQUNILENBQUM7Q0FDRCJ9