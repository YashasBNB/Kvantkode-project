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
import { VSBuffer } from '../../../../../../base/common/buffer.js';
import { INotebookService } from '../../../../notebook/common/notebookService.js';
/**
 * When asking LLM to generate a new notebook, LLM might end up generating the notebook
 * using the raw file format.
 * E.g. assume we ask LLM to generate a new Github Issues notebook, LLM might end up
 * genrating the notebook using the JSON format of github issues file.
 * Such a format is not known to copilot extension and those are sent over as regular
 * text edits for the Notebook URI.
 *
 * In such cases we should accumulate all of the edits, generate the content and deserialize the content
 * into a notebook, then generate notebooke edits to insert these cells.
 */
let ChatEditingNewNotebookContentEdits = class ChatEditingNewNotebookContentEdits {
    constructor(notebook, _notebookService) {
        this.notebook = notebook;
        this._notebookService = _notebookService;
        this.textEdits = [];
    }
    acceptTextEdits(edits) {
        if (edits.length) {
            this.textEdits.push(...edits);
        }
    }
    async generateEdits() {
        if (this.notebook.cells.length) {
            console.error(`Notebook edits not generated as notebook already has cells`);
            return [];
        }
        const content = this.generateContent();
        if (!content) {
            return [];
        }
        const notebookEdits = [];
        try {
            const { serializer } = await this._notebookService.withNotebookDataProvider(this.notebook.viewType);
            const data = await serializer.dataToNotebook(VSBuffer.fromString(content));
            for (let i = 0; i < data.cells.length; i++) {
                notebookEdits.push({
                    editType: 1 /* CellEditType.Replace */,
                    index: i,
                    count: 0,
                    cells: [data.cells[i]],
                });
            }
        }
        catch (ex) {
            console.error(`Failed to generate notebook edits from text edits ${content}`, ex);
            return [];
        }
        return notebookEdits;
    }
    generateContent() {
        try {
            return applyTextEdits(this.textEdits);
        }
        catch (ex) {
            console.error('Failed to generate content from text edits', ex);
            return '';
        }
    }
};
ChatEditingNewNotebookContentEdits = __decorate([
    __param(1, INotebookService)
], ChatEditingNewNotebookContentEdits);
export { ChatEditingNewNotebookContentEdits };
function applyTextEdits(edits) {
    let output = '';
    for (const edit of edits) {
        output =
            output.slice(0, edit.range.startColumn) + edit.text + output.slice(edit.range.endColumn);
    }
    return output;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEVkaXRpbmdOZXdOb3RlYm9va0NvbnRlbnRFZGl0cy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0RWRpdGluZy9ub3RlYm9vay9jaGF0RWRpdGluZ05ld05vdGVib29rQ29udGVudEVkaXRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUlsRSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUVqRjs7Ozs7Ozs7OztHQVVHO0FBQ0ksSUFBTSxrQ0FBa0MsR0FBeEMsTUFBTSxrQ0FBa0M7SUFFOUMsWUFDa0IsUUFBMkIsRUFDMUIsZ0JBQW1EO1FBRHBELGFBQVEsR0FBUixRQUFRLENBQW1CO1FBQ1QscUJBQWdCLEdBQWhCLGdCQUFnQixDQUFrQjtRQUhyRCxjQUFTLEdBQWUsRUFBRSxDQUFBO0lBSXhDLENBQUM7SUFFSixlQUFlLENBQUMsS0FBaUI7UUFDaEMsSUFBSSxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbEIsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQTtRQUM5QixDQUFDO0lBQ0YsQ0FBQztJQUVELEtBQUssQ0FBQyxhQUFhO1FBQ2xCLElBQUksSUFBSSxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDaEMsT0FBTyxDQUFDLEtBQUssQ0FBQyw0REFBNEQsQ0FBQyxDQUFBO1lBQzNFLE9BQU8sRUFBRSxDQUFBO1FBQ1YsQ0FBQztRQUNELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQTtRQUN0QyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDZCxPQUFPLEVBQUUsQ0FBQTtRQUNWLENBQUM7UUFFRCxNQUFNLGFBQWEsR0FBeUIsRUFBRSxDQUFBO1FBQzlDLElBQUksQ0FBQztZQUNKLE1BQU0sRUFBRSxVQUFVLEVBQUUsR0FBRyxNQUFNLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyx3QkFBd0IsQ0FDMUUsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQ3RCLENBQUE7WUFDRCxNQUFNLElBQUksR0FBRyxNQUFNLFVBQVUsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO1lBQzFFLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUM1QyxhQUFhLENBQUMsSUFBSSxDQUFDO29CQUNsQixRQUFRLDhCQUFzQjtvQkFDOUIsS0FBSyxFQUFFLENBQUM7b0JBQ1IsS0FBSyxFQUFFLENBQUM7b0JBQ1IsS0FBSyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDdEIsQ0FBQyxDQUFBO1lBQ0gsQ0FBQztRQUNGLENBQUM7UUFBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO1lBQ2IsT0FBTyxDQUFDLEtBQUssQ0FBQyxxREFBcUQsT0FBTyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7WUFDakYsT0FBTyxFQUFFLENBQUE7UUFDVixDQUFDO1FBRUQsT0FBTyxhQUFhLENBQUE7SUFDckIsQ0FBQztJQUVPLGVBQWU7UUFDdEIsSUFBSSxDQUFDO1lBQ0osT0FBTyxjQUFjLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ3RDLENBQUM7UUFBQyxPQUFPLEVBQUUsRUFBRSxDQUFDO1lBQ2IsT0FBTyxDQUFDLEtBQUssQ0FBQyw0Q0FBNEMsRUFBRSxFQUFFLENBQUMsQ0FBQTtZQUMvRCxPQUFPLEVBQUUsQ0FBQTtRQUNWLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FBQTtBQXJEWSxrQ0FBa0M7SUFJNUMsV0FBQSxnQkFBZ0IsQ0FBQTtHQUpOLGtDQUFrQyxDQXFEOUM7O0FBRUQsU0FBUyxjQUFjLENBQUMsS0FBaUI7SUFDeEMsSUFBSSxNQUFNLEdBQUcsRUFBRSxDQUFBO0lBQ2YsS0FBSyxNQUFNLElBQUksSUFBSSxLQUFLLEVBQUUsQ0FBQztRQUMxQixNQUFNO1lBQ0wsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUMxRixDQUFDO0lBQ0QsT0FBTyxNQUFNLENBQUE7QUFDZCxDQUFDIn0=