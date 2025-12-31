/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../../../base/common/lifecycle.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { AbstractProgressScope, ScopedProgressIndicator } from '../../browser/progressIndicator.js';
class TestProgressBar {
    constructor() {
        this.fTotal = 0;
        this.fWorked = 0;
        this.fInfinite = false;
        this.fDone = false;
    }
    infinite() {
        this.fDone = null;
        this.fInfinite = true;
        return this;
    }
    total(total) {
        this.fDone = null;
        this.fTotal = total;
        return this;
    }
    hasTotal() {
        return !!this.fTotal;
    }
    worked(worked) {
        this.fDone = null;
        if (this.fWorked) {
            this.fWorked += worked;
        }
        else {
            this.fWorked = worked;
        }
        return this;
    }
    done() {
        this.fDone = true;
        this.fInfinite = null;
        this.fWorked = null;
        this.fTotal = null;
        return this;
    }
    stop() {
        return this.done();
    }
    show() { }
    hide() { }
}
suite('Progress Indicator', () => {
    const disposables = new DisposableStore();
    teardown(() => {
        disposables.clear();
    });
    test('ScopedProgressIndicator', async () => {
        const testProgressBar = new TestProgressBar();
        const progressScope = disposables.add(new (class extends AbstractProgressScope {
            constructor() {
                super('test.scopeId', true);
            }
            testOnScopeOpened(scopeId) {
                super.onScopeOpened(scopeId);
            }
            testOnScopeClosed(scopeId) {
                super.onScopeClosed(scopeId);
            }
        })());
        const testObject = disposables.add(new ScopedProgressIndicator(testProgressBar, progressScope));
        // Active: Show (Infinite)
        let fn = testObject.show(true);
        assert.strictEqual(true, testProgressBar.fInfinite);
        fn.done();
        assert.strictEqual(true, testProgressBar.fDone);
        // Active: Show (Total / Worked)
        fn = testObject.show(100);
        assert.strictEqual(false, !!testProgressBar.fInfinite);
        assert.strictEqual(100, testProgressBar.fTotal);
        fn.worked(20);
        assert.strictEqual(20, testProgressBar.fWorked);
        fn.total(80);
        assert.strictEqual(80, testProgressBar.fTotal);
        fn.done();
        assert.strictEqual(true, testProgressBar.fDone);
        // Inactive: Show (Infinite)
        progressScope.testOnScopeClosed('test.scopeId');
        testObject.show(true);
        assert.strictEqual(false, !!testProgressBar.fInfinite);
        progressScope.testOnScopeOpened('test.scopeId');
        assert.strictEqual(true, testProgressBar.fInfinite);
        // Inactive: Show (Total / Worked)
        progressScope.testOnScopeClosed('test.scopeId');
        fn = testObject.show(100);
        fn.total(80);
        fn.worked(20);
        assert.strictEqual(false, !!testProgressBar.fTotal);
        progressScope.testOnScopeOpened('test.scopeId');
        assert.strictEqual(20, testProgressBar.fWorked);
        assert.strictEqual(80, testProgressBar.fTotal);
        // Acive: Show While
        let p = Promise.resolve(null);
        await testObject.showWhile(p);
        assert.strictEqual(true, testProgressBar.fDone);
        progressScope.testOnScopeClosed('test.scopeId');
        p = Promise.resolve(null);
        await testObject.showWhile(p);
        assert.strictEqual(true, testProgressBar.fDone);
        progressScope.testOnScopeOpened('test.scopeId');
        assert.strictEqual(true, testProgressBar.fDone);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3Jlc3NJbmRpY2F0b3IudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9zZXJ2aWNlcy9wcm9ncmVzcy90ZXN0L2Jyb3dzZXIvcHJvZ3Jlc3NJbmRpY2F0b3IudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBQ3pFLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBRW5HLE1BQU0sZUFBZTtJQUFyQjtRQUNDLFdBQU0sR0FBVyxDQUFDLENBQUE7UUFDbEIsWUFBTyxHQUFXLENBQUMsQ0FBQTtRQUNuQixjQUFTLEdBQVksS0FBSyxDQUFBO1FBQzFCLFVBQUssR0FBWSxLQUFLLENBQUE7SUFpRHZCLENBQUM7SUEvQ0EsUUFBUTtRQUNQLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSyxDQUFBO1FBQ2xCLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxDQUFBO1FBRXJCLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELEtBQUssQ0FBQyxLQUFhO1FBQ2xCLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSyxDQUFBO1FBQ2xCLElBQUksQ0FBQyxNQUFNLEdBQUcsS0FBSyxDQUFBO1FBRW5CLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELFFBQVE7UUFDUCxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFBO0lBQ3JCLENBQUM7SUFFRCxNQUFNLENBQUMsTUFBYztRQUNwQixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUssQ0FBQTtRQUVsQixJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNsQixJQUFJLENBQUMsT0FBTyxJQUFJLE1BQU0sQ0FBQTtRQUN2QixDQUFDO2FBQU0sQ0FBQztZQUNQLElBQUksQ0FBQyxPQUFPLEdBQUcsTUFBTSxDQUFBO1FBQ3RCLENBQUM7UUFFRCxPQUFPLElBQUksQ0FBQTtJQUNaLENBQUM7SUFFRCxJQUFJO1FBQ0gsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUE7UUFFakIsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFLLENBQUE7UUFDdEIsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFLLENBQUE7UUFDcEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFLLENBQUE7UUFFbkIsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsSUFBSTtRQUNILE9BQU8sSUFBSSxDQUFDLElBQUksRUFBRSxDQUFBO0lBQ25CLENBQUM7SUFFRCxJQUFJLEtBQVUsQ0FBQztJQUVmLElBQUksS0FBVSxDQUFDO0NBQ2Y7QUFFRCxLQUFLLENBQUMsb0JBQW9CLEVBQUUsR0FBRyxFQUFFO0lBQ2hDLE1BQU0sV0FBVyxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7SUFFekMsUUFBUSxDQUFDLEdBQUcsRUFBRTtRQUNiLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtJQUNwQixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUMxQyxNQUFNLGVBQWUsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1FBQzdDLE1BQU0sYUFBYSxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQ3BDLElBQUksQ0FBQyxLQUFNLFNBQVEscUJBQXFCO1lBQ3ZDO2dCQUNDLEtBQUssQ0FBQyxjQUFjLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDNUIsQ0FBQztZQUNELGlCQUFpQixDQUFDLE9BQWU7Z0JBQ2hDLEtBQUssQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDN0IsQ0FBQztZQUNELGlCQUFpQixDQUFDLE9BQWU7Z0JBQ2hDLEtBQUssQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUE7WUFDN0IsQ0FBQztTQUNELENBQUMsRUFBRSxDQUNKLENBQUE7UUFDRCxNQUFNLFVBQVUsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUNqQyxJQUFJLHVCQUF1QixDQUFNLGVBQWUsRUFBRSxhQUFhLENBQUMsQ0FDaEUsQ0FBQTtRQUVELDBCQUEwQjtRQUMxQixJQUFJLEVBQUUsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQzlCLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNuRCxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDVCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUE7UUFFL0MsZ0NBQWdDO1FBQ2hDLEVBQUUsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3pCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDdEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxHQUFHLEVBQUUsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQy9DLEVBQUUsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDYixNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUE7UUFDL0MsRUFBRSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUNaLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUM5QyxFQUFFLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDVCxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUE7UUFFL0MsNEJBQTRCO1FBQzVCLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUMvQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1FBQ3JCLE1BQU0sQ0FBQyxXQUFXLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDdEQsYUFBYSxDQUFDLGlCQUFpQixDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLGVBQWUsQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUVuRCxrQ0FBa0M7UUFDbEMsYUFBYSxDQUFDLGlCQUFpQixDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBQy9DLEVBQUUsR0FBRyxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ3pCLEVBQUUsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDWixFQUFFLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ2IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNuRCxhQUFhLENBQUMsaUJBQWlCLENBQUMsY0FBYyxDQUFDLENBQUE7UUFDL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLGVBQWUsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUU5QyxvQkFBb0I7UUFDcEIsSUFBSSxDQUFDLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUM3QixNQUFNLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDN0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQy9DLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUMvQyxDQUFDLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUN6QixNQUFNLFVBQVUsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDN0IsTUFBTSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEVBQUUsZUFBZSxDQUFDLEtBQUssQ0FBQyxDQUFBO1FBQy9DLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxjQUFjLENBQUMsQ0FBQTtRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLElBQUksRUFBRSxlQUFlLENBQUMsS0FBSyxDQUFDLENBQUE7SUFDaEQsQ0FBQyxDQUFDLENBQUE7SUFFRix1Q0FBdUMsRUFBRSxDQUFBO0FBQzFDLENBQUMsQ0FBQyxDQUFBIn0=