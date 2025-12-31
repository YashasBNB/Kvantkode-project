/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../base/common/lifecycle.js';
import { registerEditorContribution, } from '../../../../editor/browser/editorExtensions.js';
/**
 * Prevents the top-level menu from showing up when doing Alt + Click in the editor
 */
export class MenuPreventer extends Disposable {
    static { this.ID = 'editor.contrib.menuPreventer'; }
    constructor(editor) {
        super();
        this._editor = editor;
        this._altListeningMouse = false;
        this._altMouseTriggered = false;
        // A global crossover handler to prevent menu bar from showing up
        // When <alt> is hold, we will listen to mouse events and prevent
        // the release event up <alt> if the mouse is triggered.
        this._register(this._editor.onMouseDown((e) => {
            if (this._altListeningMouse) {
                this._altMouseTriggered = true;
            }
        }));
        this._register(this._editor.onKeyDown((e) => {
            if (e.equals(512 /* KeyMod.Alt */)) {
                if (!this._altListeningMouse) {
                    this._altMouseTriggered = false;
                }
                this._altListeningMouse = true;
            }
        }));
        this._register(this._editor.onKeyUp((e) => {
            if (e.equals(512 /* KeyMod.Alt */)) {
                if (this._altMouseTriggered) {
                    e.preventDefault();
                }
                this._altListeningMouse = false;
                this._altMouseTriggered = false;
            }
        }));
    }
}
registerEditorContribution(MenuPreventer.ID, MenuPreventer, 2 /* EditorContributionInstantiation.BeforeFirstInteraction */);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWVudVByZXZlbnRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NvZGVFZGl0b3IvYnJvd3Nlci9tZW51UHJldmVudGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUVqRSxPQUFPLEVBRU4sMEJBQTBCLEdBQzFCLE1BQU0sZ0RBQWdELENBQUE7QUFHdkQ7O0dBRUc7QUFDSCxNQUFNLE9BQU8sYUFBYyxTQUFRLFVBQVU7YUFDckIsT0FBRSxHQUFHLDhCQUE4QixDQUFBO0lBTTFELFlBQVksTUFBbUI7UUFDOUIsS0FBSyxFQUFFLENBQUE7UUFDUCxJQUFJLENBQUMsT0FBTyxHQUFHLE1BQU0sQ0FBQTtRQUNyQixJQUFJLENBQUMsa0JBQWtCLEdBQUcsS0FBSyxDQUFBO1FBQy9CLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxLQUFLLENBQUE7UUFFL0IsaUVBQWlFO1FBQ2pFLGlFQUFpRTtRQUNqRSx3REFBd0Q7UUFFeEQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQzlCLElBQUksSUFBSSxDQUFDLGtCQUFrQixFQUFFLENBQUM7Z0JBQzdCLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUE7WUFDL0IsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsU0FBUyxDQUNiLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDNUIsSUFBSSxDQUFDLENBQUMsTUFBTSxzQkFBWSxFQUFFLENBQUM7Z0JBQzFCLElBQUksQ0FBQyxJQUFJLENBQUMsa0JBQWtCLEVBQUUsQ0FBQztvQkFDOUIsSUFBSSxDQUFDLGtCQUFrQixHQUFHLEtBQUssQ0FBQTtnQkFDaEMsQ0FBQztnQkFDRCxJQUFJLENBQUMsa0JBQWtCLEdBQUcsSUFBSSxDQUFBO1lBQy9CLENBQUM7UUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO1FBRUQsSUFBSSxDQUFDLFNBQVMsQ0FDYixJQUFJLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQzFCLElBQUksQ0FBQyxDQUFDLE1BQU0sc0JBQVksRUFBRSxDQUFDO2dCQUMxQixJQUFJLElBQUksQ0FBQyxrQkFBa0IsRUFBRSxDQUFDO29CQUM3QixDQUFDLENBQUMsY0FBYyxFQUFFLENBQUE7Z0JBQ25CLENBQUM7Z0JBQ0QsSUFBSSxDQUFDLGtCQUFrQixHQUFHLEtBQUssQ0FBQTtnQkFDL0IsSUFBSSxDQUFDLGtCQUFrQixHQUFHLEtBQUssQ0FBQTtZQUNoQyxDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7O0FBR0YsMEJBQTBCLENBQ3pCLGFBQWEsQ0FBQyxFQUFFLEVBQ2hCLGFBQWEsaUVBRWIsQ0FBQSJ9