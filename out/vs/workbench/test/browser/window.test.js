/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { mainWindow } from '../../../base/browser/window.js';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { runWithFakedTimers } from '../../../base/test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../base/test/common/utils.js';
import { BaseWindow } from '../../browser/window.js';
import { TestEnvironmentService, TestHostService } from './workbenchTestServices.js';
suite('Window', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    class TestWindow extends BaseWindow {
        constructor(window, dom) {
            super(window, dom, new TestHostService(), TestEnvironmentService);
        }
        enableWindowFocusOnElementFocus() { }
    }
    test('multi window aware setTimeout()', async function () {
        return runWithFakedTimers({ useFakeTimers: true }, async () => {
            const disposables = new DisposableStore();
            let windows = [];
            const dom = {
                getWindowsCount: () => windows.length,
                getWindows: () => windows,
            };
            const setTimeoutCalls = [];
            const clearTimeoutCalls = [];
            function createWindow(id, slow) {
                const res = {
                    setTimeout: function (callback, delay, ...args) {
                        setTimeoutCalls.push(id);
                        return mainWindow.setTimeout(() => callback(id), slow ? delay * 2 : delay, ...args);
                    },
                    clearTimeout: function (timeoutId) {
                        clearTimeoutCalls.push(id);
                        return mainWindow.clearTimeout(timeoutId);
                    },
                };
                disposables.add(new TestWindow(res, dom));
                return res;
            }
            const window1 = createWindow(1);
            windows = [{ window: window1, disposables }];
            // Window Count: 1
            let called = false;
            await new Promise((resolve, reject) => {
                window1.setTimeout(() => {
                    if (!called) {
                        called = true;
                        resolve();
                    }
                    else {
                        reject(new Error('timeout called twice'));
                    }
                }, 1);
            });
            assert.strictEqual(called, true);
            assert.deepStrictEqual(setTimeoutCalls, [1]);
            assert.deepStrictEqual(clearTimeoutCalls, []);
            called = false;
            setTimeoutCalls.length = 0;
            clearTimeoutCalls.length = 0;
            await new Promise((resolve, reject) => {
                window1.setTimeout(() => {
                    if (!called) {
                        called = true;
                        resolve();
                    }
                    else {
                        reject(new Error('timeout called twice'));
                    }
                }, 0);
            });
            assert.strictEqual(called, true);
            assert.deepStrictEqual(setTimeoutCalls, [1]);
            assert.deepStrictEqual(clearTimeoutCalls, []);
            called = false;
            setTimeoutCalls.length = 0;
            clearTimeoutCalls.length = 0;
            // Window Count: 3
            let window2 = createWindow(2);
            const window3 = createWindow(3);
            windows = [
                { window: window2, disposables },
                { window: window1, disposables },
                { window: window3, disposables },
            ];
            await new Promise((resolve, reject) => {
                window1.setTimeout(() => {
                    if (!called) {
                        called = true;
                        resolve();
                    }
                    else {
                        reject(new Error('timeout called twice'));
                    }
                }, 1);
            });
            assert.strictEqual(called, true);
            assert.deepStrictEqual(setTimeoutCalls, [2, 1, 3]);
            assert.deepStrictEqual(clearTimeoutCalls, [2, 1, 3]);
            called = false;
            setTimeoutCalls.length = 0;
            clearTimeoutCalls.length = 0;
            // Window Count: 2 (1 fast, 1 slow)
            window2 = createWindow(2, true);
            windows = [
                { window: window2, disposables },
                { window: window1, disposables },
            ];
            await new Promise((resolve, reject) => {
                window1.setTimeout((windowId) => {
                    if (!called && windowId === 1) {
                        called = true;
                        resolve();
                    }
                    else if (called) {
                        reject(new Error('timeout called twice'));
                    }
                    else {
                        reject(new Error('timeout called for wrong window'));
                    }
                }, 1);
            });
            assert.strictEqual(called, true);
            assert.deepStrictEqual(setTimeoutCalls, [2, 1]);
            assert.deepStrictEqual(clearTimeoutCalls, [2, 1]);
            called = false;
            setTimeoutCalls.length = 0;
            clearTimeoutCalls.length = 0;
            disposables.dispose();
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvdGVzdC9icm93c2VyL3dpbmRvdy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUUzQixPQUFPLEVBQWMsVUFBVSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDeEUsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ3JGLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzVGLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx5QkFBeUIsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsZUFBZSxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFFcEYsS0FBSyxDQUFDLFFBQVEsRUFBRSxHQUFHLEVBQUU7SUFDcEIsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxNQUFNLFVBQVcsU0FBUSxVQUFVO1FBQ2xDLFlBQ0MsTUFBa0IsRUFDbEIsR0FBeUY7WUFFekYsS0FBSyxDQUFDLE1BQU0sRUFBRSxHQUFHLEVBQUUsSUFBSSxlQUFlLEVBQUUsRUFBRSxzQkFBc0IsQ0FBQyxDQUFBO1FBQ2xFLENBQUM7UUFFa0IsK0JBQStCLEtBQVUsQ0FBQztLQUM3RDtJQUVELElBQUksQ0FBQyxpQ0FBaUMsRUFBRSxLQUFLO1FBQzVDLE9BQU8sa0JBQWtCLENBQUMsRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDN0QsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtZQUV6QyxJQUFJLE9BQU8sR0FBNEIsRUFBRSxDQUFBO1lBQ3pD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