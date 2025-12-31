import { localize2 } from '../../../../nls.js';
import { Action2, registerAction2, MenuId } from '../../../../platform/actions/common/actions.js';
import { INotificationService } from '../../../../platform/notification/common/notification.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { IDirectoryStrService } from '../common/directoryStrService.js';
import { messageOfSelection } from '../common/prompt/prompts.js';
import { IVoidModelService } from '../common/voidModelService.js';
class FilePromptActionService extends Action2 {
    static { this.VOID_COPY_FILE_PROMPT_ID = 'void.copyfileprompt'; }
    constructor() {
        super({
            id: FilePromptActionService.VOID_COPY_FILE_PROMPT_ID,
            title: localize2('voidCopyPrompt', 'KvantKode: Copy Prompt'),
            menu: [
                {
                    id: MenuId.ExplorerContext,
                    group: '8_void',
                    order: 1,
                },
            ],
        });
    }
    async run(accessor, uri) {
        try {
            const fileService = accessor.get(IFileService);
            const clipboardService = accessor.get(IClipboardService);
            const directoryStrService = accessor.get(IDirectoryStrService);
            const voidModelService = accessor.get(IVoidModelService);
            const stat = await fileService.stat(uri);
            const folderOpts = {
                maxChildren: 1000,
                maxCharsPerFile: 2_000_000,
            };
            let m = 'No contents detected';
            if (stat.isFile) {
                m = await messageOfSelection({
                    type: 'File',
                    uri,
                    language: (await voidModelService.getModelSafe(uri)).model?.getLanguageId() || '',
                    state: { wasAddedAsCurrentFile: false },
                }, {
                    folderOpts,
                    directoryStrService,
                    fileService,
                });
            }
            if (stat.isDirectory) {
                m = await messageOfSelection({
                    type: 'Folder',
                    uri,
                }, {
                    folderOpts,
                    fileService,
                    directoryStrService,
                });
            }
            await clipboardService.writeText(m);
        }
        catch (error) {
            const notificationService = accessor.get(INotificationService);
            notificationService.error(error + '');
        }
    }
}
registerAction2(FilePromptActionService);
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi92b2lkL2Jyb3dzZXIvZmlsZVNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRTlDLE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBRWpHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQy9GLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUVqRSxNQUFNLHVCQUF3QixTQUFRLE9BQU87YUFDcEIsNkJBQXdCLEdBQUcscUJBQXFCLENBQUE7SUFFeEU7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUsdUJBQXVCLENBQUMsd0JBQXdCO1lBQ3BELEtBQUssRUFBRSxTQUFTLENBQUMsZ0JBQWdCLEVBQUUsd0JBQXdCLENBQUM7WUFDNUQsSUFBSSxFQUFFO2dCQUNMO29CQUNDLEVBQUUsRUFBRSxNQUFNLENBQUMsZUFBZTtvQkFDMUIsS0FBSyxFQUFFLFFBQVE7b0JBQ2YsS0FBSyxFQUFFLENBQUM7aUJBQ1I7YUFDRDtTQUNELENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCLEVBQUUsR0FBUTtRQUM3QyxJQUFJLENBQUM7WUFDSixNQUFNLFdBQVcsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFBO1lBQzlDLE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1lBQ3hELE1BQU0sbUJBQW1CLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO1lBQzlELE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1lBRXhELE1BQU0sSUFBSSxHQUFHLE1BQU0sV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUV4QyxNQUFNLFVBQVUsR0FBRztnQkFDbEIsV0FBVyxFQUFFLElBQUk7Z0JBQ2pCLGVBQWUsRUFBRSxTQUFTO2FBQ2pCLENBQUE7WUFFVixJQUFJLENBQUMsR0FBVyxzQkFBc0IsQ0FBQTtZQUN0QyxJQUFJLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDakIsQ0FBQyxHQUFHLE1BQU0sa0JBQWtCLENBQzNCO29CQUNDLElBQUksRUFBRSxNQUFNO29CQUNaLEdBQUc7b0JBQ0gsUUFBUSxFQUFFLENBQUMsTUFBTSxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRTtvQkFDakYsS0FBSyxFQUFFLEVBQUUscUJBQXFCLEVBQUUsS0FBSyxFQUFFO2lCQUN2QyxFQUNEO29CQUNDLFVBQVU7b0JBQ1YsbUJBQW1CO29CQUNuQixXQUFXO2lCQUNYLENBQ0QsQ0FBQTtZQUNGLENBQUM7WUFFRCxJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztnQkFDdEIsQ0FBQyxHQUFHLE1BQU0sa0JBQWtCLENBQzNCO29CQUNDLElBQUksRUFBRSxRQUFRO29CQUNkLEdBQUc7aUJBQ0gsRUFDRDtvQkFDQyxVQUFVO29CQUNWLFdBQVc7b0JBQ1gsbUJBQW1CO2lCQUNuQixDQUNELENBQUE7WUFDRixDQUFDO1lBRUQsTUFBTSxnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDcEMsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsTUFBTSxtQkFBbUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUE7WUFDOUQsbUJBQW1CLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUMsQ0FBQTtRQUN0QyxDQUFDO0lBQ0YsQ0FBQzs7QUFHRixlQUFlLENBQUMsdUJBQXVCLENBQUMsQ0FBQSJ9