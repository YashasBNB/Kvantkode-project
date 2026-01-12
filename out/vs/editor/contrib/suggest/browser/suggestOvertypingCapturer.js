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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3VnZ2VzdE92ZXJ0eXBpbmdDYXB0dXJlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL2NvbnRyaWIvc3VnZ2VzdC9icm93c2VyL3N1Z2dlc3RPdmVydHlwaW5nQ2FwdHVyZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBZSxNQUFNLHNDQUFzQyxDQUFBO0FBSW5GLE1BQU0sT0FBTyxrQkFBa0I7YUFDTix3QkFBbUIsR0FBRyxLQUFLLEFBQVIsQ0FBUTtJQU1uRCxZQUFZLE1BQW1CLEVBQUUsWUFBMEI7UUFMMUMsaUJBQVksR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBRTdDLG1CQUFjLEdBQTRDLEVBQUUsQ0FBQTtRQUM1RCxZQUFPLEdBQVksS0FBSyxDQUFBO1FBRy9CLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUNwQixNQUFNLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRTtZQUN0QixJQUFJLElBQUksQ0FBQyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQztnQkFDeEMsT0FBTTtZQUNQLENBQUM7WUFFRCxNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsYUFBYSxFQUFFLENBQUE7WUFDekMsTUFBTSxnQkFBZ0IsR0FBRyxVQUFVLENBQUMsTUFBTSxDQUFBO1lBRTFDLDJDQUEyQztZQUMzQyxJQUFJLFlBQVksR0FBRyxLQUFLLENBQUE7WUFDeEIsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLGdCQUFnQixFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQzNDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQztvQkFDOUIsWUFBWSxHQUFHLElBQUksQ0FBQTtvQkFDbkIsTUFBSztnQkFDTixDQUFDO1lBQ0YsQ0FBQztZQUNELElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztnQkFDbkIsSUFBSSxJQUFJLENBQUMsY0FBYyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztvQkFDdEMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO2dCQUMvQixDQUFDO2dCQUNELE9BQU07WUFDUCxDQUFDO1lBRUQsSUFBSSxDQUFDLGNBQWMsR0FBRyxFQUFFLENBQUE7WUFDeEIsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFDLFFBQVEsRUFBRSxDQUFBO1lBQy9CLEtBQUssSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxnQkFBZ0IsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUMzQyxNQUFNLFNBQVMsR0FBRyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUE7Z0JBQy9CLDZDQUE2QztnQkFDN0MsSUFBSSxLQUFLLENBQUMscUJBQXFCLENBQUMsU0FBUyxDQUFDLEdBQUcsa0JBQWtCLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztvQkFDckYsT0FBTTtnQkFDUCxDQUFDO2dCQUNELElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEdBQUc7b0JBQ3hCLEtBQUssRUFBRSxLQUFLLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQztvQkFDdkMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxlQUFlLEtBQUssU0FBUyxDQUFDLGFBQWE7aUJBQ2hFLENBQUE7WUFDRixDQUFDO1FBQ0YsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUNwQixZQUFZLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDL0IsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUE7UUFDcEIsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUVELElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUNwQixZQUFZLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7WUFDOUIsSUFBSSxDQUFDLE9BQU8sR0FBRyxLQUFLLENBQUE7UUFDckIsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFRCxvQkFBb0IsQ0FBQyxHQUFXO1FBQy9CLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUcsSUFBSSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNsRCxPQUFPLElBQUksQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUE7UUFDaEMsQ0FBQztRQUNELE9BQU8sU0FBUyxDQUFBO0lBQ2pCLENBQUM7SUFFRCxPQUFPO1FBQ04sSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUM1QixDQUFDIn0=