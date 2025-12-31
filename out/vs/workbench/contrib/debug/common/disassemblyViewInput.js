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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlzYXNzZW1ibHlWaWV3SW5wdXQuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy9jb21tb24vZGlzYXNzZW1ibHlWaWV3SW5wdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUU3QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBRWhGLE1BQU0scUJBQXFCLEdBQUcsWUFBWSxDQUN6QywrQkFBK0IsRUFDL0IsT0FBTyxDQUFDLEtBQUssRUFDYixRQUFRLENBQUMsNEJBQTRCLEVBQUUsdUNBQXVDLENBQUMsQ0FDL0UsQ0FBQTtBQUVELE1BQU0sT0FBTyxvQkFBcUIsU0FBUSxXQUFXO0lBQXJEOztRQWdCVSxhQUFRLEdBQUcsU0FBUyxDQUFBO0lBYTlCLENBQUM7YUE1QmdCLE9BQUUsR0FBRyw2QkFBNkIsQUFBaEMsQ0FBZ0M7SUFFbEQsSUFBYSxNQUFNO1FBQ2xCLE9BQU8sb0JBQW9CLENBQUMsRUFBRSxDQUFBO0lBQy9CLENBQUM7SUFHRCxNQUFNLEtBQUssUUFBUTtRQUNsQixJQUFJLENBQUMsb0JBQW9CLENBQUMsU0FBUyxJQUFJLG9CQUFvQixDQUFDLFNBQVMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxDQUFDO1lBQ3BGLG9CQUFvQixDQUFDLFNBQVMsR0FBRyxJQUFJLG9CQUFvQixFQUFFLENBQUE7UUFDNUQsQ0FBQztRQUVELE9BQU8sb0JBQW9CLENBQUMsU0FBUyxDQUFBO0lBQ3RDLENBQUM7SUFJUSxPQUFPO1FBQ2YsT0FBTyxRQUFRLENBQUMsc0JBQXNCLEVBQUUsYUFBYSxDQUFDLENBQUE7SUFDdkQsQ0FBQztJQUVRLE9BQU87UUFDZixPQUFPLHFCQUFxQixDQUFBO0lBQzdCLENBQUM7SUFFUSxPQUFPLENBQUMsS0FBYztRQUM5QixPQUFPLEtBQUssWUFBWSxvQkFBb0IsQ0FBQTtJQUM3QyxDQUFDIn0=