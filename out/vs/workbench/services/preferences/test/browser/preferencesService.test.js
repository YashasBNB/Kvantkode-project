/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { TestCommandService } from '../../../../../editor/test/browser/editorTestServices.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { SyncDescriptor } from '../../../../../platform/instantiation/common/descriptors.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { IURLService } from '../../../../../platform/url/common/url.js';
import { DEFAULT_EDITOR_ASSOCIATION } from '../../../../common/editor.js';
import { IJSONEditingService } from '../../../configuration/common/jsonEditing.js';
import { TestJSONEditingService } from '../../../configuration/test/common/testServices.js';
import { PreferencesService } from '../../browser/preferencesService.js';
import { IPreferencesService } from '../../common/preferences.js';
import { IRemoteAgentService } from '../../../remote/common/remoteAgentService.js';
import { TestRemoteAgentService, workbenchInstantiationService, TestEditorGroupView, TestEditorGroupsService, } from '../../../../test/browser/workbenchTestServices.js';
import { IEditorGroupsService } from '../../../editor/common/editorGroupsService.js';
suite('PreferencesService', () => {
    let testInstantiationService;
    let testObject;
    let lastOpenEditorOptions;
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        testInstantiationService = workbenchInstantiationService({}, disposables);
        class TestOpenEditorGroupView extends TestEditorGroupView {
            openEditor(_editor, options) {
                lastOpenEditorOptions = options;
                _editor.dispose();
                return Promise.resolve(undefined);
            }
        }
        const testEditorGroupService = new TestEditorGroupsService([new TestOpenEditorGroupView(0)]);
        testInstantiationService.stub(IEditorGroupsService, testEditorGroupService);
        testInstantiationService.stub(IJSONEditingService, TestJSONEditingService);
        testInstantiationService.stub(IRemoteAgentService, TestRemoteAgentService);
        testInstantiationService.stub(ICommandService, TestCommandService);
        testInstantiationService.stub(IURLService, { registerHandler: () => { } });
        // PreferencesService creates a PreferencesEditorInput which depends on IPreferencesService, add the real one, not a stub
        const collection = new ServiceCollection();
        collection.set(IPreferencesService, new SyncDescriptor(PreferencesService));
        const instantiationService = disposables.add(testInstantiationService.createChild(collection));
        testObject = disposables.add(instantiationService.createInstance(PreferencesService));
    });
    test('options are preserved when calling openEditor', async () => {
        await testObject.openSettings({ jsonEditor: false, query: 'test query' });
        const options = lastOpenEditorOptions;
        assert.strictEqual(options.focusSearch, true);
        assert.strictEqual(options.override, DEFAULT_EDITOR_ASSOCIATION.id);
        assert.strictEqual(options.query, 'test query');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXNTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvcHJlZmVyZW5jZXMvdGVzdC9icm93c2VyL3ByZWZlcmVuY2VzU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUM3RixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDckYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1FQUFtRSxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUN2RSxPQUFPLEVBQUUsMEJBQTBCLEVBQWUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN0RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNsRixPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsbUJBQW1CLEVBQTBCLE1BQU0sNkJBQTZCLENBQUE7QUFDekYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDbEYsT0FBTyxFQUNOLHNCQUFzQixFQUV0Qiw2QkFBNkIsRUFDN0IsbUJBQW1CLEVBQ25CLHVCQUF1QixHQUN2QixNQUFNLG1EQUFtRCxDQUFBO0FBQzFELE9BQU8sRUFB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