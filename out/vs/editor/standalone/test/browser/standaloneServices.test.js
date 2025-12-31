/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { StandaloneCodeEditorService } from '../../browser/standaloneCodeEditorService.js';
import { StandaloneCommandService, StandaloneConfigurationService, StandaloneKeybindingService, StandaloneNotificationService, } from '../../browser/standaloneServices.js';
import { StandaloneThemeService } from '../../browser/standaloneThemeService.js';
import { ContextKeyService } from '../../../../platform/contextkey/browser/contextKeyService.js';
import { InstantiationService } from '../../../../platform/instantiation/common/instantiationService.js';
import { ServiceCollection } from '../../../../platform/instantiation/common/serviceCollection.js';
import { NullLogService } from '../../../../platform/log/common/log.js';
import { NullTelemetryService } from '../../../../platform/telemetry/common/telemetryUtils.js';
suite('StandaloneKeybindingService', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    class TestStandaloneKeybindingService extends StandaloneKeybindingService {
        testDispatch(e) {
            super._dispatch(e, null);
        }
    }
    test('issue microsoft/monaco-editor#167', () => {
        const disposables = new DisposableStore();
        const serviceCollection = new ServiceCollection();
        const instantiationService = new InstantiationService(serviceCollection, true);
        const configurationService = new StandaloneConfigurationService(new NullLogService());
        const contextKeyService = disposables.add(new ContextKeyService(configurationService));
        const commandService = new StandaloneCommandService(instantiationService);
        const notificationService = new StandaloneNotificationService();
        const standaloneThemeService = disposables.add(new StandaloneThemeService());
        const codeEditorService = disposables.add(new StandaloneCodeEditorService(contextKeyService, standaloneThemeService));
        const keybindingService = disposables.add(new TestStandaloneKeybindingService(contextKeyService, commandService, NullTelemetryService, notificationService, new NullLogService(), codeEditorService));
        let commandInvoked = false;
        disposables.add(keybindingService.addDynamicKeybinding('testCommand', 67 /* KeyCode.F9 */, () => {
            commandInvoked = true;
        }, undefined));
        keybindingService.testDispatch({
            _standardKeyboardEventBrand: true,
            ctrlKey: false,
            shiftKey: false,
            altKey: false,
            metaKey: false,
            altGraphKey: false,
            keyCode: 67 /* KeyCode.F9 */,
            code: null,
        });
        assert.ok(commandInvoked, 'command invoked');
        disposables.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZVNlcnZpY2VzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3Ivc3RhbmRhbG9uZS90ZXN0L2Jyb3dzZXIvc3RhbmRhbG9uZVNlcnZpY2VzLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBRTNCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN0RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQUUsMkJBQTJCLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUMxRixPQUFPLEVBQ04sd0JBQXdCLEVBQ3hCLDhCQUE4QixFQUM5QiwyQkFBMkIsRUFDM0IsNkJBQTZCLEdBQzdCLE1BQU0scUNBQXFDLENBQUE7QUFDNUMsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDaEYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOERBQThELENBQUE7QUFDaEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sbUVBQW1FLENBQUE7QUFDeEcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFFbEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHlEQUF5RCxDQUFBO0FBRTlGLEtBQUssQ0FBQyw2QkFBNkIsRUFBRSxHQUFHLEVBQUU7SUFDekMsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxNQUFNLCtCQUFnQyxTQUFRLDJCQUEyQjtRQUNqRSxZQUFZLENBQUMsQ0FBaUI7WUFDcEMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsSUFBSyxDQUFDLENBQUE7UUFDMUIsQ0FBQztLQUNEO0lBRUQsSUFBSSxDQUFDLG1DQUFtQyxFQUFFLEdBQUcsRUFBRTtRQUM5QyxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBQ3pDLE1BQU0saUJBQWlCLEdBQUcsSUFBSSxpQkFBaUIsRUFBRSxDQUFBO1FBQ2pELE1BQU0sb0JBQW9CLEdBQUcsSUFBSSxvQkFBb0IsQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM5RSxNQUFNLG9CQUFvQixHQUFHLElBQUksOEJBQThCLENBQUMsSUFBSSxjQUFjLEVBQUUsQ0FBQyxDQUFBO1FBQ3JGLE1BQU0saUJBQWlCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGlCQUFpQixDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQTtRQUN0RixNQUFNLGNBQWMsR0FBRyxJQUFJLHdCQUF3QixDQUFDLG9CQUFvQixDQUFDLENBQUE7UUFDekUsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLDZCQUE2QixFQUFFLENBQUE7UUFDL0QsTUFBTSxzQkFBc0IsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksc0JBQXNCLEVBQUUsQ0FBQyxDQUFBO1FBQzVFLE1BQU0saUJBQWlCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDeEMsSUFBSSwyQkFBMkIsQ0FBQyxpQkFBaUIsRUFBRSxzQkFBc0IsQ0FBQyxDQUMxRSxDQUFBO1FBQ0QsTUFBTSxpQkFBaUIsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUN4QyxJQUFJLCtCQUErQixDQUNsQyxpQkFBaUIsRUFDakIsY0FBYyxFQUNkLG9CQUFvQixFQUNwQixtQkFBbUIsRUFDbkIsSUFBSSxjQUFjLEVBQUUsRUFDcEIsaUJBQWlCLENBQ2pCLENBQ0QsQ0FBQTtRQUVELElBQUksY0FBYyxHQUFHLEtBQUssQ0FBQTtRQUMxQixXQUFXLENBQUMsR0FBRyxDQUNkLGlCQUFpQixDQUFDLG9CQUFvQixDQUNyQyxhQUFhLHVCQUViLEdBQUcsRUFBRTtZQUNKLGNBQWMsR0FBRyxJQUFJLENBQUE7UUFDdEIsQ0FBQyxFQUNELFNBQVMsQ0FDVCxDQUNELENBQUE7UUFFRCxpQkFBaUIsQ0FBQyxZQUFZLENBQUM7WUFDOUIsMkJBQTJCLEVBQUUsSUFBSTtZQUNqQyxPQUFPLEVBQUUsS0FBSztZQUNkLFFBQVEsRUFBRSxLQUFLO1lBQ2YsTUFBTSxFQUFFLEtBQUs7WUFDYixPQUFPLEVBQUUsS0FBSztZQUNkLFdBQVcsRUFBRSxLQUFLO1lBQ2xCLE9BQU8scUJBQVk7WUFDbkIsSUFBSSxFQUFFLElBQUs7U0FDWCxDQUFDLENBQUE7UUFFRixNQUFNLENBQUMsRUFBRSxDQUFDLGNBQWMsRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO1FBRTVDLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUN0QixDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=