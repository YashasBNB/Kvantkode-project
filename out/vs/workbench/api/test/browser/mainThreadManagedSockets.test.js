/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { disposableTimeout, timeout } from '../../../../base/common/async.js';
import { VSBuffer } from '../../../../base/common/buffer.js';
import { Emitter } from '../../../../base/common/event.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { mock } from '../../../../base/test/common/mock.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { MainThreadManagedSocket } from '../../browser/mainThreadManagedSockets.js';
suite('MainThreadManagedSockets', () => {
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    suite('ManagedSocket', () => {
        let extHost;
        let half;
        class ExtHostMock extends mock() {
            constructor() {
                super(...arguments);
                this.onDidFire = new Emitter();
                this.events = [];
            }
            $remoteSocketWrite(socketId, buffer) {
                this.events.push({ socketId, data: buffer.toString() });
                this.onDidFire.fire();
            }
            $remoteSocketDrain(socketId) {
                this.events.push({ socketId, event: 'drain' });
                this.onDidFire.fire();
                return Promise.resolve();
            }
            $remoteSocketEnd(socketId) {
                this.events.push({ socketId, event: 'end' });
                this.onDidFire.fire();
            }
            expectEvent(test, message) {
                if (this.events.some(test)) {
                    return;
                }
                const d = new DisposableStore();
                return new Promise((resolve) => {
                    d.add(this.onDidFire.event(() => {
                        if (this.events.some(test)) {
                            return;
                        }
                    }));
                    d.add(disposableTimeout(() => {
                        throw new Error(`Expected ${message} but only had ${JSON.stringify(this.events, null, 2)}`);
                    }, 1000));
                }).finally(() => d.dispose());
            }
        }
        setup(() => {
            extHost = new ExtHostMock();
            half = {
                onClose: new Emitter(),
                onData: new Emitter(),
                onEnd: new Emitter(),
            };
        });
        async function doConnect() {
            const socket = MainThreadManagedSocket.connect(1, extHost, '/hello', 'world=true', '', half);
            await extHost.expectEvent((evt) => evt.data &&
                evt.data.startsWith('GET ws://localhost/hello?world=true&skipWebSocketFrames=true HTTP/1.1\r\nConnection: Upgrade\r\nUpgrade: websocket\r\nSec-WebSocket-Key:'), 'websocket open event');
            half.onData.fire(VSBuffer.fromString('Opened successfully ;)\r\n\r\n'));
            return ds.add(await socket);
        }
        test('connects', async () => {
            await doConnect();
        });
        test('includes trailing connection data', async () => {
            const socketProm = MainThreadManagedSocket.connect(1, extHost, '/hello', 'world=true', '', half);
            await extHost.expectEvent((evt) => evt.data && evt.data.includes('GET ws://localhost'), 'websocket open event');
            half.onData.fire(VSBuffer.fromString('Opened successfully ;)\r\n\r\nSome trailing data'));
            const socket = ds.add(await socketProm);
            const data = [];
            ds.add(socket.onData((d) => data.push(d.toString())));
            await timeout(1); // allow microtasks to flush
            assert.deepStrictEqual(data, ['Some trailing data']);
        });
        test('round trips data', async () => {
            const socket = await doConnect();
            const data = [];
            ds.add(socket.onData((d) => data.push(d.toString())));
            socket.write(VSBuffer.fromString('ping'));
            await extHost.expectEvent((evt) => evt.data === 'ping', 'expected ping');
            half.onData.fire(VSBuffer.fromString('pong'));
            assert.deepStrictEqual(data, ['pong']);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZE1hbmFnZWRTb2NrZXRzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9hcGkvdGVzdC9icm93c2VyL21haW5UaHJlYWRNYW5hZ2VkU29ja2V0cy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDN0UsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzVELE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFdEUsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQzNELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBRS9GLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBR25GLEtBQUssQ0FBQywwQkFBMEIsRUFBRSxHQUFHLEVBQUU7SUFDdEMsTUFBTSxFQUFFLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUVwRCxLQUFLLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRTtRQUMzQixJQUFJLE9BQW9CLENBQUE7UUFDeEIsSUFBSSxJQUFzQixDQUFBO1FBRTFCLE1BQU0sV0FBWSxTQUFRLElBQUksRUFBOEI7WUFBNUQ7O2dCQUNTLGNBQVMsR0FBRyxJQUFJLE9BQU8sRUFBUSxDQUFBO2dCQUN2QixXQUFNLEdBQVUsRUFBRSxDQUFBO1lBeUNuQyxDQUFDO1lBdkNTLGtCQUFrQixDQUFDLFFBQWdCLEVBQUUsTUFBZ0I7Z0JBQzdELElBQUks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RUFBRSxDQUFBO1lBQ3pCLEVBQUUsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFckQsTUFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7WUFDekMsTUFBTSxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsR0FBRyxFQUFFLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxLQUFLLE1BQU0sRUFBRSxlQUFlLENBQUMsQ0FBQTtZQUN4RSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUE7WUFDN0MsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBQ3ZDLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9