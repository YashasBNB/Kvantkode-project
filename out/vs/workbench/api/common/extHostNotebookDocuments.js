/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../base/common/event.js';
import { URI } from '../../../base/common/uri.js';
export class ExtHostNotebookDocuments {
    constructor(_notebooksAndEditors) {
        this._notebooksAndEditors = _notebooksAndEditors;
        this._onDidSaveNotebookDocument = new Emitter();
        this.onDidSaveNotebookDocument = this._onDidSaveNotebookDocument.event;
        this._onDidChangeNotebookDocument = new Emitter();
        this.onDidChangeNotebookDocument = this._onDidChangeNotebookDocument.event;
    }
    $acceptModelChanged(uri, event, isDirty, newMetadata) {
        const document = this._notebooksAndEditors.getNotebookDocument(URI.revive(uri));
        const e = document.acceptModelChanged(event.value, isDirty, newMetadata);
        this._onDidChangeNotebookDocument.fire(e);
    }
    $acceptDirtyStateChanged(uri, isDirty) {
        const document = this._notebooksAndEditors.getNotebookDocument(URI.revive(uri));
        document.acceptDirty(isDirty);
    }
    $acceptModelSaved(uri) {
        const document = this._notebooksAndEditors.getNotebookDocument(URI.revive(uri));
        this._onDidSaveNotebookDocument.fire(document.apiNotebook);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0SG9zdE5vdGVib29rRG9jdW1lbnRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS9jb21tb24vZXh0SG9zdE5vdGVib29rRG9jdW1lbnRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLDZCQUE2QixDQUFBO0FBT2hFLE1BQU0sT0FBTyx3QkFBd0I7SUFPcEMsWUFBNkIsb0JBQStDO1FBQS9DLHlCQUFvQixHQUFwQixvQkFBb0IsQ0FBMkI7UUFOM0QsK0JBQTBCLEdBQUcsSUFBSSxPQUFPLEVBQTJCLENBQUE7UUFDM0UsOEJBQXlCLEdBQUcsSUFBSSxDQUFDLDBCQUEwQixDQUFDLEtBQUssQ0FBQTtRQUV6RCxpQ0FBNEIsR0FBRyxJQUFJLE9BQU8sRUFBc0MsQ0FBQTtRQUN4RixnQ0FBMkIsR0FBRyxJQUFJLENBQUMsNEJBQTRCLENBQUMsS0FBSyxDQUFBO0lBRUMsQ0FBQztJQUVoRixtQkFBbUIsQ0FDbEIsR0FBa0IsRUFDbEIsS0FBa0YsRUFDbEYsT0FBZ0IsRUFDaEIsV0FBc0M7UUFFdEMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLG9CQUFvQixDQUFDLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUMvRSxNQUFNLENBQUMsR0FBRyxRQUFRLENBQUMsa0JBQWtCLENBQUMsS0FBSyxDQUFDLEtBQUssRUFBRSxPQUFPLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDeEUsSUFBSSxDQUFDLDRCQUE0QixDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUMxQyxDQUFDO0lBRUQsd0JBQXdCLENBQUMsR0FBa0IsRUFBRSxPQUFnQjtRQUM1RCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsb0JBQW9CLENBQUMsbUJBQW1CLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQy9FLFFBQVEsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDOUIsQ0FBQztJQUVELGlCQUFpQixDQUFDLEdBQWtCO1FBQ25DLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxtQkFBbUIsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7UUFDL0UsSUFBSSxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUE7SUFDM0QsQ0FBQztDQUNEIn0=