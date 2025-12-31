/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createFastDomNode } from '../../../../../base/browser/fastDomNode.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { localize2 } from '../../../../../nls.js';
import { Categories } from '../../../../../platform/action/common/actionCommonCategories.js';
import { Action2, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { IsDevelopmentContext } from '../../../../../platform/contextkey/common/contextkeys.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { CellKind } from '../../common/notebookCommon.js';
import { getNotebookEditorFromEditorPane, } from '../notebookBrowser.js';
export class NotebookCellOverlays extends Disposable {
    constructor(listView) {
        super();
        this.listView = listView;
        this._lastOverlayId = 0;
        this._overlays = Object.create(null);
        this.domNode = createFastDomNode(document.createElement('div'));
        this.domNode.setClassName('cell-overlays');
        this.domNode.setPosition('absolute');
        this.domNode.setAttribute('role', 'presentation');
        this.domNode.setAttribute('aria-hidden', 'true');
        this.domNode.setWidth('100%');
        this.listView.containerDomNode.appendChild(this.domNode.domNode);
    }
    changeCellOverlays(callback) {
        let overlaysHaveChanged = false;
        const changeAccessor = {
            addOverlay: (overlay) => {
                overlaysHaveChanged = true;
                return this._addOverlay(overlay);
            },
            removeOverlay: (id) => {
                overlaysHaveChanged = true;
                this._removeOverlay(id);
            },
            layoutOverlay: (id) => {
                overlaysHaveChanged = true;
                this._layoutOverlay(id);
            },
        };
        callback(changeAccessor);
        return overlaysHaveChanged;
    }
    onCellsChanged(e) {
        this.layout();
    }
    onHiddenRangesChange() {
        this.layout();
    }
    layout() {
        for (const id in this._overlays) {
            this._layoutOverlay(id);
        }
    }
    _addOverlay(overlay) {
        const overlayId = `${++this._lastOverlayId}`;
        const overlayWidget = {
            overlayId,
            overlay,
            domNode: createFastDomNode(overlay.domNode),
        };
        this._overlays[overlayId] = overlayWidget;
        overlayWidget.domNode.setClassName('cell-overlay');
        overlayWidget.domNode.setPosition('absolute');
        this.domNode.appendChild(overlayWidget.domNode);
        return overlayId;
    }
    _removeOverlay(id) {
        const overlay = this._overlays[id];
        if (overlay) {
            // overlay.overlay.dispose();
            try {
                this.domNode.removeChild(overlay.domNode);
            }
            catch {
                // no op
            }
            delete this._overlays[id];
        }
    }
    _layoutOverlay(id) {
        const overlay = this._overlays[id];
        if (!overlay) {
            return;
        }
        const isInHiddenRanges = this._isInHiddenRanges(overlay);
        if (isInHiddenRanges) {
            overlay.domNode.setDisplay('none');
            return;
        }
        overlay.domNode.setDisplay('block');
        const index = this.listView.indexOf(overlay.overlay.cell);
        if (index === -1) {
            // should not happen
            return;
        }
        const top = this.listView.elementTop(index);
        overlay.domNode.setTop(top);
    }
    _isInHiddenRanges(zone) {
        const index = this.listView.indexOf(zone.overlay.cell);
        if (index === -1) {
            return true;
        }
        return false;
    }
}
class ToggleNotebookCellOverlaysDeveloperAction extends Action2 {
    static { this.cellOverlayIds = []; }
    constructor() {
        super({
            id: 'notebook.developer.addCellOverlays',
            title: localize2('workbench.notebook.developer.addCellOverlays', 'Toggle Notebook Cell Overlays'),
            category: Categories.Developer,
            precondition: IsDevelopmentContext,
            f1: true,
        });
    }
    async run(accessor) {
        const editorService = accessor.get(IEditorService);
        const editor = getNotebookEditorFromEditorPane(editorService.activeEditorPane);
        if (!editor) {
            return;
        }
        if (ToggleNotebookCellOverlaysDeveloperAction.cellOverlayIds.length > 0) {
            // remove all view zones
            editor.changeCellOverlays((accessor) => {
                ToggleNotebookCellOverlaysDeveloperAction.cellOverlayIds.forEach((id) => {
                    accessor.removeOverlay(id);
                });
                ToggleNotebookCellOverlaysDeveloperAction.cellOverlayIds = [];
            });
        }
        else {
            editor.changeCellOverlays((accessor) => {
                const cells = editor.getCellsInRange();
                if (cells.length === 0) {
                    return;
                }
                const cellOverlayIds = [];
                for (let i = 0; i < cells.length; i++) {
                    if (cells[i].cellKind !== CellKind.Markup) {
                        continue;
                    }
                    const domNode = document.createElement('div');
                    domNode.innerText = `Cell Overlay ${i}`;
                    domNode.style.top = '10px';
                    domNode.style.right = '10px';
                    domNode.style.backgroundColor = 'rgba(0, 255, 0, 0.5)';
                    const overlayId = accessor.addOverlay({
                        cell: cells[i],
                        domNode: domNode,
                    });
                    cellOverlayIds.push(overlayId);
                }
                ToggleNotebookCellOverlaysDeveloperAction.cellOverlayIds = cellOverlayIds;
            });
        }
    }
}
registerAction2(ToggleNotebookCellOverlaysDeveloperAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDZWxsT3ZlcmxheXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXdQYXJ0cy9ub3RlYm9va0NlbGxPdmVybGF5cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsaUJBQWlCLEVBQWUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUMzRixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDcEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2pELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUM1RixPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBRS9GLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNwRixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDekQsT0FBTyxFQUNOLCtCQUErQixHQUkvQixNQUFNLHVCQUF1QixDQUFBO0FBVTlCLE1BQU0sT0FBTyxvQkFBcUIsU0FBUSxVQUFVO0lBS25ELFlBQTZCLFFBQTZDO1FBQ3pFLEtBQUssRUFBRSxDQUFBO1FBRHFCLGFBQVEsR0FBUixRQUFRLENBQXFDO1FBSmxFLG1CQUFjLEdBQUcsQ0FBQyxDQUFBO1FBRWxCLGNBQVMsR0FBa0QsTUFBTSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUlyRixJQUFJLENBQUMsT0FBTyxHQUFHLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQTtRQUMvRCxJQUFJ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