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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uTWFuaWZlc3RQcm9wZXJ0aWVzU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL2V4dGVuc2lvbnMvdGVzdC9jb21tb24vZXh0ZW5zaW9uTWFuaWZlc3RQcm9wZXJ0aWVzU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQzlELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ3JHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBS3hILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ3hILE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sMERBQTBELENBQUE7QUFDMUYsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sNERBQTRELENBQUE7QUFDN0csT0FBTyxFQUFFLGtDQUFrQyxFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDdkcsT0FBTyxFQUNOLGtCQUFrQixFQUNsQixtQ0FBbUMsR0FDbkMsTUFBTSxrREFBa0QsQ0FBQTtBQUV6RCxLQUFLLENBQUMsb0RBQW9ELEVBQUUsR0FBRyxFQUFFO0lBQ2hFLElBQUksV0FBNEIsQ0FBQTtJQUNoQyxJQUFJLFVBQThDLENBQUE7SUFFbEQsS0FBSyxDQUFDLEdBQUcs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