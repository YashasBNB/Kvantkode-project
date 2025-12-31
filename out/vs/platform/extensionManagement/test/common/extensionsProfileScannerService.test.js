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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0ZW5zaW9uc1Byb2ZpbGVTY2FubmVyU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvcGxhdGZvcm0vZXh0ZW5zaW9uTWFuYWdlbWVudC90ZXN0L2NvbW1vbi9leHRlbnNpb25zUHJvZmlsZVNjYW5uZXJTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sS0FBSyxLQUFLLE1BQU0sT0FBTyxDQUFBO0FBQzlCLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0QsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQ2hGLE9BQU8sRUFDTix1Q0FBdUMsR0FFdkMsTUFBTSxpREFBaUQsQ0FBQTtBQU94RCxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDbEUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQzdELE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ2hHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGdFQUFnRSxDQUFBO0FBQ3pHLE9BQU8sRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDeEUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDMUUsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sNkNB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