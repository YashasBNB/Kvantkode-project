/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { IFileService } from '../../../../../platform/files/common/files.js';
import { Schemas } from '../../../../../base/common/network.js';
import { ServiceCollection } from '../../../../../platform/instantiation/common/serviceCollection.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { FileService } from '../../../../../platform/files/common/fileService.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { TestNativeTextFileServiceWithEncodingOverrides, TestServiceAccessor, workbenchInstantiationService, } from '../../../../test/electron-sandbox/workbenchTestServices.js';
import { IWorkingCopyFileService, WorkingCopyFileService, } from '../../../workingCopy/common/workingCopyFileService.js';
import { WorkingCopyService } from '../../../workingCopy/common/workingCopyService.js';
import { UriIdentityService } from '../../../../../platform/uriIdentity/common/uriIdentityService.js';
import { InMemoryFileSystemProvider } from '../../../../../platform/files/common/inMemoryFilesystemProvider.js';
import { TextFileEditorModel } from '../../common/textFileEditorModel.js';
import { ensureNoDisposablesAreLeakedInTestSuite, toResource, } from '../../../../../base/test/common/utils.js';
suite('Files - NativeTextFileService', function () {
    const disposables = new DisposableStore();
    let service;
    let instantiationService;
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        const logService = new NullLogService();
        const fileService = disposables.add(new FileService(logService));
        const fileProvider = disposables.add(new InMemoryFileSystemProvider());
        disposables.add(fileService.registerProvider(Schemas.file, fileProvider));
        const collection = new ServiceCollection();
        collection.set(IFileService, fileService);
        collection.set(IWorkingCopyFileService, disposables.add(new WorkingCopyFileService(fileService, disposables.add(new WorkingCopyService()), instantiationService, disposables.add(new UriIdentityService(fileService)))));
        service = disposables.add(instantiationService
            .createChild(collection)
            .createInstance(TestNativeTextFileServiceWithEncodingOverrides));
        disposables.add(service.files);
    });
    teardown(() => {
        disposables.clear();
    });
    test('shutdown joins on pending saves', async function () {
        const model = disposables.add(instantiationService.createInstance(TextFileEditorModel, toResource.call(this, '/path/index_async.txt'), 'utf8', undefined));
        await model.resolve();
        let pendingSaveAwaited = false;
        model.save().then(() => (pendingSaveAwaited = true));
        const accessor = instantiationService.createInstance(TestServiceAccessor);
        accessor.lifecycleService.fireShutdown();
        assert.ok(accessor.lifecycleService.shutdownJoiners.length > 0);
        await Promise.all(accessor.lifecycleService.shutdownJoiners);
        assert.strictEqual(pendingSaveAwaited, true);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibmF0aXZlVGV4dEZpbGVTZXJ2aWNlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvc2VydmljZXMvdGV4dGZpbGUvdGVzdC9lbGVjdHJvbi1zYW5kYm94L25hdGl2ZVRleHRGaWxlU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUUzQixPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sK0NBQStDLENBQUE7QUFFNUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQy9ELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLG1FQUFtRSxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN6RSxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDakYsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzFFLE9BQU8sRUFDTiw4Q0FBOEMsRUFDOUMsbUJBQW1CLEVBQ25CLDZCQUE2QixHQUM3QixNQUFNLDREQUE0RCxDQUFBO0FBQ25FLE9BQU8sRUFDTix1QkFBdUIsRUFDdkIsc0JBQXNCLEdBQ3RCLE1BQU0sdURBQXVELENBQUE7QUFDOUQsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sbURBQW1ELENBQUE7QUFDdEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDckcsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sb0VBQW9FLENBQUE7QUFFL0csT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0scUNBQXFDLENBQUE7QUFDekUsT0FBTyxFQUNOLHVDQUF1QyxFQUN2QyxVQUFVLEdBQ1YsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVqRCxLQUFLLENBQUMsK0JBQStCLEVBQUU7SUFDdEMsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLE9BQXlCLENBQUE7SUFDN0IsSUFBSSxvQkFBMkMsQ0FBQTtJQUUvQyxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1Ysb0JBQW9CLEdBQUcsNkJBQTZCLENBQUMsU0FBUyxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBRTVFLE1BQU0sVUFBVSxHQUFHLElBQUksY0FBYyxFQUFFLENBQUE7UUFDdkMsTUFBTSxXQUFXLEdBQUcsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLFdBQVcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFBO1FBRWhFLE1BQU0sWUFBWSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSwwQkFBMEIsRUFBRSxDQUFDLENBQUE7UUFDdEUsV0FBVyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsZ0JBQWdCLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQyxDQUFBO1FBRXpFLE1BQU0sVUFBVSxHQUFHLElBQUksaUJBQWlCLEVBQUUsQ0FBQTtRQUMxQyxVQUFVLENBQUMsR0FBRyxDQUFDLFlBQVksRUFBRSxXQUFXLENBQUMsQ0FBQTtRQUN6QyxVQUFVLENBQUMsR0FBRyxDQUNiLHVCQUF1QixFQUN2QixXQUFXLENBQUMsR0FBRyxDQUNkLElBQUksc0JBQXNCLENBQ3pCLFdBQVcsRUFDWCxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksa0JBQWtCLEVBQUUsQ0FBQyxFQUN6QyxvQkFBb0IsRUFDcEIsV0FBVyxDQUFDLEdBQUcsQ0FBQyxJQUFJLGtCQUFrQixDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQ3BELENBQ0QsQ0FDRCxDQUFBO1FBRUQsT0FBTyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQ3hCLG9CQUFvQjthQUNsQixXQUFXLENBQUMsVUFBVSxDQUFDO2FBQ3ZCLGNBQWMsQ0FBQyw4Q0FBOEMsQ0FBQyxDQUNoRSxDQUFBO1FBQ0QsV0FBVyxDQUFDLEdBQUcsQ0FBNkIsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFBO0lBQzNELENBQUMsQ0FBQyxDQUFBO0lBRUYsUUFBUSxDQUFDLEdBQUcsRUFBRTtRQUNiLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUNwQixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxpQ0FBaUMsRUFBRSxLQUFLO1FBQzVDLE1BQU0sS0FBSyxHQUF3QixXQUFXLENBQUMsR0FBRyxDQUNqRCxvQkFBb0IsQ0FBQyxjQUFjLENBQ2xDLG1CQUFtQixFQUNuQixVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSx1QkFBdUIsQ0FBQyxFQUM5QyxNQUFNLEVBQ04sU0FBUyxDQUNULENBQ0QsQ0FBQTtRQUVELE1BQU0sS0FBSyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBRXJCLElBQUksa0JBQWtCLEdBQUcsS0FBSyxDQUFBO1FBQzlCLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBRXBELE1BQU0sUUFBUSxHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO1FBQ3pFLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLEVBQUUsQ0FBQTtRQUV4QyxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQy9ELE1BQU0sT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLENBQUE7UUFFNUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxrQkFBa0IsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUM3QyxDQUFDLENBQUMsQ0FBQTtJQUVGLHVDQUF1QyxFQUFFLENBQUE7QUFDMUMsQ0FBQyxDQUFDLENBQUEifQ==