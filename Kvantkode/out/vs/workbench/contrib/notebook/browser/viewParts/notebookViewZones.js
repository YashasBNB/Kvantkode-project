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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tWaWV3Wm9uZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlld1BhcnRzL25vdGVib29rVmlld1pvbmVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBZSxpQkFBaUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzNGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUVwRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDakQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBQzVGLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDNUYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDL0YsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3BGLE9BQU8sRUFDTiwrQkFBK0IsR0FJL0IsTUFBTSx1QkFBdUIsQ0FBQTtBQUs5QixNQUFNLFdBQVcsR0FBRyxHQUFHLEVBQUU7SUFDeEIsTUFBTSxJQUFJLEtBQUssQ0FBQyw0Q0FBNEMsQ0FBQyxDQUFBO0FBQzlELENBQUMsQ0FBQTtBQVNELE1BQU0sT0FBTyxpQkFBa0IsU0FBUSxVQUFVO0lBSWhELFlBQ2tCLFFBQTZDLEVBQzdDLFdBQWtDO1FBRW5ELEtBQUssRUFBRSxDQUFBO1FBSFUsYUFBUSxHQUFSLFFBQVEsQ0FBcUM7UUFDN0MsZ0JBQVcsR0FBWCxXQUFXLENBQXVCO1FBR25ELElBQUksQ0FBQyxPQUFPLEdBQUcsaUJBQWlCLENBQUMs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