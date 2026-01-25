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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaG92ZXJDb2xvclBpY2tlckNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvY29sb3JQaWNrZXIvYnJvd3Nlci9ob3ZlckNvbG9yUGlja2VyL2hvdmVyQ29sb3JQaWNrZXJDb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBR3BFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUV4RCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUV6RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSx1QkFBdUIsQ0FBQTtBQUUxRCxNQUFNLE9BQU8sNEJBQTZCLFNBQVEsVUFBVTthQUNwQyxPQUFFLEdBQVcsa0NBQWtDLENBQUE7YUFFdEQsbUJBQWMsR0FBRyxJQUFJLENBQUEsR0FBQyxLQUFLO0lBRTNDLFlBQTZCLE9BQW9CO1FBQ2hELEtBQUssRUFBRSxDQUFBO1FBRHFCLFlBQU8sR0FBUCxPQUFPLENBQWE7UUFFaEQsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNoRSxDQUFDO0lBRVEsT0FBTztRQUNmLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNoQixDQUFDO0lBRU8sV0FBVyxDQUFDLFVBQTZCO1FBQ2hELE1BQU0sMEJBQTBCLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLG1EQUV4RCxDQUFBO1FBQ0QsSUFBSSwwQkFBMEIsS0FBSyxPQUFPLElBQUksMEJBQTBCLEtBQUssZUFBZSxFQUFFLENBQUM7WUFDOUYsT0FBTTtRQUNQLENBQUM7UUFDRCxJQUFJLENBQUMsa0JBQWtCLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUNyQyxPQUFNO1FBQ1AsQ0FBQztRQUNELE1BQU0sZUFBZSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsZUFBZSxDQUNuRCxzQkFBc0IsQ0FBQyxFQUFFLENBQ3pCLENBQUE7UUFDRCxJQUFJLENBQUMsZUFBZSxFQUFFLENBQUM7WUFDdEIsT0FBTTtRQUNQLENBQUM7UUFDRCxJQUFJLGVBQWUsQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1lBQzFDLE9BQU07UUFDUCxDQUFDO1FBQ0QsTUFBTSxXQUFXLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUE7UUFDM0MsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ2xCLE9BQU07UUFDUCxDQUFDO1FBQ0QsTUFBTSxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQ3RCLFdBQVcsQ0FBQyxlQUFlLEVBQzNCLFdBQVcsQ0FBQyxXQUFXLEdBQUcsQ0FBQyxFQUMzQixXQUFXLENBQUMsYUFBYSxFQUN6QixXQUFXLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FDekIsQ0FBQTtRQUNELGVBQWUsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLG9FQUFvRCxLQUFLLENBQUMsQ0FBQTtJQUNqRyxDQUFDIn0=