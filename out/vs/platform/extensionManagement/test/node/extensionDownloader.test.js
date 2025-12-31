/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { platform } from '../../../../base/common/platform.js';
import { arch } from '../../../../base/common/process.js';
import { joinPath } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { mock } from '../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { INativeEnvironmentService } from '../../../environment/common/environment.js';
import { ExtensionSignatureVerificationCode, getTargetPlatform, IExtensionGalleryService, } from '../../common/extensionManagement.js';
import { getGalleryExtensionId } from '../../common/extensionManagementUtil.js';
import { ExtensionsDownloader } from '../../node/extensionDownloader.js';
import { IExtensionSignatureVerificationService, } from '../../node/extensionSignatureVerificationService.js';
import { IFileService } from '../../../files/common/files.js';
import { FileService } from '../../../files/common/fileService.js';
import { InMemoryFileSystemProvider } from '../../../files/common/inMemoryFilesystemProvider.js';
import { TestInstantiationService } from '../../../instantiation/test/common/instantiationServiceMock.js';
import { ILogService, NullLogService } from '../../../log/common/log.js';
import { IUriIdentityService } from '../../../uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../../uriIdentity/common/uriIdentityService.js';
const ROOT = URI.file('tests').with({ scheme: 'vscode-tests' });
class TestExtensionSignatureVerificationService extends mock() {
    constructor(verificationResult) {
        super();
        this.verificationResult = verificationResult;
    }
    async verify() {
        if (this.verificationResult === true) {
            return {
                code: ExtensionSignatureVerificationCode.Success,
            };
        }
        if (this.verificationResult === false) {
            return undefined;
        }
        return {
            code: this.verificationResult,
        };
    }
}
class TestExtensionDownloader extends ExtensionsDownloader {
    async validate() { }
}
suite('ExtensionDownloader Tests', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    setup(() => {
        instantiationService = disposables.add(new TestInstantiationService());
        const logService = new NullLogService();
        const fileService = disposables.add(new FileService(logService));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(ROOT.scheme, fileSystemProvider));
        instantiationService.stub(ILogService, logService);
        instantiationService.stub(IFileService, fileService);
        instantiationService.stub(ILogService, logService);
        instantiationService.stub(IUriIdentityService, disposables.add(new UriIdentityService(fileService)));
        instantiationService.stub(INativeEnvironmentService, {
            extensionsDownloadLocation: joinPath(ROOT, 'CachedExtensionVSIXs'),
        });
        instantiationService.stub(IExtensionGalleryService, {
            async download(extension, location, operation) {
                await fileService.writeFile(location, VSBuffer.fromString('extension vsix'));
            },
            async downloadSignatureArchive(extension, location) {
                await fileService.writeFile(location, VSBuffer.fromString('extension signature'));
            },
        });
    });
    test('download completes successfully if verification is disabled by options', async () => {
        const testObject = aTestObject({ verificationResult: 'error' });
        const actual = await testObject.download(aGalleryExtension('a', { isSigned: true }), 2 /* InstallOperation.Install */, false);
        assert.strictEqual(actual.verificationStatus, undefined);
    });
    test('download completes successfully if verification is disabled because the module is not loaded', async () => {
        const testObject = aTestObject({ verificationResult: false });
        const actual = await testObject.download(aGalleryExtension('a', { isSigned: true }), 2 /* InstallOperation.Install */, true);
        assert.strictEqual(actual.verificationStatus, undefined);
    });
    test('download completes successfully if verification fails to execute', async () => {
        const errorCode = 'ENOENT';
        const testObject = aTestObject({ verificationResult: errorCode });
        const actual = await testObject.download(aGalleryExtension('a', { isSigned: true }), 2 /* InstallOperation.Install */, true);
        assert.strictEqual(actual.verificationStatus, errorCode);
    });
    test('download completes successfully if verification fails ', async () => {
        const errorCode = 'IntegrityCheckFailed';
        const testObject = aTestObject({ verificationResult: errorCode });
        const actual = await testObject.download(aGalleryExtension('a', { isSigned: true }), 2 /* InstallOperation.Install */, true);
        assert.strictEqual(actual.verificationStatus, errorCode);
    });
    test('download completes successfully if verification succeeds', async () => {
        const testObject = aTestObject({ verificationResult: true });
        const actual = await testObject.download(aGalleryExtension('a', { isSigned: true }), 2 /* InstallOperation.Install */, true);
        assert.strictEqual(actual.verificationStatus, ExtensionSignatureVerificationCode.Success);
    });
    test('download completes successfully for unsigned extension', async () => {
        const testObject = aTestObject({ verificationResult: true });
        const actual = await testObject.download(aGalleryExtension('a', { isSigned: false }), 2 /* InstallOperation.Install */, true);
        assert.strictEqual(actual.verificationStatus, ExtensionSignatureVerificationCode.NotSigned);
    });
    test('download completes successfully for an unsigned extension even when signature verification throws error', async () => {
        const testObject = aTestObject({ verificationResult: 'error' });
        const actual = await testObject.download(aGalleryExtension('a', { isSigned: false }), 2 /* InstallOperation.Install */, true);
        assert.strictEqual(actual.verificationStatus, ExtensionSignatureVerificationCode.NotSigned);
    });
    function aTestObject(options) {
        instantiationService.stub(IExtensionSignatureVerificationService, new TestExtensionSignatureVerificationService(options.verificationResult));
        return disposables.add(instantiationService.createInstance(TestExtensionDownloader));
    }
    function aGalleryExtension(name, properties = {}, galleryExtensionProperties = {}, assets = {}) {
        const targetPlatform = getTargetPlatform(platform, arch);
        const galleryExtension = (Object.create({
            name,
            publisher: 'pub',
            version: '1.0.0',
            allTargetPlatforms: [targetPlatform],
            properties: {},
            assets: {},
            ...properties,
        }));
        galleryExtension.properties = {
            ...galleryExtension.properties,
            dependencies: [],
            targetPlatform,
            ...galleryExtensionProperties,
        };
        galleryExtension.assets = { ...galleryExtension.assets, ...assets };
        galleryExtension.identifier = {
            id: getGalleryExtensionId(galleryExtension.publisher, galleryExtension.name),
            uuid: generateUuid(),
        };
        return galleryExtension;
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uRG93bmxvYWRlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZXh0ZW5zaW9uTWFuYWdlbWVudC90ZXN0L25vZGUvZXh0ZW5zaW9uRG93bmxvYWRlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDM0QsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDdEYsT0FBTyxFQUNOLGtDQUFrQyxFQUNsQyxpQkFBaUIsRUFDakIsd0JBQXdCLEdBSXhCLE1BQU0scUNBQXFDLENBQUE7QUFDNUMsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDL0UsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDeEUsT0FBTyxFQUVOLHNDQUFzQyxHQUN0QyxNQUFNLHFEQUFxRCxDQUFBO0FBQzVELE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxnQ0FBZ0Ms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