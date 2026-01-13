/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import sinon from 'sinon';
import { EventEmitter } from 'events';
import { connect, createServer } from 'net';
import { tmpdir } from 'os';
import { Barrier, timeout } from '../../../../common/async.js';
import { VSBuffer } from '../../../../common/buffer.js';
import { Emitter, Event } from '../../../../common/event.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../common/lifecycle.js';
import { PersistentProtocol, Protocol, } from '../../common/ipc.net.js';
import { createRandomIPCHandle, createStaticIPCHandle, NodeSocket, WebSocketNodeSocket, } from '../../node/ipc.net.js';
import { flakySuite } from '../../../../test/common/testUtils.js';
import { runWithFakedTimers } from '../../../../test/common/timeTravelScheduler.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../test/common/utils.js';
class MessageStream extends Disposable {
    constructor(x) {
        super();
        this._currentComplete = null;
        this._messages = [];
        this._register(x.onMessage((data) => {
            this._messages.push(data);
            this._trigger();
        }));
    }
    _trigger() {
        if (!this._currentComplete) {
            return;
        }
        if (this._messages.length === 0) {
            return;
        }
        const complete = this._currentComplete;
        const msg = this._messages.shift();
        this._currentComplete = null;
        complete(msg);
    }
    waitForOne() {
        return new Promise((complete) => {
            this._currentComplete = complete;
            this._trigger();
        });
    }
}
class EtherStream extends EventEmitter {
    constructor(_ether, _name) {
        super();
        this._ether = _ether;
        this._name = _name;
    }
    write(data, cb) {
        if (!Buffer.isBuffer(data)) {
            throw new Error(`Invalid data`);
        }
        this._ether.write(this._name, data);
        return true;
    }
    destroy() { }
}
class Ether {
    get a() {
        return this._a;
    }
    get b() {
        return this._b;
    }
    constructor(_wireLatency = 0) {
        this._wireLatency = _wireLatency;
        this._a = new EtherStream(this, 'a');
        this._b = new EtherStream(this, 'b');
        this._ab = [];
        this._ba = [];
    }
    write(from, data) {
        setTimeout(() => {
            if (from === 'a') {
                this._ab.push(data);
            }
            else {
                this._ba.push(data);
            }
            setTimeout(() => this._deliver(), 0);
        }, this._wireLatency);
    }
    _deliver() {
        if (this._ab.length > 0) {
            const data = Buffer.concat(this._ab);
            this._ab.length = 0;
            this._b.emit('data', data);
            setTimeout(() => this._deliver(), 0);
            return;
        }
        if (this._ba.length > 0) {
            const data = Buffer.concat(this._ba);
            this._ba.length = 0;
            this._a.emit('data', data);
            setTimeout(() => this._deliver(), 0);
            return;
        }
    }
}
suite('IPC, Socket Protocol', () => {
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    let ether;
    setup(() => {
        ether = new Ether();
    });
    test('read/write', async () => {
        const a = new Protocol(new NodeSocket(ether.a));
        const b = new Protocol(new NodeSocket(ether.b));
        const bMessages = new MessageStream(b);
        a.send(VSBuffer.fromString('foobarfarboo'));
        const msg1 = await bMessages.waitForOne();
        assert.strictEqual(msg1.toString(), 'foobarfarboo');
        const buffer = VSBuffer.alloc(1);
        buffer.writeUInt8(123, 0);
        a.send(buffer);
        const msg2 = await bMessages.waitForOne();
        assert.strictEqual(msg2.readUInt8(0), 123);
        bMessages.dispose();
        a.dispose();
        b.dispose();
    });
    test('read/write, object data', async () => {
        const a = new Protocol(new NodeSocket(ether.a));
        const b = new Protocol(new NodeSocket(ether.b));
        const bMessages = new MessageStream(b);
        const data = {
            pi: Math.PI,
            foo: 'bar',
            more: true,
            data: 'Hello World'.split(''),
        };
        a.send(VSBuffer.fromString(JSON.stringify(data)));
        const msg = await bMessages.waitForOne();
        assert.deepStrictEqual(JSON.parse(msg.toString()), data);
        bMessages.dispose();
        a.dispose();
        b.dispose();
    });
    test('issue #211462: destroy socket after end timeout', async () => {
        const socket = new EventEmitter();
        Object.assign(socket, { destroy: () => socket.emit('close') });
        const protocol = ds.add(new Protocol(new NodeSocket(socket)));
        const disposed = sinon.stub();
        const timers = sinon.useFakeTimers();
        ds.add(toDisposable(() => timers.restore()));
        ds.add(protocol.onDidDispose(disposed));
        socket.emit('end');
        assert.ok(!disposed.called);
        timers.tick(29_999);
        assert.ok(!disposed.called);
        timers.tick(1);
        assert.ok(disposed.called);
    });
});
suite('PersistentProtocol reconnection', () => {
    ensureNoDisposablesAreLeakedInTestSuite();
    test('acks get piggybacked with messages', async () => {
        const ether = new Ether();
        const a = new PersistentProtocol({ socket: new NodeSocket(ether.a) });
        const aMessages = new MessageStream(a);
        const b = new PersistentProtocol({ socket: new NodeSocket(ether.b) });
        const bMessages = new MessageStream(b);
        a.send(VSBuffer.fromString('a1'));
        assert.strictEqual(a.unacknowledgedCount, 1);
        assert.strictEqual(b.unacknowledgedCount, 0);
        a.send(VSBuffer.fromString('a2'));
        assert.strictEqual(a.unacknowledgedCount, 2);
        assert.strictEqual(b.unacknowledgedCount, 0);
        a.send(VSBuffer.fromString('a3'));
        assert.strictEqual(a.unacknowledgedCount, 3);
        assert.strictEqual(b.unacknowledgedCount, 0);
        const a1 = await bMessages.waitForOne();
        assert.strictEqual(a1.toString(), 'a1');
        assert.strictEqual(a.unacknowledgedCount, 3);
        assert.strictEqual(b.unacknowledgedCount, 0);
        const a2 = await bMessages.waitForOne();
        assert.strictEqual(a2.toString(), 'a2');
        assert.strictEqual(a.unacknowledgedCount, 3);
        assert.strictEqual(b.unacknowledgedCount, 0);
        const a3 = await bMessages.waitForOne();
        assert.strictEqual(a3.toString(), 'a3');
        assert.strictEqual(a.unacknowledgedCount, 3);
        assert.strictEqual(b.unacknowledgedCount, 0);
        b.send(VSBuffer.fromString('b1'));
        assert.strictEqual(a.unacknowledgedCount, 3);
        assert.strictEqual(b.unacknowledgedCount, 1);
        const b1 = await aMessages.waitForOne();
        assert.strictEqual(b1.toString(), 'b1');
        assert.strictEqual(a.unacknowledgedCount, 0);
        assert.strictEqual(b.unacknowledgedCount, 1);
        a.send(VSBuffer.fromString('a4'));
        assert.strictEqual(a.unacknowledgedCount, 1);
        assert.strictEqual(b.unacknowledgedCount, 1);
        const b2 = await bMessages.waitForOne();
        assert.strictEqual(b2.toString(), 'a4');
        assert.strictEqual(a.unacknowledgedCount, 1);
        assert.strictEqual(b.unacknowledgedCount, 0);
        aMessages.dispose();
        bMessages.dispose();
        a.dispose();
        b.dispose();
    });
    test('ack gets sent after a while', async () => {
        await runWithFakedTimers({ useFakeTimers: true, maxTaskCount: 100 }, async () => {
            const loadEstimator = {
                hasHighLoad: () => false,
            };
            const ether = new Ether();
            const aSocket = new NodeSocket(ether.a);
            const a = new PersistentProtocol({ socket: aSocket, loadEstimator });
            const aMessages = new MessageStream(a);
            const bSocket = new NodeSocket(ether.b);
            const b = new PersistentProtocol({ socket: bSocket, loadEstimator });
            const bMessages = new MessageStream(b);
            // send one message A -> B
            a.send(VSBuffer.fromString('a1'));
            assert.strictEqual(a.unacknowledgedCount, 1);
            assert.strictEqual(b.unacknowledgedCount, 0);
            const a1 = await bMessages.waitForOne();
            assert.strictEqual(a1.toString(), 'a1');
            assert.strictEqual(a.unacknowledgedCount, 1);
            assert.strictEqual(b.unacknowledgedCount, 0);
            // wait for ack to arrive B -> A
            await timeout(2 * 2000 /* ProtocolConstants.AcknowledgeTime */);
            assert.strictEqual(a.unacknowledgedCount, 0);
            assert.strictEqual(b.unacknowledgedCount, 0);
            aMessages.dispose();
            bMessages.dispose();
            a.dispose();
            b.dispose();
        });
    });
    test('messages that are never written to a socket should not cause an ack timeout', async () => {
        await runWithFakedTimers({
            useFakeTimers: true,
            useSetImmediate: true,
            maxTaskCount: 1000,
        }, async () => {
            // Date.now() in fake timers starts at 0, which is very inconvenient
            // since we want to test exactly that a certain field is not initialized with Date.now()
            // As a workaround we wait such that Date.now() starts producing more realistic values
            await timeout(60 * 60 * 1000);
            const loadEstimator = {
                hasHighLoad: () => false,
            };
            const ether = new Ether();
            const aSocket = new NodeSocket(ether.a);
            const a = new PersistentProtocol({ socket: aSocket, loadEstimator, sendKeepAlive: false });
            const aMessages = new MessageStream(a);
            const bSocket = new NodeSocket(ether.b);
            const b = new PersistentProtocol({ socket: bSocket, loadEstimator, sendKeepAlive: false });
            const bMessages = new MessageStream(b);
            // send message a1 before reconnection to get _recvAckCheck() scheduled
            a.send(VSBuffer.fromString('a1'));
            assert.strictEqual(a.unacknowledgedCount, 1);
            assert.strictEqual(b.unacknowledgedCount, 0);
            // read message a1 at B
            const a1 = await bMessages.waitForOne();
            assert.strictEqual(a1.toString(), 'a1');
            assert.strictEqual(a.unacknowledgedCount, 1);
            assert.strictEqual(b.unacknowledgedCount, 0);
            // send message b1 to send the ack for a1
            b.send(VSBuffer.fromString('b1'));
            assert.strictEqual(a.unacknowledgedCount, 1);
            assert.strictEqual(b.unacknowledgedCount, 1);
            // read message b1 at A to receive the ack for a1
            const b1 = await aMessages.waitForOne();
            assert.strictEqual(b1.toString(), 'b1');
            assert.strictEqual(a.unacknowledgedCount, 0);
            assert.strictEqual(b.unacknowledgedCount, 1);
            // begin reconnection
            aSocket.dispose();
            const aSocket2 = new NodeSocket(ether.a);
            a.beginAcceptReconnection(aSocket2, null);
            let timeoutListenerCalled = false;
            const socketTimeoutListener = a.onSocketTimeout(() => {
                timeoutListenerCalled = true;
            });
            // send message 2 during reconnection
            a.send(VSBuffer.fromString('a2'));
            assert.strictEqual(a.unacknowledgedCount, 1);
            assert.strictEqual(b.unacknowledgedCount, 1);
            // wait for scheduled _recvAckCheck() to execute
            await timeout(2 * 20000 /* ProtocolConstants.TimeoutTime */);
            assert.strictEqual(a.unacknowledgedCount, 1);
            assert.strictEqual(b.unacknowledgedCount, 1);
            assert.strictEqual(timeoutListenerCalled, false);
            a.endAcceptReconnection();
            assert.strictEqual(timeoutListenerCalled, false);
            await timeout(2 * 20000 /* ProtocolConstants.TimeoutTime */);
            assert.strictEqual(a.unacknowledgedCount, 0);
            assert.strictEqual(b.unacknowledgedCount, 0);
            assert.strictEqual(timeoutListenerCalled, false);
            socketTimeoutListener.dispose();
            aMessages.dispose();
            bMessages.dispose();
            a.dispose();
            b.dispose();
        });
    });
    test('acks are always sent after a reconnection', async () => {
        await runWithFakedTimers({
            useFakeTimers: true,
            useSetImmediate: true,
            maxTaskCount: 1000,
        }, async () => {
            const loadEstimator = {
                hasHighLoad: () => false,
            };
            const wireLatency = 1000;
            const ether = new Ether(wireLatency);
            const aSocket = new NodeSocket(ether.a);
            const a = new PersistentProtocol({ socket: aSocket, loadEstimator });
            const aMessages = new MessageStream(a);
            const bSocket = new NodeSocket(ether.b);
            const b = new PersistentProtocol({ socket: bSocket, loadEstimator });
            const bMessages = new MessageStream(b);
            // send message a1 to have something unacknowledged
            a.send(VSBuffer.fromString('a1'));
            assert.strictEqual(a.unacknowledgedCount, 1);
            assert.strictEqual(b.unacknowledgedCount, 0);
            // read message a1 at B
            const a1 = await bMessages.waitForOne();
            assert.strictEqual(a1.toString(), 'a1');
            assert.strictEqual(a.unacknowledgedCount, 1);
            assert.strictEqual(b.unacknowledgedCount, 0);
            // wait for B to send an ACK message,
            // but resume before A receives it
            await timeout(2000 /* ProtocolConstants.AcknowledgeTime */ + wireLatency / 2);
            assert.strictEqual(a.unacknowledgedCount, 1);
            assert.strictEqual(b.unacknowledgedCount, 0);
            // simulate complete reconnection
            aSocket.dispose();
            bSocket.dispose();
            const ether2 = new Ether(wireLatency);
            const aSocket2 = new NodeSocket(ether2.a);
            const bSocket2 = new NodeSocket(ether2.b);
            b.beginAcceptReconnection(bSocket2, null);
            b.endAcceptReconnection();
            a.beginAcceptReconnection(aSocket2, null);
            a.endAcceptReconnection();
            // wait for quite some time
            await timeout(2 * 2000 /* ProtocolConstants.AcknowledgeTime */ + wireLatency);
            assert.strictEqual(a.unacknowledgedCount, 0);
            assert.strictEqual(b.unacknowledgedCount, 0);
            aMessages.dispose();
            bMessages.dispose();
            a.dispose();
            b.dispose();
        });
    });
    test('onSocketTimeout is emitted at most once every 20s', async () => {
        await runWithFakedTimers({
            useFakeTimers: true,
            useSetImmediate: true,
            maxTaskCount: 1000,
        }, async () => {
            const loadEstimator = {
                hasHighLoad: () => false,
            };
            const ether = new Ether();
            const aSocket = new NodeSocket(ether.a);
            const a = new PersistentProtocol({ socket: aSocket, loadEstimator });
            const aMessages = new MessageStream(a);
            const bSocket = new NodeSocket(ether.b);
            const b = new PersistentProtocol({ socket: bSocket, loadEstimator });
            const bMessages = new MessageStream(b);
            // never receive acks
            b.pauseSocketWriting();
            // send message a1 to have something unacknowledged
            a.send(VSBuffer.fromString('a1'));
            // wait for the first timeout to fire
            await Event.toPromise(a.onSocketTimeout);
            let timeoutFiredAgain = false;
            const timeoutListener = a.onSocketTimeout(() => {
                timeoutFiredAgain = true;
            });
            // send more messages
            a.send(VSBuffer.fromString('a2'));
            a.send(VSBuffer.fromString('a3'));
            // wait for 10s
            await timeout(20000 /* ProtocolConstants.TimeoutTime */ / 2);
            assert.strictEqual(timeoutFiredAgain, false);
            timeoutListener.dispose();
            aMessages.dispose();
            bMessages.dispose();
            a.dispose();
            b.dispose();
        });
    });
    test('writing can be paused', async () => {
        await runWithFakedTimers({ useFakeTimers: true, maxTaskCount: 100 }, async () => {
            const loadEstimator = {
                hasHighLoad: () => false,
            };
            const ether = new Ether();
            const aSocket = new NodeSocket(ether.a);
            const a = new PersistentProtocol({ socket: aSocket, loadEstimator });
            const aMessages = new MessageStream(a);
            const bSocket = new NodeSocket(ether.b);
            const b = new PersistentProtocol({ socket: bSocket, loadEstimator });
            const bMessages = new MessageStream(b);
            // send one message A -> B
            a.send(VSBuffer.fromString('a1'));
            const a1 = await bMessages.waitForOne();
            assert.strictEqual(a1.toString(), 'a1');
            // ask A to pause writing
            b.sendPause();
            // send a message B -> A
            b.send(VSBuffer.fromString('b1'));
            const b1 = await aMessages.waitForOne();
            assert.strictEqual(b1.toString(), 'b1');
            // send a message A -> B (this should be blocked at A)
            a.send(VSBuffer.fromString('a2'));
            // wait a long time and check that not even acks are written
            await timeout(2 * 2000 /* ProtocolConstants.AcknowledgeTime */);
            assert.strictEqual(a.unacknowledgedCount, 1);
            assert.strictEqual(b.unacknowledgedCount, 1);
            // ask A to resume writing
            b.sendResume();
            // check that B receives message
            const a2 = await bMessages.waitForOne();
            assert.strictEqual(a2.toString(), 'a2');
            // wait a long time and check that acks are written
            await timeout(2 * 2000 /* ProtocolConstants.AcknowledgeTime */);
            assert.strictEqual(a.unacknowledgedCount, 0);
            assert.strictEqual(b.unacknowledgedCount, 0);
            aMessages.dispose();
            bMessages.dispose();
            a.dispose();
            b.dispose();
        });
    });
});
flakySuite('IPC, create handle', () => {
    test('createRandomIPCHandle', async () => {
        return testIPCHandle(createRandomIPCHandle());
    });
    test('createStaticIPCHandle', async () => {
        return testIPCHandle(createStaticIPCHandle(tmpdir(), 'test', '1.64.0'));
    });
    function testIPCHandle(handle) {
        return new Promise((resolve, reject) => {
            const pipeName = createRandomIPCHandle();
            const server = createServer();
            server.on('error', () => {
                return new Promise(() => server.close(() => reject()));
            });
            server.listen(pipeName, () => {
                server.removeListener('error', reject);
                return new Promise(() => {
                    server.close(() => resolve());
                });
            });
        });
    }
});
suite('WebSocketNodeSocket', () => {
    const ds = ensureNoDisposablesAreLeakedInTestSuite();
    function toUint8Array(data) {
        const result = new Uint8Array(data.length);
        for (let i = 0; i < data.length; i++) {
            result[i] = data[i];
        }
        return result;
    }
    function fromUint8Array(data) {
        const result = [];
        for (let i = 0; i < data.length; i++) {
            result[i] = data[i];
        }
        return result;
    }
    function fromCharCodeArray(data) {
        let result = '';
        for (let i = 0; i < data.length; i++) {
            result += String.fromCharCode(data[i]);
        }
        return result;
    }
    class FakeNodeSocket extends Disposable {
        traceSocketEvent(type, data) { }
        constructor() {
            super();
            this._onData = new Emitter();
            this.onData = this._onData.event;
            this._onClose = new Emitter();
            this.onClose = this._onClose.event;
            this.writtenData = [];
        }
        write(data) {
            this.writtenData.push(data);
        }
        fireData(data) {
            this._onData.fire(VSBuffer.wrap(toUint8Array(data)));
        }
    }
    async function testReading(frames, permessageDeflate) {
        const disposables = new DisposableStore();
        const socket = new FakeNodeSocket();
        const webSocket = disposables.add(new WebSocketNodeSocket(socket, permessageDeflate, null, false));
        const barrier = new Barrier();
        let remainingFrameCount = frames.length;
        let receivedData = '';
        disposables.add(webSocket.onData((buff) => {
            receivedData += fromCharCodeArray(fromUint8Array(buff.buffer));
            remainingFrameCount--;
            if (remainingFrameCount === 0) {
                barrier.open();
            }
        }));
        for (let i = 0; i < frames.length; i++) {
            socket.fireData(frames[i]);
        }
        await barrier.wait();
        disposables.dispose();
        return receivedData;
    }
    test('A single-frame unmasked text message', async () => {
        const frames = [
            [0x81, 0x05, 0x48, 0x65, 0x6c, 0x6c, 0x6f], // contains "Hello"
        ];
        const actual = await testReading(frames, false);
        assert.deepStrictEqual(actual, 'Hello');
    });
    test('A single-frame masked text message', async () => {
        const frames = [
            [0x81, 0x85, 0x37, 0xfa, 0x21, 0x3d, 0x7f, 0x9f, 0x4d, 0x51, 0x58], // contains "Hello"
        ];
        const actual = await testReading(frames, false);
        assert.deepStrictEqual(actual, 'Hello');
    });
    test('A fragmented unmasked text message', async () => {
        // contains "Hello"
        const frames = [
            [0x01, 0x03, 0x48, 0x65, 0x6c], // contains "Hel"
            [0x80, 0x02, 0x6c, 0x6f], // contains "lo"
        ];
        const actual = await testReading(frames, false);
        assert.deepStrictEqual(actual, 'Hello');
    });
    suite('compression', () => {
        test('A single-frame compressed text message', async () => {
            // contains "Hello"
            const frames = [
                [0xc1, 0x07, 0xf2, 0x48, 0xcd, 0xc9, 0xc9, 0x07, 0x00], // contains "Hello"
            ];
            const actual = await testReading(frames, true);
            assert.deepStrictEqual(actual, 'Hello');
        });
        test('A fragmented compressed text message', async () => {
            // contains "Hello"
            const frames = [
                // contains "Hello"
                [0x41, 0x03, 0xf2, 0x48, 0xcd],
                [0x80, 0x04, 0xc9, 0xc9, 0x07, 0x00],
            ];
            const actual = await testReading(frames, true);
            assert.deepStrictEqual(actual, 'Hello');
        });
        test('A single-frame non-compressed text message', async () => {
            const frames = [
                [0x81, 0x05, 0x48, 0x65, 0x6c, 0x6c, 0x6f], // contains "Hello"
            ];
            const actual = await testReading(frames, true);
            assert.deepStrictEqual(actual, 'Hello');
        });
        test('A single-frame compressed text message followed by a single-frame non-compressed text message', async () => {
            const frames = [
                [0xc1, 0x07, 0xf2, 0x48, 0xcd, 0xc9, 0xc9, 0x07, 0x00], // contains "Hello"
                [0x81, 0x05, 0x77, 0x6f, 0x72, 0x6c, 0x64], // contains "world"
            ];
            const actual = await testReading(frames, true);
            assert.deepStrictEqual(actual, 'Helloworld');
        });
    });
    test('Large buffers are split and sent in chunks', async () => {
        let receivingSideOnDataCallCount = 0;
        let receivingSideTotalBytes = 0;
        const receivingSideSocketClosedBarrier = new Barrier();
        const server = await listenOnRandomPort((socket) => {
            // stop the server when the first connection is received
            server.close();
            const webSocketNodeSocket = new WebSocketNodeSocket(new NodeSocket(socket), true, null, false);
            ds.add(webSocketNodeSocket.onData((data) => {
                receivingSideOnDataCallCount++;
                receivingSideTotalBytes += data.byteLength;
            }));
            ds.add(webSocketNodeSocket.onClose(() => {
                webSocketNodeSocket.dispose();
                receivingSideSocketClosedBarrier.open();
            }));
        });
        const socket = connect({
            host: '127.0.0.1',
            port: server.address().port,
        });
        const buff = generateRandomBuffer(1 * 1024 * 1024);
        const webSocketNodeSocket = new WebSocketNodeSocket(new NodeSocket(socket), true, null, false);
        webSocketNodeSocket.write(buff);
        await webSocketNodeSocket.drain();
        webSocketNodeSocket.dispose();
        await receivingSideSocketClosedBarrier.wait();
        assert.strictEqual(receivingSideTotalBytes, buff.byteLength);
        assert.strictEqual(receivingSideOnDataCallCount, 4);
    });
    test('issue #194284: ping/pong opcodes are supported', async () => {
        const disposables = new DisposableStore();
        const socket = new FakeNodeSocket();
        const webSocket = disposables.add(new WebSocketNodeSocket(socket, false, null, false));
        let receivedData = '';
        disposables.add(webSocket.onData((buff) => {
            receivedData += fromCharCodeArray(fromUint8Array(buff.buffer));
        }));
        // A single-frame non-compressed text message that contains "Hello"
        socket.fireData([0x81, 0x05, 0x48, 0x65, 0x6c, 0x6c, 0x6f]);
        // A ping message that contains "data"
        socket.fireData([0x89, 0x04, 0x64, 0x61, 0x74, 0x61]);
        // Another single-frame non-compressed text message that contains "Hello"
        socket.fireData([0x81, 0x05, 0x48, 0x65, 0x6c, 0x6c, 0x6f]);
        assert.strictEqual(receivedData, 'HelloHello');
        assert.deepStrictEqual(socket.writtenData.map((x) => fromUint8Array(x.buffer)), [
            // A pong message that contains "data"
            [0x8a, 0x04, 0x64, 0x61, 0x74, 0x61],
        ]);
        disposables.dispose();
        return receivedData;
    });
    function generateRandomBuffer(size) {
        const buff = VSBuffer.alloc(size);
        for (let i = 0; i < size; i++) {
            buff.writeUInt8(Math.floor(256 * Math.random()), i);
        }
        return buff;
    }
    function listenOnRandomPort(handler) {
        return new Promise((resolve, reject) => {
            const server = createServer(handler).listen(0);
            server.on('listening', () => {
                resolve(server);
            });
            server.on('error', (err) => {
                reject(err);
            });
        });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjLm5ldC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3BhcnRzL2lwYy90ZXN0L25vZGUvaXBjLm5ldC50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEtBQUssTUFBTSxPQUFPLENBQUE7QUFDekIsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLFFBQVEsQ0FBQTtBQUNyQyxPQUFPLEVBQWUsT0FBTyxFQUFFLFlBQVksRUFBa0IsTUFBTSxLQUFLLENBQUE7QUFDeEUsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLElBQUksQ0FBQTtBQUMzQixPQUFPLEVBQUUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQzlELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQzVELE9BQU8sRUFBRSxVQUFVLEVBQUUsZUFBZSxFQUFFLFlBQVksRUFBRSxNQUFNLGlDQUFpQyxDQUFBO0FBQzNGLE9BQU8sRUFFTixrQkFBa0IsRUFDbEIsUUFBUSxHQUlSLE1BQU0seUJBQXlCLENBQUE7QUFDaEMsT0FBTyxFQUNOLHFCQUFxQixFQUNyQixxQkFBcUIsRUFDckIsVUFBVSxFQUNWLG1CQUFtQixHQUNuQixNQUFNLHVCQUF1QixDQUFBO0FBQzlCLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxnREFBZ0QsQ0FBQTtBQUNuRixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUUxRixNQUFNLGFBQWMsU0FBUSxVQUFVO0lBSXJDLFlBQVksQ0FBZ0M7UUFDM0MsS0FBSyxFQUFFLENBQUE7UUFDUCxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxDQUFBO1FBQzVCLElBQUksQ0FBQyxTQUFTLEdBQUcsRUFBRSxDQUFBO1FBQ25CLElBQUksQ0FBQyxTQUFTLENBQ2IsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFO1lBQ3BCLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ3pCLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQTtRQUNoQixDQUFDLENBQUMsQ0FDRixDQUFBO0lBQ0YsQ0FBQztJQUVPLFFBQVE7UUFDZixJQUFJLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDNUIsT0FBTTtRQUNQLENBQUM7UUFDRCxJQUFJLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2pDLE9BQU07UUFDUCxDQUFDO1FBQ0QsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLGdCQUFnQixDQUFBO1FBQ3RDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUMsS0FBSyxFQUFHLENBQUE7UUFFbkMsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQTtRQUM1QixRQUFRLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDZCxDQUFDO0lBRU0sVUFBVTtRQUNoQixPQUFPLElBQUksT0FBTyxDQUFXLENBQUMsUUFBUSxFQUFFLEVBQUU7WUFDekMsSUFBSSxDQUFDLGdCQUFnQixHQUFHLFFBQVEsQ0FBQTtZQUNoQyxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUE7UUFDaEIsQ0FBQyxDQUFDLENBQUE7SUFDSCxDQUFDO0NBQ0Q7QUFFRCxNQUFNLFdBQVksU0FBUSxZQUFZO0lBQ3JDLFlBQ2tCLE1BQWEsRUFDYixLQUFnQjtRQUVqQyxLQUFLLEVBQUUsQ0FBQTtRQUhVLFdBQU0sR0FBTixNQUFNLENBQU87UUFDYixVQUFLLEdBQUwsS0FBSyxDQUFXO0lBR2xDLENBQUM7SUFFRCxLQUFLLENBQUMsSUFBWSxFQUFFLEVBQWE7UUFDaEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztZQUM1QixNQUFNLElBQUksS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFBO1FBQ2hDLENBQUM7UUFDRCxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ25DLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELE9BQU8sS0FBVSxDQUFDO0NBQ2xCO0FBRUQsTUFBTSxLQUFLO0lBT1YsSUFBVyxDQUFDO1FBQ1gsT0FBWSxJQUFJLENBQUMsRUFBRSxDQUFBO0lBQ3BCLENBQUM7SUFFRCxJQUFXLENBQUM7UUFDWCxPQUFZLElBQUksQ0FBQyxFQUFFLENBQUE7SUFDcEIsQ0FBQztJQUVELFlBQTZCLGVBQWUsQ0FBQztRQUFoQixpQkFBWSxHQUFaLFlBQVksQ0FBSTtRQUM1QyxJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksV0FBVyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUNwQyxJQUFJLENBQUMsRUFBRSxHQUFHLElBQUksV0FBVyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUNwQyxJQUFJLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQTtRQUNiLElBQUksQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFBO0lBQ2QsQ0FBQztJQUVNLEtBQUssQ0FBQyxJQUFlLEVBQUUsSUFBWTtRQUN6QyxVQUFVLENBQUMsR0FBRyxFQUFFO1lBQ2YsSUFBSSxJQUFJLEtBQUssR0FBRyxFQUFFLENBQUM7Z0JBQ2xCLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ3BCLENBQUM7aUJBQU0sQ0FBQztnQkFDUCxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUNwQixDQUFDO1lBRUQsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNyQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFBO0lBQ3RCLENBQUM7SUFFTyxRQUFRO1FBQ2YsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN6QixNQUFNLElBQUksR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQTtZQUNwQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUE7WUFDbkIsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQzFCLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDcEMsT0FBTTtRQUNQLENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3pCLE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ3BDLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQTtZQUNuQixJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDMUIsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUNwQyxPQUFNO1FBQ1AsQ0FBQztJQUNGLENBQUM7Q0FDRDtBQUVELEtBQUssQ0FBQyxzQkFBc0IsRUFBRSxHQUFHLEVBQUU7SUFDbEMsTUFBTSxFQUFFLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUVwRCxJQUFJLEtBQVksQ0FBQTtJQUVoQixLQUFLLENBQUMsR0FBRyxFQUFFO1FBQ1YsS0FBSyxHQUFHLElBQUksS0FBSyxFQUFFLENBQUE7SUFDcEIsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsWUFBWSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzdCLE1BQU0sQ0FBQyxHQUFHLElBQUksUUFBUSxDQUFDLElBQUksVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQy9DLE1BQU0sQ0FBQyxHQUFHLElBQUksUUFBUSxDQUFDLElBQUksVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQy9DLE1BQU0sU0FBUyxHQUFHLElBQUksYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRXRDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFBO1FBQzNDLE1BQU0sSUFBSSxHQUFHLE1BQU0sU0FBUyxDQUFDLFVBQVUsRUFBRSxDQUFBO1FBQ3pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFFBQVEsRUFBRSxFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBRW5ELE1BQU0sTUFBTSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDaEMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDekIsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUNkLE1BQU0sSUFBSSxHQUFHLE1BQU0sU0FBUyxDQUFDLFVBQVUsRUFBRSxDQUFBO1FBQ3pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUUxQyxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDbkIsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ1gsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ1osQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMseUJBQXlCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDMUMsTUFBTSxDQUFDLEdBQUcsSUFBSSxRQUFRLENBQUMsSUFBSSxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDL0MsTUFBTSxDQUFDLEdBQUcsSUFBSSxRQUFRLENBQUMsSUFBSSxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDL0MsTUFBTSxTQUFTLEdBQUcsSUFBSSxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFdEMsTUFBTSxJQUFJLEdBQUc7WUFDWixFQUFFLEVBQUUsSUFBSSxDQUFDLEVBQUU7WUFDWCxHQUFHLEVBQUUsS0FBSztZQUNWLElBQUksRUFBRSxJQUFJO1lBQ1YsSUFBSSxFQUFFLGFBQWEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1NBQzdCLENBQUE7UUFFRCxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDakQsTUFBTSxHQUFHLEdBQUcsTUFBTSxTQUFTLENBQUMsVUFBVSxFQUFFLENBQUE7UUFDeEMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO1FBRXhELFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNuQixDQUFDLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDWCxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDWixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxpREFBaUQsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNsRSxNQUFNLE1BQU0sR0FBRyxJQUFJLFlBQVksRUFBRSxDQUFBO1FBQ2pDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLEVBQUUsT0FBTyxFQUFFLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQzlELE1BQU0sUUFBUSxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxRQUFRLENBQUMsSUFBSSxVQUFVLENBQUMsTUFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUV2RSxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUE7UUFDN0IsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLGFBQWEsRUFBRSxDQUFBO1FBRXBDLEVBQUUsQ0FBQyxHQUFHLENBQUMsWUFBWSxDQUFDLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxPQUFPLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDNUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUE7UUFFdkMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQTtRQUNsQixNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFBO1FBQzNCLE1BQU0sQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDbkIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUMzQixNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ2QsTUFBTSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUE7SUFDM0IsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQTtBQUVGLEtBQUssQ0FBQyxpQ0FBaUMsRUFBRSxHQUFHLEVBQUU7SUFDN0MsdUNBQXVDLEVBQUUsQ0FBQTtJQUV6QyxJQUFJLENBQUMsb0NBQW9DLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDckQsTUFBTSxLQUFLLEdBQUcsSUFBSSxLQUFLLEVBQUUsQ0FBQTtRQUN6QixNQUFNLENBQUMsR0FBRyxJQUFJLGtCQUFrQixDQUFDLEVBQUUsTUFBTSxFQUFFLElBQUksVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUE7UUFDckUsTUFBTSxTQUFTLEdBQUcsSUFBSSxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDdEMsTUFBTSxDQUFDLEdBQUcsSUFBSSxrQkFBa0IsQ0FBQyxFQUFFLE1BQU0sRUFBRSxJQUFJLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sU0FBUyxHQUFHLElBQUksYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRXRDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQ2pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTVDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQ2pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTVDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQ2pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTVDLE1BQU0sRUFBRSxHQUFHLE1BQU0sU0FBUyxDQUFDLFVBQVUsRUFBRSxDQUFBO1FBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTVDLE1BQU0sRUFBRSxHQUFHLE1BQU0sU0FBUyxDQUFDLFVBQVUsRUFBRSxDQUFBO1FBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTVDLE1BQU0sRUFBRSxHQUFHLE1BQU0sU0FBUyxDQUFDLFVBQVUsRUFBRSxDQUFBO1FBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTVDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQ2pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTVDLE1BQU0sRUFBRSxHQUFHLE1BQU0sU0FBUyxDQUFDLFVBQVUsRUFBRSxDQUFBO1FBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTVDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBQ2pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTVDLE1BQU0sRUFBRSxHQUFHLE1BQU0sU0FBUyxDQUFDLFVBQVUsRUFBRSxDQUFBO1FBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRTVDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNuQixTQUFTLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDbkIsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ1gsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ1osQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNkJBQTZCLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDOUMsTUFBTSxrQkFBa0IsQ0FBQyxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLEdBQUcsRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQy9FLE1BQU0sYUFBYSxHQUFtQjtnQkFDckMsV0FBVyxFQUFFLEdBQUcsRUFBRSxDQUFDLEtBQUs7YUFDeEIsQ0FBQTtZQUNELE1BQU0sS0FBSyxHQUFHLElBQUksS0FBSyxFQUFFLENBQUE7WUFDekIsTUFBTSxPQUFPLEdBQUcsSUFBSSxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3ZDLE1BQU0sQ0FBQyxHQUFHLElBQUksa0JBQWtCLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxDQUFDLENBQUE7WUFDcEUsTUFBTSxTQUFTLEdBQUcsSUFBSSxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDdEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3ZDLE1BQU0sQ0FBQyxHQUFHLElBQUksa0JBQWtCLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxDQUFDLENBQUE7WUFDcEUsTUFBTSxTQUFTLEdBQUcsSUFBSSxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFdEMsMEJBQTBCO1lBQzFCLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1lBQ2pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQzVDLE1BQU0sRUFBRSxHQUFHLE1BQU0sU0FBUyxDQUFDLFVBQVUsRUFBRSxDQUFBO1lBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFBO1lBRTVDLGdDQUFnQztZQUNoQyxNQUFNLE9BQU8sQ0FBQyxDQUFDLCtDQUFvQyxDQUFDLENBQUE7WUFDcEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFNUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQ25CLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUNuQixDQUFDLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDWCxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDWixDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDZFQUE2RSxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzlGLE1BQU0sa0JBQWtCLENBQ3ZCO1lBQ0MsYUFBYSxFQUFFLElBQUk7WUFDbkIsZUFBZSxFQUFFLElBQUk7WUFDckIsWUFBWSxFQUFFLElBQUk7U0FDbEIsRUFDRCxLQUFLLElBQUksRUFBRTtZQUNWLG9FQUFvRTtZQUNwRSx3RkFBd0Y7WUFDeEYsc0ZBQXNGO1lBQ3RGLE1BQU0sT0FBTyxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUE7WUFFN0IsTUFBTSxhQUFhLEdBQW1CO2dCQUNyQyxXQUFXLEVBQUUsR0FBRyxFQUFFLENBQUMsS0FBSzthQUN4QixDQUFBO1lBQ0QsTUFBTSxLQUFLLEdBQUcsSUFBSSxLQUFLLEVBQUUsQ0FBQTtZQUN6QixNQUFNLE9BQU8sR0FBRyxJQUFJLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDdkMsTUFBTSxDQUFDLEdBQUcsSUFBSSxrQkFBa0IsQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLEVBQUUsYUFBYSxFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1lBQzFGLE1BQU0sU0FBUyxHQUFHLElBQUksYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3RDLE1BQU0sT0FBTyxHQUFHLElBQUksVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN2QyxNQUFNLENBQUMsR0FBRyxJQUFJLGtCQUFrQixDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxhQUFhLEVBQUUsYUFBYSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUE7WUFDMUYsTUFBTSxTQUFTLEdBQUcsSUFBSSxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFdEMsdUVBQXVFO1lBQ3ZFLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1lBQ2pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFBO1lBRTVDLHVCQUF1QjtZQUN2QixNQUFNLEVBQUUsR0FBRyxNQUFNLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQTtZQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUU1Qyx5Q0FBeUM7WUFDekMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7WUFDakMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFNUMsaURBQWlEO1lBQ2pELE1BQU0sRUFBRSxHQUFHLE1BQU0sU0FBUyxDQUFDLFVBQVUsRUFBRSxDQUFBO1lBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFBO1lBRTVDLHFCQUFxQjtZQUNyQixPQUFPLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDakIsTUFBTSxRQUFRLEdBQUcsSUFBSSxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3hDLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFFekMsSUFBSSxxQkFBcUIsR0FBRyxLQUFLLENBQUE7WUFDakMsTUFBTSxxQkFBcUIsR0FBRyxDQUFDLENBQUMsZUFBZSxDQUFDLEdBQUcsRUFBRTtnQkFDcEQscUJBQXFCLEdBQUcsSUFBSSxDQUFBO1lBQzdCLENBQUMsQ0FBQyxDQUFBO1lBRUYscUNBQXFDO1lBQ3JDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1lBQ2pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFBO1lBRTVDLGdEQUFnRDtZQUNoRCxNQUFNLE9BQU8sQ0FBQyxDQUFDLDRDQUFnQyxDQUFDLENBQUE7WUFFaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxxQkFBcUIsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUVoRCxDQUFDLENBQUMscUJBQXFCLEVBQUUsQ0FBQTtZQUN6QixNQUFNLENBQUMsV0FBVyxDQUFDLHFCQUFxQixFQUFFLEtBQUssQ0FBQyxDQUFBO1lBRWhELE1BQU0sT0FBTyxDQUFDLENBQUMsNENBQWdDLENBQUMsQ0FBQTtZQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLHFCQUFxQixFQUFFLEtBQUssQ0FBQyxDQUFBO1lBRWhELHFCQUFxQixDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQy9CLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUNuQixTQUFTLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDbkIsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQ1gsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBQ1osQ0FBQyxDQUNELENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQywyQ0FBMkMsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM1RCxNQUFNLGtCQUFrQixDQUN2QjtZQUNDLGFBQWEsRUFBRSxJQUFJO1lBQ25CLGVBQWUsRUFBRSxJQUFJO1lBQ3JCLFlBQVksRUFBRSxJQUFJO1NBQ2xCLEVBQ0QsS0FBSyxJQUFJLEVBQUU7WUFDVixNQUFNLGFBQWEsR0FBbUI7Z0JBQ3JDLFdBQVcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxLQUFLO2FBQ3hCLENBQUE7WUFDRCxNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUE7WUFDeEIsTUFBTSxLQUFLLEdBQUcsSUFBSSxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUE7WUFDcEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3ZDLE1BQU0sQ0FBQyxHQUFHLElBQUksa0JBQWtCLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxDQUFDLENBQUE7WUFDcEUsTUFBTSxTQUFTLEdBQUcsSUFBSSxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDdEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3ZDLE1BQU0sQ0FBQyxHQUFHLElBQUksa0JBQWtCLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxDQUFDLENBQUE7WUFDcEUsTUFBTSxTQUFTLEdBQUcsSUFBSSxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFdEMsbURBQW1EO1lBQ25ELENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1lBQ2pDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFBO1lBRTVDLHVCQUF1QjtZQUN2QixNQUFNLEVBQUUsR0FBRyxNQUFNLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQTtZQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUU1QyxxQ0FBcUM7WUFDckMsa0NBQWtDO1lBQ2xDLE1BQU0sT0FBTyxDQUFDLCtDQUFvQyxXQUFXLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFNUMsaUNBQWlDO1lBQ2pDLE9BQU8sQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUNqQixPQUFPLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDakIsTUFBTSxNQUFNLEdBQUcsSUFBSSxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUE7WUFDckMsTUFBTSxRQUFRLEdBQUcsSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3pDLE1BQU0sUUFBUSxHQUFHLElBQUksVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN6QyxDQUFDLENBQUMsdUJBQXVCLENBQUMsUUFBUSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ3pDLENBQUMsQ0FBQyxxQkFBcUIsRUFBRSxDQUFBO1lBQ3pCLENBQUMsQ0FBQyx1QkFBdUIsQ0FBQyxRQUFRLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDekMsQ0FBQyxDQUFDLHFCQUFxQixFQUFFLENBQUE7WUFFekIsMkJBQTJCO1lBQzNCLE1BQU0sT0FBTyxDQUFDLENBQUMsK0NBQW9DLEdBQUcsV0FBVyxDQUFDLENBQUE7WUFDbEUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFDNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsbUJBQW1CLEVBQUUsQ0FBQyxDQUFDLENBQUE7WUFFNUMsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQ25CLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUNuQixDQUFDLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDWCxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDWixDQUFDLENBQ0QsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLG1EQUFtRCxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3BFLE1BQU0sa0JBQWtCLENBQ3ZCO1lBQ0MsYUFBYSxFQUFFLElBQUk7WUFDbkIsZUFBZSxFQUFFLElBQUk7WUFDckIsWUFBWSxFQUFFLElBQUk7U0FDbEIsRUFDRCxLQUFLLElBQUksRUFBRTtZQUNWLE1BQU0sYUFBYSxHQUFtQjtnQkFDckMsV0FBVyxFQUFFLEdBQUcsRUFBRSxDQUFDLEtBQUs7YUFDeEIsQ0FBQTtZQUNELE1BQU0sS0FBSyxHQUFHLElBQUksS0FBSyxFQUFFLENBQUE7WUFDekIsTUFBTSxPQUFPLEdBQUcsSUFBSSxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3ZDLE1BQU0sQ0FBQyxHQUFHLElBQUksa0JBQWtCLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxDQUFDLENBQUE7WUFDcEUsTUFBTSxTQUFTLEdBQUcsSUFBSSxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFDdEMsTUFBTSxPQUFPLEdBQUcsSUFBSSxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3ZDLE1BQU0sQ0FBQyxHQUFHLElBQUksa0JBQWtCLENBQUMsRUFBRSxNQUFNLEVBQUUsT0FBTyxFQUFFLGFBQWEsRUFBRSxDQUFDLENBQUE7WUFDcEUsTUFBTSxTQUFTLEdBQUcsSUFBSSxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUE7WUFFdEMscUJBQXFCO1lBQ3JCLENBQUMsQ0FBQyxrQkFBa0IsRUFBRSxDQUFBO1lBRXRCLG1EQUFtRDtZQUNuRCxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtZQUVqQyxxQ0FBcUM7WUFDckMsTUFBTSxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQTtZQUV4QyxJQUFJLGlCQUFpQixHQUFHLEtBQUssQ0FBQTtZQUM3QixNQUFNLGVBQWUsR0FBRyxDQUFDLENBQUMsZUFBZSxDQUFDLEdBQUcsRUFBRTtnQkFDOUMsaUJBQWlCLEdBQUcsSUFBSSxDQUFBO1lBQ3pCLENBQUMsQ0FBQyxDQUFBO1lBRUYscUJBQXFCO1lBQ3JCLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1lBQ2pDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1lBRWpDLGVBQWU7WUFDZixNQUFNLE9BQU8sQ0FBQyw0Q0FBZ0MsQ0FBQyxDQUFDLENBQUE7WUFFaEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsRUFBRSxLQUFLLENBQUMsQ0FBQTtZQUU1QyxlQUFlLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDekIsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQ25CLFNBQVMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUNuQixDQUFDLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDWCxDQUFDLENBQUMsT0FBTyxFQUFFLENBQUE7UUFDWixDQUFDLENBQ0QsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHVCQUF1QixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3hDLE1BQU0sa0JBQWtCLENBQUMsRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLFlBQVksRUFBRSxHQUFHLEVBQUUsRUFBRSxLQUFLLElBQUksRUFBRTtZQUMvRSxNQUFNLGFBQWEsR0FBbUI7Z0JBQ3JDLFdBQVcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxLQUFLO2FBQ3hCLENBQUE7WUFDRCxNQUFNLEtBQUssR0FBRyxJQUFJLEtBQUssRUFBRSxDQUFBO1lBQ3pCLE1BQU0sT0FBTyxHQUFHLElBQUksVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN2QyxNQUFNLENBQUMsR0FBRyxJQUFJLGtCQUFrQixDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxhQUFhLEVBQUUsQ0FBQyxDQUFBO1lBQ3BFLE1BQU0sU0FBUyxHQUFHLElBQUksYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQ3RDLE1BQU0sT0FBTyxHQUFHLElBQUksVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUN2QyxNQUFNLENBQUMsR0FBRyxJQUFJLGtCQUFrQixDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sRUFBRSxhQUFhLEVBQUUsQ0FBQyxDQUFBO1lBQ3BFLE1BQU0sU0FBUyxHQUFHLElBQUksYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBRXRDLDBCQUEwQjtZQUMxQixDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtZQUNqQyxNQUFNLEVBQUUsR0FBRyxNQUFNLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQTtZQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUV2Qyx5QkFBeUI7WUFDekIsQ0FBQyxDQUFDLFNBQVMsRUFBRSxDQUFBO1lBRWIsd0JBQXdCO1lBQ3hCLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1lBQ2pDLE1BQU0sRUFBRSxHQUFHLE1BQU0sU0FBUyxDQUFDLFVBQVUsRUFBRSxDQUFBO1lBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBRXZDLHNEQUFzRDtZQUN0RCxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtZQUVqQyw0REFBNEQ7WUFDNUQsTUFBTSxPQUFPLENBQUMsQ0FBQywrQ0FBb0MsQ0FBQyxDQUFBO1lBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFBO1lBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixFQUFFLENBQUMsQ0FBQyxDQUFBO1lBRTVDLDBCQUEwQjtZQUMxQixDQUFDLENBQUMsVUFBVSxFQUFFLENBQUE7WUFFZCxnQ0FBZ0M7WUFDaEMsTUFBTSxFQUFFLEdBQUcsTUFBTSxTQUFTLENBQUMsVUFBVSxFQUFFLENBQUE7WUFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsUUFBUSxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFFdkMsbURBQW1EO1lBQ25ELE1BQU0sT0FBTyxDQUFDLENBQUMsK0NBQW9DLENBQUMsQ0FBQTtZQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUU1QyxTQUFTLENBQUMsT0FBTyxFQUFFLENBQUE7WUFDbkIsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFBO1lBQ25CLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtZQUNYLENBQUMsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUNaLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQTtBQUVGLFVBQVUsQ0FBQyxvQkFBb0IsRUFBRSxHQUFHLEVBQUU7SUFDckMsSUFBSSxDQUFDLHVCQUF1QixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3hDLE9BQU8sYUFBYSxDQUFDLHFCQUFxQixFQUFFLENBQUMsQ0FBQTtJQUM5QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx1QkFBdUIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN4QyxPQUFPLGFBQWEsQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLEVBQUUsRUFBRSxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUMsQ0FBQTtJQUN4RSxDQUFDLENBQUMsQ0FBQTtJQUVGLFNBQVMsYUFBYSxDQUFDLE1BQWM7UUFDcEMsT0FBTyxJQUFJLE9BQU8sQ0FBTyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUM1QyxNQUFNLFFBQVEsR0FBRyxxQkFBcUIsRUFBRSxDQUFBO1lBRXhDLE1BQU0sTUFBTSxHQUFHLFlBQVksRUFBRSxDQUFBO1lBRTdCLE1BQU0sQ0FBQyxFQUFFLENBQUMsT0FBTyxFQUFFLEdBQUcsRUFBRTtnQkFDdkIsT0FBTyxJQUFJLE9BQU8sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtZQUN2RCxDQUFDLENBQUMsQ0FBQTtZQUVGLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxFQUFFLEdBQUcsRUFBRTtnQkFDNUIsTUFBTSxDQUFDLGNBQWMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUE7Z0JBRXRDLE9BQU8sSUFBSSxPQUFPLENBQUMsR0FBRyxFQUFFO29CQUN2QixNQUFNLENBQUMsS0FBSyxDQUFDLEdBQUcsRUFBRSxDQUFDLE9BQU8sRUFBRSxDQUFDLENBQUE7Z0JBQzlCLENBQUMsQ0FBQyxDQUFBO1lBQ0gsQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7QUFDRixDQUFDLENBQUMsQ0FBQTtBQUVGLEtBQUssQ0FBQyxxQkFBcUIsRUFBRSxHQUFHLEVBQUU7SUFDakMsTUFBTSxFQUFFLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUVwRCxTQUFTLFlBQVksQ0FBQyxJQUFjO1FBQ25DLE1BQU0sTUFBTSxHQUFHLElBQUksVUFBVSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUMxQyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDcEIsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVELFNBQVMsY0FBYyxDQUFDLElBQWdCO1FBQ3ZDLE1BQU0sTUFBTSxHQUFHLEVBQUUsQ0FBQTtRQUNqQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDcEIsQ0FBQztRQUNELE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVELFNBQVMsaUJBQWlCLENBQUMsSUFBYztRQUN4QyxJQUFJLE1BQU0sR0FBRyxFQUFFLENBQUE7UUFDZixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3RDLE1BQU0sSUFBSSxNQUFNLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3ZDLENBQUM7UUFDRCxPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFRCxNQUFNLGNBQWUsU0FBUSxVQUFVO1FBUy9CLGdCQUFnQixDQUN0QixJQUFnQyxFQUNoQyxJQUFrRSxJQUMxRCxDQUFDO1FBRVY7WUFDQyxLQUFLLEVBQUUsQ0FBQTtZQWRTLFlBQU8sR0FBRyxJQUFJLE9BQU8sRUFBWSxDQUFBO1lBQ2xDLFdBQU0sR0FBRyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQTtZQUUxQixhQUFRLEdBQUcsSUFBSSxPQUFPLEVBQW9CLENBQUE7WUFDM0MsWUFBTyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFBO1lBRXRDLGdCQUFXLEdBQWUsRUFBRSxDQUFBO1FBU25DLENBQUM7UUFFTSxLQUFLLENBQUMsSUFBYztZQUMxQixJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUM1QixDQUFDO1FBRU0sUUFBUSxDQUFDLElBQWM7WUFDN0IsSUFBSSxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3JELENBQUM7S0FDRDtJQUVELEtBQUssVUFBVSxXQUFXLENBQUMsTUFBa0IsRUFBRSxpQkFBMEI7UUFDeEUsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUN6QyxNQUFNLE1BQU0sR0FBRyxJQUFJLGNBQWMsRUFBRSxDQUFBO1FBQ25DLE1BQU0sU0FBUyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQ2hDLElBQUksbUJBQW1CLENBQU0sTUFBTSxFQUFFLGlCQUFpQixFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FDcEUsQ0FBQTtRQUVELE1BQU0sT0FBTyxHQUFHLElBQUksT0FBTyxFQUFFLENBQUE7UUFDN0IsSUFBSSxtQkFBbUIsR0FBRyxNQUFNLENBQUMsTUFBTSxDQUFBO1FBRXZDLElBQUksWUFBWSxHQUFXLEVBQUUsQ0FBQTtRQUM3QixXQUFXLENBQUMsR0FBRyxDQUNkLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUN6QixZQUFZLElBQUksaUJBQWlCLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1lBQzlELG1CQUFtQixFQUFFLENBQUE7WUFDckIsSUFBSSxtQkFBbUIsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDL0IsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFBO1lBQ2YsQ0FBQztRQUNGLENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQ3hDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDM0IsQ0FBQztRQUVELE1BQU0sT0FBTyxDQUFDLElBQUksRUFBRSxDQUFBO1FBRXBCLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUVyQixPQUFPLFlBQVksQ0FBQTtJQUNwQixDQUFDO0lBRUQsSUFBSSxDQUFDLHNDQUFzQyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3ZELE1BQU0sTUFBTSxHQUFHO1lBQ2QsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxtQkFBbUI7U0FDL0QsQ0FBQTtRQUNELE1BQU0sTUFBTSxHQUFHLE1BQU0sV0FBVyxDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUMvQyxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQTtJQUN4QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxvQ0FBb0MsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNyRCxNQUFNLE1BQU0sR0FBRztZQUNkLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLG1CQUFtQjtTQUN2RixDQUFBO1FBQ0QsTUFBTSxNQUFNLEdBQUcsTUFBTSxXQUFXLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQy9DLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQ3hDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLG9DQUFvQyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3JELG1CQUFtQjtRQUNuQixNQUFNLE1BQU0sR0FBRztZQUNkLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLGlCQUFpQjtZQUNqRCxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLGdCQUFnQjtTQUMxQyxDQUFBO1FBQ0QsTUFBTSxNQUFNLEdBQUcsTUFBTSxXQUFXLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBQy9DLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFBO0lBQ3hDLENBQUMsQ0FBQyxDQUFBO0lBRUYsS0FBSyxDQUFDLGFBQWEsRUFBRSxHQUFHLEVBQUU7UUFDekIsSUFBSSxDQUFDLHdDQUF3QyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3pELG1CQUFtQjtZQUNuQixNQUFNLE1BQU0sR0FBRztnQkFDZCxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsbUJBQW1CO2FBQzNFLENBQUE7WUFDRCxNQUFNLE1BQU0sR0FBRyxNQUFNLFdBQVcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDOUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDeEMsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsc0NBQXNDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDdkQsbUJBQW1CO1lBQ25CLE1BQU0sTUFBTSxHQUFHO2dCQUNkLG1CQUFtQjtnQkFDbkIsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO2dCQUM5QixDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDO2FBQ3BDLENBQUE7WUFDRCxNQUFNLE1BQU0sR0FBRyxNQUFNLFdBQVcsQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUE7WUFDOUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUE7UUFDeEMsQ0FBQyxDQUFDLENBQUE7UUFFRixJQUFJLENBQUMsNENBQTRDLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDN0QsTUFBTSxNQUFNLEdBQUc7Z0JBQ2QsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxtQkFBbUI7YUFDL0QsQ0FBQTtZQUNELE1BQU0sTUFBTSxHQUFHLE1BQU0sV0FBVyxDQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsQ0FBQTtZQUM5QyxNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQTtRQUN4QyxDQUFDLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQywrRkFBK0YsRUFBRSxLQUFLLElBQUksRUFBRTtZQUNoSCxNQUFNLE1BQU0sR0FBRztnQkFDZCxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsbUJBQW1CO2dCQUMzRSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLG1CQUFtQjthQUMvRCxDQUFBO1lBQ0QsTUFBTSxNQUFNLEdBQUcsTUFBTSxXQUFXLENBQUMsTUFBTSxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQzlDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFLFlBQVksQ0FBQyxDQUFBO1FBQzdDLENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNENBQTRDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDN0QsSUFBSSw0QkFBNEIsR0FBRyxDQUFDLENBQUE7UUFDcEMsSUFBSSx1QkFBdUIsR0FBRyxDQUFDLENBQUE7UUFDL0IsTUFBTSxnQ0FBZ0MsR0FBRyxJQUFJLE9BQU8sRUFBRSxDQUFBO1FBRXRELE1BQU0sTUFBTSxHQUFHLE1BQU0sa0JBQWtCLENBQUMsQ0FBQyxNQUFNLEVBQUUsRUFBRTtZQUNsRCx3REFBd0Q7WUFDeEQsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFBO1lBRWQsTUFBTSxtQkFBbUIsR0FBRyxJQUFJLG1CQUFtQixDQUFDLElBQUksVUFBVSxDQUFDLE1BQU0sQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUE7WUFDOUYsRUFBRSxDQUFDLEdBQUcsQ0FDTCxtQkFBbUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtnQkFDbkMsNEJBQTRCLEVBQUUsQ0FBQTtnQkFDOUIsdUJBQXVCLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQTtZQUMzQyxDQUFDLENBQUMsQ0FDRixDQUFBO1lBRUQsRUFBRSxDQUFDLEdBQUcsQ0FDTCxtQkFBbUIsQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFO2dCQUNoQyxtQkFBbUIsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtnQkFDN0IsZ0NBQWdDLENBQUMsSUFBSSxFQUFFLENBQUE7WUFDeEMsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtRQUNGLENBQUMsQ0FBQyxDQUFBO1FBRUYsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDO1lBQ3RCLElBQUksRUFBRSxXQUFXO1lBQ2pCLElBQUksRUFBZ0IsTUFBTSxDQUFDLE9BQU8sRUFBRyxDQUFDLElBQUk7U0FDMUMsQ0FBQyxDQUFBO1FBRUYsTUFBTSxJQUFJLEdBQUcsb0JBQW9CLENBQUMsQ0FBQyxHQUFHLElBQUksR0FBRyxJQUFJLENBQUMsQ0FBQTtRQUVsRCxNQUFNLG1CQUFtQixHQUFHLElBQUksbUJBQW1CLENBQUMsSUFBSSxVQUFVLENBQUMsTUFBTSxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUM5RixtQkFBbUIsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDL0IsTUFBTSxtQkFBbUIsQ0FBQyxLQUFLLEVBQUUsQ0FBQTtRQUNqQyxtQkFBbUIsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtRQUM3QixNQUFNLGdDQUFnQyxDQUFDLElBQUksRUFBRSxDQUFBO1FBRTdDLE1BQU0sQ0FBQyxXQUFXLENBQUMsdUJBQXVCLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBQzVELE1BQU0sQ0FBQyxXQUFXLENBQUMsNEJBQTRCLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDcEQsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsZ0RBQWdELEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDakUsTUFBTSxXQUFXLEdBQUcsSUFBSSxlQUFlLEVBQUUsQ0FBQTtRQUN6QyxNQUFNLE1BQU0sR0FBRyxJQUFJLGNBQWMsRUFBRSxDQUFBO1FBQ25DLE1BQU0sU0FBUyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsSUFBSSxtQkFBbUIsQ0FBTSxNQUFNLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFBO1FBRTNGLElBQUksWUFBWSxHQUFXLEVBQUUsQ0FBQTtRQUM3QixXQUFXLENBQUMsR0FBRyxDQUNkLFNBQVMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLEVBQUUsRUFBRTtZQUN6QixZQUFZLElBQUksaUJBQWlCLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBQy9ELENBQUMsQ0FBQyxDQUNGLENBQUE7UUFFRCxtRUFBbUU7UUFDbkUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUE7UUFFM0Qsc0NBQXNDO1FBQ3RDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUE7UUFFckQseUVBQXlFO1FBQ3pFLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBRTNELE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxFQUFFLFlBQVksQ0FBQyxDQUFBO1FBQzlDLE1BQU0sQ0FBQyxlQUFlLENBQ3JCLE1BQU0sQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQ3ZEO1lBQ0Msc0NBQXNDO1lBQ3RDLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7U0FDcEMsQ0FDRCxDQUFBO1FBRUQsV0FBVyxDQUFDLE9BQU8sRUFBRSxDQUFBO1FBRXJCLE9BQU8sWUFBWSxDQUFBO0lBQ3BCLENBQUMsQ0FBQyxDQUFBO0lBRUYsU0FBUyxvQkFBb0IsQ0FBQyxJQUFZO1FBQ3pDLE1BQU0sSUFBSSxHQUFHLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDakMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1lBQy9CLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDcEQsQ0FBQztRQUNELE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztJQUVELFNBQVMsa0JBQWtCLENBQUMsT0FBaUM7UUFDNUQsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLE9BQU8sRUFBRSxNQUFNLEVBQUUsRUFBRTtZQUN0QyxNQUFNLE1BQU0sR0FBRyxZQUFZLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFBO1lBQzlDLE1BQU0sQ0FBQyxFQUFFLENBQUMsV0FBVyxFQUFFLEdBQUcsRUFBRTtnQkFDM0IsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFBO1lBQ2hCLENBQUMsQ0FBQyxDQUFBO1lBQ0YsTUFBTSxDQUFDLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQyxHQUFHLEVBQUUsRUFBRTtnQkFDMUIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1lBQ1osQ0FBQyxDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUM7QUFDRixDQUFDLENBQUMsQ0FBQSJ9