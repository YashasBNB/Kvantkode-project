/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { unthemedListStyles } from '../list/listWidget.js';
import { SelectBoxList } from './selectBoxCustom.js';
import { SelectBoxNative } from './selectBoxNative.js';
import { Widget } from '../widget.js';
import { isMacintosh } from '../../../common/platform.js';
import './selectBox.css';
export const unthemedSelectBoxStyles = {
    ...unthemedListStyles,
    selectBackground: '#3C3C3C',
    selectForeground: '#F0F0F0',
    selectBorder: '#3C3C3C',
    decoratorRightForeground: undefined,
    selectListBackground: undefined,
    selectListBorder: undefined,
    focusBorder: undefined,
};
export class SelectBox extends Widget {
    constructor(options, selected, contextViewProvider, styles, selectBoxOptions) {
        super();
        // Default to native SelectBox for OSX unless overridden
        if (isMacintosh && !selectBoxOptions?.useCustomDrawn) {
            this.selectBoxDelegate = new SelectBoxNative(options, selected, styles, selectBoxOptions);
        }
        else {
            this.selectBoxDelegate = new SelectBoxList(options, selected, contextViewProvider, styles, selectBoxOptions);
        }
        this._register(this.selectBoxDelegate);
    }
    // Public SelectBox Methods - routed through delegate interface
    get onDidSelect() {
        return this.selectBoxDelegate.onDidSelect;
    }
    setOptions(options, selected) {
        this.selectBoxDelegate.setOptions(options, selected);
    }
    select(index) {
        this.selectBoxDelegate.select(index);
    }
    setAriaLabel(label) {
        this.selectBoxDelegate.setAriaLabel(label);
    }
    focus() {
        this.selectBoxDelegate.focus();
    }
    blur() {
        this.selectBoxDelegate.blur();
    }
    setFocusable(focusable) {
        this.selectBoxDelegate.setFocusable(focusable);
    }
    setEnabled(enabled) {
        this.selectBoxDelegate.setEnabled(enabled);
    }
    render(container) {
        this.selectBoxDelegate.render(container);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VsZWN0Qm94LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2Jyb3dzZXIvdWkvc2VsZWN0Qm94L3NlbGVjdEJveC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQWUsa0JBQWtCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sc0JBQXNCLENBQUE7QUFDcEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNCQUFzQixDQUFBO0FBQ3RELE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxjQUFjLENBQUE7QUFHckMsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ3pELE9BQU8saUJBQWlCLENBQUE7QUFnRHhCLE1BQU0sQ0FBQyxNQUFNLHVCQUF1QixHQUFxQjtJQUN4RCxHQUFHLGtCQUFrQjtJQUNyQixnQkFBZ0IsRUFBRSxTQUFTO0lBQzNCLGdCQUFnQixFQUFFLFNBQVM7SUFDM0IsWUFBWSxFQUFFLFNBQVM7SUFDdkIsd0JBQXdCLEVBQUUsU0FBUztJQUNuQyxvQkFBb0IsRUFBRSxTQUFTO0lBQy9CLGdCQUFnQixFQUFFLFNBQVM7SUFDM0IsV0FBVyxFQUFFLFNBQVM7Q0FDdEIsQ0FBQTtBQU9ELE1BQU0sT0FBTyxTQUFVLFNBQVEsTUFBTTtJQUdwQyxZQUNDLE9BQTRCLEVBQzVCLFFBQWdCLEVBQ2hCLG1CQUF5QyxFQUN6QyxNQUF3QixFQUN4QixnQkFBb0M7UUFFcEMsS0FBSyxFQUFFLENBQUE7UUFFUCx3REFBd0Q7UUFDeEQsSUFBSSxXQUFXLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxjQUFjLEVBQUUsQ0FBQztZQUN0RCxJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxlQUFlLENBQUMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtRQUMxRixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxpQkFBaUIsR0FBRyxJQUFJLGFBQWEsQ0FDekMsT0FBTyxFQUNQLFFBQVEsRUFDUixtQkFBbUIsRUFDbkIsTUFBTSxFQUNOLGdCQUFnQixDQUNoQixDQUFBO1FBQ0YsQ0FBQztRQUVELElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUE7SUFDdkMsQ0FBQztJQUVELCtEQUErRDtJQUUvRCxJQUFJLFdBQVc7UUFDZCxPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxXQUFXLENBQUE7SUFDMUMsQ0FBQztJQUVELFVBQVUsQ0FBQyxPQUE0QixFQUFFLFFBQWlCO1FBQ3pELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQ3JELENBQUM7SUFFRCxNQUFNLENBQUMsS0FBYTtRQUNuQixJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQ3JDLENBQUM7SUFFRCxZQUFZLENBQUMsS0FBYTtRQUN6QixJQUFJLENBQUMsaUJBQWlCLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFRCxLQUFLO1FBQ0osSUFBSSxDQUFDLGlCQUFpQixDQUFDLEtBQUssRUFBRSxDQUFBO0lBQy9CLENBQUM7SUFFRCxJQUFJO1FBQ0gsSUFBSSxDQUFDLGlCQUFpQixDQUFDLElBQUksRUFBRSxDQUFBO0lBQzlCLENBQUM7SUFFRCxZQUFZLENBQUMsU0FBa0I7UUFDOUIsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsQ0FBQTtJQUMvQyxDQUFDO0lBRUQsVUFBVSxDQUFDLE9BQWdCO1FBQzFCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVELE1BQU0sQ0FBQyxTQUFzQjtRQUM1QixJQUFJLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQ3pDLENBQUM7Q0FDRCJ9