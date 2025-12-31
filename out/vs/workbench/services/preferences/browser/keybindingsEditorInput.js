/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var KeybindingsEditorInput_1;
import { Codicon } from '../../../../base/common/codicons.js';
import { OS } from '../../../../base/common/platform.js';
import * as nls from '../../../../nls.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
import { KeybindingsEditorModel } from './keybindingsEditorModel.js';
const KeybindingsEditorIcon = registerIcon('keybindings-editor-label-icon', Codicon.keyboard, nls.localize('keybindingsEditorLabelIcon', 'Icon of the keybindings editor label.'));
let KeybindingsEditorInput = class KeybindingsEditorInput extends EditorInput {
    static { KeybindingsEditorInput_1 = this; }
    static { this.ID = 'workbench.input.keybindings'; }
    constructor(instantiationService) {
        super();
        this.searchOptions = null;
        this.resource = undefined;
        this.keybindingsModel = instantiationService.createInstance(KeybindingsEditorModel, OS);
    }
    get typeId() {
        return KeybindingsEditorInput_1.ID;
    }
    getName() {
        return nls.localize('keybindingsInputName', 'Keyboard Shortcuts');
    }
    getIcon() {
        return KeybindingsEditorIcon;
    }
    async resolve() {
        return this.keybindingsModel;
    }
    matches(otherInput) {
        return otherInput instanceof KeybindingsEditorInput_1;
    }
    dispose() {
        this.keybindingsModel.dispose();
        super.dispose();
    }
};
KeybindingsEditorInput = KeybindingsEditorInput_1 = __decorate([
    __param(0, IInstantiationService)
], KeybindingsEditorInput);
export { KeybindingsEditorInput };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ3NFZGl0b3JJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9wcmVmZXJlbmNlcy9icm93c2VyL2tleWJpbmRpbmdzRWRpdG9ySW5wdXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsRUFBRSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFFeEQsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFFaEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBUXBFLE1BQU0scUJBQXFCLEdBQUcsWUFBWSxDQUN6QywrQkFBK0IsRUFDL0IsT0FBTyxDQUFDLFFBQVEsRUFDaEIsR0FBRyxDQUFDLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSx1Q0FBdUMsQ0FBQyxDQUNuRixDQUFBO0FBRU0sSUFBTSxzQkFBc0IsR0FBNUIsTUFBTSxzQkFBdUIsU0FBUSxXQUFXOzthQUN0QyxPQUFFLEdBQVcsNkJBQTZCLEFBQXhDLENBQXdDO0lBTzFELFlBQW1DLG9CQUEyQztRQUM3RSxLQUFLLEVBQUUsQ0FBQTtRQUxSLGtCQUFhLEdBQTJDLElBQUksQ0FBQTtRQUVuRCxhQUFRLEdBQUcsU0FBUyxDQUFBO1FBSzVCLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsc0JBQXNCLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDeEYsQ0FBQztJQUVELElBQWEsTUFBTTtRQUNsQixPQUFPLHdCQUFzQixDQUFDLEVBQUUsQ0FBQTtJQUNqQyxDQUFDO0lBRVEsT0FBTztRQUNmLE9BQU8sR0FBRyxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO0lBQ2xFLENBQUM7SUFFUSxPQUFPO1FBQ2YsT0FBTyxxQkFBcUIsQ0FBQTtJQUM3QixDQUFDO0lBRVEsS0FBSyxDQUFDLE9BQU87UUFDckIsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLENBQUE7SUFDN0IsQ0FBQztJQUVRLE9BQU8sQ0FBQyxVQUE2QztRQUM3RCxPQUFPLFVBQVUsWUFBWSx3QkFBc0IsQ0FBQTtJQUNwRCxDQUFDO0lBRVEsT0FBTztRQUNmLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUUvQixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDaEIsQ0FBQzs7QUF0Q1csc0JBQXNCO0lBUXJCLFdBQUEscUJBQXFCLENBQUE7R0FSdEIsc0JBQXNCLENBdUNsQyJ9