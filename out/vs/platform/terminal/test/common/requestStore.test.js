/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { fail, strictEqual } from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { TestInstantiationService } from '../../../instantiation/test/common/instantiationServiceMock.js';
import { ConsoleLogger, ILogService } from '../../../log/common/log.js';
import { LogService } from '../../../log/common/logService.js';
import { RequestStore } from '../../common/requestStore.js';
suite('RequestStore', () => {
    let instantiationService;
    setup(() => {
        instantiationService = new TestInstantiationService();
        instantiationService.stub(ILogService, new LogService(new ConsoleLogger()));
    });
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    test('should resolve requests', async () => {
        const requestStore = store.add(instantiationService.createInstance((RequestStore), undefined));
        let eventArgs;
        store.add(requestStore.onCreateRequest((e) => (eventArgs = e)));
        const request = requestStore.createRequest({ arg: 'foo' });
        strictEqual(typeof eventArgs?.requestId, 'number');
        strictEqual(eventArgs?.arg, 'foo');
        requestStore.acceptReply(eventArgs.requestId, { data: 'bar' });
        const result = await request;
        strictEqual(result.data, 'bar');
    });
    test('should reject the promise when the request times out', async () => {
        const requestStore = store.add(instantiationService.createInstance((RequestStore), 1));
        const request = requestStore.createRequest({ arg: 'foo' });
        let threw = false;
        try {
            await request;
        }
        catch (e) {
            threw = true;
        }
        if (!threw) {
            fail();
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVxdWVzdFN0b3JlLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS90ZXJtaW5hbC90ZXN0L2NvbW1vbi9yZXF1ZXN0U3RvcmUudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxNQUFNLFFBQVEsQ0FBQTtBQUMxQyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxnRUFBZ0UsQ0FBQTtBQUN6RyxPQUFPLEVBQUUsYUFBYSxFQUFFLFdBQVcsRUFBRSxNQUFNLDRCQUE0QixDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFFM0QsS0FBSyxDQUFDLGNBQWMsRUFBRSxHQUFHLEVBQUU7SUFDMUIsSUFBSSxvQkFBOEMsQ0FBQTtJQUVsRCxLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1Ysb0JBQW9CLEdBQUcsSUFBSSx3QkFBd0IsRUFBRSxDQUFBO1FBQ3JELG9CQUFvQixDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsSUFBSSxVQUFVLENBQUMsSUFBSSxhQUFhLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDNUUsQ0FBQyxDQUFDLENBQUE7SUFFRixNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXZELElBQUksQ0FBQyx5QkFBeUIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUMxQyxNQUFNLFlBQVksR0FBb0QsS0FBSyxDQUFDLEdBQUcsQ0FDOUUsb0JBQW9CLENBQUMsY0FBYyxDQUNsQyxDQUFBLFlBQStDLENBQUEsRUFDL0MsU0FBUyxDQUNULENBQ0QsQ0FBQTtRQUNELElBQUksU0FBeUQsQ0FBQTtRQUM3RCxLQUFLLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsU0FBUyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUMvRCxNQUFNLE9BQU8sR0FBRyxZQUFZLENBQUMsYUFBYSxDQUFDLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7UUFDMUQsV0FBVyxDQUFDLE9BQU8sU0FBUyxFQUFFLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUNsRCxXQUFXLENBQUMsU0FBUyxFQUFFLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNsQyxZQUFZLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxTQUFTLEVBQUUsRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQTtRQUM5RCxNQUFNLE1BQU0sR0FBRyxNQUFNLE9BQU8sQ0FBQTtRQUM1QixXQUFXLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUNoQyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxzREFBc0QsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN2RSxNQUFNLFlBQVksR0FBb0QsS0FBSyxDQUFDLEdBQUcsQ0FDOUUsb0JBQW9CLENBQUMsY0FBYyxDQUFDLENBQUEsWUFBK0MsQ0FBQSxFQUFFLENBQUMsQ0FBQyxDQUN2RixDQUFBO1FBQ0QsTUFBTSxPQUFPLEdBQUcsWUFBWSxDQUFDLGFBQWEsQ0FBQyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1FBQzFELElBQUksS0FBSyxHQUFHLEtBQUssQ0FBQTtRQUNqQixJQUFJLENBQUM7WUFDSixNQUFNLE9BQU8sQ0FBQTtRQUNkLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1osS0FBSyxHQUFHLElBQUksQ0FBQTtRQUNiLENBQUM7UUFDRCxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixJQUFJLEVBQUUsQ0FBQTtRQUNQLENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=