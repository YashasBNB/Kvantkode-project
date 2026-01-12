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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tDZWxsT3ZlcmxheXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvdmlld1BhcnRzL25vdGVib29rQ2VsbE92ZXJsYXlzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBZSxNQUFNLDRDQUE0QyxDQUFBO0FBQzNGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFDakQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBQzVGLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDNUYsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFFL0YsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN6RCxPQUFPLEVBQ04sK0JBQStCLEdBSS9CLE1BQU0sdUJBQXVCLENBQUE7QUFVOUIsTUFBTSxPQUFPLG9CQUFxQixTQUFRLFVBQVU7SUFLbkQsWUFBNkIsUUFBNkM7UUFDekUsS0FBSyxFQUFFLENBQUE7UUFEcUIsYUFBUSxHQUFSLFFBQVEsQ0FBcUM7UUFKbEUsbUJBQWMsR0FBRyxDQUFDLENBQUE7UUFFbEIsY0FBUyxHQUFrRCxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBSXJGLElBQUksQ0FBQyxPQUFPLEdBQUcsaUJBQWlCLENBQUMsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQy9E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