/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
class EditorContributionRegistry {
    static { this.INSTANCE = new EditorContributionRegistry(); }
    constructor() {
        this.editorContributions = [];
    }
    registerEditorContribution(id, ctor) {
        this.editorContributions.push({ id, ctor: ctor });
    }
    getEditorContributions() {
        return this.editorContributions.slice(0);
    }
}
export function registerNotebookContribution(id, ctor) {
    EditorContributionRegistry.INSTANCE.registerEditorContribution(id, ctor);
}
export var NotebookEditorExtensionsRegistry;
(function (NotebookEditorExtensionsRegistry) {
    function getEditorContributions() {
        return EditorContributionRegistry.INSTANCE.getEditorContributions();
    }
    NotebookEditorExtensionsRegistry.getEditorContributions = getEditorContributions;
    function getSomeEditorContributions(ids) {
        return EditorContributionRegistry.INSTANCE.getEditorContributions().filter((c) => ids.indexOf(c.id) >= 0);
    }
    NotebookEditorExtensionsRegistry.getSomeEditorContributions = getSomeEditorContributions;
})(NotebookEditorExtensionsRegistry || (NotebookEditorExtensionsRegistry = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFZGl0b3JFeHRlbnNpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9ub3RlYm9va0VkaXRvckV4dGVuc2lvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFVaEcsTUFBTSwwQkFBMEI7YUFDUixhQUFRLEdBQUcsSUFBSSwwQkFBMEIsRUFBRSxDQUFBO0lBR2xFO1FBQ0MsSUFBSSxDQUFDLG1CQUFtQixHQUFHLEVBQUUsQ0FBQTtJQUM5QixDQUFDO0lBRU0sMEJBQTBCLENBQ2hDLEVBQVUsRUFDVixJQUEyRjtRQUUzRixJQUFJLENBQUMsbUJBQW1CLENBQUMsSUFBSSxDQUFDLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxJQUF1QyxFQUFFLENBQUMsQ0FBQTtJQUNyRixDQUFDO0lBRU0sc0JBQXNCO1FBQzVCLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUN6QyxDQUFDOztBQUdGLE1BQU0sVUFBVSw0QkFBNEIsQ0FDM0MsRUFBVSxFQUNWLElBQTJGO0lBRTNGLDBCQUEwQixDQUFDLFFBQVEsQ0FBQywwQkFBMEIsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7QUFDekUsQ0FBQztBQUVELE1BQU0sS0FBVyxnQ0FBZ0MsQ0FZaEQ7QUFaRCxXQUFpQixnQ0FBZ0M7SUFDaEQsU0FBZ0Isc0JBQXNCO1FBQ3JDLE9BQU8sMEJBQTBCLENBQUMsUUFBUSxDQUFDLHNCQUFzQixFQUFFLENBQUE7SUFDcEUsQ0FBQztJQUZlLHVEQUFzQix5QkFFckMsQ0FBQTtJQUVELFNBQWdCLDBCQUEwQixDQUN6QyxHQUFhO1FBRWIsT0FBTywwQkFBMEIsQ0FBQyxRQUFRLENBQUMsc0JBQXNCLEVBQUUsQ0FBQyxNQUFNLENBQ3pFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQzdCLENBQUE7SUFDRixDQUFDO0lBTmUsMkRBQTBCLDZCQU16QyxDQUFBO0FBQ0YsQ0FBQyxFQVpnQixnQ0FBZ0MsS0FBaEMsZ0NBQWdDLFFBWWhEIn0=