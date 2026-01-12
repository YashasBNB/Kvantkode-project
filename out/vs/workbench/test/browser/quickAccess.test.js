/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import assert from 'assert';
import { Registry } from '../../../platform/registry/common/platform.js';
import { Extensions, } from '../../../platform/quickinput/common/quickAccess.js';
import { IQuickInputService, } from '../../../platform/quickinput/common/quickInput.js';
import { TestServiceAccessor, workbenchInstantiationService, createEditorPart, } from './workbenchTestServices.js';
import { DisposableStore, toDisposable } from '../../../base/common/lifecycle.js';
import { timeout } from '../../../base/common/async.js';
import { PickerQuickAccessProvider, } from '../../../platform/quickinput/browser/pickerQuickAccess.js';
import { URI } from '../../../base/common/uri.js';
import { IEditorGroupsService } from '../../services/editor/common/editorGroupsService.js';
import { IEditorService } from '../../services/editor/common/editorService.js';
import { EditorService } from '../../services/editor/browser/editorService.js';
import { PickerEditorState } from '../../browser/quickaccess.js';
import { Range } from '../../../editor/common/core/range.js';
suite('QuickAccess', () => {
    let disposables;
    let instantiationService;
    let accessor;
    let providerDefaultCalled = false;
    let providerDefaultCanceled = false;
    let providerDefaultDisposed = false;
    let provider1Called = false;
    let provider1Canceled = false;
    let provider1Disposed = false;
    let provider2Called = false;
    let provider2Canceled = false;
    let provider2Disposed = false;
    let provider3Called = false;
    let provider3Canceled = false;
    let provider3Disposed = false;
    let TestProviderDefault = class TestProviderDefault {
        constructor(quickInputService, disposables) {
            this.quickInputService = quickInputService;
        }
        provide(picker, token) {
            assert.ok(picker);
            providerDefaultCalled = true;
            token.onCancellationRequested(() => (providerDefaultCanceled = true));
            // bring up provider #3
            setTimeout(() => this.quickInputService.quickAccess.show(providerDescriptor3.prefix));
            return toDisposable(() => (providerDefaultDisposed = true));
        }
    };
    TestProviderDefault = __decorate([
        __param(0, IQuickInputService)
    ], TestProviderDefault);
    class TestProvider1 {
        provide(picker, token) {
            assert.ok(picker);
            provider1Called = true;
            token.onCancellationRequested(() => (provider1Canceled = true));
            return toDisposable(() => (provider1Disposed = true));
        }
    }
    class TestProvider2 {
        provide(picker, token) {
            assert.ok(picker);
            provider2Called = true;
            token.onCancellationRequested(() => (provider2Canceled = true));
            return toDisposable(() => (provider2Disposed = true));
        }
    }
    class TestProvider3 {
        provide(picker, token) {
            assert.ok(picker);
            provider3Called = true;
            token.onCancellationRequested(() => (provider3Canceled = true));
            // hide without picking
            setTimeout(() => picker.hide());
            return toDisposable(() => (provider3Disposed = true));
        }
    }
    const providerDescriptorDefault = { ctor: TestProviderDefault, prefix: '', helpEntries: [] };
    const providerDescriptor1 = { ctor: TestProvider1, prefix: 'test', helpEntries: [] };
    const providerDescriptor2 = { ctor: TestProvider2, prefix: 'test something', helpEntries: [] };
    const providerDescriptor3 = { ctor: TestProvider3, prefix: 'changed', helpEntries: [] };
    setup(() => {
        disposables = new DisposableStore();
        instantiationService = workbenchInstantiationService(undefined, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
    });
    teardown(() => {
        disposables.dispose();
    });
    test('registry', () => {
        const registry = Registry.as(Extensions.Quickaccess);
        const restore = registry.clear();
        assert.ok(!registry.getQuickAccessProvider('test'));
        const disposables = new DisposableStore();
        disposables.add(registry.registerQuickAccessProvider(providerDescriptorDefault));
        assert(registry.getQuickAccessProvider('') === providerDescriptorDefault);
        assert(registry.getQuickAccessProvider('test') === providerDescriptorDefault);
        const disposable = disposables.add(registry.registerQuickAccessProvider(providerDescriptor1));
        assert(registry.getQuickAccessProvider('test') === providerDescriptor1);
        const providers = registry.getQuickAccessProviders();
        assert(providers.some((provider) => provider.prefix === 'test'));
        disposable.dispose();
        assert(registry.getQuickAccessProvider('test') === providerDescriptorDefault);
        disposables.dispose();
        assert.ok(!registry.getQuickAccessProvider('test'));
        restore();
    });
    test('provider', async () => {
        const registry = Registry.as(Extensions.Quickaccess);
        const restore = registry.clear();
        const disposables = new DisposableStore();
        disposables.add(registry.registerQuickAccessProvider(providerDescriptorDefault));
        disposables.add(registry.registerQuickAccessProvider(providerDescriptor1));
        disposables.add(registry.registerQuickAccessProvider(providerDescriptor2));
        disposables.add(registry.registerQuickAccessProvider(providerDescriptor3));
        accessor.quickInputService.quickAccess.show('test');
        assert.strictEqual(providerDefaultCalled, false);
        assert.strictEqual(provider1Called, true);
        assert.strictEqual(provider2Called, false);
        assert.strictEqual(provider3Called, false);
        assert.strictEqual(providerDefaultCanceled, false);
        assert.strictEqual(provider1Canceled, false);
        assert.strictEqual(provider2Canceled, false);
        assert.strictEqual(provider3Canceled, false);
        assert.strictEqual(providerDefaultDisposed, false);
        assert.strictEqual(provider1Disposed, false);
        assert.strictEqual(provider2Disposed, false);
        assert.strictEqual(provider3Disposed, false);
        provider1Called = false;
        accessor.quickInputService.quickAccess.show('test something');
        assert.strictEqual(providerDefaultCalled, false);
        assert.strictEqual(provider1Called, false);
        assert.strictEqual(provider2Called, true);
        assert.strictEqual(provider3Called, false);
        assert.strictEqual(providerDefaultCanceled, false);
        assert.strictEqual(provider1Canceled, true);
        assert.strictEqual(provider2Canceled, false);
        assert.strictEqual(provider3Canceled, false);
        assert.strictEqual(providerDefaultDisposed, false);
        assert.strictEqual(provider1Disposed, true);
        assert.strictEqual(provider2Disposed, false);
        assert.strictEqual(provider3Disposed, false);
        provider2Called = false;
        provider1Canceled = false;
        provider1Disposed = false;
        accessor.quickInputService.quickAccess.show('usedefault');
        assert.strictEqual(providerDefaultCalled, true);
        assert.strictEqual(provider1Called, false);
        assert.strictEqual(provider2Called, false);
        assert.strictEqual(provider3Called, false);
        assert.strictEqual(providerDefaultCanceled, false);
        assert.strictEqual(provider1Canceled, false);
        assert.strictEqual(provider2Canceled, true);
        assert.strictEqual(provider3Canceled, false);
        assert.strictEqual(providerDefaultDisposed, false);
        assert.strictEqual(provider1Disposed, false);
        assert.strictEqual(provider2Disposed, true);
        assert.strictEqual(provider3Disposed, false);
        await timeout(1);
        assert.strictEqual(providerDefaultCanceled, true);
        assert.strictEqual(providerDefaultDisposed, true);
        assert.strictEqual(provider3Called, true);
        await timeout(1);
        assert.strictEqual(provider3Canceled, true);
        assert.strictEqual(provider3Disposed, true);
        disposables.dispose();
        restore();
    });
    let fastProviderCalled = false;
    let slowProviderCalled = false;
    let fastAndSlowProviderCalled = false;
    let slowProviderCanceled = false;
    let fastAndSlowProviderCanceled = false;
    class FastTestQuickPickProvider extends PickerQuickAccessProvider {
        constructor() {
            super('fast');
        }
        _getPicks(filter, disposables, token) {
            fastProviderCalled = true;
            return [{ label: 'Fast Pick' }];
        }
    }
    class SlowTestQuickPickProvider extends PickerQuickAccessProvider {
        constructor() {
            super('slow');
        }
        async _getPicks(filter, disposables, token) {
            slowProviderCalled = true;
            await timeout(1);
            if (token.isCancellationRequested) {
                slowProviderCanceled = true;
            }
            return [{ label: 'Slow Pick' }];
        }
    }
    class FastAndSlowTestQuickPickProvider extends PickerQuickAccessProvider {
        constructor() {
            super('bothFastAndSlow');
        }
        _getPicks(filter, disposables, token) {
            fastAndSlowProviderCalled = true;
            return {
                picks: [{ label: 'Fast Pick' }],
                additionalPicks: (async () => {
                    await timeout(1);
                    if (token.isCancellationRequested) {
                        fastAndSlowProviderCanceled = true;
                    }
                    return [{ label: 'Slow Pick' }];
                })(),
            };
        }
    }
    const fastProviderDescriptor = {
        ctor: FastTestQuickPickProvider,
        prefix: 'fast',
        helpEntries: [],
    };
    const slowProviderDescriptor = {
        ctor: SlowTestQuickPickProvider,
        prefix: 'slow',
        helpEntries: [],
    };
    const fastAndSlowProviderDescriptor = {
        ctor: FastAndSlowTestQuickPickProvider,
        prefix: 'bothFastAndSlow',
        helpEntries: [],
    };
    test('quick pick access - show()', async () => {
        const registry = Registry.as(Extensions.Quickaccess);
        const restore = registry.clear();
        const disposables = new DisposableStore();
        disposables.add(registry.registerQuickAccessProvider(fastProviderDescriptor));
        disposables.add(registry.registerQuickAccessProvider(slowProviderDescriptor));
        disposables.add(registry.registerQuickAccessProvider(fastAndSlowProviderDescriptor));
        accessor.quickInputService.quickAccess.show('fast');
        assert.strictEqual(fastProviderCalled, true);
        assert.strictEqual(slowProviderCalled, false);
        assert.strictEqual(fastAndSlowProviderCalled, false);
        fastProviderCalled = false;
        accessor.quickInputService.quickAccess.show('slow');
        await timeout(2);
        assert.strictEqual(fastProviderCalled, false);
        assert.strictEqual(slowProviderCalled, true);
        assert.strictEqual(slowProviderCanceled, false);
        assert.strictEqual(fastAndSlowProviderCalled, false);
        slowProviderCalled = false;
        accessor.quickInputService.quickAccess.show('bothFastAndSlow');
        await timeout(2);
        assert.strictEqual(fastProviderCalled, false);
        assert.strictEqual(slowProviderCalled, false);
        assert.strictEqual(fastAndSlowProviderCalled, true);
        assert.strictEqual(fastAndSlowProviderCanceled, false);
        fastAndSlowProviderCalled = false;
        accessor.quickInputService.quickAccess.show('slow');
        accessor.quickInputService.quickAccess.show('bothFastAndSlow');
        accessor.quickInputService.quickAccess.show('fast');
        assert.strictEqual(fastProviderCalled, true);
        assert.strictEqual(slowProviderCalled, true);
        assert.strictEqual(fastAndSlowProviderCalled, true);
        await timeout(2);
        assert.strictEqual(slowProviderCanceled, true);
        assert.strictEqual(fastAndSlowProviderCanceled, true);
        disposables.dispose();
        restore();
    });
    test('quick pick access - pick()', async () => {
        const registry = Registry.as(Extensions.Quickaccess);
        const restore = registry.clear();
        const disposables = new DisposableStore();
        disposables.add(registry.registerQuickAccessProvider(fastProviderDescriptor));
        const result = accessor.quickInputService.quickAccess.pick('fast');
        assert.strictEqual(fastProviderCalled, true);
        assert.ok(result instanceof Promise);
        disposables.dispose();
        restore();
    });
    test('PickerEditorState can properly restore editors', async () => {
        const part = await createEditorPart(instantiationService, disposables);
        instantiationService.stub(IEditorGroupsService, part);
        const editorService = disposables.add(instantiationService.createInstance(EditorService, undefined));
        instantiationService.stub(IEditorService, editorService);
        const editorViewState = disposables.add(instantiationService.createInstance(PickerEditorState));
        disposables.add(part);
        disposables.add(editorService);
        const input1 = {
            resource: URI.parse('foo://bar1'),
            options: {
                pinned: true,
                preserveFocus: true,
                selection: new Range(1, 0, 1, 3),
            },
        };
        const input2 = {
            resource: URI.parse('foo://bar2'),
            options: {
                pinned: true,
                selection: new Range(1, 0, 1, 3),
            },
        };
        const input3 = {
            resource: URI.parse('foo://bar3'),
        };
        const input4 = {
            resource: URI.parse('foo://bar4'),
        };
        const editor = await editorService.openEditor(input1);
        assert.strictEqual(editor, editorService.activeEditorPane);
        editorViewState.set();
        await editorService.openEditor(input2);
        await editorViewState.openTransientEditor(input3);
        await editorViewState.openTransientEditor(input4);
        await editorViewState.restore();
        assert.strictEqual(part.activeGroup.activeEditor?.resource, input1.resource);
        assert.deepStrictEqual(part.activeGroup.getEditors(0 /* EditorsOrder.MOST_RECENTLY_ACTIVE */).map((e) => e.resource), [input1.resource, input2.resource]);
        if (part.activeGroup.activeEditorPane?.getSelection) {
            assert.deepStrictEqual(part.activeGroup.activeEditorPane?.getSelection(), input1.options.selection);
        }
        await part.activeGroup.closeAllEditors();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tBY2Nlc3MudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3Rlc3QvYnJvd3Nlci9xdWlja0FjY2Vzcy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDeEUsT0FBTyxFQUVOLFVBQVUsR0FHVixNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFHTixrQkFBa0IsR0FDbEIsTUFBTSxtREFBbUQsQ0FBQTtBQUUxRCxPQUFPLEVBQ04sbUJBQW1CLEVBQ25CLDZCQUE2QixFQUM3QixnQkFBZ0IsR0FDaEIsTUFBTSw0QkFBNEIsQ0FBQTtBQUNuQyxPQUFPLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBZSxNQUFNLG1DQUFtQyxDQUFBO0FBQzlGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSwrQkFBK0IsQ0FBQTtBQUN2RCxPQUFPLEVBQ04seUJBQXlCLEdBRXpCLE1BQU0sMkRBQTJELENBQUE7QUFDbEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQ2pELE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQzFGLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwrQ0FBK0MsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDOUUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFFaEUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRzVELEtBQUssQ0FBQyxhQUFhLEVBQUUsR0FBRyxFQUFFO0lBQ3pCLElBQUks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