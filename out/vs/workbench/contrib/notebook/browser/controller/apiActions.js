/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as glob from '../../../../../base/common/glob.js';
import { URI } from '../../../../../base/common/uri.js';
import { CommandsRegistry } from '../../../../../platform/commands/common/commands.js';
import { isDocumentExcludePattern, } from '../../common/notebookCommon.js';
import { INotebookKernelService } from '../../common/notebookKernelService.js';
import { INotebookService } from '../../common/notebookService.js';
CommandsRegistry.registerCommand('_resolveNotebookContentProvider', (accessor) => {
    const notebookService = accessor.get(INotebookService);
    const contentProviders = notebookService.getContributedNotebookTypes();
    return contentProviders.map((provider) => {
        const filenamePatterns = provider.selectors
            .map((selector) => {
            if (typeof selector === 'string') {
                return selector;
            }
            if (glob.isRelativePattern(selector)) {
                return selector;
            }
            if (isDocumentExcludePattern(selector)) {
                return {
                    include: selector.include,
                    exclude: selector.exclude,
                };
            }
            return null;
        })
            .filter((pattern) => pattern !== null);
        return {
            viewType: provider.id,
            displayName: provider.displayName,
            filenamePattern: filenamePatterns,
            options: {
                transientCellMetadata: provider.options.transientCellMetadata,
                transientDocumentMetadata: provider.options.transientDocumentMetadata,
                transientOutputs: provider.options.transientOutputs,
            },
        };
    });
});
CommandsRegistry.registerCommand('_resolveNotebookKernels', async (accessor, args) => {
    const notebookKernelService = accessor.get(INotebookKernelService);
    const uri = URI.revive(args.uri);
    const kernels = notebookKernelService.getMatchingKernel({ uri, notebookType: args.viewType });
    return kernels.all.map((provider) => ({
        id: provider.id,
        label: provider.label,
        description: provider.description,
        detail: provider.detail,
        isPreferred: false, // todo@jrieken,@rebornix
        preloads: provider.preloadUris,
    }));
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvY29udHJvbGxlci9hcGlBY3Rpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxJQUFJLE1BQU0sb0NBQW9DLENBQUE7QUFDMUQsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUN0RixPQUFPLEVBQ04sd0JBQXdCLEdBR3hCLE1BQU0sZ0NBQWdDLENBQUE7QUFDdkMsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDOUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFFbEUsZ0JBQWdCLENBQUMsZUFBZSxDQUMvQixpQ0FBaUMsRUFDakMsQ0FDQyxRQUFRLEVBY0wsRUFBRTtJQUNMLE1BQU0sZUFBZSxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQW1CLGdCQUFnQixDQUFDLENBQUE7SUFDeEUsTUFBTSxnQkFBZ0IsR0FBRyxlQUFlLENBQUMsMkJBQTJCLEVBQUUsQ0FBQTtJQUN0RSxPQUFPLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsRUFBRSxFQUFFO1FBQ3hDLE1BQU0sZ0JBQWdCLEdBQUcsUUFBUSxDQUFDLFNBQVM7YUFDekMsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUU7WUFDakIsSUFBSSxPQUFPLFFBQVEsS0FBSyxRQUFRLEVBQUUsQ0FBQztnQkFDbEMsT0FBTyxRQUFRLENBQUE7WUFDaEIsQ0FBQztZQUVELElBQUksSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7Z0JBQ3RDLE9BQU8sUUFBUSxDQUFBO1lBQ2hCLENBQUM7WUFFRCxJQUFJLHdCQUF3QixDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7Z0JBQ3hDLE9BQU87b0JBQ04sT0FBTyxFQUFFLFFBQVEsQ0FBQyxPQUFPO29CQUN6QixPQUFPLEVBQUUsUUFBUSxDQUFDLE9BQU87aUJBQ3pCLENBQUE7WUFDRixDQUFDO1lBRUQsT0FBTyxJQUFJLENBQUE7UUFDWixDQUFDLENBQUM7YUFDRCxNQUFNLENBQUMsQ0FBQyxPQUFPLEVBQUUsRUFBRSxDQUFDLE9BQU8sS0FBSyxJQUFJLENBSW5DLENBQUE7UUFFSCxPQUFPO1lBQ04sUUFBUSxFQUFFLFFBQVEsQ0FBQyxFQUFFO1lBQ3JCLFdBQVcsRUFBRSxRQUFRLENBQUMsV0FBVztZQUNqQyxlQUFlLEVBQUUsZ0JBQWdCO1lBQ2pDLE9BQU8sRUFBRTtnQkFDUixxQkFBcUIsRUFBRSxRQUFRLENBQUMsT0FBTyxDQUFDLHFCQUFxQjtnQkFDN0QseUJBQXlCLEVBQUUsUUFBUSxDQUFDLE9BQU8sQ0FBQyx5QkFBeUI7Z0JBQ3JFLGdCQUFnQixFQUFFLFFBQVEsQ0FBQyxPQUFPLENBQUMsZ0JBQWdCO2FBQ25EO1NBQ0QsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUNELENBQUE7QUFFRCxnQkFBZ0IsQ0FBQyxlQUFlLENBQy9CLHlCQUF5QixFQUN6QixLQUFLLEVBQ0osUUFBUSxFQUNSLElBR0MsRUFVQSxFQUFFO0lBQ0gsTUFBTSxxQkFBcUIsR0FBRyxRQUFRLENBQUMsR0FBRyxDQUFDLHNCQUFzQixDQUFDLENBQUE7SUFDbEUsTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBb0IsQ0FBQyxDQUFBO0lBQ2pELE1BQU0sT0FBTyxHQUFHLHFCQUFxQixDQUFDLGlCQUFpQixDQUFDLEVBQUUsR0FBRyxFQUFFLFlBQVksRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtJQUU3RixPQUFPLE9BQU8sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3JDLEVBQUUsRUFBRSxRQUFRLENBQUMsRUFBRTtRQUNmLEtBQUssRUFBRSxRQUFRLENBQUMsS0FBSztRQUNyQixXQUFXLEVBQUUsUUFBUSxDQUFDLFdBQVc7UUFDakMsTUFBTSxFQUFFLFFBQVEsQ0FBQyxNQUFNO1FBQ3ZCLFdBQVcsRUFBRSxLQUFLLEVBQUUseUJBQXlCO1FBQzdDLFFBQVEsRUFBRSxRQUFRLENBQUMsV0FBVztLQUM5QixDQUFDLENBQUMsQ0FBQTtBQUNKLENBQUMsQ0FDRCxDQUFBIn0=