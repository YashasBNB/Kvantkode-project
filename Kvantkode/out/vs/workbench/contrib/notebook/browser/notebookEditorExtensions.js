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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tFZGl0b3JFeHRlbnNpb25zLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL25vdGVib29rRWRpdG9yRXh0ZW5zaW9ucy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQVVoRyxNQUFNLDBCQUEwQjthQUNSLGFBQVEsR0FBRyxJQUFJLDBCQUEwQixFQUFFLENBQUE7SUFHbEU7UUFDQyxJQUFJLENBQUMsbUJBQW1CLEdBQUcsRUFBRSxDQUFBO0lBQzlCLENBQUM7SUFFTSwwQkFBMEIsQ0FDaEMsRUFBVSxFQUNWLElBQTJGO1FBRTNGLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLENBQUMsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLElBQXVDLEVBQUUsQ0FBQyxDQUFBO0lBQ3JGLENBQUM7SUFFTSxzQkFBc0I7UUFDNUIsT0FBTyxJQUFJLENBQUMsbUJBQW1CLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3pDLENBQUM7O0FBR0YsTUFBTSxVQUFVLDRCQUE0QixDQUMzQyxFQUFVLEVBQ1YsSUFBMkY7SUFFM0YsMEJBQTBCLENBQUMsUUFBUSxDQUFDLDBCQUEwQixDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtBQUN6RSxDQUFDO0FBRUQsTUFBTSxLQUFXLGdDQUFnQyxDQVloRDtBQVpELFdBQWlCLGdDQUFnQztJQUNoRCxTQUFnQixzQkFBc0I7UUFDckMsT0FBTywwQkFBMEIsQ0FBQyxRQUFRLENBQUMsc0JBQXNCLEVBQUUsQ0FBQTtJQUNwRSxDQUFDO0lBRmUsdURBQXNCLHlCQUVyQyxDQUFBO0lBRUQsU0FBZ0IsMEJBQTBCLENBQ3pDLEdBQWE7UUFFYixPQUFPLDBCQUEwQixDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxDQUFDLE1BQU0sQ0FDekUsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FDN0IsQ0FBQTtJQUNGLENBQUM7SUFOZSwyREFBMEIsNkJBTXpDLENBQUE7QUFDRixDQUFDLEVBWmdCLGdDQUFnQyxLQUFoQyxnQ0FBZ0MsUUFZaEQifQ==