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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYnJvd3NlclRleHRGaWxlU2VydmljZS5pby50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGV4dGZpbGUvdGVzdC9icm93c2VyL2Jyb3dzZXJUZXh0RmlsZVNlcnZpY2UuaW8udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQ04sNkJBQTZCLEVBQzdCLDhCQUE4QixFQUM5QiwrQ0FBK0MsR0FDL0MsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDMUUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ2pGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUcvRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sbUVBQW1FLENBQUE7QUFDckcsT0FBTyxFQUFFLFlBQVksRUFBUyxNQUFNLCtDQUErQyxDQUFBO0FBQ25GLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDekQsT0FBTyxFQUVOLDZCQUE2QixFQUc3QixlQUFlLEdBQ2YsTUFBTSwwQkFBMEIsQ0FBQTtBQUNqQyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDL0QsT0FBTyxLQUFLLE1BQU0sNkJBQTZCLENBQUE7QUFDL0MsT0FBTyxXQUFXLE1BQU0sc0NBQXNDLENBQUE7QUFDOUQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQzlELE9BQU8sRUFDTix1QkFBdUIs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