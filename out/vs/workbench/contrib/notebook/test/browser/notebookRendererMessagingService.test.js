/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { NullExtensionService } from '../../../../services/extensions/common/extensions.js';
import { stub } from 'sinon';
import { NotebookRendererMessagingService } from '../../browser/services/notebookRendererMessagingServiceImpl.js';
import assert from 'assert';
import { timeout } from '../../../../../base/common/async.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('NotebookRendererMessaging', () => {
    let extService;
    let m;
    let sent = [];
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    setup(() => {
        sent = [];
        extService = new NullExtensionService();
        m = ds.add(new NotebookRendererMessagingService(extService));
        ds.add(m.onShouldPostMessage((e) => sent.push(e)));
    });
    test('activates on prepare', () => {
        const activate = stub(extService, 'activateByEvent').returns(Promise.resolve());
        m.prepare('foo');
        m.prepare('foo');
        m.prepare('foo');
        assert.deepStrictEqual(activate.args, [['onRenderer:foo']]);
    });
    test('buffers and then plays events', async () => {
        stub(extService, 'activateByEvent').returns(Promise.resolve());
        const scoped = m.getScoped('some-editor');
        scoped.postMessage('foo', 1);
        scoped.postMessage('foo', 2);
        assert.deepStrictEqual(sent, []);
        await timeout(0);
        const expected = [
            { editorId: 'some-editor', rendererId: 'foo', message: 1 },
            { editorId: 'some-editor', rendererId: 'foo', message: 2 },
        ];
        assert.deepStrictEqual(sent, expected);
        scoped.postMessage('foo', 3);
        assert.deepStrictEqual(sent, [
            ...expected,
            { editorId: 'some-editor', rendererId: 'foo', message: 3 },
        ]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90ZWJvb2tSZW5kZXJlck1lc3NhZ2luZ1NlcnZpY2UudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL25vdGVib29rL3Rlc3QvYnJvd3Nlci9ub3RlYm9va1JlbmRlcmVyTWVzc2FnaW5nU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQzNGLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxPQUFPLENBQUE7QUFDNUIsT0FBTyxFQUFFLGdDQUFnQyxFQUFFLE1BQU0sZ0VBQWdFLENBQUE7QUFDakgsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUM3RCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUVsRyxLQUFLLENBQUMsMkJBQTJCLEVBQUUsR0FBRyxFQUFFO0lBQ3ZDLElBQUksVUFBZ0MsQ0FBQTtJQUNwQyxJQUFJLENBQW1DLENBQUE7SUFDdkMsSUFBSSxJQUFJLEdBQWMsRUFBRSxDQUFBO0lBRXhCLE1BQU0sRUFBRSxHQUFHLHVDQUF1QyxFQUFFLENBQUE7SUFFcEQsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLElBQUksR0FBRyxFQUFFLENBQUE7UUFDVCxVQUFVLEdBQUcsSUFBSSxvQkFBb0IsRUFBRSxDQUFBO1FBQ3ZDLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksZ0NBQWdDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQTtRQUM1RCxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7SUFDbkQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsc0JBQXNCLEVBQUUsR0FBRyxFQUFFO1FBQ2pDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxVQUFVLEVBQUUsaUJBQWlCLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUE7UUFDL0UsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNoQixDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQ2hCLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUE7UUFFaEIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUM1RCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywrQkFBK0IsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNoRCxJQUFJLENBQUMsVUFBVSxFQUFFLGlCQUFpQixDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFBO1FBRTlELE1BQU0sTUFBTSxHQUFHLENBQUMsQ0FBQyxTQUFTLENBQUMsYUFBYSxDQUFDLENBQUE7UUFDekMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDNUIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDNUIsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFFaEMsTUFBTSxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFaEIsTUFBTSxRQUFRLEdBQUc7WUFDaEIsRUFBRSxRQUFRLEVBQUUsYUFBYSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsT0FBTyxFQUFFLENBQUMsRUFBRTtZQUMxRCxFQUFFLFFBQVEsRUFBRSxhQUFhLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFO1NBQzFELENBQUE7UUFFRCxNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQTtRQUV0QyxNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUU1QixNQUFNLENBQUMsZUFBZSxDQUFDLElBQUksRUFBRTtZQUM1QixHQUFHLFFBQVE7WUFDWCxFQUFFLFFBQVEsRUFBRSxhQUFhLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxPQUFPLEVBQUUsQ0FBQyxFQUFFO1NBQzFELENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==