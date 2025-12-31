/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { workbenchInstantiationService, TestServiceAccessor, } from '../../../../test/browser/workbenchTestServices.js';
import { UntitledTextEditorInput } from '../../common/untitledTextEditorInput.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('Untitled text editors', () => {
    const disposables = new DisposableStore();
    let instantiationService;
    let accessor;
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        accessor = instantiationService.createInstance(TestServiceAccessor);
        disposables.add(accessor.untitledTextEditorService);
    });
    teardown(() => {
        disposables.clear();
    });
    test('backup and restore (simple)', async function () {
        return testBackupAndRestore('Some very small file text content.');
    });
    test('backup and restore (large, #121347)', async function () {
        const largeContent = '국어한\n'.repeat(100000);
        return testBackupAndRestore(largeContent);
    });
    async function testBackupAndRestore(content) {
        const service = accessor.untitledTextEditorService;
        const originalInput = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, service.create()));
        const restoredInput = disposables.add(instantiationService.createInstance(UntitledTextEditorInput, service.create()));
        const originalModel = disposables.add(await originalInput.resolve());
        originalModel.textEditorModel?.setValue(content);
        const backup = await originalModel.backup(CancellationToken.None);
        const modelRestoredIdentifier = {
            typeId: originalModel.typeId,
            resource: restoredInput.resource,
        };
        await accessor.workingCopyBackupService.backup(modelRestoredIdentifier, backup.content);
        const restoredModel = disposables.add(await restoredInput.resolve());
        assert.strictEqual(restoredModel.textEditorModel?.getValue(), content);
        assert.strictEqual(restoredModel.isDirty(), true);
    }
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidW50aXRsZWRUZXh0RWRpdG9yLmludGVncmF0aW9uVGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy91bnRpdGxlZC90ZXN0L2Jyb3dzZXIvdW50aXRsZWRUZXh0RWRpdG9yLmludGVncmF0aW9uVGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFFM0IsT0FBTyxFQUNOLDZCQUE2QixFQUM3QixtQkFBbUIsR0FDbkIsTUFBTSxtREFBbUQsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUNqRixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSw0Q0FBNEMsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEcsS0FBSyxDQUFDLHVCQUF1QixFQUFFLEdBQUcsRUFBRTtJQUNuQyxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO0lBRXpDLElBQUksb0JBQTJDLENBQUE7SUFDL0MsSUFBSSxRQUE2QixDQUFBO0lBRWpDLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixvQkFBb0IsR0FBRyw2QkFBNkIsQ0FBQyxTQUFTLEVBQUUsV0FBVyxDQUFDLENBQUE7UUFDNUUsUUFBUSxHQUFHLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFBO1FBQ25FLFdBQVcsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLHlCQUF5QixDQUFDLENBQUE7SUFDcEQsQ0FBQyxDQUFDLENBQUE7SUFFRixRQUFRLENBQUMsR0FBRyxFQUFFO1FBQ2IsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFBO0lBQ3BCLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDZCQUE2QixFQUFFLEtBQUs7UUFDeEMsT0FBTyxvQkFBb0IsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFBO0lBQ2xFLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHFDQUFxQyxFQUFFLEtBQUs7UUFDaEQsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUMzQyxPQUFPLG9CQUFvQixDQUFDLFlBQVksQ0FBQyxDQUFBO0lBQzFDLENBQUMsQ0FBQyxDQUFBO0lBRUYsS0FBSyxVQUFVLG9CQUFvQixDQUFDLE9BQWU7UUFDbEQsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFDLHlCQUF5QixDQUFBO1FBQ2xELE1BQU0sYUFBYSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQ3BDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyx1QkFBdUIsRUFBRSxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FDOUUsQ0FBQTtRQUNELE1BQU0sYUFBYSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQ3BDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyx1QkFBdUIsRUFBRSxPQUFPLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FDOUUsQ0FBQTtRQUVELE1BQU0sYUFBYSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxhQUFhLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQTtRQUNwRSxhQUFhLENBQUMsZUFBZSxFQUFFLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUVoRCxNQUFNLE1BQU0sR0FBRyxNQUFNLGFBQWEsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDakUsTUFBTSx1QkFBdUIsR0FBRztZQUMvQixNQUFNLEVBQUUsYUFBYSxDQUFDLE1BQU07WUFDNUIsUUFBUSxFQUFFLGFBQWEsQ0FBQyxRQUFRO1NBQ2hDLENBQUE7UUFDRCxNQUFNLFFBQVEsQ0FBQyx3QkFBd0IsQ0FBQyxNQUFNLENBQUMsdUJBQXVCLEVBQUUsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBRXZGLE1BQU0sYUFBYSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsTUFBTSxhQUFhLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQTtRQUVwRSxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxlQUFlLEVBQUUsUUFBUSxFQUFFLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDdEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7SUFDbEQsQ0FBQztJQUVELHVDQUF1QyxFQUFFLENBQUE7QUFDMUMsQ0FBQyxDQUFDLENBQUEifQ==