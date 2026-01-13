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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlVGV4dEZpbGVTZXJ2aWNlLmlvLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy90ZXh0ZmlsZS90ZXN0L2VsZWN0cm9uLXNhbmRib3gvbmF0aXZlVGV4dEZpbGVTZXJ2aWNlLmlvLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNqRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFHL0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1FQUFtRSxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxZQUFZLEVBQVMsTUFBTSwrQ0FBK0MsQ0FBQTtBQUNuRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3pELE9BQU8sRUFFTiw2QkFBNkIsRUFHN0IsZUFBZSxHQUNmLE1BQU0sMEJBQTBCLENBQUE7QUFDakMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9ELE9BQU8sS0FBSyxNQUFNLDZCQUE2QixDQUFBO0FBQy9DLE9BQU8sV0FBVyxNQUFNLHNDQUFzQyxDQUFBO0FBQzlELE9BQU8sRUFDTix1QkFBdUIsRUFDdkIsc0JBQXNCLEdBQ3RCLE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDdEYsT0FB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