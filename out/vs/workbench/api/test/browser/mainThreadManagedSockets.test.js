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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZE1hbmFnZWRTb2NrZXRzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvYXBpL3Rlc3QvYnJvd3Nlci9tYWluVGhyZWFkTWFuYWdlZFNvY2tldHMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE9BQU8sRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFDMUQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRXRFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUUvRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUduRixLQUFLLENBQUMsMEJBQTBCLEVBQUUsR0FBRyxFQUFFO0lBQ3RDLE1BQU0sRUFBRSxHQUFHLHVDQUF1QyxFQUFFLENBQUE7SUFFcEQsS0FBSyxDQUFDLGVBQWUsRUFBRSxHQUFHLEVBQUU7UUFDM0IsSUFBSSxPQUFvQixDQUFBO1FBQ3hCLElBQUksSUFBc0IsQ0FBQTtRQUUxQixNQUFNLFdBQVksU0FBUSxJQUFJLEVBQThCO1lBQTVEOztnQkFDUyxjQUFTLEdBQUcsSUFBSSxPQUFPLEVBQVEsQ0FBQTtnQkFDdkIsV0FBTSxHQUFVLEVBQUUsQ0FBQTtZQXlDbkMsQ0FBQztZQXZDUyxrQkFBa0IsQ0FBQyxRQUFnQixFQUFFLE1BQWdCO2dCQUM3RCxJQUFJLENBQUMs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