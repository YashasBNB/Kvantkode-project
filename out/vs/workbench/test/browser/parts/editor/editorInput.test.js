/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { Schemas } from '../../../../../base/common/network.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { DEFAULT_EDITOR_ASSOCIATION, isEditorInput, isResourceDiffEditorInput, isResourceEditorInput, isResourceMergeEditorInput, isResourceSideBySideEditorInput, isUntitledResourceEditorInput, } from '../../../../common/editor.js';
import { DiffEditorInput } from '../../../../common/editor/diffEditorInput.js';
import { EditorInput } from '../../../../common/editor/editorInput.js';
import { TextResourceEditorInput } from '../../../../common/editor/textResourceEditorInput.js';
import { FileEditorInput } from '../../../../contrib/files/browser/editors/fileEditorInput.js';
import { MergeEditorInput, } from '../../../../contrib/mergeEditor/browser/mergeEditorInput.js';
import { UntitledTextEditorInput } from '../../../../services/untitled/common/untitledTextEditorInput.js';
import { TestEditorInput, TestServiceAccessor, workbenchInstantiationService, } from '../../workbenchTestServices.js';
suite('EditorInput', () => {
    let instantiationService;
    let accessor;
    const disposables = new DisposableStore();
    const testResource = URI.from({ scheme: 'random', path: '/path' });
    const untypedResourceEditorInput = {
        resource: testResource,
        options: { override: DEFAULT_EDITOR_ASSOCIATION.id },
    };
    const untypedTextResourceEditorInput = {
        resource: testResource,
        options: { override: DEFAULT_EDITOR_ASSOCIATION.id },
    };
    const untypedResourceSideBySideEditorInput = {
        primary: untypedResourceEditorInput,
        secondary: untypedResourceEditorInput,
        options: { override: DEFAULT_EDITOR_ASSOCIATION.id },
    };
    const untypedUntitledResourceEditorinput = {
        resource: URI.from({ scheme: Schemas.untitled, path: '/path' }),
        options: { override: DEFAULT_EDITOR_ASSOCIATION.id },
    };
    const untypedResourceDiffEditorInput = {
        original: untypedResourceEditorInput,
        modified: untypedResourceEditorInput,
        options: { override: DEFAULT_EDITOR_ASSOCIATION.id },
    };
    const untypedResourceMergeEditorInput = {
        base: untypedResourceEditorInput,
        input1: untypedResourceEditorInput,
        input2: untypedResourceEditorInput,
        result: untypedResourceEditorInput,
        options: { override: DEFAULT_EDITOR_ASSOCIATION.id },
    };
    // Function to easily remove the overrides from the untyped inputs
    const stripOverrides = () => {
        if (!untypedResourceEditorInput.options ||
            !untypedTextResourceEditorInput.options ||
            !untypedUntitledResourceEditorinput.options ||
            !untypedResourceDiffEditorInput.options ||
            !untypedResourceMergeEditorInput.options) {
            throw new Error('Malformed options on untyped inputs');
        }
        // Some of the tests mutate the overrides so we want to reset them on each test
        untypedResourceEditorInput.options.override = undefined;
        untypedTextResourceEditorInput.options.override = undefined;
        untypedUntitledResourceEditorinput.options.override = undefined;
        untypedResourceDiffEditorInput.options.override = undefined;
        untypedResourceMergeEditorInput.options.override = undefined;
    };
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
        if (!untypedResourceEditorInput.options ||
            !untypedTextResourceEditorInput.options ||
            !untypedUntitledResourceEditorinput.options ||
            !untypedResourceDiffEditorInput.options ||
            !untypedResourceMergeEditorInput.options) {
            throw new Error('Malformed options on untyped inputs');
        }
        // Some of the tests mutate the overrides so we want to reset them on each test
        untypedResourceEditorInput.options.override = DEFAULT_EDITOR_ASSOCIATION.id;
        untypedTextResourceEditorInput.options.override = DEFAULT_EDITOR_ASSOCIATION.id;
        untypedUntitledResourceEditorinput.options.override = DEFAULT_EDITOR_ASSOCIATION.id;
        untypedResourceDiffEditorInput.options.override = DEFAULT_EDITOR_ASSOCIATION.id;
        untypedResourceMergeEditorInput.options.override = DEFAULT_EDITOR_ASSOCIATION.id;
    });
    teardown(() => {
        disposables.clear();
    });
    class MyEditorInput extends EditorInput {
        constructor() {
            super(...arguments);
            this.resource = undefined;
        }
        get typeId() {
            return 'myEditorInput';
        }
        resolve() {
            return null;
        }
    }
    test('basics', () => {
        let counter = 0;
        const input = disposables.add(new MyEditorInput());
        const otherInput = disposables.add(new MyEditorInput());
        assert.ok(isEditorInput(input));
        assert.ok(!isEditorInput(undefined));
        assert.ok(!isEditorInput({ resource: URI.file('/') }));
        assert.ok(!isEditorInput({}));
        assert.ok(!isResourceEditorInput(input));
        assert.ok(!isUntitledResourceEditorInput(input));
        assert.ok(!isResourceDiffEditorInput(input));
        assert.ok(!isResourceMergeEditorInput(input));
        assert.ok(!isResourceSideBySideEditorInput(input));
        assert(input.matches(input));
        assert(!input.matches(otherInput));
        assert(input.getName());
        disposables.add(input.onWillDispose(() => {
            assert(true);
            counter++;
        }));
        input.dispose();
        assert.strictEqual(counter, 1);
    });
    test('untyped matches', () => {
        const testInputID = 'untypedMatches';
        const testInputResource = URI.file('/fake');
        const testInput = disposables.add(new TestEditorInput(testInputResource, testInputID));
        const testUntypedInput = { resource: testInputResource, options: { override: testInputID } };
        const tetUntypedInputWrongResource = {
            resource: URI.file('/incorrectFake'),
            options: { override: testInputID },
        };
        const testUntypedInputWrongId = {
            resource: testInputResource,
            options: { override: 'wrongId' },
        };
        const testUntypedInputWrong = {
            resource: URI.file('/incorrectFake'),
            options: { override: 'wrongId' },
        };
        assert(testInput.matches(testUntypedInput));
        assert.ok(!testInput.matches(tetUntypedInputWrongResource));
        assert.ok(!testInput.matches(testUntypedInputWrongId));
        assert.ok(!testInput.matches(testUntypedInputWrong));
    });
    test('Untpyed inputs properly match TextResourceEditorInput', () => {
        const textResourceEditorInput = instantiationService.createInstance(TextResourceEditorInput, testResource, undefined, undefined, undefined, undefined);
        assert.ok(textResourceEditorInput.matches(untypedResourceEditorInput));
        assert.ok(textResourceEditorInput.matches(untypedTextResourceEditorInput));
        assert.ok(!textResourceEditorInput.matches(untypedResourceSideBySideEditorInput));
        assert.ok(!textResourceEditorInput.matches(untypedUntitledResourceEditorinput));
        assert.ok(!textResourceEditorInput.matches(untypedResourceDiffEditorInput));
        assert.ok(!textResourceEditorInput.matches(untypedResourceMergeEditorInput));
        textResourceEditorInput.dispose();
    });
    test('Untyped inputs properly match FileEditorInput', () => {
        const fileEditorInput = instantiationService.createInstance(FileEditorInput, testResource, undefined, undefined, undefined, undefined, undefined, undefined);
        assert.ok(fileEditorInput.matches(untypedResourceEditorInput));
        assert.ok(fileEditorInput.matches(untypedTextResourceEditorInput));
        assert.ok(!fileEditorInput.matches(untypedResourceSideBySideEditorInput));
        assert.ok(!fileEditorInput.matches(untypedUntitledResourceEditorinput));
        assert.ok(!fileEditorInput.matches(untypedResourceDiffEditorInput));
        assert.ok(!fileEditorInput.matches(untypedResourceMergeEditorInput));
        // Now we remove the override on the untyped to ensure that FileEditorInput supports lightweight resource matching
        stripOverrides();
        assert.ok(fileEditorInput.matches(untypedResourceEditorInput));
        assert.ok(fileEditorInput.matches(untypedTextResourceEditorInput));
        assert.ok(!fileEditorInput.matches(untypedResourceSideBySideEditorInput));
        assert.ok(!fileEditorInput.matches(untypedUntitledResourceEditorinput));
        assert.ok(!fileEditorInput.matches(untypedResourceDiffEditorInput));
        assert.ok(!fileEditorInput.matches(untypedResourceMergeEditorInput));
        fileEditorInput.dispose();
    });
    test('Untyped inputs properly match MergeEditorInput', () => {
        const mergeData = {
            uri: testResource,
            description: undefined,
            detail: undefined,
            title: undefined,
        };
        const mergeEditorInput = instantiationService.createInstance(MergeEditorInput, testResource, mergeData, mergeData, testResource);
        assert.ok(!mergeEditorInput.matches(untypedResourceEditorInput));
        assert.ok(!mergeEditorInput.matches(untypedTextResourceEditorInput));
        assert.ok(!mergeEditorInput.matches(untypedResourceSideBySideEditorInput));
        assert.ok(!mergeEditorInput.matches(untypedUntitledResourceEditorinput));
        assert.ok(!mergeEditorInput.matches(untypedResourceDiffEditorInput));
        assert.ok(mergeEditorInput.matches(untypedResourceMergeEditorInput));
        stripOverrides();
        assert.ok(!mergeEditorInput.matches(untypedResourceEditorInput));
        assert.ok(!mergeEditorInput.matches(untypedTextResourceEditorInput));
        assert.ok(!mergeEditorInput.matches(untypedResourceSideBySideEditorInput));
        assert.ok(!mergeEditorInput.matches(untypedUntitledResourceEditorinput));
        assert.ok(!mergeEditorInput.matches(untypedResourceDiffEditorInput));
        assert.ok(mergeEditorInput.matches(untypedResourceMergeEditorInput));
        mergeEditorInput.dispose();
    });
    test('Untyped inputs properly match UntitledTextEditorInput', () => {
        const untitledModel = accessor.untitledTextEditorService.create({
            associatedResource: { authority: '', path: '/path', fragment: '', query: '' },
        });
        const untitledTextEditorInput = instantiationService.createInstance(UntitledTextEditorInput, untitledModel);
        assert.ok(!untitledTextEditorInput.matches(untypedResourceEditorInput));
        assert.ok(!untitledTextEditorInput.matches(untypedTextResourceEditorInput));
        assert.ok(!untitledTextEditorInput.matches(untypedResourceSideBySideEditorInput));
        assert.ok(untitledTextEditorInput.matches(untypedUntitledResourceEditorinput));
        assert.ok(!untitledTextEditorInput.matches(untypedResourceDiffEditorInput));
        assert.ok(!untitledTextEditorInput.matches(untypedResourceMergeEditorInput));
        stripOverrides();
        assert.ok(!untitledTextEditorInput.matches(untypedResourceEditorInput));
        assert.ok(!untitledTextEditorInput.matches(untypedTextResourceEditorInput));
        assert.ok(!untitledTextEditorInput.matches(untypedResourceSideBySideEditorInput));
        assert.ok(untitledTextEditorInput.matches(untypedUntitledResourceEditorinput));
        assert.ok(!untitledTextEditorInput.matches(untypedResourceDiffEditorInput));
        assert.ok(!untitledTextEditorInput.matches(untypedResourceMergeEditorInput));
        untitledTextEditorInput.dispose();
    });
    test('Untyped inputs properly match DiffEditorInput', () => {
        const fileEditorInput1 = instantiationService.createInstance(FileEditorInput, testResource, undefined, undefined, undefined, undefined, undefined, undefined);
        const fileEditorInput2 = instantiationService.createInstance(FileEditorInput, testResource, undefined, undefined, undefined, undefined, undefined, undefined);
        const diffEditorInput = instantiationService.createInstance(DiffEditorInput, undefined, undefined, fileEditorInput1, fileEditorInput2, false);
        assert.ok(!diffEditorInput.matches(untypedResourceEditorInput));
        assert.ok(!diffEditorInput.matches(untypedTextResourceEditorInput));
        assert.ok(!diffEditorInput.matches(untypedResourceSideBySideEditorInput));
        assert.ok(!diffEditorInput.matches(untypedUntitledResourceEditorinput));
        assert.ok(diffEditorInput.matches(untypedResourceDiffEditorInput));
        assert.ok(!diffEditorInput.matches(untypedResourceMergeEditorInput));
        stripOverrides();
        assert.ok(!diffEditorInput.matches(untypedResourceEditorInput));
        assert.ok(!diffEditorInput.matches(untypedTextResourceEditorInput));
        assert.ok(!diffEditorInput.matches(untypedResourceSideBySideEditorInput));
        assert.ok(!diffEditorInput.matches(untypedUntitledResourceEditorinput));
        assert.ok(diffEditorInput.matches(untypedResourceDiffEditorInput));
        assert.ok(!diffEditorInput.matches(untypedResourceMergeEditorInput));
        diffEditorInput.dispose();
        fileEditorInput1.dispose();
        fileEditorInput2.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9ySW5wdXQudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3Rlc3QvYnJvd3Nlci9wYXJ0cy9lZGl0b3IvZWRpdG9ySW5wdXQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFNbEcsT0FBTyxFQUNOLDBCQUEwQixFQUkxQixhQUFhLEVBQ2IseUJBQXlCLEVBQ3pCLHFCQUFxQixFQUNyQiwwQkFBMEIsRUFDMUIsK0JBQStCLEVBQy9CLDZCQUE2QixHQUU3QixNQUFNLDhCQUE4QixDQUFBO0FBQ3JDLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDdEUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDOUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhEQUE4RCxDQUFBO0FBQzlGLE9BQU8sRUFDTixnQkFBZ0IsR0FFaEIsTUFBTSw2REFBNkQsQ0FBQTtBQUNwRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUN6RyxPQUFPLEVBQ04sZUFBZSxFQUNmLG1CQUFtQixFQUNuQiw2QkFBNkIsR0FDN0IsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUV2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