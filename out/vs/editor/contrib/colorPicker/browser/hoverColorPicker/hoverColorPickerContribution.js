/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Disposable } from '../../../../../base/common/lifecycle.js';
import { Range } from '../../../../common/core/range.js';
import { ContentHoverController } from '../../../hover/browser/contentHoverController.js';
import { isOnColorDecorator } from './hoverColorPicker.js';
export class HoverColorPickerContribution extends Disposable {
    static { this.ID = 'editor.contrib.colorContribution'; }
    static { this.RECOMPUTE_TIME = 1000; } // ms
    constructor(_editor) {
        super();
        this._editor = _editor;
        this._register(_editor.onMouseDown((e) => this.onMouseDown(e)));
    }
    dispose() {
        super.dispose();
    }
    onMouseDown(mouseEvent) {
        const colorDecoratorsActivatedOn = this._editor.getOption(154 /* EditorOption.colorDecoratorsActivatedOn */);
        if (colorDecoratorsActivatedOn !== 'click' && colorDecoratorsActivatedOn !== 'clickAndHover') {
            return;
        }
        if (!isOnColorDecorator(mouseEvent)) {
            return;
        }
        const hoverController = this._editor.getContribution(ContentHoverController.ID);
        if (!hoverController) {
            return;
        }
        if (hoverController.isColorPickerVisible) {
            return;
        }
        const targetRange = mouseEvent.target.range;
        if (!targetRange) {
            return;
        }
        const range = new Range(targetRange.startLineNumber, targetRange.startColumn + 1, targetRange.endLineNumber, targetRange.endColumn + 1);
        hoverController.showContentHover(range, 1 /* HoverStartMode.Immediate */, 1 /* HoverStartSource.Click */, false);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXJDb2xvclBpY2tlckNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2NvbG9yUGlja2VyL2Jyb3dzZXIvaG92ZXJDb2xvclBpY2tlci9ob3ZlckNvbG9yUGlja2VyQ29udHJpYnV0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUdwRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFeEQsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFekYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sdUJBQXVCLENBQUE7QUFFMUQsTUFBTSxPQUFPLDRCQUE2QixTQUFRLFVBQVU7YUFDcEMsT0FBRSxHQUFXLGtDQUFrQyxDQUFBO2FBRXRELG1CQUFjLEdBQUcsSUFBSSxDQUFBLEdBQUMsS0FBSztJQUUzQyxZQUE2QixPQUFvQjtRQUNoRCxLQUFLLEVBQUUsQ0FBQTtRQURxQixZQUFPLEdBQVAsT0FBTyxDQUFhO1FBRWhELElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDaEUsQ0FBQztJQUVRLE9BQU87UUFDZixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDaEIsQ0FBQztJQUVPLFdBQVcsQ0FBQyxVQUE2QjtRQUNoRCxNQUFNLDBCQUEwQixHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsU0FBUyxtREFFeEQsQ0FBQTtRQUNELElBQUksMEJBQTBCLEtBQUssT0FBTyxJQUFJLDBCQUEwQixLQUFLLGVBQWUsRUFBRSxDQUFDO1lBQzlGLE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUM7WUFDckMsT0FBTTtRQUNQLENBQUM7UUFDRCxNQUFNLGVBQWUsR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLGVBQWUsQ0FDbkQsc0JBQXNCLENBQUMsRUFBRSxDQUN6QixDQUFBO1FBQ0QsSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQ3RCLE9BQU07UUFDUCxDQUFDO1FBQ0QsSUFBSSxlQUFlLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztZQUMxQyxPQUFNO1FBQ1AsQ0FBQztRQUNELE1BQU0sV0FBVyxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFBO1FBQzNDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNsQixPQUFNO1FBQ1AsQ0FBQztRQUNELE1BQU0sS0FBSyxHQUFHLElBQUksS0FBSyxDQUN0QixXQUFXLENBQUMsZUFBZSxFQUMzQixXQUFXLENBQUMsV0FBVyxHQUFHLENBQUMsRUFDM0IsV0FBVyxDQUFDLGFBQWEsRUFDekIsV0FBVyxDQUFDLFNBQVMsR0FBRyxDQUFDLENBQ3pCLENBQUE7UUFDRCxlQUFlLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxvRUFBb0QsS0FBSyxDQUFDLENBQUE7SUFDakcsQ0FBQyJ9