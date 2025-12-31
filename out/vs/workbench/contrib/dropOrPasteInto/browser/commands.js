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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kcm9wT3JQYXN0ZUludG8vYnJvd3Nlci9jb21tYW5kcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDN0QsT0FBTyxFQUNOLG1CQUFtQixFQUNuQix1QkFBdUIsR0FDdkIsTUFBTSwyRUFBMkUsQ0FBQTtBQUNsRixPQUFPLEVBQ04sd0JBQXdCLEVBQ3hCLHNCQUFzQixHQUN0QixNQUFNLGdGQUFnRixDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUU3QyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUVsRixJQUFNLHVCQUF1QixHQUE3QixNQUFNLHVCQUF1QjthQUNyQixPQUFFLEdBQUcsbUNBQW1DLEFBQXRDLENBQXNDO0lBRXRELFlBQWtELG1CQUF3QztRQUF4Qyx3QkFBbUIsR0FBbkIsbUJBQW1CLENBQXFCO1FBQ3pGLG1CQUFtQixDQUFDLHlCQUF5QixDQUM1QyxRQUFRLENBQUM7WUFDUixFQUFFLEVBQUUsZ0RBQWdEO1lBQ3BELEtBQUssRUFBRSxRQUFRLENBQUMsNkJBQTZCLEVBQUUscUNBQXFDLENBQUM7WUFDckYsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyw2QkFBNkIsRUFBRTtTQUMvQyxDQUFDLENBQ0YsQ0FBQTtRQUVELHdCQUF3QixDQUFDLHlCQUF5QixDQUNqRCxRQUFRLENBQUM7WUFDUixFQUFFLEVBQUUsK0NBQStDO1lBQ25ELEtBQUssRUFBRSxRQUFRLENBQUMsNEJBQTRCLEVBQUUsb0NBQW9DLENBQUM7WUFDbkYsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyw0QkFBNEIsRUFBRTtTQUM5QyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFTyw2QkFBNkI7UUFDcEMsT0FBTyxJQUFJLENBQUMsbUJBQW1CLENBQUMsZ0JBQWdCLENBQUM7WUFDaEQsVUFBVSxFQUFFLElBQUk7WUFDaEIsYUFBYSxFQUFFLEVBQUUsR0FBRyxFQUFFLHVCQUF1QixFQUFFLElBQUksRUFBRSxJQUFJLEVBQUU7U0FDM0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVPLDRCQUE0QjtRQUNuQyxPQUFPLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxnQkFBZ0IsQ0FBQztZQUNoRCxVQUFVLEVBQUUsSUFBSTtZQUNoQixhQUFhLEVBQUUsRUFBRSxHQUFHLEVBQUUsc0JBQXNCLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRTtTQUMxRCxDQUFDLENBQUE7SUFDSCxDQUFDOztBQWpDVyx1QkFBdUI7SUFHdEIsV0FBQSxtQkFBbUIsQ0FBQTtHQUhwQix1QkFBdUIsQ0FrQ25DIn0=