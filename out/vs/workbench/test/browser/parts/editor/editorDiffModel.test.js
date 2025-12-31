/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { TextDiffEditorModel } from '../../../../common/editor/textDiffEditorModel.js';
import { DiffEditorInput } from '../../../../common/editor/diffEditorInput.js';
import { TextResourceEditorInput } from '../../../../common/editor/textResourceEditorInput.js';
import { URI } from '../../../../../base/common/uri.js';
import { workbenchInstantiationService, TestServiceAccessor } from '../../workbenchTestServices.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('TextDiffEditorModel', () => {
    const disposables = new DisposableStore();
    let instantiationService;
    let accessor;
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
    });
    teardown(() => {
        disposables.clear();
    });
    test('basics', async () => {
        disposables.add(accessor.textModelResolverService.registerTextModelContentProvider('test', {
            provideTextContent: async function (resource) {
                if (resource.scheme === 'test') {
                    const modelContent = 'Hello Test';
                    const languageSelection = accessor.languageService.createById('json');
                    return disposables.add(accessor.modelService.createModel(modelContent, languageSelection, resource));
                }
                return null;
            },
        }));
        const input = disposables.add(instantiationService.createInstance(TextResourceEditorInput, URI.from({ scheme: 'test', authority: null, path: 'thePath' }), 'name', 'description', undefined, undefined));
        const otherInput = disposables.add(instantiationService.createInstance(TextResourceEditorInput, URI.from({ scheme: 'test', authority: null, path: 'thePath' }), 'name2', 'description', undefined, undefined));
        const diffInput = disposables.add(instantiationService.createInstance(DiffEditorInput, 'name', 'description', input, otherInput, undefined));
        let model = disposables.add((await diffInput.resolve()));
        assert(model);
        assert(model instanceof TextDiffEditorModel);
        const diffEditorModel = model.textDiffEditorModel;
        assert(diffEditorModel.original);
        assert(diffEditorModel.modified);
        model = disposables.add((await diffInput.resolve()));
        assert(model.isResolved());
        assert(diffEditorModel !== model.textDiffEditorModel);
        diffInput.dispose();
        assert(!model.textDiffEditorModel);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yRGlmZk1vZGVsLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvdGVzdC9icm93c2VyL3BhcnRzL2VkaXRvci9lZGl0b3JEaWZmTW9kZWwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDdEYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzlFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQzlGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUduRyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEcsS0FBSyxDQUFDLHFCQUFxQixFQUFFLEdBQUcsRUFBRTtJQUNqQyxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO0lBQ3pDLElBQUksb0JBQTJDLENBQUE7SUFDL0MsSUFBSSxRQUE2QixDQUFBO0lBRWpDLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixvQkFBb0IsR0FBRyw2QkFBNkIsQ0FBQyxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDNUUsUUFBUSxHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO0lBQ3BFLENBQUMsQ0FBQyxDQUFBO0lBRUYsUUFBUSxDQUFDLEdBQUcsRUFBRTtRQUNiLFdBQVcsQ0FBQyxLQUFLLEVB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