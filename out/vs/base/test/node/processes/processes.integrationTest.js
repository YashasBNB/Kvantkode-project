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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvY2Vzc2VzLmludGVncmF0aW9uVGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUtcHJvamVjdC9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L25vZGUvcHJvY2Vzc2VzL3Byb2Nlc3Nlcy5pbnRlZ3JhdGlvblRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sS0FBSyxFQUFFLE1BQU0sZUFBZSxDQUFBO0FBQ25DLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUN2RCxPQUFPLEtBQUssT0FBTyxNQUFNLDRCQUE0QixDQUFBO0FBQ3JELE9BQU8sS0FBSyxRQUFRLE1BQU0sNkJBQTZCLENBQUE7QUFDdkQsT0FBTyxLQUFLLFNBQVMsTUFBTSw0QkFBNEIsQ0FBQTtBQUV2RCxTQUFTLElBQUksQ0FBQyxFQUFVO0lBQ3ZCLE1BQU0sSUFBSSxHQUFRO1FBQ2pCLEdBQUcsRUFBRSxPQUFPLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxFQUFFO1lBQ2xELHFCQUFxQixFQUFFLEVBQUU7WUFDekIsbUJBQW1CLEVBQUUsTUFBTTtZQUMzQixzQkFBc0IsRUFBRSxJQUFJO1NBQzVCLENBQUM7S0FDRixDQUFBO0lBRUQsT0FBTyxFQUFFLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO0FBQzdGLENBQUM7QUFFRCxLQUFLLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRTtJQUN2QixJQUFJLENBQUMsZ0NBQWdDLEVBQUUsVUFBVSxJQUFnQjtRQUNoRSxJQUFJLE9BQU8s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