/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DeferredPromise } from '../../../../base/common/async.js';
import { URI } from '../../../../base/common/uri.js';
import { mock } from '../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../configuration/common/configuration.js';
import { TestConfigurationService } from '../../../configuration/test/common/testConfigurationService.js';
import { ContextKeyService, setContext } from '../../browser/contextKeyService.js';
import { ContextKeyExpr, IContextKeyService } from '../../common/contextkey.js';
import { ServiceCollection } from '../../../instantiation/common/serviceCollection.js';
import { TestInstantiationService } from '../../../instantiation/test/common/instantiationServiceMock.js';
import { ITelemetryService } from '../../../telemetry/common/telemetry.js';
suite('ContextKeyService', () => {
    const testDisposables = ensureNoDisposablesAreLeakedInTestSuite();
    test('updateParent', () => {
        const root = testDisposables.add(new ContextKeyService(new TestConfigurationService()));
        const parent1 = testDisposables.add(root.createScoped(document.createElement('div')));
        const parent2 = testDisposables.add(root.createScoped(document.createElement('div')));
        const child = testDisposables.add(parent1.createScoped(document.createElement('div')));
        parent1.createKey('testA', 1);
        parent1.createKey('testB', 2);
        parent1.createKey('testD', 0);
        parent2.createKey('testA', 3);
        parent2.createKey('testC', 4);
        parent2.createKey('testD', 0);
        let complete;
        let reject;
        const p = new Promise((_complete, _reject) => {
            complete = _complete;
            reject = _reject;
        });
        testDisposables.add(child.onDidChangeContext((e) => {
            try {
                assert.ok(e.affectsSome(new Set(['testA'])), 'testA changed');
                assert.ok(e.affectsSome(new Set(['testB'])), 'testB changed');
                assert.ok(e.affectsSome(new Set(['testC'])), 'testC changed');
                assert.ok(!e.affectsSome(new Set(['testD'])), 'testD did not change');
                assert.strictEqual(child.getContextKeyValue('testA'), 3);
                assert.strictEqual(child.getContextKeyValue('testB'), undefined);
                assert.strictEqual(child.getContextKeyValue('testC'), 4);
                assert.strictEqual(child.getContextKeyValue('testD'), 0);
            }
            catch (err) {
                reject(err);
                return;
            }
            complete();
        }));
        child.updateParent(parent2);
        return p;
    });
    test('updateParent to same service', () => {
        const root = testDisposables.add(new ContextKeyService(new TestConfigurationService()));
        const parent1 = testDisposables.add(root.createScoped(document.createElement('div')));
        const child = testDisposables.add(parent1.createScoped(document.createElement('div')));
        parent1.createKey('testA', 1);
        parent1.createKey('testB', 2);
        parent1.createKey('testD', 0);
        let eventFired = false;
        testDisposables.add(child.onDidChangeContext((e) => {
            eventFired = true;
        }));
        child.updateParent(parent1);
        assert.strictEqual(eventFired, false);
    });
    test('issue #147732: URIs as context values', () => {
        const configurationService = new TestConfigurationService();
        const contextKeyService = testDisposables.add(new ContextKeyService(configurationService));
        const instantiationService = testDisposables.add(new TestInstantiationService(new ServiceCollection([IConfigurationService, configurationService], [IContextKeyService, contextKeyService], [
            ITelemetryService,
            new (class extends mock() {
                async publicLog2() {
                    //
                }
            })(),
        ])));
        const uri = URI.parse('test://abc');
        contextKeyService.createKey('notebookCellResource', undefined).set(uri.toString());
        instantiationService.invokeFunction(setContext, 'jupyter.runByLineCells', JSON.parse(JSON.stringify([uri])));
        const expr = ContextKeyExpr.in('notebookCellResource', 'jupyter.runByLineCells');
        assert.deepStrictEqual(contextKeyService.contextMatchesRules(expr), true);
    });
    test('suppress update event from parent when one key is overridden by child', () => {
        const root = testDisposables.add(new ContextKeyService(new TestConfigurationService()));
        const child = testDisposables.add(root.createScoped(document.createElement('div')));
        root.createKey('testA', 1);
        child.createKey('testA', 4);
        let fired = false;
        const event = testDisposables.add(child.onDidChangeContext((e) => (fired = true)));
        root.setContext('testA', 10);
        assert.strictEqual(fired, false, 'Should not fire event when overridden key is updated in parent');
        event.dispose();
    });
    test('suppress update event from parent when all keys are overridden by child', () => {
        const root = testDisposables.add(new ContextKeyService(new TestConfigurationService()));
        const child = testDisposables.add(root.createScoped(document.createElement('div')));
        root.createKey('testA', 1);
        root.createKey('testB', 2);
        root.createKey('testC', 3);
        child.createKey('testA', 4);
        child.createKey('testB', 5);
        child.createKey('testD', 6);
        let fired = false;
        const event = testDisposables.add(child.onDidChangeContext((e) => (fired = true)));
        root.bufferChangeEvents(() => {
            root.setContext('testA', 10);
            root.setContext('testB', 20);
            root.setContext('testD', 30);
        });
        assert.strictEqual(fired, false, 'Should not fire event when overridden key is updated in parent');
        event.dispose();
    });
    test('pass through update event from parent when one key is not overridden by child', () => {
        const root = testDisposables.add(new ContextKeyService(new TestConfigurationService()));
        const child = testDisposables.add(root.createScoped(document.createElement('div')));
        root.createKey('testA', 1);
        root.createKey('testB', 2);
        root.createKey('testC', 3);
        child.createKey('testA', 4);
        child.createKey('testB', 5);
        child.createKey('testD', 6);
        const def = new DeferredPromise();
        testDisposables.add(child.onDidChangeContext((e) => {
            try {
                assert.ok(e.affectsSome(new Set(['testA'])), 'testA changed');
                assert.ok(e.affectsSome(new Set(['testB'])), 'testB changed');
                assert.ok(e.affectsSome(new Set(['testC'])), 'testC changed');
            }
            catch (err) {
                def.error(err);
                return;
            }
            def.complete(undefined);
        }));
        root.bufferChangeEvents(() => {
            root.setContext('testA', 10);
            root.setContext('testB', 20);
            root.setContext('testC', 30);
        });
        return def.p;
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dGtleS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vY29udGV4dGtleS90ZXN0L2Jyb3dzZXIvY29udGV4dGtleS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDbEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUN0RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUN6RyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsVUFBVSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDbEYsT0FBTyxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQy9FLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG9EQUFvRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGdFQUFnRSxDQUFBO0FBQ3pHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBRTFFLEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxHQUFHLEVBQUU7SUFDL0IsTUFBTSxlQUFlLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUVqRSxJQUFJLENBQUMsY0FBYyxFQUFFLEdBQUcsRUFBRTtRQUN6QixNQUFNLElBQUksR0FBRyxlQUFlLENBQUMsR0FBRyxDQUFD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