/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { DisposableStore } from '../../../../base/common/lifecycle.js';
export class OvertypingCapturer {
    static { this._maxSelectionLength = 51200; }
    constructor(editor, suggestModel) {
        this._disposables = new DisposableStore();
        this._lastOvertyped = [];
        this._locked = false;
        this._disposables.add(editor.onWillType(() => {
            if (this._locked || !editor.hasModel()) {
                return;
            }
            const selections = editor.getSelections();
            const selectionsLength = selections.length;
            // Check if it will overtype any selections
            let willOvertype = false;
            for (let i = 0; i < selectionsLength; i++) {
                if (!selections[i].isEmpty()) {
                    willOvertype = true;
                    break;
                }
            }
            if (!willOvertype) {
                if (this._lastOvertyped.length !== 0) {
                    this._lastOvertyped.length = 0;
                }
                return;
            }
            this._lastOvertyped = [];
            const model = editor.getModel();
            for (let i = 0; i < selectionsLength; i++) {
                const selection = selections[i];
                // Check for overtyping capturer restrictions
                if (model.getValueLengthInRange(selection) > OvertypingCapturer._maxSelectionLength) {
                    return;
                }
                this._lastOvertyped[i] = {
                    value: model.getValueInRange(selection),
                    multiline: selection.startLineNumber !== selection.endLineNumber,
                };
            }
        }));
        this._disposables.add(suggestModel.onDidTrigger((e) => {
            this._locked = true;
        }));
        this._disposables.add(suggestModel.onDidCancel((e) => {
            this._locked = false;
        }));
    }
    getLastOvertypedInfo(idx) {
        if (idx >= 0 && idx < this._lastOvertyped.length) {
            return this._lastOvertyped[idx];
        }
        return undefined;
    }
    dispose() {
        this._disposables.dispose();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdE92ZXJ0eXBpbmdDYXB0dXJlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3N1Z2dlc3QvYnJvd3Nlci9zdWdnZXN0T3ZlcnR5cGluZ0NhcHR1cmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUluRixNQUFNLE9BQU8sa0JBQWtCO2FBQ04sd0JBQW1CLEdBQUcsS0FBSyxBQUFSLENBQVE7SUFNbkQsWUFBWSxNQUFtQixFQUFFLFlBQTBCO1FBTDFDLGlCQUFZLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUU3QyxtQkFBYyxHQUE0QyxFQUFFLENBQUE7UUFDNUQsWUFBTyxHQUFZLEtBQUssQ0FBQTtRQUcvQixJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FDcEIsTUFBTSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDdEIsSUFBSSxJQUFJLENBQUMsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUM7Z0JBQ3hDLE9BQU07WUFDUCxDQUFDO1lBRUQsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLGFBQWEsRUFBRSxDQUFBO1lBQ3pDLE1BQU0sZ0JBQWdCLEdBQUcsVUFBVSxDQUFDLE1BQU0sQ0FBQTtZQUUxQywyQ0FBMkM7WUFDM0MsSUFBSSxZQUFZLEdBQUcsS0FBSyxDQUFBO1lBQ3hCLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxnQkFBZ0IsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUMzQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUM7b0JBQzlCLFlBQVksR0FBRyxJQUFJLENBQUE7b0JBQ25CLE1BQUs7Z0JBQ04sQ0FBQztZQUNGLENBQUM7WUFDRCxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7Z0JBQ25CLElBQUksSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7b0JBQ3RDLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtnQkFDL0IsQ0FBQztnQkFDRCxPQUFNO1lBQ1AsQ0FBQztZQUVELElBQUksQ0FBQyxjQUFjLEdBQUcsRUFBRSxDQUFBO1lBQ3hCLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxRQUFRLEVBQUUsQ0FBQTtZQUMvQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsZ0JBQWdCLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDM0MsTUFBTSxTQUFTLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFBO2dCQUMvQiw2Q0FBNkM7Z0JBQzdDLElBQUksS0FBSyxDQUFDLHFCQUFxQixDQUFDLFNBQVMsQ0FBQyxHQUFHLGtCQUFrQixDQUFDLG1CQUFtQixFQUFFLENBQUM7b0JBQ3JGLE9BQU07Z0JBQ1AsQ0FBQztnQkFDRCxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxHQUFHO29CQUN4QixLQUFLLEVBQUUsS0FBSyxDQUFDLGVBQWUsQ0FBQyxTQUFTLENBQUM7b0JBQ3ZDLFNBQVMsRUFBRSxTQUFTLENBQUMsZUFBZSxLQUFLLFNBQVMsQ0FBQyxhQUFhO2lCQUNoRSxDQUFBO1lBQ0YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FDcEIsWUFBWSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQy9CLElBQUksQ0FBQyxPQUFPLEdBQUcsSUFBSSxDQUFBO1FBQ3BCLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FDcEIsWUFBWSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQzlCLElBQUksQ0FBQyxPQUFPLEdBQUcsS0FBSyxDQUFBO1FBQ3JCLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRUQsb0JBQW9CLENBQUMsR0FBVztRQUMvQixJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksR0FBRyxHQUFHLElBQUksQ0FBQyxjQUFjLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDbEQsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ2hDLENBQUM7UUFDRCxPQUFPLFNBQVMsQ0FBQTtJQUNqQixDQUFDO0lBRUQsT0FBTztRQUNOLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDNUIsQ0FBQyJ9