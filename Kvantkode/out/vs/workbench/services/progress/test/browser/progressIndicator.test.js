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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3Jlc3NJbmRpY2F0b3IudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL3NlcnZpY2VzL3Byb2dyZXNzL3Rlc3QvYnJvd3Nlci9wcm9ncmVzc0luZGljYXRvci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0seUNBQXlDLENBQUE7QUFDekUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLHVCQUF1QixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFFbkcsTUFBTSxlQUFlO0lBQXJCO1FBQ0MsV0FBTSxHQUFXLENBQUMsQ0FBQTtRQUNsQixZQUFPLEdBQVcsQ0FBQyxDQUFBO1FBQ25CLGNBQVMsR0FBWSxLQUFLLENBQUE7UUFDMUIsVUFBSyxHQUFZLEtBQUssQ0FBQTtJQWlEdkIsQ0FBQztJQS9DQSxRQUFRO1FBQ1AsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFLLENBQUE7UUFDbEIsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUE7UUFFckIsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsS0FBSyxDQUFDLEtBQWE7UUFDbEIsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFLLENBQUE7UUFDbEIsSUFBSSxDQUFDLE1BQU0sR0FBRyxLQUFLLENBQUE7UUFFbkIsT0FBTyxJQUFJLENBQUE7SUFDWixDQUFDO0lBRUQsUUFBUTtRQUNQLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUE7SUFDckIsQ0FBQztJQUVELE1BQU0sQ0FBQyxNQUFjO1FBQ3BCLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSyxDQUFB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