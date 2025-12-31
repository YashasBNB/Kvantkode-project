/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { EditorResourceAccessor, isResourceSideBySideEditorInput, isSideBySideEditorInput, } from '../../../../common/editor.js';
import { EditorInput } from '../../../../common/editor/editorInput.js';
import { SideBySideEditorInput } from '../../../../common/editor/sideBySideEditorInput.js';
import { TestFileEditorInput, workbenchInstantiationService } from '../../workbenchTestServices.js';
suite('SideBySideEditorInput', () => {
    const disposables = new DisposableStore();
    teardown(() => {
        disposables.clear();
    });
    class MyEditorInput extends EditorInput {
        constructor(resource = undefined) {
            super();
            this.resource = resource;
        }
        fireCapabilitiesChangeEvent() {
            this._onDidChangeCapabilities.fire();
        }
        fireDirtyChangeEvent() {
            this._onDidChangeDirty.fire();
        }
        fireLabelChangeEvent() {
            this._onDidChangeLabel.fire();
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
    test('basics', () => {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        let counter = 0;
        const input = disposables.add(new MyEditorInput(URI.file('/fake')));
        disposables.add(input.onWillDispose(() => {
            assert(true);
            counter++;
        }));
        const otherInput = disposables.add(new MyEditorInput(URI.file('/fake2')));
        disposables.add(otherInput.onWillDispose(() => {
            assert(true);
            counter++;
        }));
        const sideBySideInput = disposables.add(instantiationService.createInstance(SideBySideEditorInput, 'name', 'description', input, otherInput));
        assert.strictEqual(sideBySideInput.getName(), 'name');
        assert.strictEqual(sideBySideInput.getDescription(), 'description');
        assert.ok(isSideBySideEditorInput(sideBySideInput));
        assert.ok(!isSideBySideEditorInput(input));
        assert.strictEqual(sideBySideInput.secondary, input);
        assert.strictEqual(sideBySideInput.primary, otherInput);
        assert(sideBySideInput.matches(sideBySideInput));
        assert(!sideBySideInput.matches(otherInput));
        sideBySideInput.dispose();
        assert.strictEqual(counter, 0);
        const sideBySideInputSame = disposables.add(instantiationService.createInstance(SideBySideEditorInput, undefined, undefined, input, input));
        assert.strictEqual(sideBySideInputSame.getName(), input.getName());
        assert.strictEqual(sideBySideInputSame.getDescription(), input.getDescription());
        assert.strictEqual(sideBySideInputSame.getTitle(), input.getTitle());
        assert.strictEqual(sideBySideInputSame.resource?.toString(), input.resource?.toString());
    });
    test('events dispatching', () => {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const input = disposables.add(new MyEditorInput());
        const otherInput = disposables.add(new MyEditorInput());
        const sideBySideInut = disposables.add(instantiationService.createInstance(SideBySideEditorInput, 'name', 'description', otherInput, input));
        assert.ok(isSideBySideEditorInput(sideBySideInut));
        let capabilitiesChangeCounter = 0;
        disposables.add(sideBySideInut.onDidChangeCapabilities(() => capabilitiesChangeCounter++));
        let dirtyChangeCounter = 0;
        disposables.add(sideBySideInut.onDidChangeDirty(() => dirtyChangeCounter++));
        let labelChangeCounter = 0;
        disposables.add(sideBySideInut.onDidChangeLabel(() => labelChangeCounter++));
        input.fireCapabilitiesChangeEvent();
        assert.strictEqual(capabilitiesChangeCounter, 1);
        otherInput.fireCapabilitiesChangeEvent();
        assert.strictEqual(capabilitiesChangeCounter, 2);
        input.fireDirtyChangeEvent();
        otherInput.fireDirtyChangeEvent();
        assert.strictEqual(dirtyChangeCounter, 1);
        input.fireLabelChangeEvent();
        otherInput.fireLabelChangeEvent();
        assert.strictEqual(labelChangeCounter, 2);
    });
    test('toUntyped', () => {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const primaryInput = disposables.add(new MyEditorInput(URI.file('/fake')));
        const secondaryInput = disposables.add(new MyEditorInput(URI.file('/fake2')));
        const sideBySideInput = disposables.add(instantiationService.createInstance(SideBySideEditorInput, 'Side By Side Test', undefined, secondaryInput, primaryInput));
        const untypedSideBySideInput = sideBySideInput.toUntyped();
        assert.ok(isResourceSideBySideEditorInput(untypedSideBySideInput));
    });
    test('untyped matches', () => {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const primaryInput = disposables.add(new TestFileEditorInput(URI.file('/fake'), 'primaryId'));
        const secondaryInput = disposables.add(new TestFileEditorInput(URI.file('/fake2'), 'secondaryId'));
        const sideBySideInput = disposables.add(instantiationService.createInstance(SideBySideEditorInput, 'Side By Side Test', undefined, secondaryInput, primaryInput));
        const primaryUntypedInput = { resource: URI.file('/fake'), options: { override: 'primaryId' } };
        const secondaryUntypedInput = {
            resource: URI.file('/fake2'),
            options: { override: 'secondaryId' },
        };
        const sideBySideUntyped = {
            primary: primaryUntypedInput,
            secondary: secondaryUntypedInput,
        };
        assert.ok(sideBySideInput.matches(sideBySideUntyped));
        const primaryUntypedInput2 = {
            resource: URI.file('/fake'),
            options: { override: 'primaryIdWrong' },
        };
        const secondaryUntypedInput2 = {
            resource: URI.file('/fake2'),
            options: { override: 'secondaryId' },
        };
        const sideBySideUntyped2 = {
            primary: primaryUntypedInput2,
            secondary: secondaryUntypedInput2,
        };
        assert.ok(!sideBySideInput.matches(sideBySideUntyped2));
        const primaryUntypedInput3 = { resource: URI.file('/fake'), options: { override: 'primaryId' } };
        const secondaryUntypedInput3 = {
            resource: URI.file('/fake2Wrong'),
            options: { override: 'secondaryId' },
        };
        const sideBySideUntyped3 = {
            primary: primaryUntypedInput3,
            secondary: secondaryUntypedInput3,
        };
        assert.ok(!sideBySideInput.matches(sideBySideUntyped3));
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lkZUJ5U2lkZUVkaXRvcklucHV0LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvdGVzdC9icm93c2VyL3BhcnRzL2VkaXRvci9zaWRlQnlTaWRlRWRpdG9ySW5wdXQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQ04sc0JBQXNCLEVBRXRCLCtCQUErQixFQUMvQix1QkFBdUIsR0FFdkIsTUFBTSw4QkFBOEIsQ0FBQTtBQUNyQyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDdEUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDMUYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLDZCQUE2QixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFbkcsS0FBSyxDQUFDLHVCQUF1QixFQUFFLEdBQUcsRUFBRTtJQUNuQyxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO0lBRXpDLFFBQVEsQ0FBQyxHQUFHLEVBQUU7UUFDYixXQUFXLENBQUMsS0FBSyxFQUFFLENBQUE7SUFDcEIsQ0FBQyxDQUFDLENBQUE7SUFFRixNQUFNLGFBQWMsU0FBUSxXQUFXO1FBQ3RDLFlBQW1CLFdBQTRCLFNBQVM7WUFDdkQsS0FBSyxFQUFFLENBQUE7WUFEVyxhQUFRLEdBQVIsUUFBUSxDQUE2QjtRQUV4RCxDQUFDO1FBRUQsMkJBQTJCO1lBQzFCLElBQUksQ0FB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