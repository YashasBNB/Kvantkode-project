var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { dirname, joinPath } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { INativeEnvironmentService } from '../../../environment/common/environment.js';
import { IExtensionsProfileScannerService, } from '../../common/extensionsProfileScannerService.js';
import { AbstractExtensionsScannerService, ExtensionScannerInput, } from '../../common/extensionsScannerService.js';
import { ExtensionsProfileScannerService } from '../../node/extensionsProfileScannerService.js';
import { IFileService } from '../../../files/common/files.js';
import { FileService } from '../../../files/common/fileService.js';
import { InMemoryFileSystemProvider } from '../../../files/common/inMemoryFilesystemProvider.js';
import { IInstantiationService } from '../../../instantiation/common/instantiation.js';
import { TestInstantiationService } from '../../../instantiation/test/common/instantiationServiceMock.js';
import { ILogService, NullLogService } from '../../../log/common/log.js';
import { IProductService } from '../../../product/common/productService.js';
import { IUriIdentityService } from '../../../uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../../uriIdentity/common/uriIdentityService.js';
import { IUserDataProfilesService, UserDataProfilesService, } from '../../../userDataProfile/common/userDataProfile.js';
let translations = Object.create(null);
const ROOT = URI.file('/ROOT');
let ExtensionsScannerService = class ExtensionsScannerService extends AbstractExtensionsScannerService {
    constructor(userDataProfilesService, extensionsProfileScannerService, fileService, logService, nativeEnvironmentService, productService, uriIdentityService, instantiationService) {
        super(URI.file(nativeEnvironmentService.builtinExtensionsPath), URI.file(nativeEnvironmentService.extensionsPath), joinPath(nativeEnvironmentService.userHome, '.vscode-oss-dev', 'extensions', 'control.json'), userDataProfilesService.defaultProfile, userDataProfilesService, extensionsProfileScannerService, fileService, logService, nativeEnvironmentService, productService, uriIdentityService, instantiationService);
    }
    async getTranslations(language) {
        return translations;
    }
};
ExtensionsScannerService = __decorate([
    __param(0, IUserDataProfilesService),
    __param(1, IExtensionsProfileScannerService),
    __param(2, IFileService),
    __param(3, ILogService),
    __param(4, INativeEnvironmentService),
    __param(5, IProductService),
    __param(6, IUriIdentityService),
    __param(7, IInstantiationService)
], ExtensionsScannerService);
suite('NativeExtensionsScanerService Test', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    setup(async () => {
        translations = {};
        instantiationService = disposables.add(new TestInstantiationService());
        const logService = new NullLogService();
        const fileService = disposables.add(new FileService(logService));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(ROOT.scheme, fileSystemProvider));
        instantiationService.stub(ILogService, logService);
        instantiationService.stub(IFileService, fileService);
        const systemExtensionsLocation = joinPath(ROOT, 'system');
        const userExtensionsLocation = joinPath(ROOT, 'extensions');
        const environmentService = instantiationService.stub(INativeEnvironmentService, {
            userHome: ROOT,
            userRoamingDataHome: ROOT,
            builtinExtensionsPath: systemExtensionsLocation.fsPath,
            extensionsPath: userExtensionsLocation.fsPath,
            cacheHome: joinPath(ROOT, 'cache'),
        });
        instantiationService.stub(IProductService, { version: '1.66.0' });
        const uriIdentityService = disposables.add(new UriIdentityService(fileService));
        instantiationService.stub(IUriIdentityService, uriIdentityService);
        const userDataProfilesService = disposables.add(new UserDataProfilesService(environmentService, fileService, uriIdentityService, logService));
        instantiationService.stub(IUserDataProfilesService, userDataProfilesService);
        instantiationService.stub(IExtensionsProfileScannerService, disposables.add(new ExtensionsProfileScannerService(environmentService, fileService, userDataProfilesService, uriIdentityService, logService)));
        await fileService.createFolder(systemExtensionsLocation);
        await fileService.createFolder(userExtensionsLocation);
    });
    test('scan system extension', async () => {
        const manifest = anExtensionManifest({
            name: 'name',
            publisher: 'pub',
        });
        const extensionLocation = await aSystemExtension(manifest);
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsScannerService));
        const actual = await testObject.scanSystemExtensions({});
        assert.deepStrictEqual(actual.length, 1);
        assert.deepStrictEqual(actual[0].identifier, { id: 'pub.name' });
        assert.deepStrictEqual(actual[0].location.toString(), extensionLocation.toString());
        assert.deepStrictEqual(actual[0].isBuiltin, true);
        assert.deepStrictEqual(actual[0].type, 0 /* ExtensionType.System */);
        assert.deepStrictEqual(actual[0].isValid, true);
        assert.deepStrictEqual(actual[0].validations, []);
        assert.deepStrictEqual(actual[0].metadata, undefined);
        assert.deepStrictEqual(actual[0].targetPlatform, "undefined" /* TargetPlatform.UNDEFINED */);
        assert.deepStrictEqual(actual[0].manifest, manifest);
    });
    test('scan user extensions', async () => {
        const manifest = anExtensionManifest({
            name: 'name',
            publisher: 'pub',
        });
        const extensionLocation = await aUserExtension(manifest);
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsScannerService));
        const actual = await testObject.scanAllUserExtensions();
        assert.deepStrictEqual(actual.length, 1);
        assert.deepStrictEqual(actual[0].identifier, { id: 'pub.name' });
        assert.deepStrictEqual(actual[0].location.toString(), extensionLocation.toString());
        assert.deepStrictEqual(actual[0].isBuiltin, false);
        assert.deepStrictEqual(actual[0].type, 1 /* ExtensionType.User */);
        assert.deepStrictEqual(actual[0].isValid, true);
        assert.deepStrictEqual(actual[0].validations, []);
        assert.deepStrictEqual(actual[0].metadata, undefined);
        assert.deepStrictEqual(actual[0].targetPlatform, "undefined" /* TargetPlatform.UNDEFINED */);
        delete manifest.__metadata;
        assert.deepStrictEqual(actual[0].manifest, manifest);
    });
    test('scan existing extension', async () => {
        const manifest = anExtensionManifest({
            name: 'name',
            publisher: 'pub',
        });
        const extensionLocation = await aUserExtension(manifest);
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsScannerService));
        const actual = await testObject.scanExistingExtension(extensionLocation, 1 /* ExtensionType.User */, {});
        assert.notEqual(actual, null);
        assert.deepStrictEqual(actual.identifier, { id: 'pub.name' });
        assert.deepStrictEqual(actual.location.toString(), extensionLocation.toString());
        assert.deepStrictEqual(actual.isBuiltin, false);
        assert.deepStrictEqual(actual.type, 1 /* ExtensionType.User */);
        assert.deepStrictEqual(actual.isValid, true);
        assert.deepStrictEqual(actual.validations, []);
        assert.deepStrictEqual(actual.metadata, undefined);
        assert.deepStrictEqual(actual.targetPlatform, "undefined" /* TargetPlatform.UNDEFINED */);
        assert.deepStrictEqual(actual.manifest, manifest);
    });
    test('scan single extension', async () => {
        const manifest = anExtensionManifest({
            name: 'name',
            publisher: 'pub',
        });
        const extensionLocation = await aUserExtension(manifest);
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsScannerService));
        const actual = await testObject.scanOneOrMultipleExtensions(extensionLocation, 1 /* ExtensionType.User */, {});
        assert.deepStrictEqual(actual.length, 1);
        assert.deepStrictEqual(actual[0].identifier, { id: 'pub.name' });
        assert.deepStrictEqual(actual[0].location.toString(), extensionLocation.toString());
        assert.deepStrictEqual(actual[0].isBuiltin, false);
        assert.deepStrictEqual(actual[0].type, 1 /* ExtensionType.User */);
        assert.deepStrictEqual(actual[0].isValid, true);
        assert.deepStrictEqual(actual[0].validations, []);
        assert.deepStrictEqual(actual[0].metadata, undefined);
        assert.deepStrictEqual(actual[0].targetPlatform, "undefined" /* TargetPlatform.UNDEFINED */);
        assert.deepStrictEqual(actual[0].manifest, manifest);
    });
    test('scan multiple extensions', async () => {
        const extensionLocation = await aUserExtension(anExtensionManifest({ name: 'name', publisher: 'pub' }));
        await aUserExtension(anExtensionManifest({ name: 'name2', publisher: 'pub' }));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsScannerService));
        const actual = await testObject.scanOneOrMultipleExtensions(dirname(extensionLocation), 1 /* ExtensionType.User */, {});
        assert.deepStrictEqual(actual.length, 2);
        assert.deepStrictEqual(actual[0].identifier, { id: 'pub.name' });
        assert.deepStrictEqual(actual[1].identifier, { id: 'pub.name2' });
    });
    test('scan all user extensions with different versions', async () => {
        await aUserExtension(anExtensionManifest({ name: 'name', publisher: 'pub', version: '1.0.1' }));
        await aUserExtension(anExtensionManifest({ name: 'name', publisher: 'pub', version: '1.0.2' }));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsScannerService));
        const actual = await testObject.scanAllUserExtensions({
            includeAllVersions: false,
            includeInvalid: false,
        });
        assert.deepStrictEqual(actual.length, 1);
        assert.deepStrictEqual(actual[0].identifier, { id: 'pub.name' });
        assert.deepStrictEqual(actual[0].manifest.version, '1.0.2');
    });
    test('scan all user extensions include all versions', async () => {
        await aUserExtension(anExtensionManifest({ name: 'name', publisher: 'pub', version: '1.0.1' }));
        await aUserExtension(anExtensionManifest({ name: 'name', publisher: 'pub', version: '1.0.2' }));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsScannerService));
        const actual = await testObject.scanAllUserExtensions();
        assert.deepStrictEqual(actual.length, 2);
        assert.deepStrictEqual(actual[0].identifier, { id: 'pub.name' });
        assert.deepStrictEqual(actual[0].manifest.version, '1.0.1');
        assert.deepStrictEqual(actual[1].identifier, { id: 'pub.name' });
        assert.deepStrictEqual(actual[1].manifest.version, '1.0.2');
    });
    test('scan all user extensions with different versions and higher version is not compatible', async () => {
        await aUserExtension(anExtensionManifest({ name: 'name', publisher: 'pub', version: '1.0.1' }));
        await aUserExtension(anExtensionManifest({
            name: 'name',
            publisher: 'pub',
            version: '1.0.2',
            engines: { vscode: '^1.67.0' },
        }));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsScannerService));
        const actual = await testObject.scanAllUserExtensions({
            includeAllVersions: false,
            includeInvalid: false,
        });
        assert.deepStrictEqual(actual.length, 1);
        assert.deepStrictEqual(actual[0].identifier, { id: 'pub.name' });
        assert.deepStrictEqual(actual[0].manifest.version, '1.0.1');
    });
    test('scan all user extensions exclude invalid extensions', async () => {
        await aUserExtension(anExtensionManifest({ name: 'name', publisher: 'pub' }));
        await aUserExtension(anExtensionManifest({ name: 'name2', publisher: 'pub', engines: { vscode: '^1.67.0' } }));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsScannerService));
        const actual = await testObject.scanAllUserExtensions({
            includeAllVersions: false,
            includeInvalid: false,
        });
        assert.deepStrictEqual(actual.length, 1);
        assert.deepStrictEqual(actual[0].identifier, { id: 'pub.name' });
    });
    test('scan all user extensions include invalid extensions', async () => {
        await aUserExtension(anExtensionManifest({ name: 'name', publisher: 'pub' }));
        await aUserExtension(anExtensionManifest({ name: 'name2', publisher: 'pub', engines: { vscode: '^1.67.0' } }));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsScannerService));
        const actual = await testObject.scanAllUserExtensions({
            includeAllVersions: false,
            includeInvalid: true,
        });
        assert.deepStrictEqual(actual.length, 2);
        assert.deepStrictEqual(actual[0].identifier, { id: 'pub.name' });
        assert.deepStrictEqual(actual[1].identifier, { id: 'pub.name2' });
    });
    test('scan system extensions include additional builtin extensions', async () => {
        instantiationService.stub(IProductService, {
            version: '1.66.0',
            builtInExtensions: [
                { name: 'pub.name2', version: '', repo: '', metadata: undefined },
                { name: 'pub.name', version: '', repo: '', metadata: undefined },
            ],
        });
        await anExtension(anExtensionManifest({ name: 'name2', publisher: 'pub' }), joinPath(ROOT, 'additional'));
        const extensionLocation = await anExtension(anExtensionManifest({ name: 'name', publisher: 'pub' }), joinPath(ROOT, 'additional'));
        await aSystemExtension(anExtensionManifest({ name: 'name', publisher: 'pub', version: '1.0.1' }));
        await instantiationService
            .get(IFileService)
            .writeFile(joinPath(instantiationService.get(INativeEnvironmentService).userHome, '.vscode-oss-dev', 'extensions', 'control.json'), VSBuffer.fromString(JSON.stringify({ 'pub.name2': 'disabled', 'pub.name': extensionLocation.fsPath })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsScannerService));
        const actual = await testObject.scanSystemExtensions({ checkControlFile: true });
        assert.deepStrictEqual(actual.length, 1);
        assert.deepStrictEqual(actual[0].identifier, { id: 'pub.name' });
        assert.deepStrictEqual(actual[0].manifest.version, '1.0.0');
    });
    test('scan all user extensions with default nls replacements', async () => {
        const extensionLocation = await aUserExtension(anExtensionManifest({ name: 'name', publisher: 'pub', displayName: '%displayName%' }));
        await instantiationService
            .get(IFileService)
            .writeFile(joinPath(extensionLocation, 'package.nls.json'), VSBuffer.fromString(JSON.stringify({ displayName: 'Hello World' })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsScannerService));
        const actual = await testObject.scanAllUserExtensions();
        assert.deepStrictEqual(actual.length, 1);
        assert.deepStrictEqual(actual[0].identifier, { id: 'pub.name' });
        assert.deepStrictEqual(actual[0].manifest.displayName, 'Hello World');
    });
    test('scan extension with en nls replacements', async () => {
        const extensionLocation = await aUserExtension(anExtensionManifest({ name: 'name', publisher: 'pub', displayName: '%displayName%' }));
        await instantiationService
            .get(IFileService)
            .writeFile(joinPath(extensionLocation, 'package.nls.json'), VSBuffer.fromString(JSON.stringify({ displayName: 'Hello World' })));
        const nlsLocation = joinPath(extensionLocation, 'package.en.json');
        await instantiationService
            .get(IFileService)
            .writeFile(nlsLocation, VSBuffer.fromString(JSON.stringify({ contents: { package: { displayName: 'Hello World EN' } } })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsScannerService));
        translations = { 'pub.name': nlsLocation.fsPath };
        const actual = await testObject.scanExistingExtension(extensionLocation, 1 /* ExtensionType.User */, {
            language: 'en',
        });
        assert.ok(actual !== null);
        assert.deepStrictEqual(actual.identifier, { id: 'pub.name' });
        assert.deepStrictEqual(actual.manifest.displayName, 'Hello World EN');
    });
    test('scan extension falls back to default nls replacements', async () => {
        const extensionLocation = await aUserExtension(anExtensionManifest({ name: 'name', publisher: 'pub', displayName: '%displayName%' }));
        await instantiationService
            .get(IFileService)
            .writeFile(joinPath(extensionLocation, 'package.nls.json'), VSBuffer.fromString(JSON.stringify({ displayName: 'Hello World' })));
        const nlsLocation = joinPath(extensionLocation, 'package.en.json');
        await instantiationService
            .get(IFileService)
            .writeFile(nlsLocation, VSBuffer.fromString(JSON.stringify({ contents: { package: { displayName: 'Hello World EN' } } })));
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsScannerService));
        translations = { 'pub.name2': nlsLocation.fsPath };
        const actual = await testObject.scanExistingExtension(extensionLocation, 1 /* ExtensionType.User */, {
            language: 'en',
        });
        assert.ok(actual !== null);
        assert.deepStrictEqual(actual.identifier, { id: 'pub.name' });
        assert.deepStrictEqual(actual.manifest.displayName, 'Hello World');
    });
    test('scan single extension with manifest metadata retains manifest metadata', async () => {
        const manifest = anExtensionManifest({
            name: 'name',
            publisher: 'pub',
        });
        const expectedMetadata = {
            size: 12345,
            installedTimestamp: 1234567890,
            targetPlatform: "darwin-arm64" /* TargetPlatform.DARWIN_ARM64 */,
        };
        const extensionLocation = await aUserExtension({
            ...manifest,
            __metadata: expectedMetadata,
        });
        const testObject = disposables.add(instantiationService.createInstance(ExtensionsScannerService));
        const actual = await testObject.scanExistingExtension(extensionLocation, 1 /* ExtensionType.User */, {});
        assert.notStrictEqual(actual, null);
        assert.deepStrictEqual(actual.identifier, { id: 'pub.name' });
        assert.deepStrictEqual(actual.location.toString(), extensionLocation.toString());
        assert.deepStrictEqual(actual.isBuiltin, false);
        assert.deepStrictEqual(actual.type, 1 /* ExtensionType.User */);
        assert.deepStrictEqual(actual.isValid, true);
        assert.deepStrictEqual(actual.validations, []);
        assert.deepStrictEqual(actual.metadata, expectedMetadata);
        assert.deepStrictEqual(actual.manifest, manifest);
    });
    async function aUserExtension(manifest) {
        const environmentService = instantiationService.get(INativeEnvironmentService);
        return anExtension(manifest, URI.file(environmentService.extensionsPath));
    }
    async function aSystemExtension(manifest) {
        const environmentService = instantiationService.get(INativeEnvironmentService);
        return anExtension(manifest, URI.file(environmentService.builtinExtensionsPath));
    }
    async function anExtension(manifest, root) {
        const fileService = instantiationService.get(IFileService);
        const extensionLocation = joinPath(root, `${manifest.publisher}.${manifest.name}-${manifest.version}`);
        await fileService.writeFile(joinPath(extensionLocation, 'package.json'), VSBuffer.fromString(JSON.stringify(manifest)));
        return extensionLocation;
    }
    function anExtensionManifest(manifest) {
        return {
            engines: { vscode: '^1.66.0' },
            version: '1.0.0',
            main: 'main.js',
            activationEvents: ['*'],
            ...manifest,
        };
    }
});
suite('ExtensionScannerInput', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('compare inputs - location', () => {
        const anInput = (location, mtime) => new ExtensionScannerInput(location, mtime, undefined, undefined, false, undefined, 1 /* ExtensionType.User */, true, '1.1.1', undefined, undefined, true, undefined, {});
        assert.strictEqual(ExtensionScannerInput.equals(anInput(ROOT, undefined), anInput(ROOT, undefined)), true);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(ROOT, 100), anInput(ROOT, 100)), true);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(joinPath(ROOT, 'foo'), undefined), anInput(ROOT, undefined)), false);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(ROOT, 100), anInput(ROOT, 200)), false);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(ROOT, undefined), anInput(ROOT, 200)), false);
    });
    test('compare inputs - application location', () => {
        const anInput = (location, mtime) => new ExtensionScannerInput(ROOT, undefined, location, mtime, false, undefined, 1 /* ExtensionType.User */, true, '1.1.1', undefined, undefined, true, undefined, {});
        assert.strictEqual(ExtensionScannerInput.equals(anInput(ROOT, undefined), anInput(ROOT, undefined)), true);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(ROOT, 100), anInput(ROOT, 100)), true);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(joinPath(ROOT, 'foo'), undefined), anInput(ROOT, undefined)), false);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(ROOT, 100), anInput(ROOT, 200)), false);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(ROOT, undefined), anInput(ROOT, 200)), false);
    });
    test('compare inputs - profile', () => {
        const anInput = (profile, profileScanOptions) => new ExtensionScannerInput(ROOT, undefined, undefined, undefined, profile, profileScanOptions, 1 /* ExtensionType.User */, true, '1.1.1', undefined, undefined, true, undefined, {});
        assert.strictEqual(ExtensionScannerInput.equals(anInput(true, { bailOutWhenFileNotFound: true }), anInput(true, { bailOutWhenFileNotFound: true })), true);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(false, { bailOutWhenFileNotFound: true }), anInput(false, { bailOutWhenFileNotFound: true })), true);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(true, { bailOutWhenFileNotFound: false }), anInput(true, { bailOutWhenFileNotFound: false })), true);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(true, {}), anInput(true, {})), true);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(true, { bailOutWhenFileNotFound: true }), anInput(true, { bailOutWhenFileNotFound: false })), false);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(true, {}), anInput(true, { bailOutWhenFileNotFound: true })), false);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(true, undefined), anInput(true, {})), false);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(false, { bailOutWhenFileNotFound: true }), anInput(true, { bailOutWhenFileNotFound: true })), false);
    });
    test('compare inputs - extension type', () => {
        const anInput = (type) => new ExtensionScannerInput(ROOT, undefined, undefined, undefined, false, undefined, type, true, '1.1.1', undefined, undefined, true, undefined, {});
        assert.strictEqual(ExtensionScannerInput.equals(anInput(0 /* ExtensionType.System */), anInput(0 /* ExtensionType.System */)), true);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(1 /* ExtensionType.User */), anInput(1 /* ExtensionType.User */)), true);
        assert.strictEqual(ExtensionScannerInput.equals(anInput(1 /* ExtensionType.User */), anInput(0 /* ExtensionType.System */)), false);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1NjYW5uZXJTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlbnNpb25NYW5hZ2VtZW50L3Rlc3Qvbm9kZS9leHRlbnNpb25zU2Nhbm5lclNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7QUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDeEUsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ3RGLE9BQU8sRUFDTixnQ0FBZ0MsR0FFaEMsTUFBTSxpREFBaUQsQ0FBQTtBQUN4RCxPQUFPLEVBQ04sZ0NBQWdDLEVBQ2hDLHFCQUFxQixHQUlyQixNQUFNLDBDQUEwQyxDQUFBO0FBQ2pELE9BQU8sRUFBRSwrQkFBK0IsRUFBRSxNQUFNLCtDQUErQyxDQUFBO0FBTS9GLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDbEUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDaEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDdEYsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFDekcsT0FBTyxFQUFFLFdB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