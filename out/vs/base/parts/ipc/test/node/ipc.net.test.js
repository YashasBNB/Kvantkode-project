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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjLm5ldC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9wYXJ0cy9pcGMvdGVzdC9ub2RlL2lwYy5uZXQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxLQUFLLE1BQU0sT0FBTyxDQUFBO0FBQ3pCLE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxRQUFRLENBQUE7QUFDckMsT0FBTyxFQUFlLE9BQU8sRUFBRSxZQUFZLEVBQWtCLE1BQU0sS0FBSyxDQUFBO0FBQ3hFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxJQUFJLENBQUE7QUFDM0IsT0FBTyxFQUFFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFDdkQsT0FBTyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUM1RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUMzRixPQUFPLEVBRU4sa0JBQWtCLEVBQ2xCLFFBQVEsR0FJUixNQUFNLHlCQUF5QixDQUFBO0FBQ2hDLE9BQU8sRUFDTixxQkFBcUIsRUFDckIscUJBQXFCLEVBQ3JCLFVBQVUsRUFDVixtQkFBbUIsR0FDbkIsTUFBTSx1QkFBdUIsQ0FBQTtBQUM5QixPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDbkYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFMUYsTUFBTSxhQUFjLFNBQVEsVUFBVTtJ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QyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sU0FBUyxHQUFHLElBQUksYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBQ3RDLE1BQU0sQ0FBQyxHQUFHLElBQUksa0JBQWtCLENBQUMsRUFBRSxNQUFNLEVBQUUsSUFBSSxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQTtRQUNyRSxNQUFNLFNBQVMsR0FBRyxJQUFJLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUV0QyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUNqQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUU1QyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUNqQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUU1QyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUNqQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUU1QyxNQUFNLEVBQUUsR0FBRyxNQUFNLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQTtRQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUU1QyxNQUFNLEVBQUUsR0FBRyxNQUFNLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQTtRQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUU1QyxNQUFNLEVBQUUsR0FBRyxNQUFNLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQTtRQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQTtRQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUU1QyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQTtRQUNqQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUM1QyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUU1QyxNQUFNLEVBQUUsR0FBRyxNQUFNLFNBQVMsQ0FBQyxVQUFVLEVBQUUsQ0FBQTtRQUN2QyxNQUFN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