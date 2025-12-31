/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { workbenchInstantiationService, TestInMemoryFileSystemProvider, TestBrowserTextFileServiceWithEncodingOverrides, } from '../../../../test/browser/workbenchTestServices.js';
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
import { isWeb } from '../../../../../base/common/platform.js';
import { IWorkingCopyFileService, WorkingCopyFileService, } from '../../../workingCopy/common/workingCopyFileService.js';
import { WorkingCopyService } from '../../../workingCopy/common/workingCopyService.js';
import { UriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentityService.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
// optimization: we don't need to run this suite in native environment,
// because we have nativeTextFileService.io.test.ts for it,
// so our tests run faster
if (isWeb) {
    suite('Files - BrowserTextFileService i/o', function () {
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
                    .createInstance(TestBrowserTextFileServiceWithEncodingOverrides));
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
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3NlclRleHRGaWxlU2VydmljZS5pby50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3RleHRmaWxlL3Rlc3QvYnJvd3Nlci9icm93c2VyVGV4dEZpbGVTZXJ2aWNlLmlvLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUNOLDZCQUE2QixFQUM3Qiw4QkFBOEIsRUFDOUIsK0NBQStDLEdBQy9DLE1BQU0sbURBQW1ELENBQUE7QUFDMUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNqRixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFHL0QsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1FQUFtRSxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxZQUFZLEVBQVMsTUFBTSwrQ0FBK0MsQ0FBQTtBQUNuRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3pELE9BQU8sRUFFTiw2QkFBNkIsRUFHN0IsZUFBZSxHQUNmLE1BQU0sMEJBQTBCLENBQUE7QUFDakMsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQy9ELE9BQU8sS0FBSyxNQUFNLDZCQUE2QixDQUFBO0FBQy9DLE9BQU8sV0FBVyxNQUFNLHNDQUFzQyxDQUFBO0FBQzlELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUM5RCxPQUFPLEVBQ04sdUJBQXVCLEVBQ3ZC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