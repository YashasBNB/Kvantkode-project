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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWxsb3dlZEV4dGVuc2lvbnNTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2V4dGVuc2lvbk1hbmFnZW1lbnQvdGVzdC9jb21tb24vYWxsb3dlZEV4dGVuc2lvbnNTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDaEMsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbkYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFFL0YsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFDekcsT0FBTyxFQUNOLDBCQUEwQixHQUcxQixNQUFNLHFDQUFxQyxDQUFBO0FBTTVDLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUV4RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDOUQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBRXBELEtBQUssQ0FBQywwQkFBMEIsRUFBRSxHQUFHLEVBQUU7SUFDdEMsTUFBTSxXQUFXLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUU3RCxNQUFNLG9CQUFvQixHQUFHLElBQUksd0JBQXdCLEVBQUUsQ0FBQTtJQUUzRCxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1Ysb0JBQW9CLENBQUMsb0JBQW9CLENBQUMsMEJBQTBCLEVBQUUsR0FBRyxDQUFDLENBQUE7SUFDM0UsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMscUVBQXFFLEVBQUUsR0FBRyxFQUFF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