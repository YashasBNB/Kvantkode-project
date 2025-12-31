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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVpY2tBY2Nlc3MudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC90ZXN0L2Jyb3dzZXIvcXVpY2tBY2Nlc3MudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRzs7Ozs7Ozs7OztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBQ3hFLE9BQU8sRUFFTixVQUFVLEdBR1YsTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBR04sa0JBQWtCLEdBQ2xCLE1BQU0sbURBQW1ELENBQUE7QUFFMUQsT0FBTyxFQUNOLG1CQUFtQixFQUNuQiw2QkFBNkIsRUFDN0IsZ0JBQWdCLEdBQ2hCLE1BQU0sNEJBQTRCLENBQUE7QUFDbkMsT0FBTyxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQWUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sK0JBQStCLENBQUE7QUFDdkQsT0FBTyxFQUNOLHlCQUF5QixHQUV6QixNQUFNLDJEQUEyRCxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUMxRixPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFDOUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQzlFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBRWhFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUc1RCxLQUFLLENBQUMsYUFBYSxFQUFFLEdBQUcsRUFBRTtJQUN6QixJQUFJLFdBQTRC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