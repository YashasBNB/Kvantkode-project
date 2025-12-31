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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXNFZGl0b3JJbnB1dC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9wcmVmZXJlbmNlcy9jb21tb24vcHJlZmVyZW5jZXNFZGl0b3JJbnB1dC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUU1RCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFFaEYsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBR3RELE1BQU0sa0JBQWtCLEdBQUcsWUFBWSxDQUN0Qyw0QkFBNEIsRUFDNUIsT0FBTyxDQUFDLFFBQVEsRUFDaEIsR0FBRyxDQUFDLFFBQVEsQ0FBQyx5QkFBeUIsRUFBRSxvQ0FBb0MsQ0FBQyxDQUM3RSxDQUFBO0FBRU0sSUFBTSxvQkFBb0IsR0FBMUIsTUFBTSxvQkFBcUIsU0FBUSxXQUFXOzthQUNwQyxPQUFFLEdBQVcsMkJBQTJCLEFBQXRDLENBQXNDO0lBUXhELFlBQWlDLG1CQUF3QztRQUN4RSxLQUFLLEVBQUUsQ0FBQTtRQU5DLGFBQVEsR0FBUSxHQUFHLENBQUMsSUFBSSxDQUFDO1lBQ2pDLE1BQU0sRUFBRSxPQUFPLENBQUMsY0FBYztZQUM5QixJQUFJLEVBQUUsZ0JBQWdCO1NBQ3RCLENBQUMsQ0FBQTtRQUtELElBQUksQ0FBQyxjQUFjLEdBQUcsbUJBQW1CLENBQUMsMEJBQTBCLEVBQUUsQ0FBQTtJQUN2RSxDQUFDO0lBRVEsT0FBTyxDQUFDLFVBQTZDO1FBQzdELE9BQU8sS0FBSyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsSUFBSSxVQUFVLFlBQVksc0JBQW9CLENBQUE7SUFDL0UsQ0FBQztJQUVELElBQWEsTUFBTTtRQUNsQixPQUFPLHNCQUFvQixDQUFDLEVBQUUsQ0FBQTtJQUMvQixDQUFDO0lBRVEsT0FBTztRQUNmLE9BQU8sR0FBRyxDQUFDLFFBQVEsQ0FBQywwQkFBMEIsRUFBRSxVQUFVLENBQUMsQ0FBQTtJQUM1RCxDQUFDO0lBRVEsT0FBTztRQUNmLE9BQU8sa0JBQWtCLENBQUE7SUFDMUIsQ0FBQztJQUVRLEtBQUssQ0FBQyxPQUFPO1FBQ3JCLE9BQU8sSUFBSSxDQUFDLGNBQWMsQ0FBQTtJQUMzQixDQUFDO0lBRVEsT0FBTztRQUNmLElBQUksQ0FBQyxjQUFjLENBQUMsT0FBTyxFQUFFLENBQUE7UUFFN0IsS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ2hCLENBQUM7O0FBdkNXLG9CQUFvQjtJQVNuQixXQUFBLG1CQUFtQixDQUFBO0dBVHBCLG9CQUFvQixDQXdDaEMifQ==