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
import { toAction } from '../../../../base/common/actions.js';
import { CopyPasteController, pasteAsPreferenceConfig, } from '../../../../editor/contrib/dropOrPasteInto/browser/copyPasteController.js';
import { DropIntoEditorController, dropAsPreferenceConfig, } from '../../../../editor/contrib/dropOrPasteInto/browser/dropIntoEditorController.js';
import { localize } from '../../../../nls.js';
import { IPreferencesService } from '../../../services/preferences/common/preferences.js';
let DropOrPasteIntoCommands = class DropOrPasteIntoCommands {
    static { this.ID = 'workbench.contrib.dropOrPasteInto'; }
    constructor(_preferencesService) {
        this._preferencesService = _preferencesService;
        CopyPasteController.setConfigureDefaultAction(toAction({
            id: 'workbench.action.configurePreferredPasteAction',
            label: localize('configureDefaultPaste.label', 'Configure preferred paste action...'),
            run: () => this.configurePreferredPasteAction(),
        }));
        DropIntoEditorController.setConfigureDefaultAction(toAction({
            id: 'workbench.action.configurePreferredDropAction',
            label: localize('configureDefaultDrop.label', 'Configure preferred drop action...'),
            run: () => this.configurePreferredDropAction(),
        }));
    }
    configurePreferredPasteAction() {
        return this._preferencesService.openUserSettings({
            jsonEditor: true,
            revealSetting: { key: pasteAsPreferenceConfig, edit: true },
        });
    }
    configurePreferredDropAction() {
        return this._preferencesService.openUserSettings({
            jsonEditor: true,
            revealSetting: { key: dropAsPreferenceConfig, edit: true },
        });
    }
};
DropOrPasteIntoCommands = __decorate([
    __param(0, IPreferencesService)
], DropOrPasteIntoCommands);
export { DropOrPasteIntoCommands };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2Ryb3BPclBhc3RlSW50by9icm93c2VyL2NvbW1hbmRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM3RCxPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLHVCQUF1QixHQUN2QixNQUFNLDJFQUEyRSxDQUFBO0FBQ2xGLE9BQU8sRUFDTix3QkFBd0IsRUFDeEIsc0JBQXNCLEdBQ3RCLE1BQU0sZ0ZBQWdGLENBQUE7QUFDdkYsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRTdDLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBRWxGLElBQU0sdUJBQXVCLEdBQTdCLE1BQU0sdUJBQXVCO2FBQ3JCLE9BQUUsR0FBRyxtQ0FBbUMsQUFBdEMsQ0FBc0M7SUFFdEQsWUFBa0QsbUJBQXdDO1FBQXhDLHdCQUFtQixHQUFuQixtQkFBbUIsQ0FBcUI7UUFDekYsbUJBQW1CLENBQUMseUJBQXlCLENBQzVDLFFBQVEsQ0FBQztZQUNSLEVBQUUsRUFBRSxnREFBZ0Q7WUFDcEQsS0FBSyxFQUFFLFFBQVEsQ0FBQyw2QkFBNkIsRUFBRSxxQ0FBcUMsQ0FBQztZQUNyRixHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLDZCQUE2QixFQUFFO1NBQy9DLENBQUMsQ0FDRixDQUFBO1FBRUQsd0JBQXdCLENBQUMseUJBQXlCLENBQ2pELFFBQVEsQ0FBQztZQUNSLEVBQUUsRUFBRSwrQ0FBK0M7WUFDbkQsS0FBSyxFQUFFLFFBQVEsQ0FBQyw0QkFBNEIsRUFBRSxvQ0FBb0MsQ0FBQztZQUNuRixHQUFHLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLDRCQUE0QixFQUFFO1NBQzlDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVPLDZCQUE2QjtRQUNwQyxPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxnQkFBZ0IsQ0FBQztZQUNoRCxVQUFVLEVBQUUsSUFBSTtZQUNoQixhQUFhLEVBQUUsRUFBRSxHQUFHLEVBQUUsdUJBQXVCLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRTtTQUMzRCxDQUFDLENBQUE7SUFDSCxDQUFDO0lBRU8sNEJBQTRCO1FBQ25DLE9BQU8sSUFBSSxDQUFDLG1CQUFtQixDQUFDLGdCQUFnQixDQUFDO1lBQ2hELFVBQVUsRUFBRSxJQUFJO1lBQ2hCLGFBQWEsRUFBRSxFQUFFLEdBQUcsRUFBRSxzQkFBc0IsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFO1NBQzFELENBQUMsQ0FBQTtJQUNILENBQUM7O0FBakNXLHVCQUF1QjtJQUd0QixXQUFBLG1CQUFtQixDQUFBO0dBSHBCLHVCQUF1QixDQWtDbkMifQ==