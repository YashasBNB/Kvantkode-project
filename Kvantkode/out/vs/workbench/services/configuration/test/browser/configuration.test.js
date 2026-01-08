/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Event } from '../../../../../base/common/event.js';
import { joinPath } from '../../../../../base/common/resources.js';
import { URI } from '../../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { Extensions, } from '../../../../../platform/configuration/common/configurationRegistry.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { Registry } from '../../../../../platform/registry/common/platform.js';
import { DefaultConfiguration } from '../../browser/configuration.js';
import { BrowserWorkbenchEnvironmentService } from '../../../environment/browser/environmentService.js';
import { TestEnvironmentService } from '../../../../test/browser/workbenchTestServices.js';
import { TestProductService } from '../../../../test/common/workbenchTestServices.js';
class ConfigurationCache {
    constructor() {
        this.cache = new Map();
    }
    needsCaching(resource) {
        return false;
    }
    async read({ type, key }) {
        return this.cache.get(`${type}:${key}`) || '';
    }
    async write({ type, key }, content) {
        this.cache.set(`${type}:${key}`, content);
    }
    async remove({ type, key }) {
        this.cache.delete(`${type}:${key}`);
    }
}
suite('DefaultConfiguration', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    const configurationRegistry = Registry.as(Extensions.Configuration);
    const cacheKey = { type: 'defaults', key: 'configurationDefaultsOverrides' };
    let configurationCache;
    setup(() => {
        configurationCache = new ConfigurationCache();
        configurationRegistry.registerConfiguration({
            id: 'test.configurationDefaultsOverride',
            type: 'object',
            properties: {
                'test.configurationDefaultsOverride': {
                    type: 'string',
                    default: 'defaultValue',
                },
            },
        });
    });
    teardown(() => {
        configurationRegistry.deregisterConfigurations(configurationRegistry.getConfigurations());
        configurationRegistry.deregisterDefaultConfigurations(configurationRegistry.getRegisteredDefaultConfigurations());
    });
    test('configuration default overrides are read from environment', async () => {
        const environmentService = new BrowserWorkbenchEnvironmentService('', joinPath(URI.file('tests').with({ scheme: 'vscode-tests' }), 'logs'), { configurationDefaults: { 'test.configurationDefaultsOverride': 'envOverrideValue' } }, TestProductService);
        const testObject = disposables.add(new DefaultConfiguration(configurationCache, environmentService, new NullLogService()));
        await testObject.initialize();
        assert.deepStrictEqual(testObject.configurationModel.getValue('test.configurationDefaultsOverride'), 'envOverrideValue');
    });
    test('configuration default overrides are read from cache', async () => {
        localStorage.setItem(DefaultConfiguration.DEFAULT_OVERRIDES_CACHE_EXISTS_KEY, 'yes');
        await configurationCache.write(cacheKey, JSON.stringify({ 'test.configurationDefaultsOverride': 'overrideValue' }));
        const testObject = disposables.add(new DefaultConfiguration(configurationCache, TestEnvironmentService, new NullLogService()));
        const actual = await testObject.initialize();
        assert.deepStrictEqual(actual.getValue('test.configurationDefaultsOverride'), 'overrideValue');
        assert.deepStrictEqual(testObject.configurationModel.getValue('test.configurationDefaultsOverride'), 'overrideValue');
    });
    test('configuration default overrides are not read from cache when model is read before initialize', async () => {
        localStorage.setItem(DefaultConfiguration.DEFAULT_OVERRIDES_CACHE_EXISTS_KEY, 'yes');
        await configurationCache.write(cacheKey, JSON.stringify({ 'test.configurationDefaultsOverride': 'overrideValue' }));
        const testObject = disposables.add(new DefaultConfiguration(configurationCache, TestEnvironmentService, new NullLogService()));
        assert.deepStrictEqual(testObject.configurationModel.getValue('test.configurationDefaultsOverride'), undefined);
    });
    test('configuration default overrides read from cache override environment', async () => {
        const environmentService = new BrowserWorkbenchEnvironmentService('', joinPath(URI.file('tests').with({ scheme: 'vscode-tests' }), 'logs'), { configurationDefaults: { 'test.configurationDefaultsOverride': 'envOverrideValue' } }, TestProductService);
        localStorage.setItem(DefaultConfiguration.DEFAULT_OVERRIDES_CACHE_EXISTS_KEY, 'yes');
        await configurationCache.write(cacheKey, JSON.stringify({ 'test.configurationDefaultsOverride': 'overrideValue' }));
        const testObject = disposables.add(new DefaultConfiguration(configurationCache, environmentService, new NullLogService()));
        const actual = await testObject.initialize();
        assert.deepStrictEqual(actual.getValue('test.configurationDefaultsOverride'), 'overrideValue');
    });
    test('configuration default overrides are read from cache when default configuration changed', async () => {
        localStorage.setItem(DefaultConfiguration.DEFAULT_OVERRIDES_CACHE_EXISTS_KEY, 'yes');
        await configurationCache.write(cacheKey, JSON.stringify({ 'test.configurationDefaultsOverride': 'overrideValue' }));
        const testObject = disposables.add(new DefaultConfiguration(configurationCache, TestEnvironmentService, new NullLogService()));
        await testObject.initialize();
        const promise = Event.toPromise(testObject.onDidChangeConfiguration);
        configurationRegistry.registerConfiguration({
            id: 'test.configurationDefaultsOverride',
            type: 'object',
            properties: {
                'test.configurationDefaultsOverride1': {
                    type: 'string',
                    default: 'defaultValue',
                },
            },
        });
        const { defaults: actual } = await promise;
        assert.deepStrictEqual(actual.getValue('test.configurationDefaultsOverride'), 'overrideValue');
    });
    test('configuration default overrides are not read from cache after reload', async () => {
        localStorage.setItem(DefaultConfiguration.DEFAULT_OVERRIDES_CACHE_EXISTS_KEY, 'yes');
        await configurationCache.write(cacheKey, JSON.stringify({ 'test.configurationDefaultsOverride': 'overrideValue' }));
        const testObject = disposables.add(new DefaultConfiguration(configurationCache, TestEnvironmentService, new NullLogService()));
        await testObject.initialize();
        const actual = testObject.reload();
        assert.deepStrictEqual(actual.getValue('test.configurationDefaultsOverride'), 'defaultValue');
    });
    test('cache is reset after reload', async () => {
        localStorage.setItem(DefaultConfiguration.DEFAULT_OVERRIDES_CACHE_EXISTS_KEY, 'yes');
        await configurationCache.write(cacheKey, JSON.stringify({ 'test.configurationDefaultsOverride': 'overrideValue' }));
        const testObject = disposables.add(new DefaultConfiguration(configurationCache, TestEnvironmentService, new NullLogService()));
        await testObject.initialize();
        testObject.reload();
        assert.deepStrictEqual(await configurationCache.read(cacheKey), '');
    });
    test('configuration default overrides are written in cache', async () => {
        const testObject = disposables.add(new DefaultConfiguration(configurationCache, TestEnvironmentService, new NullLogService()));
        await testObject.initialize();
        testObject.reload();
        const promise = Event.toPromise(testObject.onDidChangeConfiguration);
        configurationRegistry.registerDefaultConfigurations([
            { overrides: { 'test.configurationDefaultsOverride': 'newoverrideValue' } },
        ]);
        await promise;
        const actual = JSON.parse(await configurationCache.read(cacheKey));
        assert.deepStrictEqual(actual, { 'test.configurationDefaultsOverride': 'newoverrideValue' });
    });
    test('configuration default overrides are removed from cache if there are no overrides', async () => {
        const testObject = disposables.add(new DefaultConfiguration(configurationCache, TestEnvironmentService, new NullLogService()));
        await testObject.initialize();
        const promise = Event.toPromise(testObject.onDidChangeConfiguration);
        configurationRegistry.registerConfiguration({
            id: 'test.configurationDefaultsOverride',
            type: 'object',
            properties: {
                'test.configurationDefaultsOverride1': {
                    type: 'string',
                    default: 'defaultValue',
                },
            },
        });
        await promise;
        assert.deepStrictEqual(await configurationCache.read(cacheKey), '');
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvY29uZmlndXJhdGlvbi90ZXN0L2Jyb3dzZXIvY29uZmlndXJhdGlvbi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDM0QsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQ04sVUFBVSxHQUVWLE1BQU0sdUVBQXVFLENBQUE7QUFDOUUsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUVyRSxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN2RyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUVyRixNQUFNLGtCQUFrQjtJQUF4QjtRQUNrQixVQUFLLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUE7SUFhbkQsQ0FBQztJQVpBLFlBQVksQ0FBQyxRQUFhO1FBQ3pCLE9BQU8sS0FBSyxDQUFBO0lBQ2IsQ0FBQztJQUNELEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxJ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