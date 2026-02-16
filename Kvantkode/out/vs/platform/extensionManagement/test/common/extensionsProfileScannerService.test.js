/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as sinon from 'sinon';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { joinPath } from '../../../../base/common/resources.js';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { IEnvironmentService } from '../../../environment/common/environment.js';
import { AbstractExtensionsProfileScannerService, } from '../../common/extensionsProfileScannerService.js';
import { FileService } from '../../../files/common/fileService.js';
import { IFileService } from '../../../files/common/files.js';
import { InMemoryFileSystemProvider } from '../../../files/common/inMemoryFilesystemProvider.js';
import { TestInstantiationService } from '../../../instantiation/test/common/instantiationServiceMock.js';
import { ILogService, NullLogService } from '../../../log/common/log.js';
import { ITelemetryService } from '../../../telemetry/common/telemetry.js';
import { NullTelemetryService } from '../../../telemetry/common/telemetryUtils.js';
import { IUriIdentityService } from '../../../uriIdentity/common/uriIdentity.js';
import { UriIdentityService } from '../../../uriIdentity/common/uriIdentityService.js';
import { IUserDataProfilesService, UserDataProfilesService, } from '../../../userDataProfile/common/userDataProfile.js';
class TestObject extends AbstractExtensionsProfileScannerService {
}
suite('ExtensionsProfileScannerService', () => {
    const ROOT = URI.file('/ROOT');
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    const extensionsLocation = joinPath(ROOT, 'extensions');
    let instantiationService;
    setup(async () => {
        instantiationService = disposables.add(new TestInstantiationService());
        const logService = new NullLogService();
        const fileService = disposables.add(new FileService(logService));
        const fileSystemProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(ROOT.scheme, fileSystemProvider));
        instantiationService.stub(ILogService, logService);
        instantiationService.stub(IFileService, fileService);
        instantiationService.stub(ITelemetryService, NullTelemetryService);
        const uriIdentityService = instantiationService.stub(IUriIdentityService, disposables.add(new UriIdentityService(fileService)));
        const environmentService = instantiationService.stub(IEnvironmentService, {
            userRoamingDataHome: ROOT,
            cacheHome: joinPath(ROOT, 'cache'),
        });
        const userDataProfilesService = disposables.add(new UserDataProfilesService(environmentService, fileService, uriIdentityService, logService));
        instantiationService.stub(IUserDataProfilesService, userDataProfilesService);
    });
    suiteTeardown(() => sinon.restore());
    test('write extensions located in the same extensions folder', async () => {
        const testObject = disposables.add(instantiationService.createInstance(TestObject, extensionsLocation));
        const extensionsManifest = joinPath(extensionsLocation, 'extensions.json');
        const extension = aExtension('pub.a', joinPath(extensionsLocation, 'pub.a-1.0.0'));
        await testObject.addExtensionsToProfile([[extension, undefined]], extensionsManifest);
        const actual = await testObject.scanProfileExtensions(extensionsManifest);
        assert.deepStrictEqual(actual.map((a) => ({ ...a, location: a.location.toJSON() })), [
            {
                identifier: extension.identifier,
                location: extension.location.toJSON(),
                version: extension.manifest.version,
                metadata: undefined,
            },
        ]);
    });
    test('write extensions located in the different folder', async () => {
        const testObject = disposables.add(instantiationService.createInstance(TestObject, extensionsLocation));
        const extensionsManifest = joinPath(extensionsLocation, 'extensions.json');
        const extension = aExtension('pub.a', joinPath(ROOT, 'pub.a-1.0.0'));
        await testObject.addExtensionsToProfile([[extension, undefined]], extensionsManifest);
        const actual = await testObject.scanProfileExtensions(extensionsManifest);
        assert.deepStrictEqual(actual.map((a) => ({ ...a, location: a.location.toJSON() })), [
            {
                identifier: extension.identifier,
                location: extension.location.toJSON(),
                version: extension.manifest.version,
                metadata: undefined,
            },
        ]);
    });
    test('write extensions located in the same extensions folder has relative location ', async () => {
        const testObject = disposables.add(instantiationService.createInstance(TestObject, extensionsLocation));
        const extensionsManifest = joinPath(extensionsLocation, 'extensions.json');
        const extension = aExtension('pub.a', joinPath(extensionsLocation, 'pub.a-1.0.0'));
        await testObject.addExtensionsToProfile([[extension, undefined]], extensionsManifest);
        const actual = JSON.parse((await instantiationService.get(IFileService).readFile(extensionsManifest)).value.toString());
        assert.deepStrictEqual(actual, [
            {
                identifier: extension.identifier,
                location: extension.location.toJSON(),
                relativeLocation: 'pub.a-1.0.0',
                version: extension.manifest.version,
            },
        ]);
    });
    test('write extensions located in different extensions folder does not has relative location ', async () => {
        const testObject = disposables.add(instantiationService.createInstance(TestObject, extensionsLocation));
        const extensionsManifest = joinPath(extensionsLocation, 'extensions.json');
        const extension = aExtension('pub.a', joinPath(ROOT, 'pub.a-1.0.0'));
        await testObject.addExtensionsToProfile([[extension, undefined]], extensionsManifest);
        const actual = JSON.parse((await instantiationService.get(IFileService).readFile(extensionsManifest)).value.toString());
        assert.deepStrictEqual(actual, [
            {
                identifier: extension.identifier,
                location: extension.location.toJSON(),
                version: extension.manifest.version,
            },
        ]);
    });
    test('extension in old format is read and migrated', async () => {
        const extensionsManifest = joinPath(extensionsLocation, 'extensions.json');
        const extension = aExtension('pub.a', joinPath(extensionsLocation, 'pub.a-1.0.0'));
        await instantiationService.get(IFileService).writeFile(extensionsManifest, VSBuffer.fromString(JSON.stringify([
            {
                identifier: extension.identifier,
                location: extension.location.toJSON(),
                version: extension.manifest.version,
            },
        ])));
        const testObject = disposables.add(instantiationService.createInstance(TestObject, extensionsLocation));
        const actual = await testObject.scanProfileExtensions(extensionsManifest);
        assert.deepStrictEqual(actual.map((a) => ({ ...a, location: a.location.toJSON() })), [
            {
                identifier: extension.identifier,
                location: extension.location.toJSON(),
                version: extension.manifest.version,
                metadata: undefined,
            },
        ]);
        const manifestContent = JSON.parse((await instantiationService.get(IFileService).readFile(extensionsManifest)).value.toString());
        assert.deepStrictEqual(manifestContent, [
            {
                identifier: extension.identifier,
                location: extension.location.toJSON(),
                relativeLocation: 'pub.a-1.0.0',
                version: extension.manifest.version,
            },
        ]);
    });
    test('extension in old format is not migrated if not exists in same location', async () => {
        const extensionsManifest = joinPath(extensionsLocation, 'extensions.json');
        const extension = aExtension('pub.a', joinPath(ROOT, 'pub.a-1.0.0'));
        await instantiationService.get(IFileService).writeFile(extensionsManifest, VSBuffer.fromString(JSON.stringify([
            {
                identifier: extension.identifier,
                location: extension.location.toJSON(),
                version: extension.manifest.version,
            },
        ])));
        const testObject = disposables.add(instantiationService.createInstance(TestObject, extensionsLocation));
        const actual = await testObject.scanProfileExtensions(extensionsManifest);
        assert.deepStrictEqual(actual.map((a) => ({ ...a, location: a.location.toJSON() })), [
            {
                identifier: extension.identifier,
                location: extension.location.toJSON(),
                version: extension.manifest.version,
                metadata: undefined,
            },
        ]);
        const manifestContent = JSON.parse((await instantiationService.get(IFileService).readFile(extensionsManifest)).value.toString());
        assert.deepStrictEqual(manifestContent, [
            {
                identifier: extension.identifier,
                location: extension.location.toJSON(),
                version: extension.manifest.version,
            },
        ]);
    });
    test('extension in old format is read and migrated during write', async () => {
        const extensionsManifest = joinPath(extensionsLocation, 'extensions.json');
        const extension = aExtension('pub.a', joinPath(extensionsLocation, 'pub.a-1.0.0'));
        await instantiationService.get(IFileService).writeFile(extensionsManifest, VSBuffer.fromString(JSON.stringify([
            {
                identifier: extension.identifier,
                location: extension.location.toJSON(),
                version: extension.manifest.version,
            },
        ])));
        const testObject = disposables.add(instantiationService.createInstance(TestObject, extensionsLocation));
        const extension2 = aExtension('pub.b', joinPath(extensionsLocation, 'pub.b-1.0.0'));
        await testObject.addExtensionsToProfile([[extension2, undefined]], extensionsManifest);
        const actual = await testObject.scanProfileExtensions(extensionsManifest);
        assert.deepStrictEqual(actual.map((a) => ({ ...a, location: a.location.toJSON() })), [
            {
                identifier: extension.identifier,
                location: extension.location.toJSON(),
                version: extension.manifest.version,
                metadata: undefined,
            },
            {
                identifier: extension2.identifier,
                location: extension2.location.toJSON(),
                version: extension2.manifest.version,
                metadata: undefined,
            },
        ]);
        const manifestContent = JSON.parse((await instantiationService.get(IFileService).readFile(extensionsManifest)).value.toString());
        assert.deepStrictEqual(manifestContent, [
            {
                identifier: extension.identifier,
                location: extension.location.toJSON(),
                relativeLocation: 'pub.a-1.0.0',
                version: extension.manifest.version,
            },
            {
                identifier: extension2.identifier,
                location: extension2.location.toJSON(),
                relativeLocation: 'pub.b-1.0.0',
                version: extension2.manifest.version,
            },
        ]);
    });
    test('extensions in old format and new format is read and migrated', async () => {
        const extensionsManifest = joinPath(extensionsLocation, 'extensions.json');
        const extension = aExtension('pub.a', joinPath(extensionsLocation, 'pub.a-1.0.0'));
        const extension2 = aExtension('pub.b', joinPath(extensionsLocation, 'pub.b-1.0.0'));
        await instantiationService.get(IFileService).writeFile(extensionsManifest, VSBuffer.fromString(JSON.stringify([
            {
                identifier: extension.identifier,
                location: extension.location.toJSON(),
                version: extension.manifest.version,
            },
            {
                identifier: extension2.identifier,
                location: extension2.location.toJSON(),
                relativeLocation: 'pub.b-1.0.0',
                version: extension2.manifest.version,
            },
        ])));
        const testObject = disposables.add(instantiationService.createInstance(TestObject, extensionsLocation));
        const actual = await testObject.scanProfileExtensions(extensionsManifest);
        assert.deepStrictEqual(actual.map((a) => ({ ...a, location: a.location.toJSON() })), [
            {
                identifier: extension.identifier,
                location: extension.location.toJSON(),
                version: extension.manifest.version,
                metadata: undefined,
            },
            {
                identifier: extension2.identifier,
                location: extension2.location.toJSON(),
                version: extension2.manifest.version,
                metadata: undefined,
            },
        ]);
        const manifestContent = JSON.parse((await instantiationService.get(IFileService).readFile(extensionsManifest)).value.toString());
        assert.deepStrictEqual(manifestContent, [
            {
                identifier: extension.identifier,
                location: extension.location.toJSON(),
                relativeLocation: 'pub.a-1.0.0',
                version: extension.manifest.version,
            },
            {
                identifier: extension2.identifier,
                location: extension2.location.toJSON(),
                relativeLocation: 'pub.b-1.0.0',
                version: extension2.manifest.version,
            },
        ]);
    });
    test('throws error if extension has invalid relativePath', async () => {
        const extensionsManifest = joinPath(extensionsLocation, 'extensions.json');
        const extension = aExtension('pub.a', joinPath(extensionsLocation, 'pub.a-1.0.0'));
        await instantiationService.get(IFileService).writeFile(extensionsManifest, VSBuffer.fromString(JSON.stringify([
            {
                identifier: extension.identifier,
                location: extension.location.toJSON(),
                version: extension.manifest.version,
                relativePath: 2,
            },
        ])));
        const testObject = disposables.add(instantiationService.createInstance(TestObject, extensionsLocation));
        try {
            await testObject.scanProfileExtensions(extensionsManifest);
            assert.fail('Should throw error');
        }
        catch (error) {
            /*expected*/
        }
    });
    test('throws error if extension has no location', async () => {
        const extensionsManifest = joinPath(extensionsLocation, 'extensions.json');
        const extension = aExtension('pub.a', joinPath(extensionsLocation, 'pub.a-1.0.0'));
        await instantiationService.get(IFileService).writeFile(extensionsManifest, VSBuffer.fromString(JSON.stringify([
            {
                identifier: extension.identifier,
                version: extension.manifest.version,
                relativePath: 'pub.a-1.0.0',
            },
        ])));
        const testObject = disposables.add(instantiationService.createInstance(TestObject, extensionsLocation));
        try {
            await testObject.scanProfileExtensions(extensionsManifest);
            assert.fail('Should throw error');
        }
        catch (error) {
            /*expected*/
        }
    });
    test('throws error if extension location is invalid', async () => {
        const extensionsManifest = joinPath(extensionsLocation, 'extensions.json');
        const extension = aExtension('pub.a', joinPath(extensionsLocation, 'pub.a-1.0.0'));
        await instantiationService.get(IFileService).writeFile(extensionsManifest, VSBuffer.fromString(JSON.stringify([
            {
                identifier: extension.identifier,
                location: {},
                version: extension.manifest.version,
                relativePath: 'pub.a-1.0.0',
            },
        ])));
        const testObject = disposables.add(instantiationService.createInstance(TestObject, extensionsLocation));
        try {
            await testObject.scanProfileExtensions(extensionsManifest);
            assert.fail('Should throw error');
        }
        catch (error) {
            /*expected*/
        }
    });
    test('throws error if extension has no identifier', async () => {
        const extensionsManifest = joinPath(extensionsLocation, 'extensions.json');
        const extension = aExtension('pub.a', joinPath(extensionsLocation, 'pub.a-1.0.0'));
        await instantiationService.get(IFileService).writeFile(extensionsManifest, VSBuffer.fromString(JSON.stringify([
            {
                location: extension.location.toJSON(),
                version: extension.manifest.version,
            },
        ])));
        const testObject = disposables.add(instantiationService.createInstance(TestObject, extensionsLocation));
        try {
            await testObject.scanProfileExtensions(extensionsManifest);
            assert.fail('Should throw error');
        }
        catch (error) {
            /*expected*/
        }
    });
    test('throws error if extension identifier is invalid', async () => {
        const extensionsManifest = joinPath(extensionsLocation, 'extensions.json');
        const extension = aExtension('pub.a', joinPath(extensionsLocation, 'pub.a-1.0.0'));
        await instantiationService.get(IFileService).writeFile(extensionsManifest, VSBuffer.fromString(JSON.stringify([
            {
                identifier: 'pub.a',
                location: extension.location.toJSON(),
                version: extension.manifest.version,
            },
        ])));
        const testObject = disposables.add(instantiationService.createInstance(TestObject, extensionsLocation));
        try {
            await testObject.scanProfileExtensions(extensionsManifest);
            assert.fail('Should throw error');
        }
        catch (error) {
            /*expected*/
        }
    });
    test('throws error if extension has no version', async () => {
        const extensionsManifest = joinPath(extensionsLocation, 'extensions.json');
        const extension = aExtension('pub.a', joinPath(extensionsLocation, 'pub.a-1.0.0'));
        await instantiationService.get(IFileService).writeFile(extensionsManifest, VSBuffer.fromString(JSON.stringify([
            {
                identifier: extension.identifier,
                location: extension.location.toJSON(),
            },
        ])));
        const testObject = disposables.add(instantiationService.createInstance(TestObject, extensionsLocation));
        try {
            await testObject.scanProfileExtensions(extensionsManifest);
            assert.fail('Should throw error');
        }
        catch (error) {
            /*expected*/
        }
    });
    test('read extension when manifest is empty', async () => {
        const extensionsManifest = joinPath(extensionsLocation, 'extensions.json');
        await instantiationService
            .get(IFileService)
            .writeFile(extensionsManifest, VSBuffer.fromString(''));
        const testObject = disposables.add(instantiationService.createInstance(TestObject, extensionsLocation));
        const actual = await testObject.scanProfileExtensions(extensionsManifest);
        assert.deepStrictEqual(actual, []);
    });
    test('read extension when manifest has empty lines and spaces', async () => {
        const extensionsManifest = joinPath(extensionsLocation, 'extensions.json');
        await instantiationService.get(IFileService).writeFile(extensionsManifest, VSBuffer.fromString(`


		`));
        const testObject = disposables.add(instantiationService.createInstance(TestObject, extensionsLocation));
        const actual = await testObject.scanProfileExtensions(extensionsManifest);
        assert.deepStrictEqual(actual, []);
    });
    test('read extension when the relative location is empty', async () => {
        const extensionsManifest = joinPath(extensionsLocation, 'extensions.json');
        const extension = aExtension('pub.a', joinPath(extensionsLocation, 'pub.a-1.0.0'));
        await instantiationService.get(IFileService).writeFile(extensionsManifest, VSBuffer.fromString(JSON.stringify([
            {
                identifier: extension.identifier,
                location: extension.location.toJSON(),
                relativeLocation: '',
                version: extension.manifest.version,
            },
        ])));
        const testObject = disposables.add(instantiationService.createInstance(TestObject, extensionsLocation));
        const actual = await testObject.scanProfileExtensions(extensionsManifest);
        assert.deepStrictEqual(actual.map((a) => ({ ...a, location: a.location.toJSON() })), [
            {
                identifier: extension.identifier,
                location: extension.location.toJSON(),
                version: extension.manifest.version,
                metadata: undefined,
            },
        ]);
        const manifestContent = JSON.parse((await instantiationService.get(IFileService).readFile(extensionsManifest)).value.toString());
        assert.deepStrictEqual(manifestContent, [
            {
                identifier: extension.identifier,
                location: extension.location.toJSON(),
                relativeLocation: 'pub.a-1.0.0',
                version: extension.manifest.version,
            },
        ]);
    });
    test('add extension trigger events', async () => {
        const testObject = disposables.add(instantiationService.createInstance(TestObject, extensionsLocation));
        const target1 = sinon.stub();
        const target2 = sinon.stub();
        disposables.add(testObject.onAddExtensions(target1));
        disposables.add(testObject.onDidAddExtensions(target2));
        const extensionsManifest = joinPath(extensionsLocation, 'extensions.json');
        const extension = aExtension('pub.a', joinPath(ROOT, 'foo', 'pub.a-1.0.0'));
        await testObject.addExtensionsToProfile([[extension, undefined]], extensionsManifest);
        const actual = await testObject.scanProfileExtensions(extensionsManifest);
        assert.deepStrictEqual(actual.map((a) => ({ ...a, location: a.location.toJSON() })), [
            {
                identifier: extension.identifier,
                location: extension.location.toJSON(),
                version: extension.manifest.version,
                metadata: undefined,
            },
        ]);
        assert.ok(target1.calledOnce);
        assert.deepStrictEqual(target1.args[0][0].profileLocation.toString(), extensionsManifest.toString());
        assert.deepStrictEqual(target1.args[0][0].extensions.length, 1);
        assert.deepStrictEqual(target1.args[0][0].extensions[0].identifier, extension.identifier);
        assert.deepStrictEqual(target1.args[0][0].extensions[0].version, extension.manifest.version);
        assert.deepStrictEqual(target1.args[0][0].extensions[0].location.toString(), extension.location.toString());
        assert.ok(target2.calledOnce);
        assert.deepStrictEqual(target2.args[0][0].profileLocation.toString(), extensionsManifest.toString());
        assert.deepStrictEqual(target2.args[0][0].extensions.length, 1);
        assert.deepStrictEqual(target2.args[0][0].extensions[0].identifier, extension.identifier);
        assert.deepStrictEqual(target2.args[0][0].extensions[0].version, extension.manifest.version);
        assert.deepStrictEqual(target2.args[0][0].extensions[0].location.toString(), extension.location.toString());
    });
    test('remove extensions trigger events', async () => {
        const testObject = disposables.add(instantiationService.createInstance(TestObject, extensionsLocation));
        const target1 = sinon.stub();
        const target2 = sinon.stub();
        disposables.add(testObject.onRemoveExtensions(target1));
        disposables.add(testObject.onDidRemoveExtensions(target2));
        const extensionsManifest = joinPath(extensionsLocation, 'extensions.json');
        const extension1 = aExtension('pub.a', joinPath(ROOT, 'foo', 'pub.a-1.0.0'));
        const extension2 = aExtension('pub.b', joinPath(ROOT, 'foo', 'pub.b-1.0.0'));
        await testObject.addExtensionsToProfile([
            [extension1, undefined],
            [extension2, undefined],
        ], extensionsManifest);
        await testObject.removeExtensionsFromProfile([extension1.identifier, extension2.identifier], extensionsManifest);
        const actual = await testObject.scanProfileExtensions(extensionsManifest);
        assert.deepStrictEqual(actual.length, 0);
        assert.ok(target1.calledOnce);
        assert.deepStrictEqual(target1.args[0][0].profileLocation.toString(), extensionsManifest.toString());
        assert.deepStrictEqual(target1.args[0][0].extensions.length, 2);
        assert.deepStrictEqual(target1.args[0][0].extensions[0].identifier, extension1.identifier);
        assert.deepStrictEqual(target1.args[0][0].extensions[0].version, extension1.manifest.version);
        assert.deepStrictEqual(target1.args[0][0].extensions[0].location.toString(), extension1.location.toString());
        assert.deepStrictEqual(target1.args[0][0].extensions[1].identifier, extension2.identifier);
        assert.deepStrictEqual(target1.args[0][0].extensions[1].version, extension2.manifest.version);
        assert.deepStrictEqual(target1.args[0][0].extensions[1].location.toString(), extension2.location.toString());
        assert.ok(target2.calledOnce);
        assert.deepStrictEqual(target2.args[0][0].profileLocation.toString(), extensionsManifest.toString());
        assert.deepStrictEqual(target2.args[0][0].extensions.length, 2);
        assert.deepStrictEqual(target2.args[0][0].extensions[0].identifier, extension1.identifier);
        assert.deepStrictEqual(target2.args[0][0].extensions[0].version, extension1.manifest.version);
        assert.deepStrictEqual(target2.args[0][0].extensions[0].location.toString(), extension1.location.toString());
        assert.deepStrictEqual(target2.args[0][0].extensions[1].identifier, extension2.identifier);
        assert.deepStrictEqual(target2.args[0][0].extensions[1].version, extension2.manifest.version);
        assert.deepStrictEqual(target2.args[0][0].extensions[1].location.toString(), extension2.location.toString());
    });
    test('add extension with same id but different version', async () => {
        const testObject = disposables.add(instantiationService.createInstance(TestObject, extensionsLocation));
        const extensionsManifest = joinPath(extensionsLocation, 'extensions.json');
        const extension1 = aExtension('pub.a', joinPath(ROOT, 'pub.a-1.0.0'));
        await testObject.addExtensionsToProfile([[extension1, undefined]], extensionsManifest);
        const target1 = sinon.stub();
        const target2 = sinon.stub();
        const target3 = sinon.stub();
        const target4 = sinon.stub();
        disposables.add(testObject.onAddExtensions(target1));
        disposables.add(testObject.onRemoveExtensions(target2));
        disposables.add(testObject.onDidAddExtensions(target3));
        disposables.add(testObject.onDidRemoveExtensions(target4));
        const extension2 = aExtension('pub.a', joinPath(ROOT, 'pub.a-2.0.0'), undefined, {
            version: '2.0.0',
        });
        await testObject.addExtensionsToProfile([[extension2, undefined]], extensionsManifest);
        const actual = await testObject.scanProfileExtensions(extensionsManifest);
        assert.deepStrictEqual(actual.map((a) => ({ ...a, location: a.location.toJSON() })), [
            {
                identifier: extension2.identifier,
                location: extension2.location.toJSON(),
                version: extension2.manifest.version,
                metadata: undefined,
            },
        ]);
        assert.ok(target1.calledOnce);
        assert.deepStrictEqual(target1.args[0][0].profileLocation.toString(), extensionsManifest.toString());
        assert.deepStrictEqual(target1.args[0][0].extensions.length, 1);
        assert.deepStrictEqual(target1.args[0][0].extensions[0].identifier, extension2.identifier);
        assert.deepStrictEqual(target1.args[0][0].extensions[0].version, extension2.manifest.version);
        assert.deepStrictEqual(target1.args[0][0].extensions[0].location.toString(), extension2.location.toString());
        assert.ok(target2.calledOnce);
        assert.deepStrictEqual(target2.args[0][0].profileLocation.toString(), extensionsManifest.toString());
        assert.deepStrictEqual(target2.args[0][0].extensions.length, 1);
        assert.deepStrictEqual(target2.args[0][0].extensions[0].identifier, extension1.identifier);
        assert.deepStrictEqual(target2.args[0][0].extensions[0].version, extension1.manifest.version);
        assert.deepStrictEqual(target2.args[0][0].extensions[0].location.toString(), extension1.location.toString());
        assert.ok(target3.calledOnce);
        assert.deepStrictEqual(target1.args[0][0].profileLocation.toString(), extensionsManifest.toString());
        assert.deepStrictEqual(target1.args[0][0].extensions.length, 1);
        assert.deepStrictEqual(target1.args[0][0].extensions[0].identifier, extension2.identifier);
        assert.deepStrictEqual(target1.args[0][0].extensions[0].version, extension2.manifest.version);
        assert.deepStrictEqual(target1.args[0][0].extensions[0].location.toString(), extension2.location.toString());
        assert.ok(target4.calledOnce);
        assert.deepStrictEqual(target2.args[0][0].profileLocation.toString(), extensionsManifest.toString());
        assert.deepStrictEqual(target2.args[0][0].extensions.length, 1);
        assert.deepStrictEqual(target2.args[0][0].extensions[0].identifier, extension1.identifier);
        assert.deepStrictEqual(target2.args[0][0].extensions[0].version, extension1.manifest.version);
        assert.deepStrictEqual(target2.args[0][0].extensions[0].location.toString(), extension1.location.toString());
    });
    test('add same extension', async () => {
        const testObject = disposables.add(instantiationService.createInstance(TestObject, extensionsLocation));
        const extensionsManifest = joinPath(extensionsLocation, 'extensions.json');
        const extension = aExtension('pub.a', joinPath(ROOT, 'pub.a-1.0.0'));
        await testObject.addExtensionsToProfile([[extension, undefined]], extensionsManifest);
        const target1 = sinon.stub();
        const target2 = sinon.stub();
        const target3 = sinon.stub();
        const target4 = sinon.stub();
        disposables.add(testObject.onAddExtensions(target1));
        disposables.add(testObject.onRemoveExtensions(target2));
        disposables.add(testObject.onDidAddExtensions(target3));
        disposables.add(testObject.onDidRemoveExtensions(target4));
        await testObject.addExtensionsToProfile([[extension, undefined]], extensionsManifest);
        const actual = await testObject.scanProfileExtensions(extensionsManifest);
        assert.deepStrictEqual(actual.map((a) => ({ ...a, location: a.location.toJSON() })), [
            {
                identifier: extension.identifier,
                location: extension.location.toJSON(),
                version: extension.manifest.version,
                metadata: undefined,
            },
        ]);
        assert.ok(target1.notCalled);
        assert.ok(target2.notCalled);
        assert.ok(target3.notCalled);
        assert.ok(target4.notCalled);
    });
    test('add same extension with different metadata', async () => {
        const testObject = disposables.add(instantiationService.createInstance(TestObject, extensionsLocation));
        const extensionsManifest = joinPath(extensionsLocation, 'extensions.json');
        const extension = aExtension('pub.a', joinPath(ROOT, 'pub.a-1.0.0'));
        await testObject.addExtensionsToProfile([[extension, undefined]], extensionsManifest);
        const target1 = sinon.stub();
        const target2 = sinon.stub();
        const target3 = sinon.stub();
        const target4 = sinon.stub();
        disposables.add(testObject.onAddExtensions(target1));
        disposables.add(testObject.onRemoveExtensions(target2));
        disposables.add(testObject.onDidAddExtensions(target3));
        disposables.add(testObject.onDidRemoveExtensions(target4));
        await testObject.addExtensionsToProfile([[extension, { isApplicationScoped: true }]], extensionsManifest);
        const actual = await testObject.scanProfileExtensions(extensionsManifest);
        assert.deepStrictEqual(actual.map((a) => ({ ...a, location: a.location.toJSON(), metadata: a.metadata })), [
            {
                identifier: extension.identifier,
                location: extension.location.toJSON(),
                version: extension.manifest.version,
                metadata: { isApplicationScoped: true },
            },
        ]);
        assert.ok(target1.notCalled);
        assert.ok(target2.notCalled);
        assert.ok(target3.notCalled);
        assert.ok(target4.notCalled);
    });
    test('add extension with different version and metadata', async () => {
        const testObject = disposables.add(instantiationService.createInstance(TestObject, extensionsLocation));
        const extensionsManifest = joinPath(extensionsLocation, 'extensions.json');
        const extension1 = aExtension('pub.a', joinPath(ROOT, 'pub.a-1.0.0'));
        await testObject.addExtensionsToProfile([[extension1, undefined]], extensionsManifest);
        const extension2 = aExtension('pub.a', joinPath(ROOT, 'pub.a-2.0.0'), undefined, {
            version: '2.0.0',
        });
        const target1 = sinon.stub();
        const target2 = sinon.stub();
        const target3 = sinon.stub();
        const target4 = sinon.stub();
        disposables.add(testObject.onAddExtensions(target1));
        disposables.add(testObject.onRemoveExtensions(target2));
        disposables.add(testObject.onDidAddExtensions(target3));
        disposables.add(testObject.onDidRemoveExtensions(target4));
        await testObject.addExtensionsToProfile([[extension2, { isApplicationScoped: true }]], extensionsManifest);
        const actual = await testObject.scanProfileExtensions(extensionsManifest);
        assert.deepStrictEqual(actual.map((a) => ({ ...a, location: a.location.toJSON(), metadata: a.metadata })), [
            {
                identifier: extension2.identifier,
                location: extension2.location.toJSON(),
                version: extension2.manifest.version,
                metadata: { isApplicationScoped: true },
            },
        ]);
        assert.ok(target1.calledOnce);
        assert.deepStrictEqual(target1.args[0][0].profileLocation.toString(), extensionsManifest.toString());
        assert.deepStrictEqual(target1.args[0][0].extensions.length, 1);
        assert.deepStrictEqual(target1.args[0][0].extensions[0].identifier, extension2.identifier);
        assert.deepStrictEqual(target1.args[0][0].extensions[0].version, extension2.manifest.version);
        assert.deepStrictEqual(target1.args[0][0].extensions[0].location.toString(), extension2.location.toString());
        assert.ok(target2.calledOnce);
        assert.deepStrictEqual(target2.args[0][0].profileLocation.toString(), extensionsManifest.toString());
        assert.deepStrictEqual(target2.args[0][0].extensions.length, 1);
        assert.deepStrictEqual(target2.args[0][0].extensions[0].identifier, extension1.identifier);
        assert.deepStrictEqual(target2.args[0][0].extensions[0].version, extension1.manifest.version);
        assert.deepStrictEqual(target2.args[0][0].extensions[0].location.toString(), extension1.location.toString());
        assert.ok(target3.calledOnce);
        assert.deepStrictEqual(target1.args[0][0].profileLocation.toString(), extensionsManifest.toString());
        assert.deepStrictEqual(target1.args[0][0].extensions.length, 1);
        assert.deepStrictEqual(target1.args[0][0].extensions[0].identifier, extension2.identifier);
        assert.deepStrictEqual(target1.args[0][0].extensions[0].version, extension2.manifest.version);
        assert.deepStrictEqual(target1.args[0][0].extensions[0].location.toString(), extension2.location.toString());
        assert.ok(target4.calledOnce);
        assert.deepStrictEqual(target2.args[0][0].profileLocation.toString(), extensionsManifest.toString());
        assert.deepStrictEqual(target2.args[0][0].extensions.length, 1);
        assert.deepStrictEqual(target2.args[0][0].extensions[0].identifier, extension1.identifier);
        assert.deepStrictEqual(target2.args[0][0].extensions[0].version, extension1.manifest.version);
        assert.deepStrictEqual(target2.args[0][0].extensions[0].location.toString(), extension1.location.toString());
    });
    test('add extension with same id and version located in the different folder', async () => {
        const testObject = disposables.add(instantiationService.createInstance(TestObject, extensionsLocation));
        const extensionsManifest = joinPath(extensionsLocation, 'extensions.json');
        let extension = aExtension('pub.a', joinPath(ROOT, 'foo', 'pub.a-1.0.0'));
        await testObject.addExtensionsToProfile([[extension, undefined]], extensionsManifest);
        const target1 = sinon.stub();
        const target2 = sinon.stub();
        const target3 = sinon.stub();
        const target4 = sinon.stub();
        disposables.add(testObject.onAddExtensions(target1));
        disposables.add(testObject.onRemoveExtensions(target2));
        disposables.add(testObject.onDidAddExtensions(target3));
        disposables.add(testObject.onDidRemoveExtensions(target4));
        extension = aExtension('pub.a', joinPath(ROOT, 'pub.a-1.0.0'));
        await testObject.addExtensionsToProfile([[extension, undefined]], extensionsManifest);
        const actual = await testObject.scanProfileExtensions(extensionsManifest);
        assert.deepStrictEqual(actual.map((a) => ({ ...a, location: a.location.toJSON() })), [
            {
                identifier: extension.identifier,
                location: extension.location.toJSON(),
                version: extension.manifest.version,
                metadata: undefined,
            },
        ]);
        assert.ok(target1.notCalled);
        assert.ok(target2.notCalled);
        assert.ok(target3.notCalled);
        assert.ok(target4.notCalled);
    });
    test('read extension when uuid is different in identifier and manifest', async () => {
        const extensionsManifest = joinPath(extensionsLocation, 'extensions.json');
        await instantiationService.get(IFileService).writeFile(extensionsManifest, VSBuffer.fromString(JSON.stringify([
            {
                identifier: {
                    id: 'pub.a',
                    uuid: 'uuid1`',
                },
                version: '1.0.0',
                location: joinPath(extensionsLocation, 'pub.a-1.0.0').toString(),
                relativeLocation: 'pub.a-1.0.0',
                metadata: {
                    id: 'uuid',
                },
            },
        ])));
        const testObject = disposables.add(instantiationService.createInstance(TestObject, extensionsLocation));
        const actual = await testObject.scanProfileExtensions(extensionsManifest);
        assert.deepStrictEqual(actual.length, 1);
        assert.deepStrictEqual(actual[0].identifier.id, 'pub.a');
        assert.deepStrictEqual(actual[0].identifier.uuid, 'uuid');
    });
    function aExtension(id, location, e, manifest) {
        return {
            identifier: { id },
            location,
            type: 1 /* ExtensionType.User */,
            targetPlatform: "darwin-x64" /* TargetPlatform.DARWIN_X64 */,
            isBuiltin: false,
            manifest: {
                name: 'name',
                publisher: 'publisher',
                version: '1.0.0',
                engines: { vscode: '1.0.0' },
                ...manifest,
            },
            isValid: true,
            preRelease: false,
            validations: [],
            ...e,
        };
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1Byb2ZpbGVTY2FubmVyU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9leHRlbnNpb25NYW5hZ2VtZW50L3Rlc3QvY29tbW9uL2V4dGVuc2lvbnNQcm9maWxlU2Nhbm5lclNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxLQUFLLEtBQUssTUFBTSxPQUFPLENBQUE7QUFDOUIsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDaEYsT0FBTyxFQUNOLHVDQUF1QyxHQUV2QyxNQUFNLGlEQUFpRCxDQUFBO0FBT3hELE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDN0QsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0scURBQXFELENBQUE7QUFDaEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFDekcsT0FBTyxFQUFFLFdBQVcsRUFBRSxjQUFjLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUMxRSxPQUFPLEVB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QUFDLGVBQWUsQ0FDSSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQ3JFLFVBQVUsQ0FBQyxVQUFVLENBQ3JCLENBQUE7UUFDRCxNQUFNLENBQUMsZUFBZSxDQUNJLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFDbEUsVUFBVSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQzNCLENBQUE7UUFDRCxNQUFNLENBQUMsZUFBZSxDQUNJLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFDOUUsVUFBVSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FDOUIsQ0FBQTtRQUVELE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQzdCLE1BQU0sQ0FBQyxlQUFlLENBQ0ksT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUUsQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLEVBQ3ZFLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxDQUM3QixDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FBMEIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUUsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3pGLE1BQU0sQ0FBQyxlQUFlLENBQ0ksT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUNyRSxVQUFVLENBQUMsVUFBVSxDQUNyQixDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDSSxP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LENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFDOUUsVUFBVSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FDOUIsQ0FBQTtRQUVELE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQzdCLE1BQU0sQ0FBQyxlQUFlLENBQ0ksT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUUsQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLEVBQ3ZFLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxDQUM3QixDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FBMEIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUUsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3pGLE1BQU0sQ0FBQyxlQUFlLENBQ0ksT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUNyRSxVQUFVLENBQUMsVUFBVSxDQUNyQixDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDSSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQ2xFLFVBQVUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUMzQixDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDSSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQzlFLFVBQVUsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQzlCLENBQUE7UUFFRCxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUM3QixNQUFNLENBQUMsZUFB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Q0FBQyxlQUFlLENBQ0ksT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUUsQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLEVBQ3ZFLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxDQUM3QixDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FBMEIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUUsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3pGLE1BQU0sQ0FBQyxlQUFlLENBQ0ksT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUNyRSxVQUFVLENBQUMsVUFBVSxDQUNyQixDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDSSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQ2xFLFVBQVUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUMzQixDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDSSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQzlFLFVBQVUsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQzlCLENBQUE7UUFFRCxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUM3QixNQUFNLENBQUMsZUFBZSxDQUNJLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFFLENBQUMsZUFBZSxDQUFDLFFBQVEsRUFBRSxFQUN2RSxrQkFBa0IsQ0FBQyxRQUFRLEVBQUUsQ0FDN0IsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQTBCLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFFLENBQUMsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN6RixNQUFNLENBQUMsZUFBZSxDQUNJLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsRUFDckUsVUFBVSxDQUFDLFVBQVUsQ0FDckIsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQ0ksT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxFQUNsRSxVQUFVLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FDM0IsQ0FBQTtRQUNELE1BQU0sQ0FBQyxlQUFlLENBQ0ksT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUM5RSxVQUFVLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxDQUM5QixDQUFBO1FBRUQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDN0IsTUFBTSxDQUFDLGVBQWUsQ0FDSSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBRSxDQUFDLGVBQWUsQ0FBQyxRQUFRLEVBQUUsRUFDdkUsa0JBQWtCLENBQUMsUUFBUSxFQUFFLENBQzdCLENBQUE7UUFDRCxNQUFNLENBQUMsZUFBZSxDQUEwQixPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBRSxDQUFDLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDekYsTUFBTSxDQUFDLGVBQWUsQ0FDSSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLEVBQ3JFLFVBQVUsQ0FBQyxVQUFVLENBQ3JCLENBQUE7UUFDRCxNQUFNLENBQUMsZUFBZSxDQUNJLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFDbEUsVUFBVSxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQzNCLENBQUE7UUFDRCxNQUFNLENBQUMsZUFBZSxDQUNJLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFFLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFDOUUsVUFBVSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsQ0FDOUIsQ0FBQTtRQUVELE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQzdCLE1BQU0sQ0FBQyxlQUFlLENBQ0ksT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUUsQ0FBQyxlQUFlLENBQUMsUUFBUSxFQUFFLEVBQ3ZFLGtCQUFrQixDQUFDLFFBQVEsRUFBRSxDQUM3QixDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FBMEIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUUsQ0FBQyxVQUFVLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3pGLE1BQU0sQ0FBQyxlQUFlLENBQ0ksT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUUsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxFQUNyRSxVQUFVLENBQUMsVUFBVSxDQUNyQixDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDSSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLEVBQ2xFLFVBQVUsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUMzQixDQUFBO1FBQ0QsTUFBTSxDQUFDLGVBQWUsQ0FDSSxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBRSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQzlFLFVBQVUsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLENBQzlCLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx3RUFBd0UsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN6RixNQUFNLFVBQVUsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUNqQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsVUFBVSxFQUFFLGtCQUFrQixDQUFDLENBQ25FLENBQUE7UUFFRCxNQUFNLGtCQUFrQixHQUFHLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxpQkFBaUIsQ0FBQyxDQUFBO1FBRTFFLElBQUksU0FBUyxHQUFHLFVBQVUsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsYUFBYSxDQUFDLENBQUMsQ0FBQTtRQUN6RSxNQUFNLFVBQVUsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDLEVBQUUsa0JBQWtCLENBQUMsQ0FBQTtRQUVyRixNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDNUIsTUFBTSxPQUFPLEdBQUcsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFBO1FBQzVCLE1BQU0sT0FBTyxHQUFHLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQTtRQUM1QixNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDNUIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7UUFDcEQsV0FBVyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUN2RCxXQUFXLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFBO1FBQ3ZELFdBQVcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLHFCQUFxQixDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUE7UUFDMUQsU0FBUyxHQUFHLFVBQVUsQ0FBQyxPQUFPLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxhQUFhLENBQUMsQ0FBQyxDQUFBO1FBQzlELE1BQU0sVUFBVSxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUMsRUFBRSxrQkFBa0IsQ0FBQyxDQUFBO1FBRXJGLE1BQU0sTUFBTSxHQUFHLE1BQU0sVUFBVSxDQUFDLHFCQUFxQixDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDekUsTUFBTSxDQUFDLGVBQWUsQ0FDckIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxFQUM1RDtZQUNDO2dCQUNDLFVBQVUsRUFBRSxTQUFTLENBQUMsVUFBVTtnQkFDaEMsUUFBUSxFQUFFLFNBQVMsQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFO2dCQUNyQyxPQUFPLEVBQUUsU0FBUyxDQUFDLFFBQVEsQ0FBQyxPQUFPO2dCQUNuQyxRQUFRLEVBQUUsU0FBUzthQUNuQjtTQUNELENBQ0QsQ0FBQTtRQUNELE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQzVCLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQzVCLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQzVCLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO0lBQzdCLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGtFQUFrRSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ25GLE1BQU0sa0JBQWtCLEdBQUcsUUFBUSxDQUFDLGtCQUFrQixFQUFFLGlCQUFpQixDQUFDLENBQUE7UUFDMUUsTUFBTSxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLENBQUMsU0FBUyxDQUNyRCxrQkFBa0IsRUFDbEIsUUFBUSxDQUFDLFVBQVUsQ0FDbEIsSUFBSSxDQUFDLFNBQVMsQ0FBQztZQUNkO2dCQUNDLFVBQVUsRUFBRTtvQkFDWCxFQUFFLEVBQUUsT0FBTztvQkFDWCxJQUFJLEVBQUUsUUFBUTtpQkFDZDtnQkFDRCxPQUFPLEVBQUUsT0FBTztnQkFDaEIsUUFBUSxFQUFFLFFBQVEsQ0FBQyxrQkFBa0IsRUFBRSxhQUFhLENBQUMsQ0FBQyxRQUFRLEVBQUU7Z0JBQ2hFLGdCQUFnQixFQUFFLGFBQWE7Z0JBQy9CLFFBQVEsRUFBRTtvQkFDVCxFQUFFLEVBQUUsTUFBTTtpQkFDVjthQUNEO1NBQ0QsQ0FBQyxDQUNGLENBQ0QsQ0FBQTtRQUVELE1BQU0sVUFBVSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQ2pDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxVQUFVLEVBQUUsa0JBQWtCLENBQUMsQ0FDbkUsQ0FBQTtRQUNELE1BQU0sTUFBTSxHQUFHLE1BQU0sVUFBVSxDQUFDLHFCQUFxQixDQUFDLGtCQUFrQixDQUFDLENBQUE7UUFDekUsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDeEQsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUMxRCxDQUFDLENBQUMsQ0FBQTtJQUVGLFNBQVMsVUFBVSxDQUNsQixFQUFVLEVBQ1YsUUFBYSxFQUNiLENBQXVCLEVBQ3ZCLFFBQXNDO1FBRXRDLE9BQU87WUFDTixVQUFVLEVBQUUsRUFBRSxFQUFFLEVBQUU7WUFDbEIsUUFBUTtZQUNSLElBQUksNEJBQW9CO1lBQ3hCLGNBQWMsOENBQTJCO1lBQ3pDLFNBQVMsRUFBRSxLQUFLO1lBQ2hCLFFBQVEsRUFBRTtnQkFDVCxJQUFJLEVBQUUsTUFBTTtnQkFDWixTQUFTLEVBQUUsV0FBVztnQkFDdEIsT0FBTyxFQUFFLE9BQU87Z0JBQ2hCLE9BQU8sRUFBRSxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUU7Z0JBQzVCLEdBQUcsUUFBUTthQUNYO1lBQ0QsT0FBTyxFQUFFLElBQUk7WUFDYixVQUFVLEVBQUUsS0FBSztZQUNqQixXQUFXLEVBQUUsRUFBRTtZQUNmLEdBQUcsQ0FBQztTQUNKLENBQUE7SUFDRixDQUFDO0FBQ0YsQ0FBQyxDQUFDLENBQUEifQ==