/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize, localize2 } from '../../../nls.js';
import { Action2 } from '../../../platform/actions/common/actions.js';
import product from '../../../platform/product/common/product.js';
import { IDialogService } from '../../../platform/dialogs/common/dialogs.js';
import { INativeHostService } from '../../../platform/native/common/native.js';
import { toErrorMessage } from '../../../base/common/errorMessage.js';
import { IProductService } from '../../../platform/product/common/productService.js';
import { isCancellationError } from '../../../base/common/errors.js';
const shellCommandCategory = localize2('shellCommand', 'Shell Command');
export class InstallShellScriptAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.installCommandLine',
            title: localize2('install', "Install '{0}' command in PATH", product.applicationName),
            category: shellCommandCategory,
            f1: true,
        });
    }
    async run(accessor) {
        const nativeHostService = accessor.get(INativeHostService);
        const dialogService = accessor.get(IDialogService);
        const productService = accessor.get(IProductService);
        try {
            await nativeHostService.installShellCommand();
            dialogService.info(localize('successIn', "Shell command '{0}' successfully installed in PATH.", productService.applicationName));
        }
        catch (error) {
            if (isCancellationError(error)) {
                return;
            }
            dialogService.error(toErrorMessage(error));
        }
    }
}
export class UninstallShellScriptAction extends Action2 {
    constructor() {
        super({
            id: 'workbench.action.uninstallCommandLine',
            title: localize2('uninstall', "Uninstall '{0}' command from PATH", product.applicationName),
            category: shellCommandCategory,
            f1: true,
        });
    }
    async run(accessor) {
        const nativeHostService = accessor.get(INativeHostService);
        const dialogService = accessor.get(IDialogService);
        const productService = accessor.get(IProductService);
        try {
            await nativeHostService.uninstallShellCommand();
            dialogService.info(localize('successFrom', "Shell command '{0}' successfully uninstalled from PATH.", productService.applicationName));
        }
        catch (error) {
            if (isCancellationError(error)) {
                return;
            }
            dialogService.error(toErrorMessage(error));
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5zdGFsbEFjdGlvbnMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvZWxlY3Ryb24tc2FuZGJveC9hY3Rpb25zL2luc3RhbGxBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFLE1BQU0saUJBQWlCLENBQUE7QUFDckQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRXJFLE9BQU8sT0FBTyxNQUFNLDZDQUE2QyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUU1RSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDckUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRXBFLE1BQU0sb0JBQW9CLEdBQXFCLFNBQVMsQ0FBQyxjQUFjLEVBQUUsZUFBZSxDQUFDLENBQUE7QUFFekYsTUFBTSxPQUFPLHdCQUF5QixTQUFRLE9BQU87SUFDcEQ7UUFDQyxLQUFLLENBQUM7WUFDTCxFQUFFLEVBQUUscUNBQXFDO1lBQ3pDLEtBQUssRUFBRSxTQUFTLENBQUMsU0FBUyxFQUFFLCtCQUErQixFQUFFLE9BQU8sQ0FBQyxlQUFlLENBQUM7WUFDckYsUUFBUSxFQUFFLG9CQUFvQjtZQUM5QixFQUFFLEVBQUUsSUFBSTtTQUNSLENBQUMsQ0FBQTtJQUNILENBQUM7SUFFRCxLQUFLLENBQUMsR0FBRyxDQUFDLFFBQTBCO1FBQ25DLE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFBO1FBQzFELE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLENBQUE7UUFDbEQsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQTtRQUVwRCxJQUFJLENBQUM7WUFDSixNQUFNLGlCQUFpQixDQUFDLG1CQUFtQixFQUFFLENBQUE7WUFFN0MsYUFBYSxDQUFDLElBQUksQ0FDakIsUUFBUSxDQUNQLFdBQVcsRUFDWCxxREFBcUQsRUFDckQsY0FBYyxDQUFDLGVBQWUsQ0FDOUIsQ0FDRCxDQUFBO1FBQ0YsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDaEIsSUFBSSxtQkFBbUIsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO2dCQUNoQyxPQUFNO1lBQ1AsQ0FBQztZQUVELGFBQWEsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUE7UUFDM0MsQ0FBQztJQUNGLENBQUM7Q0FDRDtBQUVELE1BQU0sT0FBTywwQkFBMkIsU0FBUSxPQUFPO0lBQ3REO1FBQ0MsS0FBSyxDQUFDO1lBQ0wsRUFBRSxFQUFFLHVDQUF1QztZQUMzQyxLQUFLLEVBQUUsU0FBUyxDQUFDLFdBQVcsRUFBRSxtQ0FBbUMsRUFBRSxPQUFPLENBQUMsZUFBZSxDQUFDO1lBQzNGLFFBQVEsRUFBRSxvQkFBb0I7WUFDOUIsRUFBRSxFQUFFLElBQUk7U0FDUixDQUFDLENBQUE7SUFDSCxDQUFDO0lBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUEwQjtRQUNuQyxNQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQTtRQUMxRCxNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBQ2xELE1BQU0sY0FBYyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDLENBQUE7UUFFcEQsSUFBSSxDQUFDO1lBQ0osTUFBTSxpQkFBaUIsQ0FBQyxxQkFBcUIsRUFBRSxDQUFBO1lBRS9DLGFBQWEsQ0FBQyxJQUFJLENBQ2pCLFFBQVEsQ0FDUCxhQUFhLEVBQ2IseURBQXlELEVBQ3pELGNBQWMsQ0FBQyxlQUFlLENBQzlCLENBQ0QsQ0FBQTtRQUNGLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2hCLElBQUksbUJBQW1CLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDaEMsT0FBTTtZQUNQLENBQUM7WUFFRCxhQUFhLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBQzNDLENBQUM7SUFDRixDQUFDO0NBQ0QifQ==