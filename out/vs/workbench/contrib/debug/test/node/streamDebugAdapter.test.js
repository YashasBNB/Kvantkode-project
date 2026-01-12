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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RyZWFtRGVidWdBZGFwdGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL3Rlc3Qvbm9kZS9zdHJlYW1EZWJ1Z0FkYXB0ZXIudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxLQUFLLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDaEMsT0FBTyxLQUFLLEdBQUcsTUFBTSxLQUFLLENBQUE7QUFDMUIsT0FBTyxLQUFLLFFBQVEsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sSUFBSSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUN6RCxPQUFPLEtBQUssS0FBSyxNQUFNLG1DQUFtQyxDQUFBO0FBQzFELE9BQU8sRUFDTixrQkFBa0IsRUFDbEIscUJBQXFCLEdBRXJCLE1BQU0sNEJBQTRCLENBQUE7QUFDbkMsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEcsU0FBUyxxQkFBcUIsQ0FBQyxZQUFnQztJQUM5RCxPQUFPLElBQUksT0FBTyxDQUFDLENBQUMsT0FBTyxFQUFFLE1BQU0sRUFBRSxFQUFFO1FBQ3RDLFlBQVksQ0FBQyxXQUFXLENBQ3ZCLFlBQVksRUFDWixFQUFFLFNBQVMsRUFBRSxNQUFNLEVBQUUsRUFDckIsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUNWLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNoQixDQUFDLEVBQ0QsSUFBSSxDQUNKLENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtBQUNILENBQUM7QUFFRCxTQUFTLGdCQUFnQixDQUFDLE1BQWtCO0lBQzNDLE1BQU0s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