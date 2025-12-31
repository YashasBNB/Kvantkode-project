/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as cp from 'child_process';
import { FileAccess } from '../../../common/network.js';
import * as objects from '../../../common/objects.js';
import * as platform from '../../../common/platform.js';
import * as processes from '../../../node/processes.js';
function fork(id) {
    const opts = {
        env: objects.mixin(objects.deepClone(process.env), {
            VSCODE_ESM_ENTRYPOINT: id,
            VSCODE_PIPE_LOGGING: 'true',
            VSCODE_VERBOSE_LOGGING: true,
        }),
    };
    return cp.fork(FileAccess.asFileUri('bootstrap-fork').fsPath, ['--type=processTests'], opts);
}
suite('Processes', () => {
    test('buffered sending - simple data', function (done) {
        if (process.env['VSCODE_PID']) {
            return done(); // this test fails when run from within VS Code
        }
        const child = fork('vs/base/test/node/processes/fixtures/fork');
        const sender = processes.createQueuedSender(child);
        let counter = 0;
        const msg1 = 'Hello One';
        const msg2 = 'Hello Two';
        const msg3 = 'Hello Three';
        child.on('message', (msgFromChild) => {
            if (msgFromChild === 'ready') {
                sender.send(msg1);
                sender.send(msg2);
                sender.send(msg3);
            }
            else {
                counter++;
                if (counter === 1) {
                    assert.strictEqual(msgFromChild, msg1);
                }
                else if (counter === 2) {
                    assert.strictEqual(msgFromChild, msg2);
                }
                else if (counter === 3) {
                    assert.strictEqual(msgFromChild, msg3);
                    child.kill();
                    done();
                }
            }
        });
    });
    (!platform.isWindows || process.env['VSCODE_PID'] ? test.skip : test)('buffered sending - lots of data (potential deadlock on win32)', function (done) {
        // test is only relevant for Windows and seems to crash randomly on some Linux builds
        const child = fork('vs/base/test/node/processes/fixtures/fork_large');
        const sender = processes.createQueuedSender(child);
        const largeObj = Object.create(null);
        for (let i = 0; i < 10000; i++) {
            largeObj[i] = 'some data';
        }
        const msg = JSON.stringify(largeObj);
        child.on('message', (msgFromChild) => {
            if (msgFromChild === 'ready') {
                sender.send(msg);
                sender.send(msg);
                sender.send(msg);
            }
            else if (msgFromChild === 'done') {
                child.kill();
                done();
            }
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzc2VzLmludGVncmF0aW9uVGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9ub2RlL3Byb2Nlc3Nlcy9wcm9jZXNzZXMuaW50ZWdyYXRpb25UZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEtBQUssRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUNuQyxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sNEJBQTRCLENBQUE7QUFDdkQsT0FBTyxLQUFLLE9BQU8sTUFBTSw0QkFBNEIsQ0FBQTtBQUNyRCxPQUFPLEtBQUssUUFBUSxNQUFNLDZCQUE2QixDQUFBO0FBQ3ZELE9BQU8sS0FBSyxTQUFTLE1BQU0sNEJBQTRCLENBQUE7QUFFdkQsU0FBUyxJQUFJLENBQUMsRUFBVTtJQUN2QixNQUFNLElBQUksR0FBUTtRQUNqQixHQUFHLEVBQUUsT0FBTyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRTtZQUNsRCxxQkFBcUIsRUFBRSxFQUFFO1lBQ3pCLG1CQUFtQixFQUFFLE1BQU07WUFDM0Isc0JBQXNCLEVBQUUsSUFBSTtTQUM1QixDQUFDO0tBQ0YsQ0FBQTtJQUVELE9BQU8sRUFBRSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLGdCQUFnQixDQUFDLENBQUMsTUFBTSxFQUFFLENBQUMscUJBQXFCLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtBQUM3RixDQUFDO0FBRUQsS0FBSyxDQUFDLFdBQVcsRUFBRSxHQUFHLEVBQUU7SUFDdkIsSUFBSSxDQUFDLGdDQUFnQyxFQUFFLFVBQVUsSUFBZ0I7UUFDaEUsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FB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