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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJlZmVyZW5jZXNTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9wcmVmZXJlbmNlcy90ZXN0L2Jyb3dzZXIvcHJlZmVyZW5jZXNTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDBEQUEwRCxDQUFBO0FBQzdGLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNyRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDNUYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUVBQW1FLENBQUE7QUFDckcsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSwwQkFBMEIsRUFBZSxNQUFNLDhCQUE4QixDQUFBO0FBQ3RGLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ2xGLE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQzNGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxtQkFBbUIsRUFBMEIsTUFBTSw2QkFBNkIsQ0FBQTtBQUN6RixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUNsRixPQUFPLEVBQ04sc0JBQXNCLEVBRXRCLDZCQUE2QixFQUM3QixtQkFBbUIsRUFDbkIsdUJBQXVCLEdBQ3ZCLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FB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