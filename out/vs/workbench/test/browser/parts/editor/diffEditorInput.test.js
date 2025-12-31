/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { EditorInput } from '../../../../common/editor/editorInput.js';
import { DiffEditorInput } from '../../../../common/editor/diffEditorInput.js';
import { workbenchInstantiationService } from '../../workbenchTestServices.js';
import { EditorResourceAccessor, isDiffEditorInput, isResourceDiffEditorInput, isResourceSideBySideEditorInput, } from '../../../../common/editor.js';
import { URI } from '../../../../../base/common/uri.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('Diff editor input', () => {
    class MyEditorInput extends EditorInput {
        constructor(resource = undefined) {
            super();
            this.resource = resource;
        }
        get typeId() {
            return 'myEditorInput';
        }
        resolve() {
            return null;
        }
        toUntyped() {
            return { resource: this.resource, options: { override: this.typeId } };
        }
        matches(otherInput) {
            if (super.matches(otherInput)) {
                return true;
            }
            const resource = EditorResourceAccessor.getCanonicalUri(otherInput);
            return resource?.toString() === this.resource?.toString();
        }
    }
    const disposables = new DisposableStore();
    teardown(() => {
        disposables.clear();
    });
    test('basics', () => {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        let counter = 0;
        const input = disposables.add(new MyEditorInput());
        disposables.add(input.onWillDispose(() => {
            assert(true);
            counter++;
        }));
        const otherInput = disposables.add(new MyEditorInput());
        disposables.add(otherInput.onWillDispose(() => {
            assert(true);
            counter++;
        }));
        const diffInput = instantiationService.createInstance(DiffEditorInput, 'name', 'description', input, otherInput, undefined);
        assert.ok(isDiffEditorInput(diffInput));
        assert.ok(!isDiffEditorInput(input));
        assert.strictEqual(diffInput.original, input);
        assert.strictEqual(diffInput.modified, otherInput);
        assert(diffInput.matches(diffInput));
        assert(!diffInput.matches(otherInput));
        diffInput.dispose();
        assert.strictEqual(counter, 0);
    });
    test('toUntyped', () => {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const input = disposables.add(new MyEditorInput(URI.file('foo/bar1')));
        const otherInput = disposables.add(new MyEditorInput(URI.file('foo/bar2')));
        const diffInput = instantiationService.createInstance(DiffEditorInput, 'name', 'description', input, otherInput, undefined);
        const untypedDiffInput = diffInput.toUntyped();
        assert.ok(isResourceDiffEditorInput(untypedDiffInput));
        assert.ok(!isResourceSideBySideEditorInput(untypedDiffInput));
        assert.ok(diffInput.matches(untypedDiffInput));
    });
    test('disposes when input inside disposes', function () {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        let counter = 0;
        let input = disposables.add(new MyEditorInput());
        let otherInput = disposables.add(new MyEditorInput());
        const diffInput = disposables.add(instantiationService.createInstance(DiffEditorInput, 'name', 'description', input, otherInput, undefined));
        disposables.add(diffInput.onWillDispose(() => {
            counter++;
            assert(true);
        }));
        input.dispose();
        input = disposables.add(new MyEditorInput());
        otherInput = disposables.add(new MyEditorInput());
        const diffInput2 = disposables.add(instantiationService.createInstance(DiffEditorInput, 'name', 'description', input, otherInput, undefined));
        disposables.add(diffInput2.onWillDispose(() => {
            counter++;
            assert(true);
        }));
        otherInput.dispose();
        assert.strictEqual(counter, 2);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGlmZkVkaXRvcklucHV0LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvdGVzdC9icm93c2VyL3BhcnRzL2VkaXRvci9kaWZmRWRpdG9ySW5wdXQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ3RFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM5RSxPQUFPLEVBQ04sc0JBQXNCLEVBQ3RCLGlCQUFpQixFQUNqQix5QkFBeUIsRUFDekIsK0JBQStCLEdBRS9CLE1BQU0sOEJBQThCLENBQUE7QUFDckMsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVsRyxLQUFLLENBQUMsbUJBQW1CLEVBQUUsR0FBRyxFQUFFO0lBQy9CLE1BQU0sYUFBYyxTQUFRLFdBQVc7UUFDdEMsWUFBbUIsV0FBNEIsU0FBUztZQUN2RCxLQUFLLEVBQUUsQ0FBQTtZQURXLGFBQVEsR0FBUixRQUFRLENBQTZCO1FBRXhELENBQUM7UUFFRCxJQUFhLE1BQU07WUFDbEIsT0FBTyxlQUFlLENBQUE7UUFDdkIsQ0FBQztRQUNRLE9BQU87WUFDZixPQUFPLElBQUksQ0FBQTtRQUNaLENBQUM7UUFFUSxTQUFTO1lBQ2pCLE9BQU8sRUFBRSxRQUFRLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsRUFB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