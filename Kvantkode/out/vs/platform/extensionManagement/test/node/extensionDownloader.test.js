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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uRG93bmxvYWRlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlbnNpb25NYW5hZ2VtZW50L3Rlc3Qvbm9kZS9leHRlbnNpb25Eb3dubG9hZGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDOUQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3pELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUN0RixPQUFPLEVBQ04sa0NBQWtDLEVBQ2xDLGlCQUFpQixFQUNqQix3QkFBd0IsR0FJeEIsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM1QyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN4RSxPQUFPLEVBRU4sc0NBQXNDLEdBQ3RDLE1BQU0scURBQXFELENBQUE7QUFDNUQsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGdD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