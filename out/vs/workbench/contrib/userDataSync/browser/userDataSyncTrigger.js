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
import { Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { isWeb } from '../../../../base/common/platform.js';
import { isEqual } from '../../../../base/common/resources.js';
import { IUserDataProfilesService } from '../../../../platform/userDataProfile/common/userDataProfile.js';
import { IUserDataAutoSyncService } from '../../../../platform/userDataSync/common/userDataSync.js';
import { IViewsService } from '../../../services/views/common/viewsService.js';
import { VIEWLET_ID } from '../../extensions/common/extensions.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IHostService } from '../../../services/host/browser/host.js';
import { KeybindingsEditorInput } from '../../../services/preferences/browser/keybindingsEditorInput.js';
import { SettingsEditor2Input } from '../../../services/preferences/common/preferencesEditorInput.js';
let UserDataSyncTrigger = class UserDataSyncTrigger extends Disposable {
    constructor(editorService, userDataProfilesService, viewsService, userDataAutoSyncService, hostService) {
        super();
        this.userDataProfilesService = userDataProfilesService;
        const event = Event.filter(Event.any(Event.map(editorService.onDidActiveEditorChange, () => this.getUserDataEditorInputSource(editorService.activeEditor)), Event.map(Event.filter(viewsService.onDidChangeViewContainerVisibility, (e) => e.id === VIEWLET_ID && e.visible), (e) => e.id)), (source) => source !== undefined);
        if (isWeb) {
            this._register(Event.debounce(Event.any(Event.map(hostService.onDidChangeFocus, () => 'windowFocus'), Event.map(event, (source) => source)), (last, source) => (last ? [...last, source] : [source]), 1000)((sources) => userDataAutoSyncService.triggerSync(sources, { skipIfSyncedRecently: true })));
        }
        else {
            this._register(event((source) => userDataAutoSyncService.triggerSync([source], { skipIfSyncedRecently: true })));
        }
    }
    getUserDataEditorInputSource(editorInput) {
        if (!editorInput) {
            return undefined;
        }
        if (editorInput instanceof SettingsEditor2Input) {
            return 'settingsEditor';
        }
        if (editorInput instanceof KeybindingsEditorInput) {
            return 'keybindingsEditor';
        }
        const resource = editorInput.resource;
        if (isEqual(resource, this.userDataProfilesService.defaultProfile.settingsResource)) {
            return 'settingsEditor';
        }
        if (isEqual(resource, this.userDataProfilesService.defaultProfile.keybindingsResource)) {
            return 'keybindingsEditor';
        }
        return undefined;
    }
};
UserDataSyncTrigger = __decorate([
    __param(0, IEditorService),
    __param(1, IUserDataProfilesService),
    __param(2, IViewsService),
    __param(3, IUserDataAutoSyncService),
    __param(4, IHostService)
], UserDataSyncTrigger);
export { UserDataSyncTrigger };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jVHJpZ2dlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3VzZXJEYXRhU3luYy9icm93c2VyL3VzZXJEYXRhU3luY1RyaWdnZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3hELE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDM0QsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzlELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGdFQUFnRSxDQUFBO0FBQ3pHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBR25HLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDbEUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNyRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUN4RyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUU5RixJQUFNLG1CQUFtQixHQUF6QixNQUFNLG1CQUFvQixTQUFRLFVBQVU7SUFDbEQsWUFDaUIsYUFBNkIsRUFDRix1QkFBaUQsRUFDN0UsWUFBMkIsRUFDaEIsdUJBQWlELEVBQzdELFdBQXlCO1FBRXZDLEtBQUssRUFBRSxDQUFBO1FBTG9DLDRCQUF1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