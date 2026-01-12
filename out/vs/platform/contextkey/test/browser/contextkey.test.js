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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29udGV4dGtleS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9jb250ZXh0a2V5L3Rlc3QvYnJvd3Nlci9jb250ZXh0a2V5LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzNELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGdEQUFnRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGdFQUFnRSxDQUFBO0FBQ3pHLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxVQUFVLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNsRixPQUFPLEVBQUUsY0FBYyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDL0UsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdEYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFDekcsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFFMUUsS0FBSyxDQUFDLG1CQUFtQixFQUFFLEdBQUcsRUFBRTtJQUMvQixNQUFNLGVBQWUsR0FBRyx1Q0FBdUMsRUFBRSxDQUFBO0lBRWpFLElBQUksQ0FBQyxjQUFjLEVBQUUsR0FBRyxFQUFFO1FBQ3pCLE1BQU0sSUFBSSxHQUFHLGVBQWUsQ0FBQyxHQUFH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