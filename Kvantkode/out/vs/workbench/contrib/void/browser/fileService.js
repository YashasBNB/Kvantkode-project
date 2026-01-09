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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZVNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3ZvaWQvYnJvd3Nlci9maWxlU2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFOUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFFakcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDL0YsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDJEQUEyRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2hFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLCtCQUErQixDQUFBO0FBRWpFLE1BQU0sdUJBQXdCLFNBQVEsT0FBTzthQUNwQiw2QkFBd0IsR0FBRyxxQkFBcUIsQ0FBQTtJQUV4RTtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSx1QkFBdUIsQ0FBQyx3QkFBd0I7WUFDcEQsS0FBSyxFQUFFLFNBQVMsQ0FBQyxnQkFBZ0IsRUFBRSx3QkFBd0IsQ0FBQztZQUM1RCxJQUFJLEVBQUU7Z0JBQ0w7b0JBQ0MsRUFBRSxFQUFFLE1BQU0sQ0FBQyxlQUFlO29CQUMxQixLQUFLLEVBQUUsUUFBUTtvQkFDZixLQUFLLEVBQUUsQ0FBQztpQkFDUjthQUNEO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQUMsUUFBMEIsRUFBRSxHQUFRO1FBQzdDLElBQUksQ0FBQztZQUNKLE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUE7WUFDOUMsTUFBTSxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUE7WUFDeEQsTUFBTSxtQkFBbUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLENBQUE7WUFDOUQsTUFBTSxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGlCQUFpQixDQUFDLENBQUE7WUFFeEQsTUFBTSxJQUFJLEdBQUcsTUFBTSxXQUFXLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBRXhDLE1BQU0sVUFBVSxHQUFHO2dCQUNsQixXQUFXLEVBQUUsSUFBSTtnQkFDakIsZUFBZSxFQUFFLFNBQVM7YUFDakIsQ0FBQTtZQUVWLElBQUksQ0FBQyxHQUFXLHNCQUFzQixDQUFBO1lBQ3RDLElBQUksSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO2dCQUNqQixDQUFDLEdBQUcsTUFBTSxrQkFBa0IsQ0FDM0I7b0JBQ0MsSUFBSSxFQUFFLE1BQU07b0JBQ1osR0FBRztvQkFDSCxRQUFRLEVBQUUsQ0FBQyxNQUFNLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFO29CQUNqRixLQUFLLEVBQUUsRUFBRSxxQkFBcUIsRUFBRSxLQUFLLEVBQUU7aUJBQ3ZDLEVBQ0Q7b0JBQ0MsVUFBVTtvQkFDVixtQkFBbUI7b0JBQ25CLFdBQVc7aUJBQ1gsQ0FDRCxDQUFBO1lBQ0YsQ0FBQztZQUVELElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO2dCQUN0QixDQUFDLEdBQUcsTUFBTSxrQkFBa0IsQ0FDM0I7b0JBQ0MsSUFBSSxFQUFFLFFBQVE7b0JBQ2QsR0FBRztpQkFDSCxFQUNEO29CQUNDLFVBQVU7b0JBQ1YsV0FBVztvQkFDWCxtQkFBbUI7aUJBQ25CLENBQ0QsQ0FBQTtZQUNGLENBQUM7WUFFRCxNQUFNLGdCQUFnQixDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUNwQyxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNoQixNQUFNLG1CQUFtQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtZQUM5RCxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQyxDQUFBO1FBQ3RDLENBQUM7SUFDRixDQUFDOztBQUdGLGVBQWUsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBIn0=