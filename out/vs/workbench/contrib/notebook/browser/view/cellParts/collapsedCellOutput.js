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
import * as DOM from '../../../../../../base/browser/dom.js';
import { Codicon } from '../../../../../../base/common/codicons.js';
import { ThemeIcon } from '../../../../../../base/common/themables.js';
import { localize } from '../../../../../../nls.js';
import { IKeybindingService } from '../../../../../../platform/keybinding/common/keybinding.js';
import { EXPAND_CELL_OUTPUT_COMMAND_ID } from '../../notebookBrowser.js';
import { CellContentPart } from '../cellPart.js';
const $ = DOM.$;
let CollapsedCellOutput = class CollapsedCellOutput extends CellContentPart {
    constructor(notebookEditor, cellOutputCollapseContainer, keybindingService) {
        super();
        this.notebookEditor = notebookEditor;
        const placeholder = DOM.append(cellOutputCollapseContainer, $('span.expandOutputPlaceholder'));
        placeholder.textContent = localize('cellOutputsCollapsedMsg', 'Outputs are collapsed');
        const expandIcon = DOM.append(cellOutputCollapseContainer, $('span.expandOutputIcon'));
        expandIcon.classList.add(...ThemeIcon.asClassNameArray(Codicon.more));
        const keybinding = keybindingService.lookupKeybinding(EXPAND_CELL_OUTPUT_COMMAND_ID);
        if (keybinding) {
            placeholder.title = localize('cellExpandOutputButtonLabelWithDoubleClick', 'Double-click to expand cell output ({0})', keybinding.getLabel());
            cellOutputCollapseContainer.title = localize('cellExpandOutputButtonLabel', 'Expand Cell Output (${0})', keybinding.getLabel());
        }
        DOM.hide(cellOutputCollapseContainer);
        this._register(DOM.addDisposableListener(expandIcon, DOM.EventType.CLICK, () => this.expand()));
        this._register(DOM.addDisposableListener(cellOutputCollapseContainer, DOM.EventType.DBLCLICK, () => this.expand()));
    }
    expand() {
        if (!this.currentCell) {
            return;
        }
        if (!this.currentCell) {
            return;
        }
        const textModel = this.notebookEditor.textModel;
        const index = textModel.cells.indexOf(this.currentCell.model);
        if (index < 0) {
            return;
        }
        this.currentCell.isOutputCollapsed = !this.currentCell.isOutputCollapsed;
    }
};
CollapsedCellOutput = __decorate([
    __param(2, IKeybindingService)
], CollapsedCellOutput);
export { CollapsedCellOutput };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29sbGFwc2VkQ2VsbE91dHB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlldy9jZWxsUGFydHMvY29sbGFwc2VkQ2VsbE91dHB1dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEtBQUssR0FBRyxNQUFNLHVDQUF1QyxDQUFBO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNuRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDdEUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ25ELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQy9GLE9BQU8sRUFBRSw2QkFBNkIsRUFBbUIsTUFBTSwwQkFBMEIsQ0FBQTtBQUN6RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sZ0JBQWdCLENBQUE7QUFFaEQsTUFBTSxDQUFDLEdBQUcsR0FBRyxDQUFDLENBQUMsQ0FBQTtBQUVSLElBQU0sbUJBQW1CLEdBQXpCLE1BQU0sbUJBQW9CLFNBQVEsZUFBZTtJQUN2RCxZQUNrQixjQUErQixFQUNoRCwyQkFBd0MsRUFDcEIsaUJBQXFDO1FBRXpELEtBQUssRUFBRSxDQUFBO1FBSlUsbUJBQWMsR0FBZCxjQUFjLENBQWlCO1FBTWhELE1BQU0sV0FBVyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQzdCLDJCQUEyQixFQUMzQixDQUFDLENBQUMsOEJBQThCLENBQUMsQ0FDbEIsQ0FBQTtRQUNoQixXQUFXLENBQUMsV0FBVyxHQUFHLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSx1QkFBdUIsQ0FBQyxDQUFBO1FBQ3RGLE1BQU0sVUFBVSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsMkJBQTJCLEVBQUUsQ0FBQyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQTtRQUN0RixVQUFVLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUVyRSxNQUFNLFVBQVUsR0FBRyxpQkFBaUIsQ0FBQyxnQkFBZ0IsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFBO1FBQ3BGLElBQUksVUFBVSxFQUFFLENBQUM7WUFDaEIsV0FBVyxDQUFDLEtBQUssR0FBRyxRQUFRLENBQzNCLDRDQUE0QyxFQUM1QywwQ0FBMEMsRUFDMUMsVUFBVSxDQUFDLFFBQVEsRUFBRSxDQUNyQixDQUFBO1lBQ0QsMkJBQTJCLENBQUMsS0FBSyxHQUFHLFFBQVEsQ0FDM0MsNkJBQTZCLEVBQzdCLDJCQUEyQixFQUMzQixVQUFVLENBQUMsUUFBUSxFQUFFLENBQ3JCLENBQUE7UUFDRixDQUFDO1FBRUQsR0FBRyxDQUFDLElBQUksQ0FBQywyQkFBMkIsQ0FBQyxDQUFBO1FBRXJDLElBQUksQ0FBQyxTQUFTLENBQUMsR0FBRyxDQUFDLHFCQUFxQixDQUFDLFVBQVUsRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQy9GLElBQUksQ0FBQyxTQUFTLENBQ2IsR0FBRyxDQUFDLHFCQUFxQixDQUFDLDJCQUEyQixFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRSxDQUNuRixJQUFJLENBQUMsTUFBTSxFQUFFLENBQ2IsQ0FDRCxDQUFBO0lBQ0YsQ0FBQztJQUVPLE1BQU07UUFDYixJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3ZCLE9BQU07UUFDUCxDQUFDO1FBRUQsSUFBSSxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUN2QixPQUFNO1FBQ1AsQ0FBQztRQUVELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsU0FBVSxDQUFBO1FBQ2hELE1BQU0sS0FBSyxHQUFHLFNBQVMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUE7UUFFN0QsSUFBSSxLQUFLLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDZixPQUFNO1FBQ1AsQ0FBQztRQUVELElBQUksQ0FBQyxXQUFXLENBQUMsaUJBQWlCLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFBO0lBQ3pFLENBQUM7Q0FDRCxDQUFBO0FBMURZLG1CQUFtQjtJQUk3QixXQUFBLGtCQUFrQixDQUFBO0dBSlIsbUJBQW1CLENBMEQvQiJ9