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
import { registerWorkbenchContribution2, } from '../../../common/contributions.js';
import { IUserDataSyncUtilService, } from '../../../../platform/userDataSync/common/userDataSync.js';
import { ISharedProcessService } from '../../../../platform/ipc/electron-sandbox/services.js';
import { registerAction2, Action2, MenuId } from '../../../../platform/actions/common/actions.js';
import { localize, localize2 } from '../../../../nls.js';
import { IEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { INotificationService, Severity, } from '../../../../platform/notification/common/notification.js';
import { CONTEXT_SYNC_STATE, DOWNLOAD_ACTIVITY_ACTION_DESCRIPTOR, IUserDataSyncWorkbenchService, SYNC_TITLE, } from '../../../services/userDataSync/common/userDataSync.js';
import { Schemas } from '../../../../base/common/network.js';
import { ProxyChannel } from '../../../../base/parts/ipc/common/ipc.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
let UserDataSyncServicesContribution = class UserDataSyncServicesContribution extends Disposable {
    static { this.ID = 'workbench.contrib.userDataSyncServices'; }
    constructor(userDataSyncUtilService, sharedProcessService) {
        super();
        sharedProcessService.registerChannel('userDataSyncUtil', ProxyChannel.fromService(userDataSyncUtilService, this._store));
    }
};
UserDataSyncServicesContribution = __decorate([
    __param(0, IUserDataSyncUtilService),
    __param(1, ISharedProcessService)
], UserDataSyncServicesContribution);
registerWorkbenchContribution2(UserDataSyncServicesContribution.ID, UserDataSyncServicesContribution, 1 /* WorkbenchPhase.BlockStartup */);
registerAction2(class OpenSyncBackupsFolder extends Action2 {
    constructor() {
        super({
            id: 'workbench.userData.actions.openSyncBackupsFolder',
            title: localize2('Open Backup folder', 'Open Local Backups Folder'),
            category: SYNC_TITLE,
            menu: {
                id: MenuId.CommandPalette,
                when: CONTEXT_SYNC_STATE.notEqualsTo("uninitialized" /* SyncStatus.Uninitialized */),
            },
        });
    }
    async run(accessor) {
        const syncHome = accessor.get(IEnvironmentService).userDataSyncHome;
        const nativeHostService = accessor.get(INativeHostService);
        const fileService = accessor.get(IFileService);
        const notificationService = accessor.get(INotificationService);
        if (await fileService.exists(syncHome)) {
            const folderStat = await fileService.resolve(syncHome);
            const item = folderStat.children && folderStat.children[0] ? folderStat.children[0].resource : syncHome;
            return nativeHostService.showItemInFolder(item.with({ scheme: Schemas.file }).fsPath);
        }
        else {
            notificationService.info(localize('no backups', 'Local backups folder does not exist'));
        }
    }
});
registerAction2(class DownloadSyncActivityAction extends Action2 {
    constructor() {
        super(DOWNLOAD_ACTIVITY_ACTION_DESCRIPTOR);
    }
    async run(accessor) {
        const userDataSyncWorkbenchService = accessor.get(IUserDataSyncWorkbenchService);
        const notificationService = accessor.get(INotificationService);
        const hostService = accessor.get(INativeHostService);
        const folder = await userDataSyncWorkbenchService.downloadSyncActivity();
        if (folder) {
            notificationService.prompt(Severity.Info, localize('download sync activity complete', 'Successfully downloaded Settings Sync activity.'), [
                {
                    label: localize('open', 'Open Folder'),
                    run: () => hostService.showItemInFolder(folder.fsPath),
                },
            ]);
        }
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlckRhdGFTeW5jLmNvbnRyaWJ1dGlvbi5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3VzZXJEYXRhU3luYy9lbGVjdHJvbi1zYW5kYm94L3VzZXJEYXRhU3luYy5jb250cmlidXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUdOLDhCQUE4QixHQUM5QixNQUFNLGtDQUFrQyxDQUFBO0FBQ3pDLE9BQU8sRUFDTix3QkFBd0IsR0FFeEIsTUFBTSwwREFBMEQsQ0FBQTtBQUNqRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx1REFBdUQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsZUFBZSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNqRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRXhELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLHdEQUF3RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNqRixPQUFPLEVBQ04sb0JBQW9CLEVBQ3BCLFFBQVEsR0FDUixNQUFNLDBEQUEwRCxDQUFBO0FBQ2pFLE9BQU8sRUFDTixrQkFBa0IsRUFDbEIsbUNBQW1DLEVBQ25DLDZCQUE2QixFQUM3QixVQUFVLEdBQ1YsTUFBTSx1REFBdUQsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0Ms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