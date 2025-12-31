/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { createDecorator } from '../../instantiation/common/instantiation.js';
export const ID = 'diagnosticsService';
export const IDiagnosticsService = createDecorator(ID);
export function isRemoteDiagnosticError(x) {
    return !!x.hostName && !!x.errorMessage;
}
export class NullDiagnosticsService {
    async getPerformanceInfo(mainProcessInfo, remoteInfo) {
        return {};
    }
    async getSystemInfo(mainProcessInfo, remoteInfo) {
        return {
            processArgs: 'nullProcessArgs',
            gpuStatus: 'nullGpuStatus',
            screenReader: 'nullScreenReader',
            remoteData: [],
            os: 'nullOs',
            memory: 'nullMemory',
            vmHint: 'nullVmHint',
        };
    }
    async getDiagnostics(mainProcessInfo, remoteInfo) {
        return '';
    }
    async getWorkspaceFileExtensions(workspace) {
        return { extensions: [] };
    }
    async reportWorkspaceStats(workspace) { }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlhZ25vc3RpY3MuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9kaWFnbm9zdGljcy9jb21tb24vZGlhZ25vc3RpY3MudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFLaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRzdFLE1BQU0sQ0FBQyxNQUFNLEVBQUUsR0FBRyxvQkFBb0IsQ0FBQTtBQUN0QyxNQUFNLENBQUMsTUFBTSxtQkFBbUIsR0FBRyxlQUFlLENBQXNCLEVBQUUsQ0FBQyxDQUFBO0FBNkYzRSxNQUFNLFVBQVUsdUJBQXVCLENBQUMsQ0FBTTtJQUM3QyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFBO0FBQ3hDLENBQUM7QUFFRCxNQUFNLE9BQU8sc0JBQXNCO0lBR2xDLEtBQUssQ0FBQyxrQkFBa0IsQ0FDdkIsZUFBd0MsRUFDeEMsVUFBOEQ7UUFFOUQsT0FBTyxFQUFFLENBQUE7SUFDVixDQUFDO0lBRUQsS0FBSyxDQUFDLGFBQWEsQ0FDbEIsZUFBd0MsRUFDeEMsVUFBOEQ7UUFFOUQsT0FBTztZQUNOLFdBQVcsRUFBRSxpQkFBaUI7WUFDOUIsU0FBUyxFQUFFLGVBQWU7WUFDMUIsWUFBWSxFQUFFLGtCQUFrQjtZQUNoQyxVQUFVLEVBQUUsRUFBRTtZQUNkLEVBQUUsRUFBRSxRQUFRO1lBQ1osTUFBTSxFQUFFLFlBQVk7WUFDcEIsTUFBTSxFQUFFLFlBQVk7U0FDcEIsQ0FBQTtJQUNGLENBQUM7SUFFRCxLQUFLLENBQUMsY0FBYyxDQUNuQixlQUF3QyxFQUN4QyxVQUE4RDtRQUU5RCxPQUFPLEVBQUUsQ0FBQTtJQUNWLENBQUM7SUFFRCxLQUFLLENBQUMsMEJBQTBCLENBQUMsU0FBcUI7UUFDckQsT0FBTyxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsQ0FBQTtJQUMxQixDQUFDO0lBRUQsS0FBSyxDQUFDLG9CQUFvQixDQUFDLFNBQWdDLElBQWtCLENBQUM7Q0FDOUUifQ==