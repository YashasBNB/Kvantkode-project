/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { EditorResourceAccessor, SideBySideEditor, isEditorIdentifier, isResourceEditorInput, isUntitledResourceEditorInput, isResourceDiffEditorInput, isEditorInputWithOptionsAndGroup, isEditorInputWithOptions, isEditorInput, isResourceSideBySideEditorInput, isTextEditorViewState, isResourceMergeEditorInput, } from '../../../../common/editor.js';
import { DiffEditorInput } from '../../../../common/editor/diffEditorInput.js';
import { URI } from '../../../../../base/common/uri.js';
import { workbenchInstantiationService, TestServiceAccessor, TestEditorInput, registerTestEditor, registerTestFileEditor, registerTestResourceEditor, TestFileEditorInput, createEditorPart, registerTestSideBySideEditor, } from '../../workbenchTestServices.js';
import { Schemas } from '../../../../../base/common/network.js';
import { UntitledTextEditorInput } from '../../../../services/untitled/common/untitledTextEditorInput.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite, toResource, } from '../../../../../base/test/common/utils.js';
import { SyncDescriptor } from '../../../../../platform/instantiation/common/descriptors.js';
import { whenEditorClosed } from '../../../../browser/editor.js';
import { IEditorGroupsService } from '../../../../services/editor/common/editorGroupsService.js';
import { EditorService } from '../../../../services/editor/browser/editorService.js';
import { IEditorService } from '../../../../services/editor/common/editorService.js';
import { SideBySideEditorInput } from '../../../../common/editor/sideBySideEditorInput.js';
import { EditorResolution, } from '../../../../../platform/editor/common/editor.js';
import { Position } from '../../../../../editor/common/core/position.js';
suite('Workbench editor utils', () => {
    class TestEditorInputWithPreferredResource extends TestEditorInput {
        constructor(resource, preferredResource, typeId) {
            super(resource, typeId);
            this.preferredResource = preferredResource;
        }
    }
    const disposables = new DisposableStore();
    const TEST_EDITOR_ID = 'MyTestEditorForEditors';
    let instantiationService;
    let accessor;
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
        disposables.add(accessor.untitledTextEditorService);
        disposables.add(registerTestFileEditor());
        disposables.add(registerTestSideBySideEditor());
        disposables.add(registerTestResourceEditor());
        disposables.add(registerTestEditor(TEST_EDITOR_ID, [new SyncDescriptor(TestFileEditorInput)]));
    });
    teardown(() => {
        disposables.clear();
    });
    test('untyped check functions', () => {
        assert.ok(!isResourceEditorInput(undefined));
        assert.ok(!isResourceEditorInput({}));
        assert.ok(!isResourceEditorInput({
            original: { resource: URI.file('/') },
            modified: { resource: URI.file('/') },
        }));
        assert.ok(isResourceEditorInput({ resource: URI.file('/') }));
        assert.ok(!isUntitledResourceEditorInput(undefined));
        assert.ok(isUntitledResourceEditorInput({}));
        assert.ok(isUntitledResourceEditorInput({ resource: URI.file('/').with({ scheme: Schemas.untitled }) }));
        assert.ok(isUntitledResourceEditorInput({ resource: URI.file('/'), forceUntitled: true }));
        assert.ok(!isResourceDiffEditorInput(undefined));
        assert.ok(!isResourceDiffEditorInput({}));
        assert.ok(!isResourceDiffEditorInput({ resource: URI.file('/') }));
        assert.ok(isResourceDiffEditorInput({
            original: { resource: URI.file('/') },
            modified: { resource: URI.file('/') },
        }));
        assert.ok(isResourceDiffEditorInput({
            original: { resource: URI.file('/') },
            modified: { resource: URI.file('/') },
            primary: { resource: URI.file('/') },
            secondary: { resource: URI.file('/') },
        }));
        assert.ok(!isResourceDiffEditorInput({
            primary: { resource: URI.file('/') },
            secondary: { resource: URI.file('/') },
        }));
        assert.ok(!isResourceSideBySideEditorInput(undefined));
        assert.ok(!isResourceSideBySideEditorInput({}));
        assert.ok(!isResourceSideBySideEditorInput({ resource: URI.file('/') }));
        assert.ok(isResourceSideBySideEditorInput({
            primary: { resource: URI.file('/') },
            secondary: { resource: URI.file('/') },
        }));
        assert.ok(!isResourceSideBySideEditorInput({
            original: { resource: URI.file('/') },
            modified: { resource: URI.file('/') },
        }));
        assert.ok(!isResourceSideBySideEditorInput({
            primary: { resource: URI.file('/') },
            secondary: { resource: URI.file('/') },
            original: { resource: URI.file('/') },
            modified: { resource: URI.file('/') },
        }));
        assert.ok(!isResourceMergeEditorInput(undefined));
        assert.ok(!isResourceMergeEditorInput({}));
        assert.ok(!isResourceMergeEditorInput({ resource: URI.file('/') }));
        assert.ok(isResourceMergeEditorInput({
            input1: { resource: URI.file('/') },
            input2: { resource: URI.file('/') },
            base: { resource: URI.file('/') },
            result: { resource: URI.file('/') },
        }));
    });
    test('EditorInputCapabilities', () => {
        const testInput1 = disposables.add(new TestFileEditorInput(URI.file('resource1'), 'testTypeId'));
        const testInput2 = disposables.add(new TestFileEditorInput(URI.file('resource2'), 'testTypeId'));
        testInput1.capabilities = 0 /* EditorInputCapabilities.None */;
        assert.strictEqual(testInput1.hasCapability(0 /* EditorInputCapabilities.None */), true);
        assert.strictEqual(testInput1.hasCapability(2 /* EditorInputCapabilities.Readonly */), false);
        assert.strictEqual(testInput1.isReadonly(), false);
        assert.strictEqual(testInput1.hasCapability(4 /* EditorInputCapabilities.Untitled */), false);
        assert.strictEqual(testInput1.hasCapability(16 /* EditorInputCapabilities.RequiresTrust */), false);
        assert.strictEqual(testInput1.hasCapability(8 /* EditorInputCapabilities.Singleton */), false);
        testInput1.capabilities |= 2 /* EditorInputCapabilities.Readonly */;
        assert.strictEqual(testInput1.hasCapability(2 /* EditorInputCapabilities.Readonly */), true);
        assert.strictEqual(!!testInput1.isReadonly(), true);
        assert.strictEqual(testInput1.hasCapability(0 /* EditorInputCapabilities.None */), false);
        assert.strictEqual(testInput1.hasCapability(4 /* EditorInputCapabilities.Untitled */), false);
        assert.strictEqual(testInput1.hasCapability(16 /* EditorInputCapabilities.RequiresTrust */), false);
        assert.strictEqual(testInput1.hasCapability(8 /* EditorInputCapabilities.Singleton */), false);
        testInput1.capabilities = 0 /* EditorInputCapabilities.None */;
        testInput2.capabilities = 0 /* EditorInputCapabilities.None */;
        const sideBySideInput = instantiationService.createInstance(SideBySideEditorInput, 'name', undefined, testInput1, testInput2);
        assert.strictEqual(sideBySideInput.hasCapability(256 /* EditorInputCapabilities.MultipleEditors */), true);
        assert.strictEqual(sideBySideInput.hasCapability(2 /* EditorInputCapabilities.Readonly */), false);
        assert.strictEqual(sideBySideInput.isReadonly(), false);
        assert.strictEqual(sideBySideInput.hasCapability(4 /* EditorInputCapabilities.Untitled */), false);
        assert.strictEqual(sideBySideInput.hasCapability(16 /* EditorInputCapabilities.RequiresTrust */), false);
        assert.strictEqual(sideBySideInput.hasCapability(8 /* EditorInputCapabilities.Singleton */), false);
        testInput1.capabilities |= 2 /* EditorInputCapabilities.Readonly */;
        assert.strictEqual(sideBySideInput.hasCapability(2 /* EditorInputCapabilities.Readonly */), false);
        assert.strictEqual(sideBySideInput.isReadonly(), false);
        testInput2.capabilities |= 2 /* EditorInputCapabilities.Readonly */;
        assert.strictEqual(sideBySideInput.hasCapability(2 /* EditorInputCapabilities.Readonly */), true);
        assert.strictEqual(!!sideBySideInput.isReadonly(), true);
        testInput1.capabilities |= 4 /* EditorInputCapabilities.Untitled */;
        assert.strictEqual(sideBySideInput.hasCapability(4 /* EditorInputCapabilities.Untitled */), false);
        testInput2.capabilities |= 4 /* EditorInputCapabilities.Untitled */;
        assert.strictEqual(sideBySideInput.hasCapability(4 /* EditorInputCapabilities.Untitled */), true);
        testInput1.capabilities |= 16 /* EditorInputCapabilities.RequiresTrust */;
        assert.strictEqual(sideBySideInput.hasCapability(16 /* EditorInputCapabilities.RequiresTrust */), true);
        testInput2.capabilities |= 16 /* EditorInputCapabilities.RequiresTrust */;
        assert.strictEqual(sideBySideInput.hasCapability(16 /* EditorInputCapabilities.RequiresTrust */), true);
        testInput1.capabilities |= 8 /* EditorInputCapabilities.Singleton */;
        assert.strictEqual(sideBySideInput.hasCapability(8 /* EditorInputCapabilities.Singleton */), true);
        testInput2.capabilities |= 8 /* EditorInputCapabilities.Singleton */;
        assert.strictEqual(sideBySideInput.hasCapability(8 /* EditorInputCapabilities.Singleton */), true);
    });
    test('EditorResourceAccessor - typed inputs', () => {
        const service = accessor.untitledTextEditorService;
        assert.ok(!EditorResourceAccessor.getCanonicalUri(null));
        assert.ok(!EditorResourceAccessor.getOriginalUri(null));
        const untitled = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, service.create()));
        assert.strictEqual(EditorResourceAccessor.getCanonicalUri(untitled)?.toString(), untitled.resource.toString());
        assert.strictEqual(EditorResourceAccessor.getCanonicalUri(untitled, {
            supportSideBySide: SideBySideEditor.PRIMARY,
        })?.toString(), untitled.resource.toString());
        assert.strictEqual(EditorResourceAccessor.getCanonicalUri(untitled, {
            supportSideBySide: SideBySideEditor.ANY,
        })?.toString(), untitled.resource.toString());
        assert.strictEqual(EditorResourceAccessor.getCanonicalUri(untitled, {
            supportSideBySide: SideBySideEditor.SECONDARY,
        })?.toString(), untitled.resource.toString());
        assert.strictEqual(EditorResourceAccessor.getCanonicalUri(untitled, {
            supportSideBySide: SideBySideEditor.BOTH,
        })?.toString(), untitled.resource.toString());
        assert.strictEqual(EditorResourceAccessor.getCanonicalUri(untitled, {
            filterByScheme: Schemas.untitled,
        })?.toString(), untitled.resource.toString());
        assert.strictEqual(EditorResourceAccessor.getCanonicalUri(untitled, {
            filterByScheme: [Schemas.file, Schemas.untitled],
        })?.toString(), untitled.resource.toString());
        assert.ok(!EditorResourceAccessor.getCanonicalUri(untitled, { filterByScheme: Schemas.file }));
        assert.strictEqual(EditorResourceAccessor.getOriginalUri(untitled)?.toString(), untitled.resource.toString());
        assert.strictEqual(EditorResourceAccessor.getOriginalUri(untitled, {
            supportSideBySide: SideBySideEditor.PRIMARY,
        })?.toString(), untitled.resource.toString());
        assert.strictEqual(EditorResourceAccessor.getOriginalUri(untitled, {
            supportSideBySide: SideBySideEditor.ANY,
        })?.toString(), untitled.resource.toString());
        assert.strictEqual(EditorResourceAccessor.getOriginalUri(untitled, {
            supportSideBySide: SideBySideEditor.SECONDARY,
        })?.toString(), untitled.resource.toString());
        assert.strictEqual(EditorResourceAccessor.getOriginalUri(untitled, {
            supportSideBySide: SideBySideEditor.BOTH,
        })?.toString(), untitled.resource.toString());
        assert.strictEqual(EditorResourceAccessor.getOriginalUri(untitled, {
            filterByScheme: Schemas.untitled,
        })?.toString(), untitled.resource.toString());
        assert.strictEqual(EditorResourceAccessor.getOriginalUri(untitled, {
            filterByScheme: [Schemas.file, Schemas.untitled],
        })?.toString(), untitled.resource.toString());
        assert.ok(!EditorResourceAccessor.getOriginalUri(untitled, { filterByScheme: Schemas.file }));
        const file = disposables.add(new TestEditorInput(URI.file('/some/path.txt'), 'editorResourceFileTest'));
        assert.strictEqual(EditorResourceAccessor.getCanonicalUri(file)?.toString(), file.resource.toString());
        assert.strictEqual(EditorResourceAccessor.getCanonicalUri(file, {
            supportSideBySide: SideBySideEditor.PRIMARY,
        })?.toString(), file.resource.toString());
        assert.strictEqual(EditorResourceAccessor.getCanonicalUri(file, {
            supportSideBySide: SideBySideEditor.ANY,
        })?.toString(), file.resource.toString());
        assert.strictEqual(EditorResourceAccessor.getCanonicalUri(file, {
            supportSideBySide: SideBySideEditor.SECONDARY,
        })?.toString(), file.resource.toString());
        assert.strictEqual(EditorResourceAccessor.getCanonicalUri(file, {
            supportSideBySide: SideBySideEditor.BOTH,
        })?.toString(), file.resource.toString());
        assert.strictEqual(EditorResourceAccessor.getCanonicalUri(file, { filterByScheme: Schemas.file })?.toString(), file.resource.toString());
        assert.strictEqual(EditorResourceAccessor.getCanonicalUri(file, {
            filterByScheme: [Schemas.file, Schemas.untitled],
        })?.toString(), file.resource.toString());
        assert.ok(!EditorResourceAccessor.getCanonicalUri(file, { filterByScheme: Schemas.untitled }));
        assert.strictEqual(EditorResourceAccessor.getOriginalUri(file)?.toString(), file.resource.toString());
        assert.strictEqual(EditorResourceAccessor.getOriginalUri(file, {
            supportSideBySide: SideBySideEditor.PRIMARY,
        })?.toString(), file.resource.toString());
        assert.strictEqual(EditorResourceAccessor.getOriginalUri(file, {
            supportSideBySide: SideBySideEditor.ANY,
        })?.toString(), file.resource.toString());
        assert.strictEqual(EditorResourceAccessor.getOriginalUri(file, {
            supportSideBySide: SideBySideEditor.SECONDARY,
        })?.toString(), file.resource.toString());
        assert.strictEqual(EditorResourceAccessor.getOriginalUri(file, {
            supportSideBySide: SideBySideEditor.BOTH,
        })?.toString(), file.resource.toString());
        assert.strictEqual(EditorResourceAccessor.getOriginalUri(file, { filterByScheme: Schemas.file })?.toString(), file.resource.toString());
        assert.strictEqual(EditorResourceAccessor.getOriginalUri(file, {
            filterByScheme: [Schemas.file, Schemas.untitled],
        })?.toString(), file.resource.toString());
        assert.ok(!EditorResourceAccessor.getOriginalUri(file, { filterByScheme: Schemas.untitled }));
        const diffInput = instantiationService.createInstance(DiffEditorInput, 'name', 'description', untitled, file, undefined);
        const sideBySideInput = instantiationService.createInstance(SideBySideEditorInput, 'name', 'description', untitled, file);
        for (const input of [diffInput, sideBySideInput]) {
            assert.ok(!EditorResourceAccessor.getCanonicalUri(input));
            assert.ok(!EditorResourceAccessor.getCanonicalUri(input, { filterByScheme: Schemas.file }));
            assert.strictEqual(EditorResourceAccessor.getCanonicalUri(input, {
                supportSideBySide: SideBySideEditor.PRIMARY,
            })?.toString(), file.resource.toString());
            assert.strictEqual(EditorResourceAccessor.getCanonicalUri(input, {
                supportSideBySide: SideBySideEditor.PRIMARY,
                filterByScheme: Schemas.file,
            })?.toString(), file.resource.toString());
            assert.strictEqual(EditorResourceAccessor.getCanonicalUri(input, {
                supportSideBySide: SideBySideEditor.PRIMARY,
                filterByScheme: [Schemas.file, Schemas.untitled],
            })?.toString(), file.resource.toString());
            assert.strictEqual(EditorResourceAccessor.getCanonicalUri(input, {
                supportSideBySide: SideBySideEditor.SECONDARY,
            })?.toString(), untitled.resource.toString());
            assert.strictEqual(EditorResourceAccessor.getCanonicalUri(input, {
                supportSideBySide: SideBySideEditor.SECONDARY,
                filterByScheme: Schemas.untitled,
            })?.toString(), untitled.resource.toString());
            assert.strictEqual(EditorResourceAccessor.getCanonicalUri(input, {
                supportSideBySide: SideBySideEditor.SECONDARY,
                filterByScheme: [Schemas.file, Schemas.untitled],
            })?.toString(), untitled.resource.toString());
            assert.strictEqual(EditorResourceAccessor.getCanonicalUri(input, {
                supportSideBySide: SideBySideEditor.BOTH,
            }).primary.toString(), file.resource.toString());
            assert.strictEqual(EditorResourceAccessor.getCanonicalUri(input, {
                supportSideBySide: SideBySideEditor.BOTH,
                filterByScheme: Schemas.file,
            }).primary.toString(), file.resource.toString());
            assert.strictEqual(EditorResourceAccessor.getCanonicalUri(input, {
                supportSideBySide: SideBySideEditor.BOTH,
                filterByScheme: [Schemas.file, Schemas.untitled],
            }).primary.toString(), file.resource.toString());
            assert.strictEqual(EditorResourceAccessor.getCanonicalUri(input, {
                supportSideBySide: SideBySideEditor.BOTH,
            }).secondary.toString(), untitled.resource.toString());
            assert.strictEqual(EditorResourceAccessor.getCanonicalUri(input, {
                supportSideBySide: SideBySideEditor.BOTH,
                filterByScheme: Schemas.untitled,
            }).secondary.toString(), untitled.resource.toString());
            assert.strictEqual(EditorResourceAccessor.getCanonicalUri(input, {
                supportSideBySide: SideBySideEditor.BOTH,
                filterByScheme: [Schemas.file, Schemas.untitled],
            }).secondary.toString(), untitled.resource.toString());
            assert.ok(!EditorResourceAccessor.getOriginalUri(input));
            assert.ok(!EditorResourceAccessor.getOriginalUri(input, { filterByScheme: Schemas.file }));
            assert.strictEqual(EditorResourceAccessor.getOriginalUri(input, {
                supportSideBySide: SideBySideEditor.PRIMARY,
            })?.toString(), file.resource.toString());
            assert.strictEqual(EditorResourceAccessor.getOriginalUri(input, {
                supportSideBySide: SideBySideEditor.PRIMARY,
                filterByScheme: Schemas.file,
            })?.toString(), file.resource.toString());
            assert.strictEqual(EditorResourceAccessor.getOriginalUri(input, {
                supportSideBySide: SideBySideEditor.PRIMARY,
                filterByScheme: [Schemas.file, Schemas.untitled],
            })?.toString(), file.resource.toString());
            assert.strictEqual(EditorResourceAccessor.getOriginalUri(input, {
                supportSideBySide: SideBySideEditor.SECONDARY,
            })?.toString(), untitled.resource.toString());
            assert.strictEqual(EditorResourceAccessor.getOriginalUri(input, {
                supportSideBySide: SideBySideEditor.SECONDARY,
                filterByScheme: Schemas.untitled,
            })?.toString(), untitled.resource.toString());
            assert.strictEqual(EditorResourceAccessor.getOriginalUri(input, {
                supportSideBySide: SideBySideEditor.SECONDARY,
                filterByScheme: [Schemas.file, Schemas.untitled],
            })?.toString(), untitled.resource.toString());
            assert.strictEqual(EditorResourceAccessor.getOriginalUri(input, {
                supportSideBySide: SideBySideEditor.BOTH,
            }).primary.toString(), file.resource.toString());
            assert.strictEqual(EditorResourceAccessor.getOriginalUri(input, {
                supportSideBySide: SideBySideEditor.BOTH,
                filterByScheme: Schemas.file,
            }).primary.toString(), file.resource.toString());
            assert.strictEqual(EditorResourceAccessor.getOriginalUri(input, {
                supportSideBySide: SideBySideEditor.BOTH,
                filterByScheme: [Schemas.file, Schemas.untitled],
            }).primary.toString(), file.resource.toString());
            assert.strictEqual(EditorResourceAccessor.getOriginalUri(input, {
                supportSideBySide: SideBySideEditor.BOTH,
            }).secondary.toString(), untitled.resource.toString());
            assert.strictEqual(EditorResourceAccessor.getOriginalUri(input, {
                supportSideBySide: SideBySideEditor.BOTH,
                filterByScheme: Schemas.untitled,
            }).secondary.toString(), untitled.resource.toString());
            assert.strictEqual(EditorResourceAccessor.getOriginalUri(input, {
                supportSideBySide: SideBySideEditor.BOTH,
                filterByScheme: [Schemas.file, Schemas.untitled],
            }).secondary.toString(), untitled.resource.toString());
        }
        const resource = URI.file('/some/path.txt');
        const preferredResource = URI.file('/some/PATH.txt');
        const fileWithPreferredResource = disposables.add(new TestEditorInputWithPreferredResource(URI.file('/some/path.txt'), URI.file('/some/PATH.txt'), 'editorResourceFileTest'));
        assert.strictEqual(EditorResourceAccessor.getCanonicalUri(fileWithPreferredResource)?.toString(), resource.toString());
        assert.strictEqual(EditorResourceAccessor.getOriginalUri(fileWithPreferredResource)?.toString(), preferredResource.toString());
    });
    test('EditorResourceAccessor - untyped inputs', () => {
        assert.ok(!EditorResourceAccessor.getCanonicalUri(null));
        assert.ok(!EditorResourceAccessor.getOriginalUri(null));
        const untitledURI = URI.from({
            scheme: Schemas.untitled,
            authority: 'foo',
            path: '/bar',
        });
        const untitled = {
            resource: untitledURI,
        };
        assert.strictEqual(EditorResourceAccessor.getCanonicalUri(untitled)?.toString(), untitled.resource?.toString());
        assert.strictEqual(EditorResourceAccessor.getCanonicalUri(untitled, {
            supportSideBySide: SideBySideEditor.PRIMARY,
        })?.toString(), untitled.resource?.toString());
        assert.strictEqual(EditorResourceAccessor.getCanonicalUri(untitled, {
            supportSideBySide: SideBySideEditor.ANY,
        })?.toString(), untitled.resource?.toString());
        assert.strictEqual(EditorResourceAccessor.getCanonicalUri(untitled, {
            supportSideBySide: SideBySideEditor.SECONDARY,
        })?.toString(), untitled.resource?.toString());
        assert.strictEqual(EditorResourceAccessor.getCanonicalUri(untitled, {
            supportSideBySide: SideBySideEditor.BOTH,
        })?.toString(), untitled.resource?.toString());
        assert.strictEqual(EditorResourceAccessor.getCanonicalUri(untitled, {
            filterByScheme: Schemas.untitled,
        })?.toString(), untitled.resource?.toString());
        assert.strictEqual(EditorResourceAccessor.getCanonicalUri(untitled, {
            filterByScheme: [Schemas.file, Schemas.untitled],
        })?.toString(), untitled.resource?.toString());
        assert.ok(!EditorResourceAccessor.getCanonicalUri(untitled, { filterByScheme: Schemas.file }));
        assert.strictEqual(EditorResourceAccessor.getOriginalUri(untitled)?.toString(), untitled.resource?.toString());
        assert.strictEqual(EditorResourceAccessor.getOriginalUri(untitled, {
            supportSideBySide: SideBySideEditor.PRIMARY,
        })?.toString(), untitled.resource?.toString());
        assert.strictEqual(EditorResourceAccessor.getOriginalUri(untitled, {
            supportSideBySide: SideBySideEditor.ANY,
        })?.toString(), untitled.resource?.toString());
        assert.strictEqual(EditorResourceAccessor.getOriginalUri(untitled, {
            supportSideBySide: SideBySideEditor.SECONDARY,
        })?.toString(), untitled.resource?.toString());
        assert.strictEqual(EditorResourceAccessor.getOriginalUri(untitled, {
            supportSideBySide: SideBySideEditor.BOTH,
        })?.toString(), untitled.resource?.toString());
        assert.strictEqual(EditorResourceAccessor.getOriginalUri(untitled, {
            filterByScheme: Schemas.untitled,
        })?.toString(), untitled.resource?.toString());
        assert.strictEqual(EditorResourceAccessor.getOriginalUri(untitled, {
            filterByScheme: [Schemas.file, Schemas.untitled],
        })?.toString(), untitled.resource?.toString());
        assert.ok(!EditorResourceAccessor.getOriginalUri(untitled, { filterByScheme: Schemas.file }));
        const file = {
            resource: URI.file('/some/path.txt'),
        };
        assert.strictEqual(EditorResourceAccessor.getCanonicalUri(file)?.toString(), file.resource.toString());
        assert.strictEqual(EditorResourceAccessor.getCanonicalUri(file, {
            supportSideBySide: SideBySideEditor.PRIMARY,
        })?.toString(), file.resource.toString());
        assert.strictEqual(EditorResourceAccessor.getCanonicalUri(file, {
            supportSideBySide: SideBySideEditor.ANY,
        })?.toString(), file.resource.toString());
        assert.strictEqual(EditorResourceAccessor.getCanonicalUri(file, {
            supportSideBySide: SideBySideEditor.SECONDARY,
        })?.toString(), file.resource.toString());
        assert.strictEqual(EditorResourceAccessor.getCanonicalUri(file, {
            supportSideBySide: SideBySideEditor.BOTH,
        })?.toString(), file.resource.toString());
        assert.strictEqual(EditorResourceAccessor.getCanonicalUri(file, { filterByScheme: Schemas.file })?.toString(), file.resource.toString());
        assert.strictEqual(EditorResourceAccessor.getCanonicalUri(file, {
            filterByScheme: [Schemas.file, Schemas.untitled],
        })?.toString(), file.resource.toString());
        assert.ok(!EditorResourceAccessor.getCanonicalUri(file, { filterByScheme: Schemas.untitled }));
        assert.strictEqual(EditorResourceAccessor.getOriginalUri(file)?.toString(), file.resource.toString());
        assert.strictEqual(EditorResourceAccessor.getOriginalUri(file, {
            supportSideBySide: SideBySideEditor.PRIMARY,
        })?.toString(), file.resource.toString());
        assert.strictEqual(EditorResourceAccessor.getOriginalUri(file, {
            supportSideBySide: SideBySideEditor.ANY,
        })?.toString(), file.resource.toString());
        assert.strictEqual(EditorResourceAccessor.getOriginalUri(file, {
            supportSideBySide: SideBySideEditor.SECONDARY,
        })?.toString(), file.resource.toString());
        assert.strictEqual(EditorResourceAccessor.getOriginalUri(file, {
            supportSideBySide: SideBySideEditor.BOTH,
        })?.toString(), file.resource.toString());
        assert.strictEqual(EditorResourceAccessor.getOriginalUri(file, { filterByScheme: Schemas.file })?.toString(), file.resource.toString());
        assert.strictEqual(EditorResourceAccessor.getOriginalUri(file, {
            filterByScheme: [Schemas.file, Schemas.untitled],
        })?.toString(), file.resource.toString());
        assert.ok(!EditorResourceAccessor.getOriginalUri(file, { filterByScheme: Schemas.untitled }));
        const diffInput = { original: untitled, modified: file };
        const sideBySideInput = { primary: file, secondary: untitled };
        for (const untypedInput of [diffInput, sideBySideInput]) {
            assert.ok(!EditorResourceAccessor.getCanonicalUri(untypedInput));
            assert.ok(!EditorResourceAccessor.getCanonicalUri(untypedInput, { filterByScheme: Schemas.file }));
            assert.strictEqual(EditorResourceAccessor.getCanonicalUri(untypedInput, {
                supportSideBySide: SideBySideEditor.PRIMARY,
            })?.toString(), file.resource.toString());
            assert.strictEqual(EditorResourceAccessor.getCanonicalUri(untypedInput, {
                supportSideBySide: SideBySideEditor.PRIMARY,
                filterByScheme: Schemas.file,
            })?.toString(), file.resource.toString());
            assert.strictEqual(EditorResourceAccessor.getCanonicalUri(untypedInput, {
                supportSideBySide: SideBySideEditor.PRIMARY,
                filterByScheme: [Schemas.file, Schemas.untitled],
            })?.toString(), file.resource.toString());
            assert.strictEqual(EditorResourceAccessor.getCanonicalUri(untypedInput, {
                supportSideBySide: SideBySideEditor.SECONDARY,
            })?.toString(), untitled.resource?.toString());
            assert.strictEqual(EditorResourceAccessor.getCanonicalUri(untypedInput, {
                supportSideBySide: SideBySideEditor.SECONDARY,
                filterByScheme: Schemas.untitled,
            })?.toString(), untitled.resource?.toString());
            assert.strictEqual(EditorResourceAccessor.getCanonicalUri(untypedInput, {
                supportSideBySide: SideBySideEditor.SECONDARY,
                filterByScheme: [Schemas.file, Schemas.untitled],
            })?.toString(), untitled.resource?.toString());
            assert.strictEqual(EditorResourceAccessor.getCanonicalUri(untypedInput, {
                supportSideBySide: SideBySideEditor.BOTH,
            }).primary.toString(), file.resource.toString());
            assert.strictEqual(EditorResourceAccessor.getCanonicalUri(untypedInput, {
                supportSideBySide: SideBySideEditor.BOTH,
                filterByScheme: Schemas.file,
            }).primary.toString(), file.resource.toString());
            assert.strictEqual(EditorResourceAccessor.getCanonicalUri(untypedInput, {
                supportSideBySide: SideBySideEditor.BOTH,
                filterByScheme: [Schemas.file, Schemas.untitled],
            }).primary.toString(), file.resource.toString());
            assert.strictEqual(EditorResourceAccessor.getCanonicalUri(untypedInput, {
                supportSideBySide: SideBySideEditor.BOTH,
            }).secondary.toString(), untitled.resource?.toString());
            assert.strictEqual(EditorResourceAccessor.getCanonicalUri(untypedInput, {
                supportSideBySide: SideBySideEditor.BOTH,
                filterByScheme: Schemas.untitled,
            }).secondary.toString(), untitled.resource?.toString());
            assert.strictEqual(EditorResourceAccessor.getCanonicalUri(untypedInput, {
                supportSideBySide: SideBySideEditor.BOTH,
                filterByScheme: [Schemas.file, Schemas.untitled],
            }).secondary.toString(), untitled.resource?.toString());
            assert.ok(!EditorResourceAccessor.getOriginalUri(untypedInput));
            assert.ok(!EditorResourceAccessor.getOriginalUri(untypedInput, { filterByScheme: Schemas.file }));
            assert.strictEqual(EditorResourceAccessor.getOriginalUri(untypedInput, {
                supportSideBySide: SideBySideEditor.PRIMARY,
            })?.toString(), file.resource.toString());
            assert.strictEqual(EditorResourceAccessor.getOriginalUri(untypedInput, {
                supportSideBySide: SideBySideEditor.PRIMARY,
                filterByScheme: Schemas.file,
            })?.toString(), file.resource.toString());
            assert.strictEqual(EditorResourceAccessor.getOriginalUri(untypedInput, {
                supportSideBySide: SideBySideEditor.PRIMARY,
                filterByScheme: [Schemas.file, Schemas.untitled],
            })?.toString(), file.resource.toString());
            assert.strictEqual(EditorResourceAccessor.getOriginalUri(untypedInput, {
                supportSideBySide: SideBySideEditor.SECONDARY,
            })?.toString(), untitled.resource?.toString());
            assert.strictEqual(EditorResourceAccessor.getOriginalUri(untypedInput, {
                supportSideBySide: SideBySideEditor.SECONDARY,
                filterByScheme: Schemas.untitled,
            })?.toString(), untitled.resource?.toString());
            assert.strictEqual(EditorResourceAccessor.getOriginalUri(untypedInput, {
                supportSideBySide: SideBySideEditor.SECONDARY,
                filterByScheme: [Schemas.file, Schemas.untitled],
            })?.toString(), untitled.resource?.toString());
            assert.strictEqual(EditorResourceAccessor.getOriginalUri(untypedInput, {
                supportSideBySide: SideBySideEditor.BOTH,
            }).primary.toString(), file.resource.toString());
            assert.strictEqual(EditorResourceAccessor.getOriginalUri(untypedInput, {
                supportSideBySide: SideBySideEditor.BOTH,
                filterByScheme: Schemas.file,
            }).primary.toString(), file.resource.toString());
            assert.strictEqual(EditorResourceAccessor.getOriginalUri(untypedInput, {
                supportSideBySide: SideBySideEditor.BOTH,
                filterByScheme: [Schemas.file, Schemas.untitled],
            }).primary.toString(), file.resource.toString());
            assert.strictEqual(EditorResourceAccessor.getOriginalUri(untypedInput, {
                supportSideBySide: SideBySideEditor.BOTH,
            }).secondary.toString(), untitled.resource?.toString());
            assert.strictEqual(EditorResourceAccessor.getOriginalUri(untypedInput, {
                supportSideBySide: SideBySideEditor.BOTH,
                filterByScheme: Schemas.untitled,
            }).secondary.toString(), untitled.resource?.toString());
            assert.strictEqual(EditorResourceAccessor.getOriginalUri(untypedInput, {
                supportSideBySide: SideBySideEditor.BOTH,
                filterByScheme: [Schemas.file, Schemas.untitled],
            }).secondary.toString(), untitled.resource?.toString());
        }
        const fileMerge = {
            input1: { resource: URI.file('/some/remote.txt') },
            input2: { resource: URI.file('/some/local.txt') },
            base: { resource: URI.file('/some/base.txt') },
            result: { resource: URI.file('/some/merged.txt') },
        };
        assert.strictEqual(EditorResourceAccessor.getCanonicalUri(fileMerge)?.toString(), fileMerge.result.resource.toString());
        assert.strictEqual(EditorResourceAccessor.getOriginalUri(fileMerge)?.toString(), fileMerge.result.resource.toString());
    });
    test('isEditorIdentifier', () => {
        assert.strictEqual(isEditorIdentifier(undefined), false);
        assert.strictEqual(isEditorIdentifier('undefined'), false);
        const testInput1 = disposables.add(new TestFileEditorInput(URI.file('resource1'), 'testTypeId'));
        assert.strictEqual(isEditorIdentifier(testInput1), false);
        assert.strictEqual(isEditorIdentifier({ editor: testInput1, groupId: 3 }), true);
    });
    test('isEditorInputWithOptionsAndGroup', () => {
        const editorInput = disposables.add(new TestFileEditorInput(URI.file('resource1'), 'testTypeId'));
        assert.strictEqual(isEditorInput(editorInput), true);
        assert.strictEqual(isEditorInputWithOptions(editorInput), false);
        assert.strictEqual(isEditorInputWithOptionsAndGroup(editorInput), false);
        const editorInputWithOptions = {
            editor: editorInput,
            options: { override: EditorResolution.PICK },
        };
        assert.strictEqual(isEditorInput(editorInputWithOptions), false);
        assert.strictEqual(isEditorInputWithOptions(editorInputWithOptions), true);
        assert.strictEqual(isEditorInputWithOptionsAndGroup(editorInputWithOptions), false);
        const service = accessor.editorGroupService;
        const editorInputWithOptionsAndGroup = {
            editor: editorInput,
            options: { override: EditorResolution.PICK },
            group: service.activeGroup,
        };
        assert.strictEqual(isEditorInput(editorInputWithOptionsAndGroup), false);
        assert.strictEqual(isEditorInputWithOptions(editorInputWithOptionsAndGroup), true);
        assert.strictEqual(isEditorInputWithOptionsAndGroup(editorInputWithOptionsAndGroup), true);
    });
    test('isTextEditorViewState', () => {
        assert.strictEqual(isTextEditorViewState(undefined), false);
        assert.strictEqual(isTextEditorViewState({}), false);
        const codeEditorViewState = {
            contributionsState: {},
            cursorState: [],
            viewState: {
                scrollLeft: 0,
                firstPosition: new Position(1, 1),
                firstPositionDeltaTop: 1,
            },
        };
        assert.strictEqual(isTextEditorViewState(codeEditorViewState), true);
        const diffEditorViewState = {
            original: codeEditorViewState,
            modified: codeEditorViewState,
        };
        assert.strictEqual(isTextEditorViewState(diffEditorViewState), true);
    });
    test('whenEditorClosed (single editor)', async function () {
        return testWhenEditorClosed(false, false, toResource.call(this, '/path/index.txt'));
    });
    test('whenEditorClosed (multiple editor)', async function () {
        return testWhenEditorClosed(false, false, toResource.call(this, '/path/index.txt'), toResource.call(this, '/test.html'));
    });
    test('whenEditorClosed (single editor, diff editor)', async function () {
        return testWhenEditorClosed(true, false, toResource.call(this, '/path/index.txt'));
    });
    test('whenEditorClosed (multiple editor, diff editor)', async function () {
        return testWhenEditorClosed(true, false, toResource.call(this, '/path/index.txt'), toResource.call(this, '/test.html'));
    });
    test('whenEditorClosed (single custom editor)', async function () {
        return testWhenEditorClosed(false, true, toResource.call(this, '/path/index.txt'));
    });
    test('whenEditorClosed (multiple custom editor)', async function () {
        return testWhenEditorClosed(false, true, toResource.call(this, '/path/index.txt'), toResource.call(this, '/test.html'));
    });
    async function createServices() {
        const instantiationService = workbenchInstantiationService(undefined, disposables);
        const part = await createEditorPart(instantiationService, disposables);
        instantiationService.stub(IEditorGroupsService, part);
        const editorService = disposables.add(instantiationService.createInstance(EditorService, undefined));
        instantiationService.stub(IEditorService, editorService);
        return instantiationService.createInstance(TestServiceAccessor);
    }
    async function testWhenEditorClosed(sideBySide, custom, ...resources) {
        const accessor = await createServices();
        for (const resource of resources) {
            if (custom) {
                await accessor.editorService.openEditor(new TestFileEditorInput(resource, 'testTypeId'), {
                    pinned: true,
                });
            }
            else if (sideBySide) {
                await accessor.editorService.openEditor(instantiationService.createInstance(SideBySideEditorInput, 'testSideBySideEditor', undefined, new TestFileEditorInput(resource, 'testTypeId'), new TestFileEditorInput(resource, 'testTypeId')), { pinned: true });
            }
            else {
                await accessor.editorService.openEditor({ resource, options: { pinned: true } });
            }
        }
        const closedPromise = accessor.instantitionService.invokeFunction((accessor) => whenEditorClosed(accessor, resources));
        accessor.editorGroupService.activeGroup.closeAllEditors();
        await closedPromise;
    }
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC90ZXN0L2Jyb3dzZXIvcGFydHMvZWRpdG9yL2VkaXRvci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQ04sc0JBQXNCLEVBQ3RCLGdCQUFnQixFQUdoQixrQkFBa0IsRUFHbEIscUJBQXFCLEVBQ3JCLDZCQUE2QixFQUM3Qix5QkFBeUIsRUFDekIsZ0NBQWdDLEVBRWhDLHdCQUF3QixFQUN4QixhQUFhLEVBRWIsK0JBQStCLEVBRS9CLHFCQUFxQixFQUNyQiwwQkFBMEIsR0FFMUIsTUFBTSw4QkFBOEIsQ0FBQTtBQUNyQyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDOUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBRXZELE9BQU8sRUFDTiw2QkFBNkIsRUFDN0IsbUJBQW1CLEVBQ25CLGVBQWUsRUFDZixrQkFBa0IsRUFDbEIsc0JBQXNCLEVBQ3RCLDBCQUEwQixFQUMxQixtQkFBbUIsRUFDbkIsZ0JBQWdCLEVBQ2hCLDRCQUE0QixHQUM1QixNQUFNLGdDQUFnQyxDQUFBO0FBQ3ZDLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUN6RyxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUNOLHVDQUF1QyxFQUN2QyxVQUFVLEdBQ1YsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sNkRBQTZELENBQUE7QUFDNUYsT0FBTyxF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