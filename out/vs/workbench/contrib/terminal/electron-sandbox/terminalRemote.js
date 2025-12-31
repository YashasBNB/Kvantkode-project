/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Schemas } from '../../../../base/common/network.js';
import { localize2 } from '../../../../nls.js';
import { INativeEnvironmentService } from '../../../../platform/environment/common/environment.js';
import { IRemoteAuthorityResolverService } from '../../../../platform/remote/common/remoteAuthorityResolver.js';
import { registerTerminalAction } from '../browser/terminalActions.js';
import { IHistoryService } from '../../../services/history/common/history.js';
export function registerRemoteContributions() {
    registerTerminalAction({
        id: "workbench.action.terminal.newLocal" /* TerminalCommandId.NewLocal */,
        title: localize2('workbench.action.terminal.newLocal', 'Create New Integrated Terminal (Local)'),
        run: async (c, accessor) => {
            const historyService = accessor.get(IHistoryService);
            const remoteAuthorityResolverService = accessor.get(IRemoteAuthorityResolverService);
            const nativeEnvironmentService = accessor.get(INativeEnvironmentService);
            let cwd;
            try {
                const activeWorkspaceRootUri = historyService.getLastActiveWorkspaceRoot(Schemas.vscodeRemote);
                if (activeWorkspaceRootUri) {
                    const canonicalUri = await remoteAuthorityResolverService.getCanonicalURI(activeWorkspaceRootUri);
                    if (canonicalUri.scheme === Schemas.file) {
                        cwd = canonicalUri;
                    }
                }
            }
            catch { }
            if (!cwd) {
                cwd = nativeEnvironmentService.userHome;
            }
            const instance = await c.service.createTerminal({ cwd });
            if (!instance) {
                return Promise.resolve(undefined);
            }
            c.service.setActiveInstance(instance);
            return c.groupService.showPanel(true);
        },
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxSZW1vdGUuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9lbGVjdHJvbi1zYW5kYm94L3Rlcm1pbmFsUmVtb3RlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUU1RCxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDOUMsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDbEcsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDL0csT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFFdEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBRTdFLE1BQU0sVUFBVSwyQkFBMkI7SUFDMUMsc0JBQXNCLENBQUM7UUFDdEIsRUFBRSx1RUFBNEI7UUFDOUIsS0FBSyxFQUFFLFNBQVMsQ0FDZixvQ0FBb0MsRUFDcEMsd0NBQXdDLENBQ3hDO1FBQ0QsR0FBRyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUUsUUFBUSxFQUFFLEVBQUU7WUFDMUIsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxlQUFlLENBQUMsQ0FBQTtZQUNwRCxNQUFNLDhCQUE4QixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsK0JBQStCLENBQUMsQ0FBQTtZQUNwRixNQUFNLHdCQUF3QixHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMseUJBQXlCLENBQUMsQ0FBQTtZQUN4RSxJQUFJLEdBQW9CLENBQUE7WUFDeEIsSUFBSSxDQUFDO2dCQUNKLE1BQU0sc0JBQXNCLEdBQUcsY0FBYyxDQUFDLDBCQUEwQixDQUN2RSxPQUFPLENBQUMsWUFBWSxDQUNwQixDQUFBO2dCQUNELElBQUksc0JBQXNCLEVBQUUsQ0FBQztvQkFDNUIsTUFBTSxZQUFZLEdBQ2pCLE1BQU0sOEJBQThCLENBQUMsZUFBZSxDQUFDLHNCQUFzQixDQUFDLENBQUE7b0JBQzdFLElBQUksWUFBWSxDQUFDLE1BQU0sS0FBSyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUM7d0JBQzFDLEdBQUcsR0FBRyxZQUFZLENBQUE7b0JBQ25CLENBQUM7Z0JBQ0YsQ0FBQztZQUNGLENBQUM7WUFBQyxNQUFNLENBQUMsQ0FBQSxDQUFDO1lBQ1YsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO2dCQUNWLEdBQUcsR0FBRyx3QkFBd0IsQ0FBQyxRQUFRLENBQUE7WUFDeEMsQ0FBQztZQUNELE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFBO1lBQ3hELElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztnQkFDZixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUE7WUFDbEMsQ0FBQztZQUVELENBQUMsQ0FBQyxPQUFPLENBQUMsaUJBQWlCLENBQUMsUUFBUSxDQUFDLENBQUE7WUFDckMsT0FBTyxDQUFDLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUN0QyxDQUFDO0tBQ0QsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyJ9