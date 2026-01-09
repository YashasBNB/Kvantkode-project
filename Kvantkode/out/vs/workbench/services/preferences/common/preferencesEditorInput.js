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
var SettingsEditor2Input_1;
import { Codicon } from '../../../../base/common/codicons.js';
import { Schemas } from '../../../../base/common/network.js';
import { URI } from '../../../../base/common/uri.js';
import * as nls from '../../../../nls.js';
import { registerIcon } from '../../../../platform/theme/common/iconRegistry.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
import { IPreferencesService } from './preferences.js';
const SettingsEditorIcon = registerIcon('settings-editor-label-icon', Codicon.settings, nls.localize('settingsEditorLabelIcon', 'Icon of the settings editor label.'));
let SettingsEditor2Input = class SettingsEditor2Input extends EditorInput {
    static { SettingsEditor2Input_1 = this; }
    static { this.ID = 'workbench.input.settings2'; }
    constructor(_preferencesService) {
        super();
        this.resource = URI.from({
            scheme: Schemas.vscodeSettings,
            path: `settingseditor`,
        });
        this._settingsModel = _preferencesService.createSettings2EditorModel();
    }
    matches(otherInput) {
        return super.matches(otherInput) || otherInput instanceof SettingsEditor2Input_1;
    }
    get typeId() {
        return SettingsEditor2Input_1.ID;
    }
    getName() {
        return nls.localize('settingsEditor2InputName', 'Settings');
    }
    getIcon() {
        return SettingsEditorIcon;
    }
    async resolve() {
        return this._settingsModel;
    }
    dispose() {
        this._settingsModel.dispose();
        super.dispose();
    }
};
SettingsEditor2Input = SettingsEditor2Input_1 = __decorate([
    __param(0, IPreferencesService)
], SettingsEditor2Input);
export { SettingsEditor2Input };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXNFZGl0b3JJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3ByZWZlcmVuY2VzL2NvbW1vbi9wcmVmZXJlbmNlc0VkaXRvcklucHV0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDN0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRTVELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEtBQUssR0FBRyxNQUFNLG9CQUFvQixDQUFBO0FBQ3pDLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUVoRixPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDbkUsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFHdEQsTUFBTSxrQkFBa0IsR0FBRyxZQUFZLENBQ3RDLDRCQUE0QixFQUM1QixPQUFPLENBQUMsUUFBUSxFQUNoQixHQUFHLENBQUMsUUFBUSxDQUFDLHlCQUF5QixFQUFFLG9DQUFvQyxDQUFDLENBQzdFLENBQUE7QUFFTSxJQUFNLG9CQUFvQixHQUExQixNQUFNLG9CQUFxQixTQUFRLFdBQVc7O2FBQ3BDLE9BQUUsR0FBVywyQkFBMkIsQUFBdEMsQ0FBc0M7SUFReEQsWUFBaUMsbUJBQXdDO1FBQ3hFLEtBQUssRUFBRSxDQUFBO1FBTkMsYUFBUSxHQUFRLEdBQUcsQ0FBQyxJQUFJLENBQUM7WUFDakMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxjQUFjO1lBQzlCLElBQUksRUFBRSxnQkFBZ0I7U0FDdEIsQ0FBQyxDQUFBO1FBS0QsSUFBSSxDQUFDLGNBQWMsR0FBRyxtQkFBbUIsQ0FBQywwQkFBMEIsRUFBRSxDQUFBO0lBQ3ZFLENBQUM7SUFFUSxPQUFPLENBQUMsVUFBNkM7UUFDN0QsT0FBTyxLQUFLLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxJQUFJLFVBQVUsWUFBWSxzQkFBb0IsQ0FBQTtJQUMvRSxDQUFDO0lBRUQsSUFBYSxNQUFNO1FBQ2xCLE9BQU8sc0JBQW9CLENBQUMsRUFBRSxDQUFBO0lBQy9CLENBQUM7SUFFUSxPQUFPO1FBQ2YsT0FBTyxHQUFHLENBQUMsUUFBUSxDQUFDLDBCQUEwQixFQUFFLFVBQVUsQ0FBQyxDQUFBO0lBQzVELENBQUM7SUFFUSxPQUFPO1FBQ2YsT0FBTyxrQkFBa0IsQ0FBQTtJQUMxQixDQUFDO0lBRVEsS0FBSyxDQUFDLE9BQU87UUFDckIsT0FBTyxJQUFJLENBQUMsY0FBYyxDQUFBO0lBQzNCLENBQUM7SUFFUSxPQUFPO1FBQ2YsSUFBSSxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUU3QixLQUFLLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDaEIsQ0FBQzs7QUF2Q1csb0JBQW9CO0lBU25CLFdBQUEsbUJBQW1CLENBQUE7R0FUcEIsb0JBQW9CLENBd0NoQyJ9