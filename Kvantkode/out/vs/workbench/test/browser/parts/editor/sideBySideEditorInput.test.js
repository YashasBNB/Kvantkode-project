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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lkZUJ5U2lkZUVkaXRvcklucHV0LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC90ZXN0L2Jyb3dzZXIvcGFydHMvZWRpdG9yL3NpZGVCeVNpZGVFZGl0b3JJbnB1dC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFDTixzQkFBc0IsRUFFdEIsK0JBQStCLEVBQy9CLHVCQUF1QixHQUV2QixNQUFNLDhCQUE4QixDQUFBO0FBQ3JDLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUN0RSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUMxRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUVuRyxLQUFLLENBQUMsdUJBQXVCLEVBQUUsR0FBRyxFQUFFO0lBQ25DLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7SUFFekMsUUFBUSxDQUFDLEdBQUcsRUFBRTtRQUNiLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUNwQixDQUFDLENBQUMsQ0FBQTtJQUVGLE1BQU0sYUFBYyxTQUFRLFdBQVc7UUFDdEMsWUFBbUIsV0FBNEIsU0FBUztZQUN2RCxLQUFLLEVBQUUsQ0FBQTtZQURXLGFBQVEsR0FBUixRQUFRLENBQTZCO1FBRXhELENBQUM7UUFF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