/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize2 } from '../../../../nls.js';
import { IWorkingCopyHistoryService } from '../../../services/workingCopy/common/workingCopyHistory.js';
import { registerAction2, Action2, MenuId } from '../../../../platform/actions/common/actions.js';
import { LOCAL_HISTORY_MENU_CONTEXT_KEY } from '../browser/localHistory.js';
import { findLocalHistoryEntry } from '../browser/localHistoryCommands.js';
import { isMacintosh, isWindows } from '../../../../base/common/platform.js';
import { INativeHostService } from '../../../../platform/native/common/native.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { Schemas } from '../../../../base/common/network.js';
import { ResourceContextKey } from '../../../common/contextkeys.js';
//#region Delete
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.localHistory.revealInOS',
            title: isWindows
                ? localize2('revealInWindows', 'Reveal in File Explorer')
                : isMacintosh
                    ? localize2('revealInMac', 'Reveal in Finder')
                    : localize2('openContainer', 'Open Containing Folder'),
            menu: {
                id: MenuId.TimelineItemContext,
                group: '4_reveal',
                order: 1,
                when: ContextKeyExpr.and(LOCAL_HISTORY_MENU_CONTEXT_KEY, ResourceContextKey.Scheme.isEqualTo(Schemas.file)),
            },
        });
    }
    async run(accessor, item) {
        const workingCopyHistoryService = accessor.get(IWorkingCopyHistoryService);
        const nativeHostService = accessor.get(INativeHostService);
        const { entry } = await findLocalHistoryEntry(workingCopyHistoryService, item);
        if (entry) {
            await nativeHostService.showItemInFolder(entry.location.with({ scheme: Schemas.file }).fsPath);
        }
    }
});
//#endregion
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9jYWxIaXN0b3J5Q29tbWFuZHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9sb2NhbEhpc3RvcnkvZWxlY3Ryb24tc2FuZGJveC9sb2NhbEhpc3RvcnlDb21tYW5kcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDOUMsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFdkcsT0FBTyxFQUFFLGVBQWUsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDakcsT0FBTyxFQUFFLDhCQUE4QixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDM0UsT0FBTyxFQUFFLHFCQUFxQixFQUE0QixNQUFNLG9DQUFvQyxDQUFBO0FBQ3BHLE9BQU8sRUFBRSxXQUFXLEVBQUUsU0FBUyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDNUUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDakYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUVuRSxnQkFBZ0I7QUFFaEIsZUFBZSxDQUNkLEtBQU0sU0FBUSxPQUFPO0lBQ3BCO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLDBDQUEwQztZQUM5QyxLQUFLLEVBQUUsU0FBUztnQkFDZixDQUFDLENBQUMsU0FBUyxDQUFDLGlCQUFpQixFQUFFLHlCQUF5QixDQUFDO2dCQUN6RCxDQUFDLENBQUMsV0FBVztvQkFDWixDQUFDLENBQUMsU0FBUyxDQUFDLGFBQWEsRUFBRSxrQkFBa0IsQ0FBQztvQkFDOUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxlQUFlLEVBQUUsd0JBQXdCLENBQUM7WUFDeEQsSUFBSSxFQUFFO2dCQUNMLEVBQUUsRUFBRSxNQUFNLENBQUMsbUJBQW1CO2dCQUM5QixLQUFLLEVBQUUsVUFBVTtnQkFDakIsS0FBSyxFQUFFLENBQUM7Z0JBQ1IsSUFBSSxFQUFFLGNBQWMsQ0FBQyxHQUFHLENBQ3ZCLDhCQUE4QixFQUM5QixrQkFBa0IsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FDakQ7YUFDRDtTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFDRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCLEVBQUUsSUFBOEI7UUFDbkUsTUFBTSx5QkFBeUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLDBCQUEwQixDQUFDLENBQUE7UUFDMUUsTUFBTSxpQkFBaUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFFMUQsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLE1BQU0scUJBQXFCLENBQUMseUJBQXlCLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDOUUsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUNYLE1BQU0saUJBQWlCLENBQUMsZ0JBQWdCLENBQ3ZDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FDcEQsQ0FBQTtRQUNGLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FDRCxDQUFBO0FBRUQsWUFBWSJ9