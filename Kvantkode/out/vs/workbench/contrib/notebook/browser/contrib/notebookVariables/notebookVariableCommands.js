/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { CancellationToken } from '../../../../../../base/common/cancellation.js';
import { URI } from '../../../../../../base/common/uri.js';
import { localize } from '../../../../../../nls.js';
import { Action2, registerAction2 } from '../../../../../../platform/actions/common/actions.js';
import { IClipboardService } from '../../../../../../platform/clipboard/common/clipboardService.js';
import { INotebookKernelService } from '../../../common/notebookKernelService.js';
import { INotebookService } from '../../../common/notebookService.js';
export const COPY_NOTEBOOK_VARIABLE_VALUE_ID = 'workbench.debug.viewlet.action.copyWorkspaceVariableValue';
export const COPY_NOTEBOOK_VARIABLE_VALUE_LABEL = localize('copyWorkspaceVariableValue', 'Copy Value');
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: COPY_NOTEBOOK_VARIABLE_VALUE_ID,
            title: COPY_NOTEBOOK_VARIABLE_VALUE_LABEL,
            f1: false,
        });
    }
    run(accessor, context) {
        const clipboardService = accessor.get(IClipboardService);
        if (context.value) {
            clipboardService.writeText(context.value);
        }
    }
});
registerAction2(class extends Action2 {
    constructor() {
        super({
            id: '_executeNotebookVariableProvider',
            title: localize('executeNotebookVariableProvider', 'Execute Notebook Variable Provider'),
            f1: false,
        });
    }
    async run(accessor, resource) {
        if (!resource) {
            return [];
        }
        const uri = URI.revive(resource);
        const notebookKernelService = accessor.get(INotebookKernelService);
        const notebookService = accessor.get(INotebookService);
        const notebookTextModel = notebookService.getNotebookTextModel(uri);
        if (!notebookTextModel) {
            return [];
        }
        const selectedKernel = notebookKernelService.getMatchingKernel(notebookTextModel).selected;
        if (selectedKernel && selectedKernel.hasVariableProvider) {
            const variables = selectedKernel.provideVariables(notebookTextModel.uri, undefined, 'named', 0, CancellationToken.None);
            return await variables
                .map((variable) => {
                return variable;
            })
                .toPromise();
        }
        return [];
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tWYXJpYWJsZUNvbW1hbmRzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9ub3RlYm9vay9icm93c2VyL2NvbnRyaWIvbm90ZWJvb2tWYXJpYWJsZXMvbm90ZWJvb2tWYXJpYWJsZUNvbW1hbmRzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxHQUFHLEVBQWlCLE1BQU0sc0NBQXNDLENBQUE7QUFDekUsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ25ELE9BQU8sRUFBRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDL0YsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFHbkcsT0FBTyxFQUFFLHNCQUFzQixFQUFtQixNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRXJFLE1BQU0sQ0FBQyxNQUFNLCtCQUErQixHQUMzQywyREFBMkQsQ0FBQTtBQUM1RCxNQUFNLENBQUMsTUFBTSxrQ0FBa0MsR0FBRyxRQUFRLENBQ3pELDRCQUE0QixFQUM1QixZQUFZLENBQ1osQ0FBQTtBQUNELGVBQWUsQ0FDZCxLQUFNLFNBQVEsT0FBTztJQUNwQjtRQUNDLEtBQUssQ0FBQztZQUNMLEVBQUUsRUFBRSwrQkFBK0I7WUFDbkMsS0FBSyxFQUFFLGtDQUFrQztZQUN6QyxFQUFFLEVBQUUsS0FBSztTQUNULENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxHQUFHLENBQUMsUUFBMEIsRUFBRSxPQUF1QjtRQUN0RCxNQUFNLGdCQUFnQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsaUJBQWlCLENBQUMsQ0FBQTtRQUV4RCxJQUFJLE9BQU8sQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNuQixnQkFBZ0IsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQzFDLENBQUM7SUFDRixDQUFDO0NBQ0QsQ0FDRCxDQUFBO0FBRUQsZUFBZSxDQUNkLEtBQU0sU0FBUSxPQUFPO0lBQ3BCO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLGtDQUFrQztZQUN0QyxLQUFLLEVBQUUsUUFBUSxDQUFDLGlDQUFpQyxFQUFFLG9DQUFvQyxDQUFDO1lBQ3hGLEVBQUUsRUFBRSxLQUFLO1NBQ1QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQyxHQUFHLENBQ1IsUUFBMEIsRUFDMUIsUUFBbUM7UUFFbkMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ2YsT0FBTyxFQUFFLENBQUE7UUFDVixDQUFDO1FBRUQsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUNoQyxNQUFNLHFCQUFxQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtRQUNsRSxNQUFNLGVBQWUsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLENBQUE7UUFDdEQsTUFBTSxpQkFBaUIsR0FBRyxlQUFlLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLENBQUE7UUFFbkUsSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7WUFDeEIsT0FBTyxFQUFFLENBQUE7UUFDVixDQUFDO1FBRUQsTUFBTSxjQUFjLEdBQUcscUJBQXFCLENBQUMsaUJBQWlCLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxRQUFRLENBQUE7UUFDMUYsSUFBSSxjQUFjLElBQUksY0FBYyxDQUFDLG1CQUFtQixFQUFFLENBQUM7WUFDMUQsTUFBTSxTQUFTLEdBQUcsY0FBYyxDQUFDLGdCQUFnQixDQUNoRCxpQkFBaUIsQ0FBQyxHQUFHLEVBQ3JCLFNBQVMsRUFDVCxPQUFPLEVBQ1AsQ0FBQyxFQUNELGlCQUFpQixDQUFDLElBQUksQ0FDdEIsQ0FBQTtZQUNELE9BQU8sTUFBTSxTQUFTO2lCQUNwQixHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRTtnQkFDakIsT0FBTyxRQUFRLENBQUE7WUFDaEIsQ0FBQyxDQUFDO2lCQUNELFNBQVMsRUFBRSxDQUFBO1FBQ2QsQ0FBQztRQUVELE9BQU8sRUFBRSxDQUFBO0lBQ1YsQ0FBQztDQUNELENBQ0QsQ0FBQSJ9