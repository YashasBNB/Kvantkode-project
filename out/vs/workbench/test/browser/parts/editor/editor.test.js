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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWRpdG9yLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvdGVzdC9icm93c2VyL3BhcnRzL2VkaXRvci9lZGl0b3IudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUNOLHNCQUFzQixFQUN0QixnQkFBZ0IsRUFHaEIsa0JBQWtCLEVBR2xCLHFCQUFxQixFQUNyQiw2QkFBNkIsRUFDN0IseUJBQXlCLEVBQ3pCLGdDQUFnQyxFQUVoQyx3QkFBd0IsRUFDeEIsYUFBYSxFQUViLCtCQUErQixFQUUvQixxQkFBcUIsRUFDckIsMEJBQTBCLEdBRTFCLE1BQU0sOEJBQThCLENBQUE7QUFDckMsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQzlFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUV2RCxPQUFPLEVBQ04sNkJBQTZCLEVBQzdCLG1CQUFtQixFQUNuQixlQUFlLEVBQ2Ysa0JBQWtCLEVBQ2xCLHNCQUFzQixFQUN0QiwwQkFBMEIsRUFDMUIsbUJBQW1CLEVBQ25CLGdCQUFnQixFQUNoQiw0QkFBNEIsR0FDNUIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN2QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0QsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0saUVBQWlFLENBQUE7QUFDekcsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFDTix1Q0FBdUMsRUFDdkMsVUFBVSxHQUNWLE1BQU0sMENBQTBDLENBQUE7QUFDakQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBQzVGLE9BQU8sRUFBRSxn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S0FBSztZQUNoQixJQUFJLEVBQUUsTUFBTTtTQUNaLENBQUMsQ0FBQTtRQUNGLE1BQU0sUUFBUSxHQUFxQztZQUNsRCxRQUFRLEVBQUUsV0FBVztTQUNyQixDQUFBO1FBRUQsTUFBTSxDQUFDLFdBQVcsQ0FDakIsc0JBQXNCLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxFQUFFLFFBQVEsRUFBRSxFQUM1RCxRQUFRLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxDQUM3QixDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDakIsc0JBQXNCLENBQUMsZUFBZSxDQUFDLFFBQVEsRUFBRTtZQUNoRCxpQkFBaUIsRUFBRSxnQkFBZ0IsQ0FBQyxPQUFPO1NBQzNDLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFDZCxRQUFRLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxDQUM3QixDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDakIsc0JBQXNCLENBQUMsZUFBZSxDQUFDLFFBQVEsRUFBRTtZQUNoRCxpQkFBaUIsRUFBRSxnQkFBZ0IsQ0FBQyxHQUFHO1NBQ3ZDLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFDZCxRQUFRLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxDQUM3QixDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDakIsc0JBQXNCLENBQUMsZUFBZSxDQUFDLFFBQVEsRUFBRTtZQUNoRCxpQkFBaUIsRUFBRSxnQkFBZ0IsQ0FBQyxTQUFTO1NBQzdDLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFDZCxRQUFRLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxDQUM3QixDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDakIsc0JBQXNCLENBQUMsZUFBZSxDQUFDLFFBQVEsRUFBRTtZQUNoRCxpQkFBaUIsRUFBRSxnQkFBZ0IsQ0FBQyxJQUFJO1NBQ3hDLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFDZCxRQUFRLENBQUMsUUFBUSxFQUFFLFFBQVEsRUFBRSxDQUM3QixDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDakIs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QyxlQUFlLENBQUMsSUFBSSxDQUFDLEVBQUUsUUFBUSxFQUFFLEVBQ3hELElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQ3hCLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUNqQixzQkFBc0IsQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFO1lBQzVDLGlCQUFpQixFQUFFLGdCQUFnQixDQUFDLE9BQU87U0FDM0MsQ0FBQyxFQUFFLFFBQVEsRUFBRSxFQUNkLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQ3hCLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUNqQixzQkFBc0IsQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFO1lBQzVDLGlCQUFpQixFQUFFLGdCQUFnQixDQUFDLEdBQUc7U0FDdkMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxFQUNkLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQ3hCLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUNqQixzQkFBc0IsQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFO1lBQzVDLGlCQUFpQixFQUFFLGdCQUFnQixDQUFDLFNBQVM7U0FDN0MsQ0FBQyxFQUFFLFFBQVEsRUFBRSxFQUNkLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQ3hCLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUNqQixzQkFBc0IsQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFO1lBQzVDLGlCQUFpQixFQUFFLGdCQUFnQixDQUFDLElBQUk7U0FDeEMsQ0FBQyxFQUFFLFFBQVEsRUFBRSxFQUNkLElBQUksQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQ3hCLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUNqQixzQkFBc0IsQ0FBQyxlQUFlLENBQUMsSUFBSSxFQUFFLEVBQUUsY0FBYyxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxFQUFFLFFBQVEsRUFBRSxFQUMxRixJQUFJLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUN4QixD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