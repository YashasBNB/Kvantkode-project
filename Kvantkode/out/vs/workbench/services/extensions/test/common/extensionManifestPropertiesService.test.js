/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { isWeb } from '../../../../../base/common/platform.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { IProductService } from '../../../../../platform/product/common/productService.js';
import { IWorkspaceTrustEnablementService } from '../../../../../platform/workspace/common/workspaceTrust.js';
import { ExtensionManifestPropertiesService } from '../../common/extensionManifestPropertiesService.js';
import { TestProductService, TestWorkspaceTrustEnablementService, } from '../../../../test/common/workbenchTestServices.js';
suite('ExtensionManifestPropertiesService - ExtensionKind', () => {
    let disposables;
    let testObject;
    setup(() => {
        disposables = new DisposableStore();
        testObject = disposables.add(new ExtensionManifestPropertiesService(TestProductService, new TestConfigurationService(), new TestWorkspaceTrustEnablementService(), new NullLogService()));
    });
    teardown(() => {
        disposables.dispose();
    });
    ensureNoDisposablesAreLeakedInTestSuite();
    test('declarative with extension dependencies', () => {
        assert.deepStrictEqual(testObject.getExtensionKind({ extensionDependencies: ['ext1'] }), isWeb ? ['workspace', 'web'] : ['workspace']);
    });
    test('declarative extension pack', () => {
        assert.deepStrictEqual(testObject.getExtensionKind({ extensionPack: ['ext1', 'ext2'] }), isWeb ? ['workspace', 'web'] : ['workspace']);
    });
    test('declarative extension pack and extension dependencies', () => {
        assert.deepStrictEqual(testObject.getExtensionKind({
            extensionPack: ['ext1', 'ext2'],
            extensionDependencies: ['ext1', 'ext2'],
        }), isWeb ? ['workspace', 'web'] : ['workspace']);
    });
    test('declarative with unknown contribution point => workspace, web in web and => workspace in desktop', () => {
        assert.deepStrictEqual(testObject.getExtensionKind({
            contributes: { unknownPoint: { something: true } },
        }), isWeb ? ['workspace', 'web'] : ['workspace']);
    });
    test('declarative extension pack with unknown contribution point', () => {
        assert.deepStrictEqual(testObject.getExtensionKind({
            extensionPack: ['ext1', 'ext2'],
            contributes: { unknownPoint: { something: true } },
        }), isWeb ? ['workspace', 'web'] : ['workspace']);
    });
    test('simple declarative => ui, workspace, web', () => {
        assert.deepStrictEqual(testObject.getExtensionKind({}), [
            'ui',
            'workspace',
            'web',
        ]);
    });
    test('only browser => web', () => {
        assert.deepStrictEqual(testObject.getExtensionKind({ browser: 'main.browser.js' }), ['web']);
    });
    test('only main => workspace', () => {
        assert.deepStrictEqual(testObject.getExtensionKind({ main: 'main.js' }), [
            'workspace',
        ]);
    });
    test('main and browser => workspace, web in web and workspace in desktop', () => {
        assert.deepStrictEqual(testObject.getExtensionKind({
            main: 'main.js',
            browser: 'main.browser.js',
        }), isWeb ? ['workspace', 'web'] : ['workspace']);
    });
    test('browser entry point with workspace extensionKind => workspace, web in web and workspace in desktop', () => {
        assert.deepStrictEqual(testObject.getExtensionKind({
            main: 'main.js',
            browser: 'main.browser.js',
            extensionKind: ['workspace'],
        }), isWeb ? ['workspace', 'web'] : ['workspace']);
    });
    test('only browser entry point with out extensionKind => web', () => {
        assert.deepStrictEqual(testObject.getExtensionKind({ browser: 'main.browser.js' }), ['web']);
    });
    test('simple descriptive with workspace, ui extensionKind => workspace, ui, web in web and workspace, ui in desktop', () => {
        assert.deepStrictEqual(testObject.getExtensionKind({ extensionKind: ['workspace', 'ui'] }), isWeb ? ['workspace', 'ui', 'web'] : ['workspace', 'ui']);
    });
    test('opt out from web through settings even if it can run in web', () => {
        testObject = disposables.add(new ExtensionManifestPropertiesService(TestProductService, new TestConfigurationService({ remote: { extensionKind: { 'pub.a': ['-web'] } } }), new TestWorkspaceTrustEnablementService(), new NullLogService()));
        assert.deepStrictEqual(testObject.getExtensionKind({
            browser: 'main.browser.js',
            publisher: 'pub',
            name: 'a',
        }), ['ui', 'workspace']);
    });
    test('opt out from web and include only workspace through settings even if it can run in web', () => {
        testObject = disposables.add(new ExtensionManifestPropertiesService(TestProductService, new TestConfigurationService({
            remote: { extensionKind: { 'pub.a': ['-web', 'workspace'] } },
        }), new TestWorkspaceTrustEnablementService(), new NullLogService()));
        assert.deepStrictEqual(testObject.getExtensionKind({
            browser: 'main.browser.js',
            publisher: 'pub',
            name: 'a',
        }), ['workspace']);
    });
    test('extension cannot opt out from web', () => {
        assert.deepStrictEqual(testObject.getExtensionKind({ browser: 'main.browser.js', extensionKind: ['-web'] }), ['web']);
    });
    test('extension cannot opt into web', () => {
        assert.deepStrictEqual(testObject.getExtensionKind({
            main: 'main.js',
            extensionKind: ['web', 'workspace', 'ui'],
        }), ['workspace', 'ui']);
    });
    test('extension cannot opt into web only', () => {
        assert.deepStrictEqual(testObject.getExtensionKind({ main: 'main.js', extensionKind: ['web'] }), ['workspace']);
    });
});
// Workspace Trust is disabled in web at the moment
if (!isWeb) {
    suite('ExtensionManifestPropertiesService - ExtensionUntrustedWorkspaceSupportType', () => {
        let testObject;
        let instantiationService;
        let testConfigurationService;
        setup(async () => {
            instantiationService = new TestInstantiationService();
            testConfigurationService = new TestConfigurationService();
            instantiationService.stub(IConfigurationService, testConfigurationService);
        });
        teardown(() => {
            testObject.dispose();
            instantiationService.dispose();
        });
        function assertUntrustedWorkspaceSupport(extensionManifest, expected) {
            testObject = instantiationService.createInstance(ExtensionManifestPropertiesService);
            const untrustedWorkspaceSupport = testObject.getExtensionUntrustedWorkspaceSupportType(extensionManifest);
            assert.strictEqual(untrustedWorkspaceSupport, expected);
        }
        function getExtensionManifest(properties = {}) {
            return Object.create({
                name: 'a',
                publisher: 'pub',
                version: '1.0.0',
                ...properties,
            });
        }
        test('test extension workspace trust request when main entry point is missing', () => {
            instantiationService.stub(IProductService, {});
            instantiationService.stub(IWorkspaceTrustEnablementService, new TestWorkspaceTrustEnablementService());
            const extensionManifest = getExtensionManifest();
            assertUntrustedWorkspaceSupport(extensionManifest, true);
        });
        test('test extension workspace trust request when workspace trust is disabled', async () => {
            instantiationService.stub(IProductService, {});
            instantiationService.stub(IWorkspaceTrustEnablementService, new TestWorkspaceTrustEnablementService(false));
            const extensionManifest = getExtensionManifest({ main: './out/extension.js' });
            assertUntrustedWorkspaceSupport(extensionManifest, true);
        });
        test('test extension workspace trust request when "true" override exists in settings.json', async () => {
            instantiationService.stub(IProductService, {});
            instantiationService.stub(IWorkspaceTrustEnablementService, new TestWorkspaceTrustEnablementService());
            await testConfigurationService.setUserConfiguration('extensions', {
                supportUntrustedWorkspaces: { 'pub.a': { supported: true } },
            });
            const extensionManifest = getExtensionManifest({
                main: './out/extension.js',
                capabilities: { untrustedWorkspaces: { supported: 'limited' } },
            });
            assertUntrustedWorkspaceSupport(extensionManifest, true);
        });
        test('test extension workspace trust request when override (false) exists in settings.json', async () => {
            instantiationService.stub(IProductService, {});
            instantiationService.stub(IWorkspaceTrustEnablementService, new TestWorkspaceTrustEnablementService());
            await testConfigurationService.setUserConfiguration('extensions', {
                supportUntrustedWorkspaces: { 'pub.a': { supported: false } },
            });
            const extensionManifest = getExtensionManifest({
                main: './out/extension.js',
                capabilities: { untrustedWorkspaces: { supported: 'limited' } },
            });
            assertUntrustedWorkspaceSupport(extensionManifest, false);
        });
        test('test extension workspace trust request when override (true) for the version exists in settings.json', async () => {
            instantiationService.stub(IProductService, {});
            instantiationService.stub(IWorkspaceTrustEnablementService, new TestWorkspaceTrustEnablementService());
            await testConfigurationService.setUserConfiguration('extensions', {
                supportUntrustedWorkspaces: { 'pub.a': { supported: true, version: '1.0.0' } },
            });
            const extensionManifest = getExtensionManifest({
                main: './out/extension.js',
                capabilities: { untrustedWorkspaces: { supported: 'limited' } },
            });
            assertUntrustedWorkspaceSupport(extensionManifest, true);
        });
        test('test extension workspace trust request when override (false) for the version exists in settings.json', async () => {
            instantiationService.stub(IProductService, {});
            instantiationService.stub(IWorkspaceTrustEnablementService, new TestWorkspaceTrustEnablementService());
            await testConfigurationService.setUserConfiguration('extensions', {
                supportUntrustedWorkspaces: { 'pub.a': { supported: false, version: '1.0.0' } },
            });
            const extensionManifest = getExtensionManifest({
                main: './out/extension.js',
                capabilities: { untrustedWorkspaces: { supported: 'limited' } },
            });
            assertUntrustedWorkspaceSupport(extensionManifest, false);
        });
        test('test extension workspace trust request when override for a different version exists in settings.json', async () => {
            instantiationService.stub(IProductService, {});
            instantiationService.stub(IWorkspaceTrustEnablementService, new TestWorkspaceTrustEnablementService());
            await testConfigurationService.setUserConfiguration('extensions', {
                supportUntrustedWorkspaces: { 'pub.a': { supported: true, version: '2.0.0' } },
            });
            const extensionManifest = getExtensionManifest({
                main: './out/extension.js',
                capabilities: { untrustedWorkspaces: { supported: 'limited' } },
            });
            assertUntrustedWorkspaceSupport(extensionManifest, 'limited');
        });
        test('test extension workspace trust request when default (true) exists in product.json', () => {
            instantiationService.stub(IProductService, {
                extensionUntrustedWorkspaceSupport: { 'pub.a': { default: true } },
            });
            instantiationService.stub(IWorkspaceTrustEnablementService, new TestWorkspaceTrustEnablementService());
            const extensionManifest = getExtensionManifest({ main: './out/extension.js' });
            assertUntrustedWorkspaceSupport(extensionManifest, true);
        });
        test('test extension workspace trust request when default (false) exists in product.json', () => {
            instantiationService.stub(IProductService, {
                extensionUntrustedWorkspaceSupport: { 'pub.a': { default: false } },
            });
            instantiationService.stub(IWorkspaceTrustEnablementService, new TestWorkspaceTrustEnablementService());
            const extensionManifest = getExtensionManifest({ main: './out/extension.js' });
            assertUntrustedWorkspaceSupport(extensionManifest, false);
        });
        test('test extension workspace trust request when override (limited) exists in product.json', () => {
            instantiationService.stub(IProductService, {
                extensionUntrustedWorkspaceSupport: { 'pub.a': { override: 'limited' } },
            });
            instantiationService.stub(IWorkspaceTrustEnablementService, new TestWorkspaceTrustEnablementService());
            const extensionManifest = getExtensionManifest({
                main: './out/extension.js',
                capabilities: { untrustedWorkspaces: { supported: true } },
            });
            assertUntrustedWorkspaceSupport(extensionManifest, 'limited');
        });
        test('test extension workspace trust request when override (false) exists in product.json', () => {
            instantiationService.stub(IProductService, {
                extensionUntrustedWorkspaceSupport: { 'pub.a': { override: false } },
            });
            instantiationService.stub(IWorkspaceTrustEnablementService, new TestWorkspaceTrustEnablementService());
            const extensionManifest = getExtensionManifest({
                main: './out/extension.js',
                capabilities: { untrustedWorkspaces: { supported: true } },
            });
            assertUntrustedWorkspaceSupport(extensionManifest, false);
        });
        test('test extension workspace trust request when value exists in package.json', () => {
            instantiationService.stub(IProductService, {});
            instantiationService.stub(IWorkspaceTrustEnablementService, new TestWorkspaceTrustEnablementService());
            const extensionManifest = getExtensionManifest({
                main: './out/extension.js',
                capabilities: { untrustedWorkspaces: { supported: 'limited' } },
            });
            assertUntrustedWorkspaceSupport(extensionManifest, 'limited');
        });
        test('test extension workspace trust request when no value exists in package.json', () => {
            instantiationService.stub(IProductService, {});
            instantiationService.stub(IWorkspaceTrustEnablementService, new TestWorkspaceTrustEnablementService());
            const extensionManifest = getExtensionManifest({ main: './out/extension.js' });
            assertUntrustedWorkspaceSupport(extensionManifest, false);
        });
    });
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWFuaWZlc3RQcm9wZXJ0aWVzU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvZXh0ZW5zaW9ucy90ZXN0L2NvbW1vbi9leHRlbnNpb25NYW5pZmVzdFByb3BlcnRpZXNTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDOUQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDckcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFLeEgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDeEgsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwwREFBMEQsQ0FBQTtBQUMxRixPQUFPLEVBQUUsZ0NBQWdDLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUM3RyxPQUFPLEVBQUUsa0NBQWtDLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUN2RyxPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLG1DQUFtQyxHQUNuQyxNQUFNLGtEQUFrRCxDQUFBO0FBRXpELEtBQUssQ0FBQyxvREFBb0QsRUFBRSxHQUFHLEVBQUU7SUFDaEUsSUFBSSxXQUE0QixDQUFBO0lBQ2hDLElBQUksVUFBOEMsQ0FBQTtJQUVsRCxLQUFLLENBQUMs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