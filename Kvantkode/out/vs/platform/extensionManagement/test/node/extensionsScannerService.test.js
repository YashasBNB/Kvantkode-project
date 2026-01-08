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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1NjYW5uZXJTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3BsYXRmb3JtL2V4dGVuc2lvbk1hbmFnZW1lbnQvdGVzdC9ub2RlL2V4dGVuc2lvbnNTY2FubmVyU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7OztBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDNUQsT0FBTyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDdEYsT0FBTyxFQUNOLGdDQUFnQyxHQUVoQyxNQUFNLGlEQUFpRCxDQUFBO0FBQ3hELE9BQU8sRUFDTixnQ0FBZ0MsRUFDaEMscUJBQXFCLEdBSXJCLE1BQU0sMENBQTBDLENBQUE7QUFDakQsT0FBTyxFQUFFLCtCQUErQixFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFNL0YsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzdELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUN0RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUN6RyxPQUFPLEVBQUUsV0FBVyxFQUFFLGNBQWMsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ3hFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUNoRixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxtREFBbUQsQ0FBQTtBQUN0RixPQUFPLEVBQ04sd0JBQXdCLEVBQ3hCLHVCQUF1QixHQUN2QixNQUFNLG9EQUFvRCxDQUFBO0FBRTNELElBQUksWUFBWSxHQUFpQixNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFBO0FBQ3BELE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUE7QUFFOUIsSUFBTSx3QkFBd0IsR0FBOUIsTUFBTSx3QkFDTCxTQUFRLGdDQUFnQztJQUd4QyxZQUMyQix1QkFBaUQsRUFFM0UsK0JBQWlFLEVBQ25ELFdBQXlCLEVBQzFCLFVBQXVCLEVBQ1Qsd0JBQW1ELEVBQzdELGNBQStCLEVBQzNCLGtCQUF1QyxFQUNyQyxvQkFBMkM7UUFFbEUsS0FBSyxDQUNKLEdBQUcsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLENBQUMscUJBQXFCLENBQUMsRUFDeEQsR0FBRyxDQUFDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxjQUFjLENBQUMsRUFDakQsUUFBUSxDQUFDLHdCQUF3QixDQUFDLFFBQVEsRUFBRSxpQkFBaUIsRUFBRSxZQUFZLEVBQUUsY0FBYyxDQUFDLEVBQzVGLHVCQUF1QixDQUFDLGNBQWMsRUFDdEMsdUJBQXVCLEVBQ3ZCLCtCQUErQixFQUMvQixXQUFXLEVBQ1gsVUFBVSxFQUNWLHdCQUF3QixFQUN4QixjQUFjLEVBQ2Qsa0JBQWtCLEVBQ2xCLG9CQUFvQixDQUNwQixDQUFBO0lBQ0YsQ0FBQztJQUVTLEtBQUssQ0FBQyxlQUFlLENBQUMsUUFBZ0I7UUFDL0MsT0FBTyxZQUFZLENBQUE7SUFDcEIsQ0FBQztDQUNELENBQUE7QUFsQ0ssd0JBQXdCO0lBSzNCLFdBQUEsd0JBQXdCLENBQUE7SUFDeEIsV0FBQSxnQ0FBZ0MsQ0FBQTtJQUVoQyxXQUFBLFlBQVksQ0FBQTtJQUNaLFdBQUEsV0FBVyxDQUFBO0lBQ1gsV0FBQSx5QkFBeUIsQ0FBQTtJQUN6QixXQUFBLGVBQWUsQ0FBQTtJQUNmLFdBQUEsbUJBQW1CLENBQUE7SUFDbkIsV0FBQSxxQkFBcUIsQ0FBQTtHQWJsQix3QkFBd0IsQ0FrQzdCO0FBRUQsS0FBSyxDQUFDLG9DQUFvQyxFQUFFLEdBQUcsRUFBRTtJQUNoRCxNQUFNLFdBQVcsR0FBRyx1Q0FBdUMsRUFBRSxDQUFBO0lBQzdELElBQUksb0JBQThDLENBQUE7SUFFbEQsS0FBSyxDQUFDLEtBQUssSUFBSSxFQUFFO1FBQ2hCLFlBQVksR0FBRyxFQUFFLENBQUE7UUFDakIsb0JBQW9CLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLHdCQUF3QixFQUFFLENBQUMsQ0FBQTtRQUN0RSxNQUFNLFVBQVUsR0FBRyxJQUFJLGNBQWMsRUFBRSxDQUFBO1FBQ3ZDLE1BQU0sV0FBVyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxXQUFXLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQTtRQUNoRSxNQUFNLGtCQUFrQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSwwQkFBMEIsRUFBRSxDQUFDLENBQUE7UUFDNUUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxrQkFBa0IsQ0FBQyxDQUFDLENBQUE7UUFDOUUsb0JBQW9CLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxVQUFVLENBQUMsQ0FBQTtRQUNsRCxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQ3BELE1BQU0sd0JBQXdCLEdBQUcsUUFBUSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUN6RCxNQUFNLHNCQUFzQixHQUFHLFFBQVEsQ0FBQyxJQUFJLEVBQUUsWUFBWSxDQUFDLENBQUE7UUFDM0QsTUFBTSxrQkFBa0IsR0FBRyxvQkFBb0IsQ0FBQyxJQUFJLENBQUMseUJBQXlCLEVBQUU7WUFDL0UsUUFBUSxFQUFFLElBQUk7WUFDZCxtQkFBbUIsRUFBRSxJQUFJO1lBQ3pCLHFCQUFxQixFQUFFLHdCQUF3QixDQUFDLE1BQU07WUFDdEQsY0FBYyxFQUFFLHNCQUFzQixDQUFDLE1BQU07WUFDN0MsU0FBUyxFQUFFLFFBQVEsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDO1NBQ2xDLENBQUMsQ0FBQTtRQUNGLG9CQUFvQixDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUUsRUFBRSxPQUFPLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQTtRQUNqRSxNQUFNLGtCQUFrQixHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFBO1FBQy9FLG9CQUFvQixDQUFDLElBQUksQ0FBQyxtQkFBbUIsRUFBRSxrQkFBa0IsQ0FBQyxDQUFBO1FBQ2xFLE1BQU0sdUJBQXVCLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FDOUMsSUFBSSx1QkFBdUIsQ0FBQyxrQkFBa0IsRUFBRSxXQUFXLEVBQUUsa0JBQWtCLEVBQUUsVUFBVSxDQUFDLENBQzVGLENBQUE7UUFDRCxvQkFBb0IsQ0FBQyxJQUFJLENBQUMsd0JBQXdCLEVBQUUsdUJBQXVCLENBQUMsQ0FBQTtRQUM1RSxvQkFBb0IsQ0FBQyxJQUFJLENBQ3hCLGdDQUFnQyxFQUNoQyxXQUFXLENBQUMsR0FBRyxDQUNkLElBQUksK0JBQStCLENBQ2xDLGtCQUFrQixFQUNsQixXQUFXLEVBQ1gsdUJBQXVCLEVBQ3ZCLGtCQUFrQixFQUNsQixVQUFVLENBQ1YsQ0FDRCxDQUNELENBQUE7UUFDRCxNQUFNLFdBQVcsQ0FBQyxZQUFZLENBQUMsd0JBQXdCLENBQUMsQ0FBQTtRQUN4RCxNQUFNLFdBQVcsQ0FBQyxZQUFZLENBQUMsc0JBQXNCLENBQUMsQ0FBQTtJQUN2RCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN4QyxNQUFNLFFBQVEsR0FBZ0MsbUJBQW1CLENBQUM7WUFDakUsSUFBSSxFQUFFLE1BQU07WUFDWixTQUFTLEVBQUUsS0FBSztTQUNoQixDQUFDLENBQUE7UUFDRixNQUFNLGlCQUFpQixHQUFHLE1BQU0sZ0JBQWdCLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDMUQsTUFBTSxVQUFVLEdBQThCLFdBQVcsQ0FBQyxHQUFHLENBQzVELG9CQUFvQixDQUFDLGNBQWMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUM3RCxDQUFBO1FBRUQsTUFBTSxNQUFNLEdBQUcsTUFBTSxVQUFVLENBQUMsb0JBQW9CLENBQUMsRUFBRSxDQUFDLENBQUE7UUFFeEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO1FBQ25GLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUNqRCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLCtCQUF1QixDQUFBO1FBQzVELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMvQyxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDakQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3JELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsNkNBQTJCLENBQUE7UUFDMUUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQ3JELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHNCQUFzQixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3ZDLE1BQU0sUUFBUSxHQUF1QyxtQkFBbUIsQ0FBQztZQUN4RSxJQUFJLEVBQUUsTUFBTTtZQUNaLFNBQVMsRUFBRSxLQUFLO1NBQ2hCLENBQUMsQ0FBQTtRQUNGLE1BQU0saUJBQWlCLEdBQUcsTUFBTSxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDeEQsTUFBTSxVQUFVLEdBQThCLFdBQVcsQ0FBQyxHQUFHLENBQzVELG9CQUFvQixDQUFDLGNBQWMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUM3RCxDQUFBO1FBRUQsTUFBTSxNQUFNLEdBQUcsTUFBTSxVQUFVLENBQUMscUJBQXFCLEVBQUUsQ0FBQTtRQUV2RCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDeEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUUsRUFBRSxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7UUFDbkYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2xELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksNkJBQXFCLENBQUE7UUFDMUQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQy9DLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNqRCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFDckQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyw2Q0FBMkIsQ0FBQTtRQUMxRSxPQUFPLFFBQVEsQ0FBQyxVQUFVLENBQUE7UUFDMUIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQ3JELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHlCQUF5QixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzFDLE1BQU0sUUFBUSxHQUFnQyxtQkFBbUIsQ0FBQztZQUNqRSxJQUFJLEVBQUUsTUFBTTtZQUNaLFNBQVMsRUFBRSxLQUFLO1NBQ2hCLENBQUMsQ0FBQTtRQUNGLE1BQU0saUJBQWlCLEdBQUcsTUFBTSxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDeEQsTUFBTSxVQUFVLEdBQThCLFdBQVcsQ0FBQyxHQUFHLENBQzVELG9CQUFvQixDQUFDLGNBQWMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUM3RCxDQUFBO1FBRUQsTUFBTSxNQUFNLEdBQUcsTUFBTSxVQUFVLENBQUMscUJBQXFCLENBQUMsaUJBQWlCLDhCQUFzQixFQUFFLENBQUMsQ0FBQTtRQUVoRyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM3QixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU8sQ0FBQyxVQUFVLEVBQUUsRUFBRSxFQUFFLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQTtRQUM5RCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU8sQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsaUJBQWlCLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQTtRQUNqRixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU8sQ0FBQyxTQUFTLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDaEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFPLENBQUMsSUFBSSw2QkFBcUIsQ0FBQTtRQUN4RCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU8sQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDN0MsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFPLENBQUMsV0FBVyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQy9DLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTyxDQUFDLFFBQVEsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNuRCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU8sQ0FBQyxjQUFjLDZDQUEyQixDQUFBO1FBQ3hFLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTyxDQUFDLFFBQVEsRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUNuRCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN4QyxNQUFNLFFBQVEsR0FBZ0MsbUJBQW1CLENBQUM7WUFDakUsSUFBSSxFQUFFLE1BQU07WUFDWixTQUFTLEVBQUUsS0FBSztTQUNoQixDQUFDLENBQUE7UUFDRixNQUFNLGlCQUFpQixHQUFHLE1BQU0sY0FBYyxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3hELE1BQU0sVUFBVSxHQUE4QixXQUFXLENBQUMsR0FBRyxDQUM1RCxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsd0JBQXdCLENBQUMsQ0FDN0QsQ0FBQTtRQUVELE1BQU0sTUFBTSxHQUFHLE1BQU0sVUFBVSxDQUFDLDJCQUEyQixDQUMxRCxpQkFBaUIsOEJBRWpCLEVBQUUsQ0FDRixDQUFBO1FBRUQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFBO1FBQ25GLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNsRCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLDZCQUFxQixDQUFBO1FBQzFELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUMvQyxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDakQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQ3JELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLGNBQWMsNkNBQTJCLENBQUE7UUFDMUUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQ3JELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDBCQUEwQixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzNDLE1BQU0saUJBQWlCLEdBQUcsTUFBTSxjQUFjLENBQzdDLG1CQUFtQixDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FDdkQsQ0FBQTtRQUNELE1BQU0sY0FBYyxDQUFDLG1CQUFtQixDQUFDLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzlFLE1BQU0sVUFBVSxHQUE4QixXQUFXLENBQUMsR0FBRyxDQUM1RCxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsd0JBQXdCLENBQUMsQ0FDN0QsQ0FBQTtRQUVELE1BQU0sTUFBTSxHQUFHLE1BQU0sVUFBVSxDQUFDLDJCQUEyQixDQUMxRCxPQUFPLENBQUMsaUJBQWlCLENBQUMsOEJBRTFCLEVBQUUsQ0FDRixDQUFBO1FBRUQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFBO0lBQ2xFLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGtEQUFrRCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ25FLE1BQU0sY0FBYyxDQUFDLG1CQUFtQixDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDL0YsTUFBTSxjQUFjLENBQUMsbUJBQW1CLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMvRixNQUFNLFVBQVUsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUNqQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsd0JBQXdCLENBQUMsQ0FDN0QsQ0FBQTtRQUVELE1BQU0sTUFBTSxHQUFHLE1BQU0sVUFBVSxDQUFDLHFCQUFxQixDQUFDO1lBQ3JELGtCQUFrQixFQUFFLEtBQUs7WUFDekIsY0FBYyxFQUFFLEtBQUs7U0FDckIsQ0FBQyxDQUFBO1FBRUYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxDQUFDLENBQUE7SUFDNUQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsK0NBQStDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDaEUsTUFBTSxjQUFjLENBQUMsbUJBQW1CLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMvRixNQUFNLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQy9GLE1BQU0sVUFBVSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQ2pDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUM3RCxDQUFBO1FBRUQsTUFBTSxNQUFNLEdBQUcsTUFBTSxVQUFVLENBQUMscUJBQXFCLEVBQUUsQ0FBQTtRQUV2RCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDeEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUUsRUFBRSxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUMzRCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxFQUFFLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQzVELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHVGQUF1RixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3hHLE1BQU0sY0FBYyxDQUFDLG1CQUFtQixDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDL0YsTUFBTSxjQUFjLENBQ25CLG1CQUFtQixDQUFDO1lBQ25CLElBQUksRUFBRSxNQUFNO1lBQ1osU0FBUyxFQUFFLEtBQUs7WUFDaEIsT0FBTyxFQUFFLE9BQU87WUFDaEIsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRTtTQUM5QixDQUFDLENBQ0YsQ0FBQTtRQUNELE1BQU0sVUFBVSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQ2pDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUM3RCxDQUFBO1FBRUQsTUFBTSxNQUFNLEdBQUcsTUFBTSxVQUFVLENBQUMscUJBQXFCLENBQUM7WUFDckQsa0JBQWtCLEVBQUUsS0FBSztZQUN6QixjQUFjLEVBQUUsS0FBSztTQUNyQixDQUFDLENBQUE7UUFFRixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDeEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUUsRUFBRSxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUE7UUFDaEUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUM1RCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxxREFBcUQsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN0RSxNQUFNLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM3RSxNQUFNLGNBQWMsQ0FDbkIsbUJBQW1CLENBQUMsRUFBRSxJQUFJLEVBQUUsT0FBTyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxFQUFFLENBQUMsQ0FDeEYsQ0FBQTtRQUNELE1BQU0sVUFBVSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQ2pDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUM3RCxDQUFBO1FBRUQsTUFBTSxNQUFNLEdBQUcsTUFBTSxVQUFVLENBQUMscUJBQXFCLENBQUM7WUFDckQsa0JBQWtCLEVBQUUsS0FBSztZQUN6QixjQUFjLEVBQUUsS0FBSztTQUNyQixDQUFDLENBQUE7UUFFRixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDeEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUFFLEVBQUUsRUFBRSxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUE7SUFDakUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMscURBQXFELEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDdEUsTUFBTSxjQUFjLENBQUMsbUJBQW1CLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDN0UsTUFBTSxjQUFjLENBQ25CLG1CQUFtQixDQUFDLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsRUFBRSxDQUFDLENBQ3hGLENBQUE7UUFDRCxNQUFNLFVBQVUsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUNqQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsd0JBQXdCLENBQUMsQ0FDN0QsQ0FBQTtRQUVELE1BQU0sTUFBTSxHQUFHLE1BQU0sVUFBVSxDQUFDLHFCQUFxQixDQUFDO1lBQ3JELGtCQUFrQixFQUFFLEtBQUs7WUFDekIsY0FBYyxFQUFFLElBQUk7U0FDcEIsQ0FBQyxDQUFBO1FBRUYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRSxXQUFXLEVBQUUsQ0FBQyxDQUFBO0lBQ2xFLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDhEQUE4RCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQy9FLG9CQUFvQixDQUFDLElBQUksQ0FBQyxlQUFlLEVBQUU7WUFDMUMsT0FBTyxFQUFFLFFBQVE7WUFDakIsaUJBQWlCLEVBQUU7Z0JBQ2xCLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsUUFBUSxFQUFFLFNBQVMsRUFBRTtnQkFDakUsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLE9BQU8sRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsU0FBUyxFQUFFO2FBQ2hFO1NBQ0QsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxXQUFXLENBQ2hCLG1CQUFtQixDQUFDLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFDeEQsUUFBUSxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsQ0FDNUIsQ0FBQTtRQUNELE1BQU0saUJBQWlCLEdBQUcsTUFBTSxXQUFXLENBQzFDLG1CQUFtQixDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFDdkQsUUFBUSxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsQ0FDNUIsQ0FBQTtRQUNELE1BQU0sZ0JBQWdCLENBQ3JCLG1CQUFtQixDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsQ0FBQyxDQUN6RSxDQUFBO1FBQ0QsTUFBTSxvQkFBb0I7YUFDeEIsR0FBRyxDQUFDLFlBQVksQ0FBQzthQUNqQixTQUFTLENBQ1QsUUFBUSxDQUNQLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLFFBQVEsRUFDNUQsaUJBQWlCLEVBQ2pCLFlBQVksRUFDWixjQUFjLENBQ2QsRUFDRCxRQUFRLENBQUMsVUFBVSxDQUNsQixJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsV0FBVyxFQUFFLFVBQVUsRUFBRSxVQUFVLEVBQUUsaUJBQWlCLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FDakYsQ0FDRCxDQUFBO1FBQ0YsTUFBTSxVQUFVLEdBQThCLFdBQVcsQ0FBQyxHQUFHLENBQzVELG9CQUFvQixDQUFDLGNBQWMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUM3RCxDQUFBO1FBRUQsTUFBTSxNQUFNLEdBQUcsTUFBTSxVQUFVLENBQUMsb0JBQW9CLENBQUMsRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBRWhGLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN4QyxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQUUsRUFBRSxFQUFFLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQTtRQUNoRSxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQzVELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHdEQUF3RCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3pFLE1BQU0saUJBQWlCLEdBQUcsTUFBTSxjQUFjLENBQzdDLG1CQUFtQixDQUFDLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxlQUFlLEVBQUUsQ0FBQyxDQUNyRixDQUFBO1FBQ0QsTUFBTSxvQkFBb0I7YUFDeEIsR0FBRyxDQUFDLFlBQVksQ0FBQzthQUNqQixTQUFTLENBQ1QsUUFBUSxDQUFDLGlCQUFpQixFQUFFLGtCQUFrQixDQUFDLEVBQy9DLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLFdBQVcsRUFBRSxhQUFhLEVBQUUsQ0FBQyxDQUFDLENBQ25FLENBQUE7UUFDRixNQUFNLFVBQVUsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUNqQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsd0JBQXdCLENBQUMsQ0FDN0QsQ0FBQTtRQUVELE1BQU0sTUFBTSxHQUFHLE1BQU0sVUFBVSxDQUFDLHFCQUFxQixFQUFFLENBQUE7UUFFdkQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFBO1FBQ2hFLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsYUFBYSxDQUFDLENBQUE7SUFDdEUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMseUNBQXlDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDMUQsTUFBTSxpQkFBaUIsR0FBRyxNQUFNLGNBQWMsQ0FDN0MsbUJBQW1CLENBQUMsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLGVBQWUsRUFBRSxDQUFDLENBQ3JGLENBQUE7UUFDRCxNQUFNLG9CQUFvQjthQUN4QixHQUFHLENBQUMsWUFBWSxDQUFDO2FBQ2pCLFNBQVMsQ0FDVCxRQUFRLENBQUMsaUJBQWlCLEVBQUUsa0JBQWtCLENBQUMsRUFDL0MsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsV0FBVyxFQUFFLGFBQWEsRUFBRSxDQUFDLENBQUMsQ0FDbkUsQ0FBQTtRQUNGLE1BQU0sV0FBVyxHQUFHLFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO1FBQ2xFLE1BQU0sb0JBQW9CO2FBQ3hCLEdBQUcsQ0FBQyxZQUFZLENBQUM7YUFDakIsU0FBUyxDQUNULFdBQVcsRUFDWCxRQUFRLENBQUMsVUFBVSxDQUNsQixJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsUUFBUSxFQUFFLEVBQUUsT0FBTyxFQUFFLEVBQUUsV0FBVyxFQUFFLGdCQUFnQixFQUFFLEVBQUUsRUFBRSxDQUFDLENBQzVFLENBQ0QsQ0FBQTtRQUNGLE1BQU0sVUFBVSxHQUE4QixXQUFXLENBQUMsR0FBRyxDQUM1RCxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsd0JBQXdCLENBQUMsQ0FDN0QsQ0FBQTtRQUVELFlBQVksR0FBRyxFQUFFLFVBQVUsRUFBRSxXQUFXLENBQUMsTUFBTSxFQUFFLENBQUE7UUFDakQsTUFBTSxNQUFNLEdBQUcsTUFBTSxVQUFVLENBQUMscUJBQXFCLENBQUMsaUJBQWlCLDhCQUFzQjtZQUM1RixRQUFRLEVBQUUsSUFBSTtTQUNkLENBQUMsQ0FBQTtRQUVGLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxLQUFLLElBQUksQ0FBQyxDQUFBO1FBQzFCLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTyxDQUFDLFVBQVUsRUFBRSxFQUFFLEVBQUUsRUFBRSxVQUFVLEVBQUUsQ0FBQyxDQUFBO1FBQzlELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTyxDQUFDLFFBQVEsQ0FBQyxXQUFXLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtJQUN2RSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx1REFBdUQsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN4RSxNQUFNLGlCQUFpQixHQUFHLE1BQU0sY0FBYyxDQUM3QyxtQkFBbUIsQ0FBQyxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsZUFBZSxFQUFFLENBQUMsQ0FDckYsQ0FBQTtRQUNELE1BQU0sb0JBQW9CO2FBQ3hCLEdBQUcsQ0FBQyxZQUFZLENBQUM7YUFDakIsU0FBUyxDQUNULFFBQVEsQ0FBQyxpQkFBaUIsRUFBRSxrQkFBa0IsQ0FBQyxFQUMvQyxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxXQUFXLEVBQUUsYUFBYSxFQUFFLENBQUMsQ0FBQyxDQUNuRSxDQUFBO1FBQ0YsTUFBTSxXQUFXLEdBQUcsUUFBUSxDQUFDLGlCQUFpQixFQUFFLGlCQUFpQixDQUFDLENBQUE7UUFDbEUsTUFBTSxvQkFBb0I7YUFDeEIsR0FBRyxDQUFDLFlBQVksQ0FBQzthQUNqQixTQUFTLENBQ1QsV0FBVyxFQUNYLFFBQVEsQ0FBQyxVQUFVLENBQ2xCLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxRQUFRLEVBQUUsRUFBRSxPQUFPLEVBQUUsRUFBRSxXQUFXLEVBQUUsZ0JBQWdCLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FDNUUsQ0FDRCxDQUFBO1FBQ0YsTUFBTSxVQUFVLEdBQThCLFdBQVcsQ0FBQyxHQUFHLENBQzVELG9CQUFvQixDQUFDLGNBQWMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUM3RCxDQUFBO1FBRUQsWUFBWSxHQUFHLEVBQUUsV0FBVyxFQUFFLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUNsRCxNQUFNLE1BQU0sR0FBRyxNQUFNLFVBQVUsQ0FBQyxxQkFBcUIsQ0FBQyxpQkFBaUIsOEJBQXNCO1lBQzVGLFFBQVEsRUFBRSxJQUFJO1NBQ2QsQ0FBQyxDQUFBO1FBRUYsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFDLENBQUE7UUFDMUIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFPLENBQUMsVUFBVSxFQUFFLEVBQUUsRUFBRSxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUE7UUFDOUQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFPLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxhQUFhLENBQUMsQ0FBQTtJQUNwRSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx3RUFBd0UsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN6RixNQUFNLFFBQVEsR0FBZ0MsbUJBQW1CLENBQUM7WUFDakUsSUFBSSxFQUFFLE1BQU07WUFDWixTQUFTLEVBQUUsS0FBSztTQUNoQixDQUFDLENBQUE7UUFDRixNQUFNLGdCQUFnQixHQUFHO1lBQ3hCLElBQUksRUFBRSxLQUFLO1lBQ1gsa0JBQWtCLEVBQUUsVUFBVTtZQUM5QixjQUFjLGtEQUE2QjtTQUMzQyxDQUFBO1FBQ0QsTUFBTSxpQkFBaUIsR0FBRyxNQUFNLGNBQWMsQ0FBQztZQUM5QyxHQUFHLFFBQVE7WUFDWCxVQUFVLEVBQUUsZ0JBQWdCO1NBQzVCLENBQUMsQ0FBQTtRQUNGLE1BQU0sVUFBVSxHQUE4QixXQUFXLENBQUMsR0FBRyxDQUM1RCxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsd0JBQXdCLENBQUMsQ0FDN0QsQ0FBQTtRQUVELE1BQU0sTUFBTSxHQUFHLE1BQU0sVUFBVSxDQUFDLHFCQUFxQixDQUFDLGlCQUFpQiw4QkFBc0IsRUFBRSxDQUFDLENBQUE7UUFFaEcsTUFBTSxDQUFDLGNBQWMsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDbkMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFPLENBQUMsVUFBVSxFQUFFLEVBQUUsRUFBRSxFQUFFLFVBQVUsRUFBRSxDQUFDLENBQUE7UUFDOUQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFPLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7UUFDakYsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFPLENBQUMsU0FBUyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQ2hELE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTyxDQUFDLElBQUksNkJBQXFCLENBQUE7UUFDeEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFPLENBQUMsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzdDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTyxDQUFDLFdBQVcsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUMvQyxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU8sQ0FBQyxRQUFRLEVBQUUsZ0JBQWdCLENBQUMsQ0FBQTtRQUMxRCxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU8sQ0FBQyxRQUFRLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDbkQsQ0FBQyxDQUFDLENBQUE7SUFFRixLQUFLLFVBQVUsY0FBYyxDQUFDLFFBQTRDO1FBQ3pFLE1BQU0sa0JBQWtCLEdBQUcsb0JBQW9CLENBQUMsR0FBRyxDQUFDLHlCQUF5QixDQUFDLENBQUE7UUFDOUUsT0FBTyxXQUFXLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQTtJQUMxRSxDQUFDO0lBRUQsS0FBSyxVQUFVLGdCQUFnQixDQUFDLFFBQTRDO1FBQzNFLE1BQU0sa0JBQWtCLEdBQUcsb0JBQW9CLENBQUMsR0FBRyxDQUFDLHlCQUF5QixDQUFDLENBQUE7UUFDOUUsT0FBTyxXQUFXLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFBO0lBQ2pGLENBQUM7SUFFRCxLQUFLLFVBQVUsV0FBVyxDQUN6QixRQUE0QyxFQUM1QyxJQUFTO1FBRVQsTUFBTSxXQUFXLEdBQUcsb0JBQW9CLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFBO1FBQzFELE1BQU0saUJBQWlCLEdBQUcsUUFBUSxDQUNqQyxJQUFJLEVBQ0osR0FBRyxRQUFRLENBQUMsU0FBUyxJQUFJLFFBQVEsQ0FBQyxJQUFJLElBQUksUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUM1RCxDQUFBO1FBQ0QsTUFBTSxXQUFXLENBQUMsU0FBUyxDQUMxQixRQUFRLENBQUMsaUJBQWlCLEVBQUUsY0FBYyxDQUFDLEVBQzNDLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUM3QyxDQUFBO1FBQ0QsT0FBTyxpQkFBaUIsQ0FBQTtJQUN6QixDQUFDO0lBRUQsU0FBUyxtQkFBbUIsQ0FDM0IsUUFBNEM7UUFFNUMsT0FBTztZQUNOLE9BQU8sRUFBRSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUU7WUFDOUIsT0FBTyxFQUFFLE9BQU87WUFDaEIsSUFBSSxFQUFFLFNBQVM7WUFDZixnQkFBZ0IsRUFBRSxDQUFDLEdBQUcsQ0FBQztZQUN2QixHQUFHLFFBQVE7U0FDWCxDQUFBO0lBQ0YsQ0FBQztBQUNGLENBQUMsQ0FBQyxDQUFBO0FBRUYsS0FBSyxDQUFDLHVCQUF1QixFQUFFLEdBQUcsRUFBRTtJQUNuQyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLElBQUksQ0FBQywyQkFBMkIsRUFBRSxHQUFHLEVBQUU7UUFDdEMsTUFBTSxPQUFPLEdBQUcsQ0FBQyxRQUFhLEVBQUUsS0FBeUIsRUFBRSxFQUFFLENBQzVELElBQUkscUJBQXFCLENBQ3hCLFFBQVEsRUFDUixLQUFLLEVBQ0wsU0FBUyxFQUNULFNBQVMsRUFDVCxLQUFLLEVBQ0wsU0FBUyw4QkFFVCxJQUFJLEVBQ0osT0FBTyxFQUNQLFNBQVMsRUFDVCxTQUFTLEVBQ1QsSUFBSSxFQUNKLFNBQVMsRUFDVCxFQUFFLENBQ0YsQ0FBQTtRQUVGLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLHFCQUFxQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQUMsRUFDaEYsSUFBSSxDQUNKLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLHFCQUFxQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM5RixNQUFNLENBQUMsV0FBVyxDQUNqQixxQkFBcUIsQ0FBQyxNQUFNLENBQzNCLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxFQUFFLFNBQVMsQ0FBQyxFQUN6QyxPQUFPLENBQUMsSUFBSSxFQUFFLFNBQVMsQ0FBQyxDQUN4QixFQUNELEtBQUssQ0FDTCxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsRUFBRSxPQUFPLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDL0YsTUFBTSxDQUFDLFdBQVcsQ0FDakIscUJBQXFCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLEVBQUUsT0FBTyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUMxRSxLQUFLLENBQ0wsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHVDQUF1QyxFQUFFLEdBQUcsRUFBRTtRQUNsRCxNQUFNLE9BQU8sR0FBRyxDQUFDLFFBQWEsRUFBRSxLQUF5QixFQUFFLEVBQUUsQ0FDNUQsSUFBSSxxQkFBcUIsQ0FDeEIsSUFBSSxFQUNKLFNBQVMsRUFDVCxRQUFRLEVBQ1IsS0FBSyxFQUNMLEtBQUssRUFDTCxTQUFTLDhCQUVULElBQUksRUFDSixPQUFPLEVBQ1AsU0FBUyxFQUNULFNBQVMsRUFDVCxJQUFJLEVBQ0osU0FBUyxFQUNULEVBQUUsQ0FDRixDQUFBO1FBRUYsTUFBTSxDQUFDLFdBQVcsQ0FDakIscUJBQXFCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLEVBQUUsT0FBTyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQyxFQUNoRixJQUFJLENBQ0osQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQUMscUJBQXFCLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLEVBQUUsT0FBTyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQzlGLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLHFCQUFxQixDQUFDLE1BQU0sQ0FDM0IsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLEVBQUUsU0FBUyxDQUFDLEVBQ3pDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsU0FBUyxDQUFDLENBQ3hCLEVBQ0QsS0FBSyxDQUNMLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLHFCQUFxQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMvRixNQUFNLENBQUMsV0FBVyxDQUNqQixxQkFBcUIsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsRUFBRSxPQUFPLENBQUMsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEVBQzFFLEtBQUssQ0FDTCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsMEJBQTBCLEVBQUUsR0FBRyxFQUFFO1FBQ3JDLE1BQU0sT0FBTyxHQUFHLENBQ2YsT0FBZ0IsRUFDaEIsa0JBQTZELEVBQzVELEVBQUUsQ0FDSCxJQUFJLHFCQUFxQixDQUN4QixJQUFJLEVBQ0osU0FBUyxFQUNULFNBQVMsRUFDVCxTQUFTLEVBQ1QsT0FBTyxFQUNQLGtCQUFrQiw4QkFFbEIsSUFBSSxFQUNKLE9BQU8sRUFDUCxTQUFTLEVBQ1QsU0FBUyxFQUNULElBQUksRUFDSixTQUFTLEVBQ1QsRUFBRSxDQUNGLENBQUE7UUFFRixNQUFNLENBQUMsV0FBVyxDQUNqQixxQkFBcUIsQ0FBQyxNQUFNLENBQzNCLE9BQU8sQ0FBQyxJQUFJLEVBQUUsRUFBRSx1QkFBdUIsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUNoRCxPQUFPLENBQUMsSUFBSSxFQUFFLEVBQUUsdUJBQXVCLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FDaEQsRUFDRCxJQUFJLENBQ0osQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLHFCQUFxQixDQUFDLE1BQU0sQ0FDM0IsT0FBTyxDQUFDLEtBQUssRUFBRSxFQUFFLHVCQUF1QixFQUFFLElBQUksRUFBRSxDQUFDLEVBQ2pELE9BQU8sQ0FBQyxLQUFLLEVBQUUsRUFBRSx1QkFBdUIsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUNqRCxFQUNELElBQUksQ0FDSixDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDakIscUJBQXFCLENBQUMsTUFBTSxDQUMzQixPQUFPLENBQUMsSUFBSSxFQUFFLEVBQUUsdUJBQXVCLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFDakQsT0FBTyxDQUFDLElBQUksRUFBRSxFQUFFLHVCQUF1QixFQUFFLEtBQUssRUFBRSxDQUFDLENBQ2pELEVBQ0QsSUFBSSxDQUNKLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLHFCQUFxQixDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUM1RixNQUFNLENBQUMsV0FBVyxDQUNqQixxQkFBcUIsQ0FBQyxNQUFNLENBQzNCLE9BQU8sQ0FBQyxJQUFJLEVBQUUsRUFBRSx1QkFBdUIsRUFBRSxJQUFJLEVBQUUsQ0FBQyxFQUNoRCxPQUFPLENBQUMsSUFBSSxFQUFFLEVBQUUsdUJBQXVCLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FDakQsRUFDRCxLQUFLLENBQ0wsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLHFCQUFxQixDQUFDLE1BQU0sQ0FDM0IsT0FBTyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsRUFDakIsT0FBTyxDQUFDLElBQUksRUFBRSxFQUFFLHVCQUF1QixFQUFFLElBQUksRUFBRSxDQUFDLENBQ2hELEVBQ0QsS0FBSyxDQUNMLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUNqQixxQkFBcUIsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsRUFBRSxPQUFPLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDLEVBQ3pFLEtBQUssQ0FDTCxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDakIscUJBQXFCLENBQUMsTUFBTSxDQUMzQixPQUFPLENBQUMsS0FBSyxFQUFFLEVBQUUsdUJBQXVCLEVBQUUsSUFBSSxFQUFFLENBQUMsRUFDakQsT0FBTyxDQUFDLElBQUksRUFBRSxFQUFFLHVCQUF1QixFQUFFLElBQUksRUFBRSxDQUFDLENBQ2hELEVBQ0QsS0FBSyxDQUNMLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxpQ0FBaUMsRUFBRSxHQUFHLEVBQUU7UUFDNUMsTUFBTSxPQUFPLEdBQUcsQ0FBQyxJQUFtQixFQUFFLEVBQUUsQ0FDdkMsSUFBSSxxQkFBcUIsQ0FDeEIsSUFBSSxFQUNKLFNBQVMsRUFDVCxTQUFTLEVBQ1QsU0FBUyxFQUNULEtBQUssRUFDTCxTQUFTLEVBQ1QsSUFBSSxFQUNKLElBQUksRUFDSixPQUFPLEVBQ1AsU0FBUyxFQUNULFNBQVMsRUFDVCxJQUFJLEVBQ0osU0FBUyxFQUNULEVBQUUsQ0FDRixDQUFBO1FBRUYsTUFBTSxDQUFDLFdBQVcsQ0FDakIscUJBQXFCLENBQUMsTUFBTSxDQUFDLE9BQU8sOEJBQXNCLEVBQUUsT0FBTyw4QkFBc0IsQ0FBQyxFQUMxRixJQUFJLENBQ0osQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQ2pCLHFCQUFxQixDQUFDLE1BQU0sQ0FBQyxPQUFPLDRCQUFvQixFQUFFLE9BQU8sNEJBQW9CLENBQUMsRUFDdEYsSUFBSSxDQUNKLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUNqQixxQkFBcUIsQ0FBQyxNQUFNLENBQUMsT0FBTyw0QkFBb0IsRUFBRSxPQUFPLDhCQUFzQixDQUFDLEVBQ3hGLEtBQUssQ0FDTCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9