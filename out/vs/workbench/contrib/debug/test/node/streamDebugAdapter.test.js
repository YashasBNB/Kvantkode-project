/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import * as crypto from 'crypto';
import * as net from 'net';
import * as platform from '../../../../../base/common/platform.js';
import { tmpdir } from 'os';
import { join } from '../../../../../base/common/path.js';
import * as ports from '../../../../../base/node/ports.js';
import { SocketDebugAdapter, NamedPipeDebugAdapter, } from '../../node/debugAdapter.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
function sendInitializeRequest(debugAdapter) {
    return new Promise((resolve, reject) => {
        debugAdapter.sendRequest('initialize', { adapterID: 'test' }, (result) => {
            resolve(result);
        }, 3000);
    });
}
function serverConnection(socket) {
    socket.on('data', (data) => {
        const str = data.toString().split('\r\n')[2];
        const request = JSON.parse(str);
        const response = {
            seq: request.seq,
            request_seq: request.seq,
            type: 'response',
            command: request.command,
        };
        if (request.arguments.adapterID === 'test') {
            response.success = true;
        }
        else {
            response.success = false;
            response.message = 'failed';
        }
        const responsePayload = JSON.stringify(response);
        socket.write(`Content-Length: ${responsePayload.length}\r\n\r\n${responsePayload}`);
    });
}
suite('Debug - StreamDebugAdapter', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test(`StreamDebugAdapter (NamedPipeDebugAdapter) can initialize a connection`, async () => {
        const pipeName = crypto.randomBytes(10).toString('hex');
        const pipePath = platform.isWindows ? join('\\\\.\\pipe\\', pipeName) : join(tmpdir(), pipeName);
        const server = await new Promise((resolve, reject) => {
            const server = net.createServer(serverConnection);
            server.once('listening', () => resolve(server));
            server.once('error', reject);
            server.listen(pipePath);
        });
        const debugAdapter = new NamedPipeDebugAdapter({
            type: 'pipeServer',
            path: pipePath,
        });
        try {
            await debugAdapter.startSession();
            const response = await sendInitializeRequest(debugAdapter);
            assert.strictEqual(response.command, 'initialize');
            assert.strictEqual(response.request_seq, 1);
            assert.strictEqual(response.success, true, response.message);
        }
        finally {
            await debugAdapter.stopSession();
            server.close();
            debugAdapter.dispose();
        }
    });
    test(`StreamDebugAdapter (SocketDebugAdapter) can initialize a connection`, async () => {
        const rndPort = Math.floor(Math.random() * 1000 + 8000);
        const port = await ports.findFreePort(rndPort, 10 /* try 10 ports */, 3000 /* try up to 3 seconds */, 87 /* skip 87 ports between attempts */);
        const server = net.createServer(serverConnection).listen(port);
        const debugAdapter = new SocketDebugAdapter({
            type: 'server',
            port,
        });
        try {
            await debugAdapter.startSession();
            const response = await sendInitializeRequest(debugAdapter);
            assert.strictEqual(response.command, 'initialize');
            assert.strictEqual(response.request_seq, 1);
            assert.strictEqual(response.success, true, response.message);
        }
        finally {
            await debugAdapter.stopSession();
            server.close();
            debugAdapter.dispose();
        }
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RyZWFtRGVidWdBZGFwdGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9kZWJ1Zy90ZXN0L25vZGUvc3RyZWFtRGVidWdBZGFwdGVyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sS0FBSyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQ2hDLE9BQU8sS0FBSyxHQUFHLE1BQU0sS0FBSyxDQUFBO0FBQzFCLE9BQU8sS0FBSyxRQUFRLE1BQU0sd0NBQXdDLENBQUE7QUFDbEUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLElBQUksQ0FBQTtBQUMzQixPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDekQsT0FBTyxLQUFLLEtBQUssTUFBTSxtQ0FBbUMsQ0FBQTtBQUMxRCxPQUFPLEVBQ04sa0JBQWtCLEVBQ2xCLHFCQUFxQixHQUVyQixNQUFNLDRCQUE0QixDQUFBO0FBQ25DLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBRWxHLFNBQVMscUJBQXFCLENBQUMsWUFBZ0M7SUFDOUQsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtRQUN0QyxZQUFZLENBQUMsV0FBVyxDQUN2QixZQUFZLEVBQ1osRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLEVBQ3JCLENBQUMsTUFBTSxFQUFFLEVBQUU7WUFDVixPQUFPLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDaEIsQ0FBQyxFQUNELElBQUksQ0FDSixDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDO0FBRUQsU0FBUyxnQkFBZ0IsQ0FBQyxNQUFrQjtJQUMzQyxNQUFNLENBQUMs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