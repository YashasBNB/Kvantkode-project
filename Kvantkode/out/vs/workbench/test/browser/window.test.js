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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid2luZG93LnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC90ZXN0L2Jyb3dzZXIvd2luZG93LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBRTNCLE9BQU8sRUFBYyxVQUFVLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN4RSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDbkUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDckYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDNUYsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ3BELE9BQU8sRUFBRSxzQkFBc0IsRUFBRSxlQUFlLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUVwRixLQUFLLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRTtJQUNwQix1Q0FBdUMsRUFBRSxDQUFBO0lBRXpDLE1BQU0sVUFBVyxTQUFRLFVBQVU7UUFDbEMsWUFDQyxNQUFrQixFQUNsQixHQUF5RjtZQUV6RixLQUFLLENBQUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxJQUFJLGVBQWUsRUFBRSxFQUFFLHNCQUFzQixDQUFDLENBQUE7UUFDbEUsQ0FBQztRQUVrQiwrQkFBK0IsS0FBVSxDQUFDO0tBQzdEO0lBRUQsSUFBSSxDQUFDLGlDQUFpQyxFQUFFLEtBQUs7UUFDNUMsT0FBTyxrQkFBa0IsQ0FBQyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtZQUM3RCxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO1lBRXpDLElBQUksT0FBTyxHQUE0QixFQUFFLENBQUE7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