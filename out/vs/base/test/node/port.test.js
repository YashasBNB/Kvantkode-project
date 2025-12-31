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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicG9ydC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS90ZXN0L25vZGUvcG9ydC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEtBQUssR0FBRyxNQUFNLEtBQUssQ0FBQTtBQUMxQixPQUFPLEtBQUssS0FBSyxNQUFNLHFCQUFxQixDQUFBO0FBQzVDLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzVFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxnQkFBZ0IsQ0FBQTtBQUUzQyxVQUFVLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtJQUN4QixDQUFDO0lBQUEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQztRQUMxQixDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxrREFBa0Q7UUFDOUQsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLGdDQUFnQyxFQUFFLFVBQVUsSUFBSTtRQUN4RCxrQ0FBa0M7UUFDbEMsS0FBSyxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FDekMsQ0FBQyxXQUFXLEVBQUUsRUFBRTtZQUNmLE1BQU0sQ0FBQyxFQUFFLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQyxDQUFBO1lBRTlCLHFDQUFxQztZQUNyQyxNQUFNLE1BQU0sR0FBRyxHQUFHLENBQUMsWUFBWSxFQUFFLENBQUE7WUFDakMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxXQUFXLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxHQUFHLEVBQUU7Z0JBQ3JELG1HQUFtRztnQkFDbkcsS0FBSyxDQUFDLFlBQVksQ0FBQyxJQUFJLEVBQUUsRUFBRSxFQUFFLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FDeEMsQ0FBQyxRQUFRLEVBQUUsRUFBRTtvQkFDWixNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsSUFBSSxJQUFJLElBQUksUUFBUSxLQUFLLFdBQVcsQ0FBQyxDQUFBO29CQUN2RCxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUE7b0JBRWQsSUFBSSxFQUFFLENBQUE7Z0JBQ1AsQ0FBQyxFQUNELENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQ2xCLENBQUE7WUFDRixDQUFDLENBQUMsQ0FBQTtRQUNILENBQUMsRUFDRCxDQUFDLEdBQUcsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUNsQixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRix1Q0FBdUMsRUFBRSxDQUFBO0FBQzFDLENBQUMsQ0FBQyxDQUFBIn0=