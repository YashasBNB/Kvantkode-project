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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoia2V5YmluZGluZ3NFZGl0b3JJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3ByZWZlcmVuY2VzL2Jyb3dzZXIva2V5YmluZGluZ3NFZGl0b3JJbnB1dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxFQUFFLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUV4RCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUVoRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDbkUsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFRcEUsTUFBTSxxQkFBcUIsR0FBRyxZQUFZLENBQ3pDLCtCQUErQixFQUMvQixPQUFPLENBQUMsUUFBUSxFQUNoQixHQUFHLENBQUMsUUFBUSxDQUFDLDRCQUE0QixFQUFFLHVDQUF1QyxDQUFDLENBQ25GLENBQUE7QUFFTSxJQUFNLHNCQUFzQixHQUE1QixNQUFNLHNCQUF1QixTQUFRLFdBQVc7O2FBQ3RDLE9BQUUsR0FBVyw2QkFBNkIsQUFBeEMsQ0FBd0M7SUFPMUQsWUFBbUMsb0JBQTJDO1FBQzdFLEtBQUssRUFBRSxDQUFBO1FBTFIsa0JBQWEsR0FBMkMsSUFBSSxDQUFBO1FBRW5ELGFBQVEsR0FBRyxTQUFTLENBQUE7UUFLNUIsSUFBSSxDQUFDLGdCQUFnQixHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxzQkFBc0IsRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUN4RixDQUFDO0lBRUQsSUFBYSxNQUFNO1FBQ2xCLE9BQU8sd0JBQXNCLENBQUMsRUFBRSxDQUFBO0lBQ2pDLENBQUM7SUFFUSxPQUFPO1FBQ2YsT0FBTyxHQUFHLENBQUMsUUFBUSxDQUFDLHNCQUFzQixFQUFFLG9CQUFvQixDQUFDLENBQUE7SUFDbEUsQ0FBQztJQUVRLE9BQU87UUFDZixPQUFPLHFCQUFxQixDQUFBO0lBQzdCLENBQUM7SUFFUSxLQUFLLENBQUMsT0FBTztRQUNyQixPQUFPLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQTtJQUM3QixDQUFDO0lBRVEsT0FBTyxDQUFDLFVBQTZDO1FBQzdELE9BQU8sVUFBVSxZQUFZLHdCQUFzQixDQUFBO0lBQ3BELENBQUM7SUFFUSxPQUFPO1FBQ2YsSUFBSSxDQUFDLGdCQUFnQixDQUFDLE9BQU8sRUFBRSxDQUFBO1FBRS9CLEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNoQixDQUFDOztBQXRDVyxzQkFBc0I7SUFRckIsV0FBQSxxQkFBcUIsQ0FBQTtHQVJ0QixzQkFBc0IsQ0F1Q2xDIn0=