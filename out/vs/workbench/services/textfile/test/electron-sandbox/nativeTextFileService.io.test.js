/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { Schemas } from '../../../../../base/common/network.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { URI } from '../../../../../base/common/uri.js';
import { join } from '../../../../../base/common/path.js';
import { detectEncodingByBOMFromBuffer, toCanonicalName, } from '../../common/encoding.js';
import { VSBuffer } from '../../../../../base/common/buffer.js';
import files from '../common/fixtures/files.js';
import createSuite from '../common/textFileService.io.test.js';
import { IWorkingCopyFileService, WorkingCopyFileService, } from '../../../workingCopy/common/workingCopyFileService.js';
import { WorkingCopyService } from '../../../workingCopy/common/workingCopyService.js';
import { UriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentityService.js';
import { TestInMemoryFileSystemProvider } from '../../../../test/browser/workbenchTestServices.js';
import { TestNativeTextFileServiceWithEncodingOverrides, workbenchInstantiationService, } from '../../../../test/electron-sandbox/workbenchTestServices.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('Files - NativeTextFileService i/o', function () {
    const disposables = new DisposableStore();
    let service;
    let fileProvider;
    const testDir = 'test';
    createSuite({
        setup: async () => {
            const instantiationService = workbenchInstantiationService(undefined, disposables);
            const logService = new NullLogService();
            const fileService = disposables.add(new FileService(logService));
            fileProvider = disposables.add(new TestInMemoryFileSystemProvider());
            disposables.add(fileService.registerProvider(Schemas.file, fileProvider));
            const collection = new ServiceCollection();
            collection.set(IFileService, fileService);
            collection.set(IWorkingCopyFileService, disposables.add(new WorkingCopyFileService(fileService, disposables.add(new WorkingCopyService()), instantiationService, disposables.add(new UriIdentityService(fileService)))));
            service = disposables.add(instantiationService
                .createChild(collection)
                .createInstance(TestNativeTextFileServiceWithEncodingOverrides));
            disposables.add(service.files);
            await fileProvider.mkdir(URI.file(testDir));
            for (const fileName in files) {
                await fileProvider.writeFile(URI.file(join(testDir, fileName)), files[fileName], {
                    create: true,
                    overwrite: false,
                    unlock: false,
                    atomic: false,
                });
            }
            return { service, testDir };
        },
        teardown: async () => {
            disposables.clear();
        },
        exists,
        stat,
        readFile,
        detectEncodingByBOM,
    });
    async function exists(fsPath) {
        try {
            await fileProvider.readFile(URI.file(fsPath));
            return true;
        }
        catch (e) {
            return false;
        }
    }
    async function readFile(fsPath, encoding) {
        const file = await fileProvider.readFile(URI.file(fsPath));
        if (!encoding) {
            return VSBuffer.wrap(file);
        }
        return new TextDecoder(toCanonicalName(encoding)).decode(file);
    }
    async function stat(fsPath) {
        return fileProvider.stat(URI.file(fsPath));
    }
    async function detectEncodingByBOM(fsPath) {
        try {
            const buffer = await readFile(fsPath);
            return detectEncodingByBOMFromBuffer(buffer.slice(0, 3), 3);
        }
        catch (error) {
            return null; // ignore errors (like file not found)
        }
    }
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlVGV4dEZpbGVTZXJ2aWNlLmlvLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGV4dGZpbGUvdGVzdC9lbGVjdHJvbi1zYW5kYm94L25hdGl2ZVRleHRGaWxlU2VydmljZS5pby50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDakYsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRy9ELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsWUFBWSxFQUFTLE1BQU0sK0NBQStDLENBQUE7QUFDbkYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ3ZELE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RCxPQUFPLEVBRU4sNkJBQTZCLEVBRzdCLGVBQWUsR0FDZixNQUFNLDBCQUEwQixDQUFBO0FBQ2pDLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMvRCxPQUFPLEtBQUssTUFBTSw2QkFBNkIsQ0FBQTtBQUMvQyxPQUFPLFdBQVcsTUFBTSxzQ0FBc0MsQ0FBQTtBQUM5RCxPQUFPLEVBQ04sdUJBQXVCLEVBQ3ZCLHNCQUFzQixHQUN0QixNQUFNLHVEQUF1RCxDQUFBO0FBQzlELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLG1EQUFtRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFN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