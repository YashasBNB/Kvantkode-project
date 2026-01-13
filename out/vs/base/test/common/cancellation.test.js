/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { CancellationToken, CancellationTokenSource } from '../../common/cancellation.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from './utils.js';
suite('CancellationToken', function () {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    test('None', () => {
        assert.strictEqual(CancellationToken.None.isCancellationRequested, false);
        assert.strictEqual(typeof CancellationToken.None.onCancellationRequested, 'function');
    });
    test('cancel before token', function () {
        const source = new CancellationTokenSource();
        assert.strictEqual(source.token.isCancellationRequested, false);
        source.cancel();
        assert.strictEqual(source.token.isCancellationRequested, true);
        return new Promise((resolve) => {
            source.token.onCancellationRequested(() => resolve());
        });
    });
    test('cancel happens only once', function () {
        const source = new CancellationTokenSource();
        assert.strictEqual(source.token.isCancellationRequested, false);
        let cancelCount = 0;
        function onCancel() {
            cancelCount += 1;
        }
        store.add(source.token.onCancellationRequested(onCancel));
        source.cancel();
        source.cancel();
        assert.strictEqual(cancelCount, 1);
    });
    test('cancel calls all listeners', function () {
        let count = 0;
        const source = new CancellationTokenSource();
        store.add(source.token.onCancellationRequested(() => count++));
        store.add(source.token.onCancellationRequested(() => count++));
        store.add(source.token.onCancellationRequested(() => count++));
        source.cancel();
        assert.strictEqual(count, 3);
    });
    test('token stays the same', function () {
        let source = new CancellationTokenSource();
        let token = source.token;
        assert.ok(token === source.token); // doesn't change on get
        source.cancel();
        assert.ok(token === source.token); // doesn't change after cancel
        source.cancel();
        assert.ok(token === source.token); // doesn't change after 2nd cancel
        source = new CancellationTokenSource();
        source.cancel();
        token = source.token;
        assert.ok(token === source.token); // doesn't change on get
    });
    test('dispose calls no listeners', function () {
        let count = 0;
        const source = new CancellationTokenSource();
        store.add(source.token.onCancellationRequested(() => count++));
        source.dispose();
        source.cancel();
        assert.strictEqual(count, 0);
    });
    test('dispose calls no listeners (unless told to cancel)', function () {
        let count = 0;
        const source = new CancellationTokenSource();
        store.add(source.token.onCancellationRequested(() => count++));
        source.dispose(true);
        // source.cancel();
        assert.strictEqual(count, 1);
    });
    test('dispose does not cancel', function () {
        const source = new CancellationTokenSource();
        source.dispose();
        assert.strictEqual(source.token.isCancellationRequested, false);
    });
    test('parent cancels child', function () {
        const parent = new CancellationTokenSource();
        const child = new CancellationTokenSource(parent.token);
        let count = 0;
        store.add(child.token.onCancellationRequested(() => count++));
        parent.cancel();
        assert.strictEqual(count, 1);
        assert.strictEqual(child.token.isCancellationRequested, true);
        assert.strictEqual(parent.token.isCancellationRequested, true);
        child.dispose();
        parent.dispose();
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2FuY2VsbGF0aW9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vY2FuY2VsbGF0aW9uLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3pGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLFlBQVksQ0FBQTtBQUVwRSxLQUFLLENBQUMsbUJBQW1CLEVBQUU7SUFDMUIsTUFBTSxLQUFLLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUV2RCxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRTtRQUNqQixNQUFNLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUN6RSxNQUFNLENBQUMsV0FBVyxDQUFDLE9BQU8saUJBQWlCLENBQUMsSUFBSSxDQUFDLHVCQUF1QixFQUFFLFVBQVUsQ0FBQyxDQUFBO0lBQ3RGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHFCQUFxQixFQUFFO1FBQzNCLE1BQU0sTUFBTSxHQUFHLElBQUksdUJBQXVCLEVBQUUsQ0FBQTtRQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsdUJBQXVCLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDL0QsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFBO1FBRWYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLHVCQUF1QixFQUFFLElBQUksQ0FBQyxDQUFBO1FBRTlELE9BQU8sSUFBSSxPQUFPLENBQU8sQ0FBQyxPQUFPLEVBQUUsRUFBRTtZQUNwQyxNQUFNLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDLEdBQUcsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUE7UUFDdEQsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywwQkFBMEIsRUFBRTtRQUNoQyxNQUFNLE1BQU0sR0FBRyxJQUFJLHVCQUF1QixFQUFFLENBQUE7UUFDNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLHVCQUF1QixFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRS9ELElBQUksV0FBVyxHQUFHLENBQUMsQ0FBQTtRQUNuQixTQUFTLFFBQVE7WUFDaEIsV0FBVyxJQUFJLENBQUMsQ0FBQTtRQUNqQixDQUFDO1FBRUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7UUFFekQsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFBO1FBQ2YsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFBO1FBRWYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDbkMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNEJBQTRCLEVBQUU7UUFDbEMsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFBO1FBRWIsTUFBTSxNQUFNLEdBQUcsSUFBSSx1QkFBdUIsRUFBRSxDQUFBO1FBQzVDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDOUQsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDLEdBQUcsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM5RCxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTlELE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQTtRQUNmLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQzdCLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHNCQUFzQixFQUFFO1FBQzVCLElBQUksTUFBTSxHQUFHLElBQUksdUJBQXVCLEVBQUUsQ0FBQTtRQUMxQyxJQUFJLEtBQUssR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFBO1FBQ3hCLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxLQUFLLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQSxDQUFDLHdCQUF3QjtRQUUxRCxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUE7UUFDZixNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssS0FBSyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUEsQ0FBQyw4QkFBOEI7UUFFaEUsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFBO1FBQ2YsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLEtBQUssTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFBLENBQUMsa0NBQWtDO1FBRXBFLE1BQU0sR0FBRyxJQUFJLHVCQUF1QixFQUFFLENBQUE7UUFDdEMsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFBO1FBQ2YsS0FBSyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUE7UUFDcEIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLEtBQUssTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFBLENBQUMsd0JBQXdCO0lBQzNELENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDRCQUE0QixFQUFFO1FBQ2xDLElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQTtRQUViLE1BQU0sTUFBTSxHQUFHLElBQUksdUJBQXVCLEVBQUUsQ0FBQTtRQUM1QyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUMsR0FBRyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTlELE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNoQixNQUFNLENBQUMsTUFBTSxFQUFFLENBQUE7UUFDZixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUM3QixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxvREFBb0QsRUFBRTtRQUMxRCxJQUFJLEtBQUssR0FBRyxDQUFDLENBQUE7UUFFYixNQUFNLE1BQU0sR0FBRyxJQUFJLHVCQUF1QixFQUFFLENBQUE7UUFDNUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDLEdBQUcsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUU5RCxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3BCLG1CQUFtQjtRQUNuQixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUM3QixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx5QkFBeUIsRUFBRTtRQUMvQixNQUFNLE1BQU0sR0FBRyxJQUFJLHVCQUF1QixFQUFFLENBQUE7UUFDNUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ2hCLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUNoRSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxzQkFBc0IsRUFBRTtRQUM1QixNQUFNLE1BQU0sR0FBRyxJQUFJLHVCQUF1QixFQUFFLENBQUE7UUFDNUMsTUFBTSxLQUFLLEdBQUcsSUFBSSx1QkFBdUIsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUE7UUFFdkQsSUFBSSxLQUFLLEdBQUcsQ0FBQyxDQUFBO1FBQ2IsS0FBSyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDLEdBQUcsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUU3RCxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUE7UUFFZixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM1QixNQUFNLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsdUJBQXVCLEVBQUUsSUFBSSxDQUFDLENBQUE7UUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLHVCQUF1QixFQUFFLElBQUksQ0FBQyxDQUFBO1FBRTlELEtBQUssQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNmLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQTtJQUNqQixDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=