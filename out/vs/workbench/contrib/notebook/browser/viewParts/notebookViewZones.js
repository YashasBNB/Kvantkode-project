/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createFastDomNode } from '../../../../../base/browser/fastDomNode.js';
import { onUnexpectedError } from '../../../../../base/common/errors.js';
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { localize2 } from '../../../../../nls.js';
import { Categories } from '../../../../../platform/action/common/actionCommonCategories.js';
import { Action2, registerAction2 } from '../../../../../platform/actions/common/actions.js';
import { IsDevelopmentContext } from '../../../../../platform/contextkey/common/contextkeys.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { getNotebookEditorFromEditorPane, } from '../notebookBrowser.js';
const invalidFunc = () => {
    throw new Error(`Invalid notebook view zone change accessor`);
};
export class NotebookViewZones extends Disposable {
    constructor(listView, coordinator) {
        super();
        this.listView = listView;
        this.coordinator = coordinator;
        this.domNode = createFastDomNode(document.createElement('div'));
        this.domNode.setClassName('view-zones');
        this.domNode.setPosition('absolute');
        this.domNode.setAttribute('role', 'presentation');
        this.domNode.setAttribute('aria-hidden', 'true');
        this.domNode.setWidth('100%');
        this._zones = {};
        this.listView.containerDomNode.appendChild(this.domNode.domNode);
    }
    changeViewZones(callback) {
        let zonesHaveChanged = false;
        const changeAccessor = {
            addZone: (zone) => {
                zonesHaveChanged = true;
                return this._addZone(zone);
            },
            removeZone: (id) => {
                zonesHaveChanged = true;
                // TODO: validate if zones have changed layout
                this._removeZone(id);
            },
            layoutZone: (id) => {
                zonesHaveChanged = true;
                // TODO: validate if zones have changed layout
                this._layoutZone(id);
            },
        };
        safeInvoke1Arg(callback, changeAccessor);
        // Invalidate changeAccessor
        changeAccessor.addZone = invalidFunc;
        changeAccessor.removeZone = invalidFunc;
        changeAccessor.layoutZone = invalidFunc;
        return zonesHaveChanged;
    }
    getViewZoneLayoutInfo(viewZoneId) {
        const zoneWidget = this._zones[viewZoneId];
        if (!zoneWidget) {
            return null;
        }
        const top = this.listView.getWhitespacePosition(zoneWidget.whitespaceId);
        const height = zoneWidget.zone.heightInPx;
        return { height: height, top: top };
    }
    onCellsChanged(e) {
        const splices = e.splices.slice().reverse();
        splices.forEach((splice) => {
            const [start, deleted, newCells] = splice;
            const fromIndex = start;
            const toIndex = start + deleted;
            // 1, 2, 0
            // delete cell index 1 and 2
            // from index 1, to index 3 (exclusive): [1, 3)
            // if we have whitespace afterModelPosition 3, which is after cell index 2
            for (const id in this._zones) {
                const zone = this._zones[id].zone;
                const cellBeforeWhitespaceIndex = zone.afterModelPosition - 1;
                if (cellBeforeWhitespaceIndex >= fromIndex && cellBeforeWhitespaceIndex < toIndex) {
                    // The cell this whitespace was after has been deleted
                    //  => move whitespace to before first deleted cell
                    zone.afterModelPosition = fromIndex;
                    this._updateWhitespace(this._zones[id]);
                }
                else if (cellBeforeWhitespaceIndex >= toIndex) {
                    // adjust afterModelPosition for all other cells
                    const insertLength = newCells.length;
                    const offset = insertLength - deleted;
                    zone.afterModelPosition += offset;
                    this._updateWhitespace(this._zones[id]);
                }
            }
        });
    }
    onHiddenRangesChange() {
        for (const id in this._zones) {
            this._updateWhitespace(this._zones[id]);
        }
    }
    _updateWhitespace(zone) {
        const whitespaceId = zone.whitespaceId;
        const viewPosition = this.coordinator.convertModelIndexToViewIndex(zone.zone.afterModelPosition);
        const isInHiddenArea = this._isInHiddenRanges(zone.zone);
        zone.isInHiddenArea = isInHiddenArea;
        this.listView.changeOneWhitespace(whitespaceId, viewPosition, isInHiddenArea ? 0 : zone.zone.heightInPx);
    }
    layout() {
        for (const id in this._zones) {
            this._layoutZone(id);
        }
    }
    _addZone(zone) {
        const viewPosition = this.coordinator.convertModelIndexToViewIndex(zone.afterModelPosition);
        const whitespaceId = this.listView.insertWhitespace(viewPosition, zone.heightInPx);
        const isInHiddenArea = this._isInHiddenRanges(zone);
        const myZone = {
            whitespaceId: whitespaceId,
            zone: zone,
            domNode: createFastDomNode(zone.domNode),
            isInHiddenArea: isInHiddenArea,
        };
        this._zones[whitespaceId] = myZone;
        myZone.domNode.setPosition('absolute');
        myZone.domNode.domNode.style.width = '100%';
        myZone.domNode.setDisplay('none');
        myZone.domNode.setAttribute('notebook-view-zone', whitespaceId);
        this.domNode.appendChild(myZone.domNode);
        return whitespaceId;
    }
    _removeZone(id) {
        this.listView.removeWhitespace(id);
        const zoneWidget = this._zones[id];
        if (zoneWidget) {
            // safely remove the dom node from its parent
            try {
                this.domNode.removeChild(zoneWidget.domNode);
            }
            catch {
                // ignore the error
            }
        }
        delete this._zones[id];
    }
    _layoutZone(id) {
        const zoneWidget = this._zones[id];
        if (!zoneWidget) {
            return;
        }
        this._updateWhitespace(this._zones[id]);
        const isInHiddenArea = this._isInHiddenRanges(zoneWidget.zone);
        if (isInHiddenArea) {
            zoneWidget.domNode.setDisplay('none');
        }
        else {
            const top = this.listView.getWhitespacePosition(zoneWidget.whitespaceId);
            zoneWidget.domNode.setTop(top);
            zoneWidget.domNode.setDisplay('block');
            zoneWidget.domNode.setHeight(zoneWidget.zone.heightInPx);
        }
    }
    _isInHiddenRanges(zone) {
        // The view zone is between two cells (zone.afterModelPosition - 1, zone.afterModelPosition)
        const afterIndex = zone.afterModelPosition;
        // In notebook, the first cell (markdown cell) in a folding range is always visible, so we need to check the cell after the notebook view zone
        return !this.coordinator.modelIndexIsVisible(afterIndex);
    }
    dispose() {
        super.dispose();
        this._zones = {};
    }
}
function safeInvoke1Arg(func, arg1) {
    try {
        func(arg1);
    }
    catch (e) {
        onUnexpectedError(e);
    }
}
class ToggleNotebookViewZoneDeveloperAction extends Action2 {
    static { this.viewZoneIds = []; }
    constructor() {
        super({
            id: 'notebook.developer.addViewZones',
            title: localize2('workbench.notebook.developer.addViewZones', 'Toggle Notebook View Zones'),
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
        if (ToggleNotebookViewZoneDeveloperAction.viewZoneIds.length > 0) {
            // remove all view zones
            editor.changeViewZones((accessor) => {
                // remove all view zones in reverse order, to follow how we handle this in the prod code
                ToggleNotebookViewZoneDeveloperAction.viewZoneIds.reverse().forEach((id) => {
                    accessor.removeZone(id);
                });
                ToggleNotebookViewZoneDeveloperAction.viewZoneIds = [];
            });
        }
        else {
            editor.changeViewZones((accessor) => {
                const cells = editor.getCellsInRange();
                if (cells.length === 0) {
                    return;
                }
                const viewZoneIds = [];
                for (let i = 0; i < cells.length; i++) {
                    const domNode = document.createElement('div');
                    domNode.innerText = `View Zone ${i}`;
                    domNode.style.backgroundColor = 'rgba(0, 255, 0, 0.5)';
                    const viewZoneId = accessor.addZone({
                        afterModelPosition: i,
                        heightInPx: 200,
                        domNode: domNode,
                    });
                    viewZoneIds.push(viewZoneId);
                }
                ToggleNotebookViewZoneDeveloperAction.viewZoneIds = viewZoneIds;
            });
        }
    }
}
registerAction2(ToggleNotebookViewZoneDeveloperAction);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tWaWV3Wm9uZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL3ZpZXdQYXJ0cy9ub3RlYm9va1ZpZXdab25lcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQWUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUMzRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFFcEUsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBQ2pELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUM1RixPQUFPLEVBQUUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNwRixPQUFPLEVBQ04sK0JBQStCLEdBSS9CLE1BQU0sdUJBQXVCLENBQUE7QUFLOUIsTUFBTSxXQUFXLEdBQUcsR0FBRyxFQUFFO0lBQ3hCLE1BQU0sSUFBSSxLQUFLLENBQUMsNENBQTRDLENBQUMsQ0FBQTtBQUM5RCxDQUFDLENBQUE7QUFTRCxNQUFNLE9BQU8saUJBQWtCLFNBQVEsVUFBVTtJQUloRCxZQUNrQixRQUE2QyxFQUM3QyxXQUFrQztRQUVuRCxLQUFLLEVBQUUsQ0FBQTtRQUhVLGFBQVEsR0FBUixRQUFRLENBQXFDO1FBQzdDLGdCQUFXLEdBQVgsV0FBVyxDQUF1QjtRQUduRCxJQUFJLENBQUMsT0FBTyxHQUFHLGlCQUFpQixDQUFDLFFBQVEs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