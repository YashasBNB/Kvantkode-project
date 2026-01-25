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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW5jaGFuZ2VkRWRpdG9yUmVnaW9ucy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvbm90ZWJvb2svYnJvd3Nlci9kaWZmL3VuY2hhbmdlZEVkaXRvclJlZ2lvbnMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLE9BQU8sRUFBUyxNQUFNLHFDQUFxQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxlQUFlLEVBQWUsTUFBTSx5Q0FBeUMsQ0FBQTtBQWF0RixNQUFNLFVBQVUsMEJBQTBCLENBQ3pDLG9CQUEyQztJQUUzQyxPQUFPLGdDQUFnQyxDQUFDLG9CQUFvQixDQUFDLENBQUE7QUFDOUQsQ0FBQztBQUVELFNBQVMsZ0NBQWdDLENBQ3hDLG9CQUEyQztJQUUzQyxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO0lBQ3pDLE1BQU0saUNBQWlDLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLE9BQU8sRUFBVyxDQUFDLENBQUE7SUFFakYsTUFBTSxNQUFNLEdBQUc7UUFDZCxPQUFPLEVBQUU7WUFDUixPQUFPLEVBQUUsb0JBQW9CLENBQUMsUUFBUSxDQUFVLHlDQUF5QyxDQUFDO1lBQzFGLGdCQUFnQixFQUFFLG9CQUFvQixDQUFDLFFBQVEsQ0FDOUMsa0RBQWtELENBQ2xEO1lBQ0QsZ0JBQWdCLEVBQUUsb0JBQW9CLENBQUMsUUFBUSxDQUM5QyxrREFBa0QsQ0FDbEQ7WUFDRCxlQUFlLEVBQUUsb0JBQW9CLENBQUMsUUFBUSxDQUM3QyxpREFBaUQsQ0FDakQ7U0FDRDtRQUNELHlDQUF5QztRQUN6Qyx5R0FBeUc7UUFDekcsNENBQTRDO1FBQzVDLHFCQUFxQixFQUFFLGlDQUFpQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQ2xFLGlDQUFpQyxDQUNqQztRQUNELE9BQU8sRUFBRSxHQUFHLEVBQUUsQ0FBQyxXQUFXLENBQUMsT0FBTyxFQUFFO0tBQ3BDLENBQUE7SUFFRCxXQUFXLENBQUMsR0FBRyxDQUNkLG9CQUFvQixDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7UUFDbkQsSUFBSSxDQUFDLENBQUMsb0JBQW9CLENBQUMsa0RBQWtELENBQUMsRUFBRSxDQUFDO1lBQ2hGLE1BQU0sQ0FBQyxPQUFPLENBQUMsZ0JBQWdCLEdBQUcsb0JBQW9CLENBQUMsUUFBUSxDQUM5RCxrREFBa0QsQ0FDbEQsQ0FBQTtRQUNGLENBQUM7UUFDRCxJQUFJLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxrREFBa0QsQ0FBQyxFQUFFLENBQUM7WUFDaEYsTUFBTSxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsR0FBRyxvQkFBb0IsQ0FBQyxRQUFRLENBQzlELGtEQUFrRCxDQUNsRCxDQUFBO1FBQ0YsQ0FBQztRQUNELElBQUksQ0FBQyxDQUFDLG9CQUFvQixDQUFDLGlEQUFpRCxDQUFDLEVBQUUsQ0FBQztZQUMvRSxNQUFNLENBQUMsT0FBTyxDQUFDLGVBQWUsR0FBRyxvQkFBb0IsQ0FBQyxRQUFRLENBQzdELGlEQUFpRCxDQUNqRCxDQUFBO1FBQ0YsQ0FBQztRQUNELElBQUksQ0FBQyxDQUFDLG9CQUFvQixDQUFDLHlDQUF5QyxDQUFDLEVBQUUsQ0FBQztZQUN2RSxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sR0FBRyxvQkFBb0IsQ0FBQyxRQUFRLENBQ3JELHlDQUF5QyxDQUN6QyxDQUFBO1lBQ0QsaUNBQWlDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDL0QsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7SUFFRCxPQUFPLE1BQU0sQ0FBQTtBQUNkLENBQUMifQ==