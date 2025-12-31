/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { combinedDisposable } from '../../../../../../base/common/lifecycle.js';
import { clamp } from '../../../../../../base/common/numbers.js';
export function registerCellToolbarStickyScroll(notebookEditor, cell, element, opts) {
    const extraOffset = opts?.extraOffset ?? 0;
    const min = opts?.min ?? 0;
    const updateForScroll = () => {
        if (cell.isInputCollapsed) {
            element.style.top = '';
        }
        else {
            const scrollTop = notebookEditor.scrollTop;
            const elementTop = notebookEditor.getAbsoluteTopOfElement(cell);
            const diff = scrollTop - elementTop + extraOffset;
            const maxTop = cell.layoutInfo.editorHeight + cell.layoutInfo.statusBarHeight - 45; // subtract roughly the height of the execution order label plus padding
            const top = maxTop > 20 // Don't move the run button if it can only move a very short distance
                ? clamp(min, diff, maxTop)
                : min;
            element.style.top = `${top}px`;
        }
    };
    updateForScroll();
    const disposables = [];
    disposables.push(notebookEditor.onDidScroll(() => updateForScroll()), notebookEditor.onDidChangeLayout(() => updateForScroll()));
    return combinedDisposable(...disposables);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2VsbFRvb2xiYXJTdGlja3lTY3JvbGwuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXcvY2VsbFBhcnRzL2NlbGxUb29sYmFyU3RpY2t5U2Nyb2xsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxrQkFBa0IsRUFBZSxNQUFNLDRDQUE0QyxDQUFBO0FBQzVGLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUdoRSxNQUFNLFVBQVUsK0JBQStCLENBQzlDLGNBQStCLEVBQy9CLElBQW9CLEVBQ3BCLE9BQW9CLEVBQ3BCLElBQTZDO0lBRTdDLE1BQU0sV0FBVyxHQUFHLElBQUksRUFBRSxXQUFXLElBQUksQ0FBQyxDQUFBO0lBQzFDLE1BQU0sR0FBRyxHQUFHLElBQUksRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFBO0lBRTFCLE1BQU0sZUFBZSxHQUFHLEdBQUcsRUFBRTtRQUM1QixJQUFJLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQzNCLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQTtRQUN2QixDQUFDO2FBQU0sQ0FBQztZQUNQLE1BQU0sU0FBUyxHQUFHLGNBQWMsQ0FBQyxTQUFTLENBQUE7WUFDMUMsTUFBTSxVQUFVLEdBQUcsY0FBYyxDQUFDLHVCQUF1QixDQUFDLElBQUksQ0FBQyxDQUFBO1lBQy9ELE1BQU0sSUFBSSxHQUFHLFNBQVMsR0FBRyxVQUFVLEdBQUcsV0FBVyxDQUFBO1lBQ2pELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQyxVQUFVLENBQUMsZUFBZSxHQUFHLEVBQUUsQ0FBQSxDQUFDLHdFQUF3RTtZQUMzSixNQUFNLEdBQUcsR0FDUixNQUFNLEdBQUcsRUFBRSxDQUFDLHNFQUFzRTtnQkFDakYsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQztnQkFDMUIsQ0FBQyxDQUFDLEdBQUcsQ0FBQTtZQUNQLE9BQU8sQ0FBQyxLQUFLLENBQUMsR0FBRyxHQUFHLEdBQUcsR0FBRyxJQUFJLENBQUE7UUFDL0IsQ0FBQztJQUNGLENBQUMsQ0FBQTtJQUVELGVBQWUsRUFBRSxDQUFBO0lBQ2pCLE1BQU0sV0FBVyxHQUFrQixFQUFFLENBQUE7SUFDckMsV0FBVyxDQUFDLElBQUksQ0FDZixjQUFjLENBQUMsV0FBVyxDQUFDLEdBQUcsRUFBRSxDQUFDLGVBQWUsRUFBRSxDQUFDLEVBQ25ELGNBQWMsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxlQUFlLEVBQUUsQ0FBQyxDQUN6RCxDQUFBO0lBRUQsT0FBTyxrQkFBa0IsQ0FBQyxHQUFHLFdBQVcsQ0FBQyxDQUFBO0FBQzFDLENBQUMifQ==