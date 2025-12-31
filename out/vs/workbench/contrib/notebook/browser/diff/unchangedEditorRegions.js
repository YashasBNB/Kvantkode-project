/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { Emitter } from '../../../../../base/common/event.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
export function getUnchangedRegionSettings(configurationService) {
    return createHideUnchangedRegionOptions(configurationService);
}
function createHideUnchangedRegionOptions(configurationService) {
    const disposables = new DisposableStore();
    const unchangedRegionsEnablementEmitter = disposables.add(new Emitter());
    const result = {
        options: {
            enabled: configurationService.getValue('diffEditor.hideUnchangedRegions.enabled'),
            minimumLineCount: configurationService.getValue('diffEditor.hideUnchangedRegions.minimumLineCount'),
            contextLineCount: configurationService.getValue('diffEditor.hideUnchangedRegions.contextLineCount'),
            revealLineCount: configurationService.getValue('diffEditor.hideUnchangedRegions.revealLineCount'),
        },
        // We only care about enable/disablement.
        // If user changes counters when a diff editor is open, we do not care, might as well ask user to reload.
        // Simpler and almost never going to happen.
        onDidChangeEnablement: unchangedRegionsEnablementEmitter.event.bind(unchangedRegionsEnablementEmitter),
        dispose: () => disposables.dispose(),
    };
    disposables.add(configurationService.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('diffEditor.hideUnchangedRegions.minimumLineCount')) {
            result.options.minimumLineCount = configurationService.getValue('diffEditor.hideUnchangedRegions.minimumLineCount');
        }
        if (e.affectsConfiguration('diffEditor.hideUnchangedRegions.contextLineCount')) {
            result.options.contextLineCount = configurationService.getValue('diffEditor.hideUnchangedRegions.contextLineCount');
        }
        if (e.affectsConfiguration('diffEditor.hideUnchangedRegions.revealLineCount')) {
            result.options.revealLineCount = configurationService.getValue('diffEditor.hideUnchangedRegions.revealLineCount');
        }
        if (e.affectsConfiguration('diffEditor.hideUnchangedRegions.enabled')) {
            result.options.enabled = configurationService.getValue('diffEditor.hideUnchangedRegions.enabled');
            unchangedRegionsEnablementEmitter.fire(result.options.enabled);
        }
    }));
    return result;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5jaGFuZ2VkRWRpdG9yUmVnaW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL2Jyb3dzZXIvZGlmZi91bmNoYW5nZWRFZGl0b3JSZWdpb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxPQUFPLEVBQVMsTUFBTSxxQ0FBcUMsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsZUFBZSxFQUFlLE1BQU0seUNBQXlDLENBQUE7QUFhdEYsTUFBTSxVQUFVLDBCQUEwQixDQUN6QyxvQkFBMkM7SUFFM0MsT0FBTyxnQ0FBZ0MsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFBO0FBQzlELENBQUM7QUFFRCxTQUFTLGdDQUFnQyxDQUN4QyxvQkFBMkM7SUFFM0MsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtJQUN6QyxNQUFNLGlDQUFpQyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxPQUFPLEVBQVcsQ0FBQyxDQUFBO0lBRWpGLE1BQU0sTUFBTSxHQUFHO1FBQ2QsT0FBTyxFQUFFO1lBQ1IsT0FBTyxFQUFFLG9CQUFvQixDQUFDLFFBQVEsQ0FBVSx5Q0FBeUMsQ0FBQztZQUMxRixnQkFBZ0IsRUFBRSxvQkFBb0IsQ0FBQyxRQUFRLENBQzlDLGtEQUFrRCxDQUNsRDtZQUNELGdCQUFnQixFQUFFLG9CQUFvQixDQUFDLFFBQVEsQ0FDOUMsa0RBQWtELENBQ2xEO1lBQ0QsZUFBZSxFQUFFLG9CQUFvQixDQUFDLFFBQVEsQ0FDN0MsaURBQWlELENBQ2pEO1NBQ0Q7UUFDRCx5Q0FBeUM7UUFDekMseUdBQXlHO1FBQ3pHLDRDQUE0QztRQUM1QyxxQkFBcUIsRUFBRSxpQ0FBaUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUNsRSxpQ0FBaUMsQ0FDakM7UUFDRCxPQUFPLEVBQUUsR0FBRyxFQUFFLENBQUMsV0FBVyxDQUFDLE9BQU8sRUFBRTtLQUNwQyxDQUFBO0lBRUQsV0FBVyxDQUFDLEdBQUcsQ0FDZCxvQkFBb0IsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1FBQ25ELElBQUksQ0FBQyxDQUFDLG9CQUFvQixDQUFDLGtEQUFrRCxDQUFDLEVBQUUsQ0FBQztZQUNoRixNQUFNLENBQUMsT0FBTyxDQUFDLGdCQUFnQixHQUFHLG9CQUFvQixDQUFDLFFBQVEsQ0FDOUQsa0RBQWtELENBQ2xELENBQUE7UUFDRixDQUFDO1FBQ0QsSUFBSSxDQUFDLENBQUMsb0JBQW9CLENBQUMsa0RBQWtELENBQUMsRUFBRSxDQUFDO1lBQ2hGLE1BQU0sQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLEdBQUcsb0JBQW9CLENBQUMsUUFBUSxDQUM5RCxrREFBa0QsQ0FDbEQsQ0FBQTtRQUNGLENBQUM7UUFDRCxJQUFJLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxpREFBaUQsQ0FBQyxFQUFFLENBQUM7WUFDL0UsTUFBTSxDQUFDLE9BQU8sQ0FBQyxlQUFlLEdBQUcsb0JBQW9CLENBQUMsUUFBUSxDQUM3RCxpREFBaUQsQ0FDakQsQ0FBQTtRQUNGLENBQUM7UUFDRCxJQUFJLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyx5Q0FBeUMsQ0FBQyxFQUFFLENBQUM7WUFDdkUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLEdBQUcsb0JBQW9CLENBQUMsUUFBUSxDQUNyRCx5Q0FBeUMsQ0FDekMsQ0FBQTtZQUNELGlDQUFpQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQy9ELENBQUM7SUFDRixDQUFDLENBQUMsQ0FDRixDQUFBO0lBRUQsT0FBTyxNQUFNLENBQUE7QUFDZCxDQUFDIn0=