/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { AllowedExtensionsService } from '../../common/allowedExtensionsService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { TestConfigurationService } from '../../../configuration/test/common/testConfigurationService.js';
import { AllowedExtensionsConfigKey, } from '../../common/extensionManagement.js';
import { Event } from '../../../../base/common/event.js';
import { getGalleryExtensionId } from '../../common/extensionManagementUtil.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { URI } from '../../../../base/common/uri.js';
suite('AllowedExtensionsService', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    const configurationService = new TestConfigurationService();
    setup(() => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, '*');
    });
    test('should allow all extensions if no allowed extensions are configured', () => {
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({ id: 'test.extension', publisherDisplayName: undefined }) === true, true);
    });
    test('should not allow specific extension if not in allowed list', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, {
            'test.extension': false,
        });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({ id: 'test.extension', publisherDisplayName: undefined }) === true, false);
    });
    test('should allow specific extension if in allowed list', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, {
            'test.extension': true,
        });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({ id: 'test.extension', publisherDisplayName: undefined }) === true, true);
    });
    test('should not allow pre-release extension if only stable is allowed', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, {
            'test.extension': 'stable',
        });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({
            id: 'test.extension',
            publisherDisplayName: undefined,
            prerelease: true,
        }) === true, false);
    });
    test('should allow pre-release extension if pre-release is allowed', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, {
            'test.extension': true,
        });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({
            id: 'test.extension',
            publisherDisplayName: undefined,
            prerelease: true,
        }) === true, true);
    });
    test('should allow specific version of an extension when configured to that version', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, {
            'test.extension': ['1.2.3'],
        });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({
            id: 'test.extension',
            publisherDisplayName: undefined,
            version: '1.2.3',
        }) === true, true);
    });
    test('should allow any version of an extension when a specific version is configured', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, {
            'test.extension': ['1.2.3'],
        });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({ id: 'test.extension', publisherDisplayName: undefined }) === true, true);
    });
    test('should allow any version of an extension when stable is configured', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, {
            'test.extension': 'stable',
        });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({ id: 'test.extension', publisherDisplayName: undefined }) === true, true);
    });
    test('should allow a version of an extension when stable is configured', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, {
            'test.extension': 'stable',
        });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({
            id: 'test.extension',
            publisherDisplayName: undefined,
            version: '1.2.3',
        }) === true, true);
    });
    test('should allow a pre-release version of an extension when stable is configured', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, {
            'test.extension': 'stable',
        });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({
            id: 'test.extension',
            publisherDisplayName: undefined,
            version: '1.2.3',
            prerelease: true,
        }) === true, false);
    });
    test('should allow specific version of an extension when configured to multiple versions', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, {
            'test.extension': ['1.2.3', '2.0.1', '3.1.2'],
        });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({
            id: 'test.extension',
            publisherDisplayName: undefined,
            version: '1.2.3',
        }) === true, true);
    });
    test('should allow platform specific version of an extension when configured to platform specific version', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, {
            'test.extension': ['1.2.3@darwin-x64'],
        });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({
            id: 'test.extension',
            publisherDisplayName: undefined,
            version: '1.2.3',
            targetPlatform: "darwin-x64" /* TargetPlatform.DARWIN_X64 */,
        }) === true, true);
    });
    test('should allow universal platform specific version of an extension when configured to platform specific version', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, {
            'test.extension': ['1.2.3@darwin-x64'],
        });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({
            id: 'test.extension',
            publisherDisplayName: undefined,
            version: '1.2.3',
            targetPlatform: "universal" /* TargetPlatform.UNIVERSAL */,
        }) === true, true);
    });
    test('should allow specific version of an extension when configured to platform specific version', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, {
            'test.extension': ['1.2.3@darwin-x64'],
        });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({
            id: 'test.extension',
            publisherDisplayName: undefined,
            version: '1.2.3',
        }) === true, true);
    });
    test('should allow platform specific version of an extension when configured to multiple versions', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, {
            'test.extension': ['1.0.0', '1.2.3@darwin-x64', '1.2.3@darwin-arm64'],
        });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({
            id: 'test.extension',
            publisherDisplayName: undefined,
            version: '1.2.3',
            targetPlatform: "darwin-x64" /* TargetPlatform.DARWIN_X64 */,
        }) === true, true);
    });
    test('should not allow platform specific version of an extension when configured to different platform specific version', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, {
            'test.extension': ['1.2.3@darwin-x64'],
        });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({
            id: 'test.extension',
            publisherDisplayName: undefined,
            version: '1.2.3',
            targetPlatform: "darwin-arm64" /* TargetPlatform.DARWIN_ARM64 */,
        }) === true, false);
    });
    test('should specific version of an extension when configured to different versions', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, {
            'test.extension': ['1.0.0', '1.2.3@darwin-x64', '1.2.3@darwin-arm64'],
        });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({
            id: 'test.extension',
            publisherDisplayName: undefined,
            version: '1.0.1',
        }) === true, false);
    });
    test('should allow extension if publisher is in allowed list', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, { test: true });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({ id: 'test.extension', publisherDisplayName: undefined }), true);
    });
    test('should allow extension if publisher is not in allowed list and has publisher mapping', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, { hello: true });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(['hello']), configurationService));
        assert.strictEqual(testObject.isAllowed({ id: 'test.extension', publisherDisplayName: 'Hello' }), true);
    });
    test('should allow extension if publisher is not in allowed list and has different publisher mapping', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, { hello: true });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(['bar']), configurationService));
        assert.strictEqual(testObject.isAllowed({ id: 'test.extension', publisherDisplayName: 'Hello' }) === true, false);
    });
    test('should not allow extension if publisher is not in allowed list', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, { test: false });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({ id: 'test.extension', publisherDisplayName: undefined }) === true, false);
    });
    test('should not allow prerelease extension if publisher is allowed only to stable', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, { test: 'stable' });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({
            id: 'test.extension',
            publisherDisplayName: undefined,
            prerelease: true,
        }) === true, false);
    });
    test('should allow extension if publisher is set to random value', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, { test: 'hello' });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({
            id: 'test.extension',
            publisherDisplayName: undefined,
            prerelease: true,
        }) === true, true);
    });
    test('should allow extension if only wildcard is in allowed list', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, { '*': true });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({ id: 'test.extension', publisherDisplayName: undefined }), true);
    });
    test('should allow extension if wildcard is in allowed list', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, {
            '*': true,
            hello: false,
        });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({ id: 'test.extension', publisherDisplayName: undefined }), true);
    });
    test('should not allow extension if wildcard is not in allowed list', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, {
            '*': false,
            hello: true,
        });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed({ id: 'test.extension', publisherDisplayName: undefined }) === true, false);
    });
    test('should allow a gallery extension', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, { pub: true });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed(aGalleryExtension('name')) === true, true);
    });
    test('should allow a local extension', () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, { pub: true });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        assert.strictEqual(testObject.isAllowed(aLocalExtension('pub.name')) === true, true);
    });
    test('should trigger change event when allowed list change', async () => {
        configurationService.setUserConfiguration(AllowedExtensionsConfigKey, { '*': false });
        const testObject = disposables.add(new AllowedExtensionsService(aProductService(), configurationService));
        const promise = Event.toPromise(testObject.onDidChangeAllowedExtensionsConfigValue);
        configurationService.onDidChangeConfigurationEmitter.fire({
            affectsConfiguration: () => true,
            affectedKeys: new Set([AllowedExtensionsConfigKey]),
            change: { keys: [], overrides: [] },
            source: 2 /* ConfigurationTarget.USER */,
        });
        await promise;
    });
    function aProductService(extensionPublisherOrgs) {
        return {
            _serviceBrand: undefined,
            extensionPublisherOrgs,
        };
    }
    function aGalleryExtension(name, properties = {}, galleryExtensionProperties = {}) {
        const galleryExtension = (Object.create({
            type: 'gallery',
            name,
            publisher: 'pub',
            publisherDisplayName: 'Pub',
            version: '1.0.0',
            allTargetPlatforms: ["universal" /* TargetPlatform.UNIVERSAL */],
            properties: {},
            assets: {},
            isSigned: true,
            ...properties,
        }));
        galleryExtension.properties = {
            ...galleryExtension.properties,
            dependencies: [],
            ...galleryExtensionProperties,
        };
        galleryExtension.identifier = {
            id: getGalleryExtensionId(galleryExtension.publisher, galleryExtension.name),
            uuid: generateUuid(),
        };
        return galleryExtension;
    }
    function aLocalExtension(id, manifest = {}, properties = {}) {
        const [publisher, name] = id.split('.');
        manifest = { name, publisher, ...manifest };
        properties = {
            identifier: { id },
            location: URI.file(`pub.${name}`),
            galleryIdentifier: { id, uuid: undefined },
            type: 1 /* ExtensionType.User */,
            ...properties,
            isValid: properties.isValid ?? true,
        };
        properties.isBuiltin = properties.type === 0 /* ExtensionType.System */;
        return Object.create({ manifest, ...properties });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWxsb3dlZEV4dGVuc2lvbnNTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlbnNpb25NYW5hZ2VtZW50L3Rlc3QvY29tbW9uL2FsbG93ZWRFeHRlbnNpb25zU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQ2hDLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ25GLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRS9GLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGdFQUFnRSxDQUFBO0FBQ3pHLE9BQU8sRUFDTiwwQkFBMEIsR0FHMUIsTUFBTSxxQ0FBcUMsQ0FBQTtBQU01QyxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFeEQsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDL0UsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUVwRCxLQUFLLENBQUMsMEJBQTBCLEVBQUUsR0FBRyxFQUFFO0lBQ3RDLE1BQU0sV0FBVyxHQUFHLHVDQUF1QyxFQUFFLENBQUE7SUFFN0QsTUFBTSxvQkFBb0IsR0FBRyxJQUFJLHdCQUF3QixFQUFFLENBQUE7SUFFM0QsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLG9CQUFvQixDQUFDLG9CQUFvQixDQUFDLDBCQUEwQixFQUFFLEdBQUcsQ0FBQyxDQUFBO0lBQzNFLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHFFQUFxRSxFQUFFLEdBQUcsRUFBRTtRQUNo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