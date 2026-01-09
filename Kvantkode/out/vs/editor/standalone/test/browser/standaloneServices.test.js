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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RhbmRhbG9uZVNlcnZpY2VzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9zdGFuZGFsb25lL3Rlc3QvYnJvd3Nlci9zdGFuZGFsb25lU2VydmljZXMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFFM0IsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSwyQkFBMkIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzFGLE9BQU8sRUFDTix3QkFBd0IsRUFDeEIsOEJBQThCLEVBQzlCLDJCQUEyQixFQUMzQiw2QkFBNkIsR0FDN0IsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM1QyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUNoRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQTtBQUN4RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUVsRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDdkUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0seURBQXlELENBQUE7QUFFOUYsS0FBSyxDQUFDLDZCQUE2QixFQUFFLEdBQUcsRUFBRTtJQUN6Qyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLE1BQU0sK0JBQWdDLFNBQVEsMkJBQTJCO1FBQ2pFLFlBQVksQ0FBQyxDQUFpQjtZQUNwQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxJQUFLLENBQUMsQ0FBQTtRQUMxQixDQUFDO0tBQ0Q7SUFFRCxJQUFJLENBQUMsbUNBQW1DLEVBQUUsR0FBRyxFQUFFO1FBQzlDLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFDekMsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLGlCQUFpQixFQUFFLENBQUE7UUFDakQsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLG9CQUFvQixDQUFDLGlCQUFpQixFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzlFLE1BQU0sb0JBQW9CLEdBQUcsSUFBSSw4QkFBOEIsQ0FBQyxJQUFJLGNBQWMsRUFBRSxDQUFDLENBQUE7UUFDckYsTUFBTSxpQkFBaUIsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksaUJBQWlCLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFBO1FBQ3RGLE1BQU0sY0FBYyxHQUFHLElBQUksd0JBQXdCLENBQUMsb0JBQW9CLENBQUMsQ0FBQTtRQUN6RSxNQUFNLG1CQUFtQixHQUFHLElBQUksNkJBQTZCLEVBQUUsQ0FBQTtRQUMvRCxNQUFNLHNCQUFzQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxzQkFBc0IsRUFBRSxDQUFDLENBQUE7UUFDNUUsTUFBTSxpQkFBaUIsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUN4QyxJQUFJLDJCQUEyQixDQUFDLGlCQUFpQixFQUFFLHNCQUFzQixDQUFDLENBQzFFLENBQUE7UUFDRCxNQUFNLGlCQUFpQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQ3hDLElBQUksK0JBQStCLENBQ2xDLGlCQUFpQixFQUNqQixjQUFjLEVBQ2Qsb0JBQW9CLEVBQ3BCLG1CQUFtQixFQUNuQixJQUFJLGNBQWMsRUFBRSxFQUNwQixpQkFBaUIsQ0FDakIsQ0FDRCxDQUFBO1FBRUQsSUFBSSxjQUFjLEdBQUcsS0FBSyxDQUFBO1FBQzFCLFdBQVcsQ0FBQyxHQUFHLENBQ2QsaUJBQWlCLENBQUMsb0JBQW9CLENBQ3JDLGFBQWEsdUJBRWIsR0FBRyxFQUFFO1lBQ0osY0FBYyxHQUFHLElBQUksQ0FBQTtRQUN0QixDQUFDLEVBQ0QsU0FBUyxDQUNULENBQ0QsQ0FBQTtRQUVELGlCQUFpQixDQUFDLFlBQVksQ0FBQztZQUM5QiwyQkFBMkIsRUFBRSxJQUFJO1lBQ2pDLE9BQU8sRUFBRSxLQUFLO1lBQ2QsUUFBUSxFQUFFLEtBQUs7WUFDZixNQUFNLEVBQUUsS0FBSztZQUNiLE9BQU8sRUFBRSxLQUFLO1lBQ2QsV0FBVyxFQUFFLEtBQUs7WUFDbEIsT0FBTyxxQkFBWTtZQUNuQixJQUFJLEVBQUUsSUFBSztTQUNYLENBQUMsQ0FBQTtRQUVGLE1BQU0sQ0FBQyxFQUFFLENBQUMsY0FBYyxFQUFFLGlCQUFpQixDQUFDLENBQUE7UUFFNUMsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ3RCLENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==