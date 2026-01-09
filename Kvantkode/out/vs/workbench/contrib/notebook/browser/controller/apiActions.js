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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYXBpQWN0aW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9jb250cm9sbGVyL2FwaUFjdGlvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLElBQUksTUFBTSxvQ0FBb0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsR0FBRyxFQUFpQixNQUFNLG1DQUFtQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3RGLE9BQU8sRUFDTix3QkFBd0IsR0FHeEIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN2QyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUVsRSxnQkFBZ0IsQ0FBQyxlQUFlLENBQy9CLGlDQUFpQyxFQUNqQyxDQUNDLFFBQVEsRUFjTCxFQUFFO0lBQ0wsTUFBTSxlQUFlLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBbUIsZ0JBQWdCLENBQUMsQ0FBQTtJQUN4RSxNQUFNLGdCQUFnQixHQUFHLGVBQWUsQ0FBQywyQkFBMkIsRUFBRSxDQUFBO0lBQ3RFLE9BQU8sZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUU7UUFDeEMsTUFBTSxnQkFBZ0IsR0FBRyxRQUFRLENBQUMsU0FBUzthQUN6QyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRTtZQUNqQixJQUFJLE9BQU8sUUFBUSxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUNsQyxPQUFPLFFBQVEsQ0FBQTtZQUNoQixDQUFDO1lBRUQsSUFBSSxJQUFJLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztnQkFDdEMsT0FBTyxRQUFRLENBQUE7WUFDaEIsQ0FBQztZQUVELElBQUksd0JBQXdCLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQztnQkFDeEMsT0FBTztvQkFDTixPQUFPLEVBQUUsUUFBUSxDQUFDLE9BQU87b0JBQ3pCLE9BQU8sRUFBRSxRQUFRLENBQUMsT0FBTztpQkFDekIsQ0FBQTtZQUNGLENBQUM7WUFFRCxPQUFPLElBQUksQ0FBQTtRQUNaLENBQUMsQ0FBQzthQUNELE1BQU0sQ0FBQyxDQUFDLE9BQU8sRUFBRSxFQUFFLENBQUMsT0FBTyxLQUFLLElBQUksQ0FJbkMsQ0FBQTtRQUVILE9BQU87WUFDTixRQUFRLEVBQUUsUUFBUSxDQUFDLEVBQUU7WUFDckIsV0FBVyxFQUFFLFFBQVEsQ0FBQyxXQUFXO1lBQ2pDLGVBQWUsRUFBRSxnQkFBZ0I7WUFDakMsT0FBTyxFQUFFO2dCQUNSLHFCQUFxQixFQUFFLFFBQVEsQ0FBQyxPQUFPLENBQUMscUJBQXFCO2dCQUM3RCx5QkFBeUIsRUFBRSxRQUFRLENBQUMsT0FBTyxDQUFDLHlCQUF5QjtnQkFDckUsZ0JBQWdCLEVBQUUsUUFBUSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0I7YUFDbkQ7U0FDRCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQ0QsQ0FBQTtBQUVELGdCQUFnQixDQUFDLGVBQWUsQ0FDL0IseUJBQXlCLEVBQ3pCLEtBQUssRUFDSixRQUFRLEVBQ1IsSUFHQyxFQVVBLEVBQUU7SUFDSCxNQUFNLHFCQUFxQixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtJQUNsRSxNQUFNLEdBQUcsR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFvQixDQUFDLENBQUE7SUFDakQsTUFBTSxPQUFPLEdBQUcscUJBQXFCLENBQUMsaUJBQWlCLENBQUMsRUFBRSxHQUFHLEVBQUUsWUFBWSxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO0lBRTdGLE9BQU8sT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDckMsRUFBRSxFQUFFLFFBQVEsQ0FBQyxFQUFFO1FBQ2YsS0FBSyxFQUFFLFFBQVEsQ0FBQyxLQUFLO1FBQ3JCLFdBQVcsRUFBRSxRQUFRLENBQUMsV0FBVztRQUNqQyxNQUFNLEVBQUUsUUFBUSxDQUFDLE1BQU07UUFDdkIsV0FBVyxFQUFFLEtBQUssRUFBRSx5QkFBeUI7UUFDN0MsUUFBUSxFQUFFLFFBQVEsQ0FBQyxXQUFXO0tBQzlCLENBQUMsQ0FBQyxDQUFBO0FBQ0osQ0FBQyxDQUNELENBQUEifQ==