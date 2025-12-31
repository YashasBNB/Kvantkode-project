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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29uZmlndXJhdGlvbi50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2NvbmZpZ3VyYXRpb24vdGVzdC9icm93c2VyL2NvbmZpZ3VyYXRpb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzNELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUNOLFVBQVUsR0FFVixNQUFNLHVFQUF1RSxDQUFBO0FBQzlFLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDOUUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFFckUsT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdkcsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDMUYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFFckYsTUFBTSxrQkFBa0I7SUFBeEI7UUFDa0IsVUFBSyxHQUFHLElBQUksR0FBRyxFQUFrQixDQUFBO0lBYW5ELENBQUM7SUFaQSxZQUFZLENBQUMsUUFBYTtRQUN6QixPQUFPLEtBQUssQ0FBQTtJQUNiLENBQUM7SUFDRCxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsSUFBSSxF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