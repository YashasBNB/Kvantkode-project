/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as net from 'net';
import * as ports from '../../node/ports.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../common/utils.js';
import { flakySuite } from './testUtils.js';
flakySuite('Ports', () => {
    ;
    (process.env['VSCODE_PID']
        ? test.skip /* this test fails when run from within VS Code */
        : test)('Finds a free port (no timeout)', function (done) {
        // get an initial freeport >= 7000
        ports.findFreePort(7000, 100, 300000).then((initialPort) => {
            assert.ok(initialPort >= 7000);
            // create a server to block this port
            const server = net.createServer();
            server.listen(initialPort, undefined, undefined, () => {
                // once listening, find another free port and assert that the port is different from the opened one
                ports.findFreePort(7000, 50, 300000).then((freePort) => {
                    assert.ok(freePort >= 7000 && freePort !== initialPort);
                    server.close();
                    done();
                }, (err) => done(err));
            });
        }, (err) => done(err));
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9ydC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3Qvbm9kZS9wb3J0LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sS0FBSyxHQUFHLE1BQU0sS0FBSyxDQUFBO0FBQzFCLE9BQU8sS0FBSyxLQUFLLE1BQU0scUJBQXFCLENBQUE7QUFDNUMsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDNUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLGdCQUFnQixDQUFBO0FBRTNDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsR0FBRyxFQUFFO0lBQ3hCLENBQUM7SUFBQSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDO1FBQzFCLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLGtEQUFrRDtRQUM5RCxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsZ0NBQWdDLEVBQUUsVUFBVSxJQUFJO1FBQ3hELGtDQUFrQztRQUNsQyxLQUFLLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUN6QyxDQUFDLFdBQVcsRUFBRSxFQUFFO1lBQ2YsTUFBTSxDQUFDLEVBQUUsQ0FBQyxXQUFXLElBQUksSUFBSSxDQUFDLENBQUE7WUFFOUIscUNBQXFDO1lBQ3JDLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxZQUFZLEVBQUUsQ0FBQTtZQUNqQyxNQUFNLENBQUMsTUFBTSxDQUFDLFdBQVcsRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLEdBQUcsRUFBRTtnQkFDckQsbUdBQW1HO2dCQUNuRyxLQUFLLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxFQUFFLEVBQUUsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUN4QyxDQUFDLFFBQVEsRUFBRSxFQUFFO29CQUNaLE1BQU0sQ0FBQyxFQUFFLENBQUMsUUFBUSxJQUFJLElBQUksSUFBSSxRQUFRLEtBQUssV0FBVyxDQUFDLENBQUE7b0JBQ3ZELE1BQU0sQ0FBQyxLQUFLLEVBQUUsQ0FBQTtvQkFFZCxJQUFJLEVBQUUsQ0FBQTtnQkFDUCxDQUFDLEVBQ0QsQ0FBQyxHQUFHLEVBQUUsRUFBRSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FDbEIsQ0FBQTtZQUNGLENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxFQUNELENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQ2xCLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLHVDQUF1QyxFQUFFLENBQUE7QUFDMUMsQ0FBQyxDQUFDLENBQUEifQ==