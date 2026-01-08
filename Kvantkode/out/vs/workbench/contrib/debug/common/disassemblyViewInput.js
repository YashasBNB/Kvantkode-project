/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { EditorInput } from '../../../common/editor/editorInput.js';
import { localize } from '../../../../nls.js';
import { Codicon } from '../../../../base/common/codicons.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
const DisassemblyEditorIcon = registerIcon('disassembly-editor-label-icon', Codicon.debug, localize('disassemblyEditorLabelIcon', 'Icon of the disassembly editor label.'));
export class DisassemblyViewInput extends EditorInput {
    constructor() {
        super(...arguments);
        this.resource = undefined;
    }
    static { this.ID = 'debug.disassemblyView.input'; }
    get typeId() {
        return DisassemblyViewInput.ID;
    }
    static get instance() {
        if (!DisassemblyViewInput._instance || DisassemblyViewInput._instance.isDisposed()) {
            DisassemblyViewInput._instance = new DisassemblyViewInput();
        }
        return DisassemblyViewInput._instance;
    }
    getName() {
        return localize('disassemblyInputName', 'Disassembly');
    }
    getIcon() {
        return DisassemblyEditorIcon;
    }
    matches(other) {
        return other instanceof DisassemblyViewInput;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlzYXNzZW1ibHlWaWV3SW5wdXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2NvbW1vbi9kaXNhc3NlbWJseVZpZXdJbnB1dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDbkUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRTdDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFFaEYsTUFBTSxxQkFBcUIsR0FBRyxZQUFZLENBQ3pDLCtCQUErQixFQUMvQixPQUFPLENBQUMsS0FBSyxFQUNiLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSx1Q0FBdUMsQ0FBQyxDQUMvRSxDQUFBO0FBRUQsTUFBTSxPQUFPLG9CQUFxQixTQUFRLFdBQVc7SUFBckQ7O1FBZ0JVLGFBQVEsR0FBRyxTQUFTLENBQUE7SUFhOUIsQ0FBQzthQTVCZ0IsT0FBRSxHQUFHLDZCQUE2QixBQUFoQyxDQUFnQztJQUVsRCxJQUFhLE1BQU07UUFDbEIsT0FBTyxvQkFBb0IsQ0FBQyxFQUFFLENBQUE7SUFDL0IsQ0FBQztJQUdELE1BQU0sS0FBSyxRQUFRO1FBQ2xCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxTQUFTLElBQUksb0JBQW9CLENBQUMsU0FBUyxDQUFDLFVBQVUsRUFBRSxFQUFFLENBQUM7WUFDcEYsb0JBQW9CLENBQUMsU0FBUyxHQUFHLElBQUksb0JBQW9CLEVBQUUsQ0FBQTtRQUM1RCxDQUFDO1FBRUQsT0FBTyxvQkFBb0IsQ0FBQyxTQUFTLENBQUE7SUFDdEMsQ0FBQztJQUlRLE9BQU87UUFDZixPQUFPLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxhQUFhLENBQUMsQ0FBQTtJQUN2RCxDQUFDO0lBRVEsT0FBTztRQUNmLE9BQU8scUJBQXFCLENBQUE7SUFDN0IsQ0FBQztJQUVRLE9BQU8sQ0FBQyxLQUFjO1FBQzlCLE9BQU8sS0FBSyxZQUFZLG9CQUFvQixDQUFBO0lBQzdDLENBQUMifQ==