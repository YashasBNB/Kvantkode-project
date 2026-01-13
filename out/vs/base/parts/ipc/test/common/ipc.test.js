/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { timeout } from '../../../../common/async.js';
import { VSBuffer } from '../../../../common/buffer.js';
import { CancellationToken, CancellationTokenSource } from '../../../../common/cancellation.js';
import { canceled } from '../../../../common/errors.js';
import { Emitter, Event } from '../../../../common/event.js';
import { DisposableStore } from '../../../../common/lifecycle.js';
import { isEqual } from '../../../../common/resources.js';
import { URI } from '../../../../common/uri.js';
import { BufferReader, BufferWriter, deserialize, IPCClient, IPCServer, ProxyChannel, serialize, } from '../../common/ipc.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../test/common/utils.js';
class QueueProtocol {
    constructor() {
        this.buffering = true;
        this.buffers = [];
        this._onMessage = new Emitter({
            onDidAddFirstListener: () => {
                for (const buffer of this.buffers) {
                    this._onMessage.fire(buffer);
                }
                this.buffers = [];
                this.buffering = false;
            },
            onDidRemoveLastListener: () => {
                this.buffering = true;
            },
        });
        this.onMessage = this._onMessage.event;
    }
    send(buffer) {
        this.other.receive(buffer);
    }
    receive(buffer) {
        if (this.buffering) {
            this.buffers.push(buffer);
        }
        else {
            this._onMessage.fire(buffer);
        }
    }
}
function createProtocolPair() {
    const one = new QueueProtocol();
    const other = new QueueProtocol();
    one.other = other;
    other.other = one;
    return [one, other];
}
class TestIPCClient extends IPCClient {
    constructor(protocol, id) {
        super(protocol, id);
        this._onDidDisconnect = new Emitter();
        this.onDidDisconnect = this._onDidDisconnect.event;
    }
    dispose() {
        this._onDidDisconnect.fire();
        super.dispose();
    }
}
class TestIPCServer extends IPCServer {
    constructor() {
        const onDidClientConnect = new Emitter();
        super(onDidClientConnect.event);
        this.onDidClientConnect = onDidClientConnect;
    }
    createConnection(id) {
        const [pc, ps] = createProtocolPair();
        const client = new TestIPCClient(pc, id);
        this.onDidClientConnect.fire({
            protocol: ps,
            onDidClientDisconnect: client.onDidDisconnect,
        });
        return client;
    }
}
const TestChannelId = 'testchannel';
class TestService {
    constructor() {
        this.disposables = new DisposableStore();
        this._onPong = new Emitter();
        this.onPong = this._onPong.event;
    }
    marco() {
        return Promise.resolve('polo');
    }
    error(message) {
        return Promise.reject(new Error(message));
    }
    neverComplete() {
        return new Promise((_) => { });
    }
    neverCompleteCT(cancellationToken) {
        if (cancellationToken.isCancellationRequested) {
            return Promise.reject(canceled());
        }
        return new Promise((_, e) => this.disposables.add(cancellationToken.onCancellationRequested(() => e(canceled()))));
    }
    buffersLength(buffers) {
        return Promise.resolve(buffers.reduce((r, b) => r + b.buffer.length, 0));
    }
    ping(msg) {
        this._onPong.fire(msg);
    }
    marshall(uri) {
        return Promise.resolve(uri);
    }
    context(context) {
        return Promise.resolve(context);
    }
    dispose() {
        this.disposables.dispose();
    }
}
class TestChannel {
    constructor(service) {
        this.service = service;
    }
    call(_, command, arg, cancellationToken) {
        switch (command) {
            case 'marco':
                return this.service.marco();
            case 'error':
                return this.service.error(arg);
            case 'neverComplete':
                return this.service.neverComplete();
            case 'neverCompleteCT':
                return this.service.neverCompleteCT(cancellationToken);
            case 'buffersLength':
                return this.service.buffersLength(arg);
            default:
                return Promise.reject(new Error('not implemented'));
        }
    }
    listen(_, event, arg) {
        switch (event) {
            case 'onPong':
                return this.service.onPong;
            default:
                throw new Error('not implemented');
        }
    }
}
class TestChannelClient {
    get onPong() {
        return this.channel.listen('onPong');
    }
    constructor(channel) {
        this.channel = channel;
    }
    marco() {
        return this.channel.call('marco');
    }
    error(message) {
        return this.channel.call('error', message);
    }
    neverComplete() {
        return this.channel.call('neverComplete');
    }
    neverCompleteCT(cancellationToken) {
        return this.channel.call('neverCompleteCT', undefined, cancellationToken);
    }
    buffersLength(buffers) {
        return this.channel.call('buffersLength', buffers);
    }
    marshall(uri) {
        return this.channel.call('marshall', uri);
    }
    context() {
        return this.channel.call('context');
    }
}
suite('Base IPC', function () {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    test('createProtocolPair', async function () {
        const [clientProtocol, serverProtocol] = createProtocolPair();
        const b1 = VSBuffer.alloc(0);
        clientProtocol.send(b1);
        const b3 = VSBuffer.alloc(0);
        serverProtocol.send(b3);
        const b2 = await Event.toPromise(serverProtocol.onMessage);
        const b4 = await Event.toPromise(clientProtocol.onMessage);
        assert.strictEqual(b1, b2);
        assert.strictEqual(b3, b4);
    });
    suite('one to one', function () {
        let server;
        let client;
        let service;
        let ipcService;
        setup(function () {
            service = store.add(new TestService());
            const testServer = store.add(new TestIPCServer());
            server = testServer;
            server.registerChannel(TestChannelId, new TestChannel(service));
            client = store.add(testServer.createConnection('client1'));
            ipcService = new TestChannelClient(client.getChannel(TestChannelId));
        });
        test('call success', async function () {
            const r = await ipcService.marco();
            return assert.strictEqual(r, 'polo');
        });
        test('call error', async function () {
            try {
                await ipcService.error('nice error');
                return assert.fail('should not reach here');
            }
            catch (err) {
                return assert.strictEqual(err.message, 'nice error');
            }
        });
        test('cancel call with cancelled cancellation token', async function () {
            try {
                await ipcService.neverCompleteCT(CancellationToken.Cancelled);
                return assert.fail('should not reach here');
            }
            catch (err) {
                return assert(err.message === 'Canceled');
            }
        });
        test('cancel call with cancellation token (sync)', function () {
            const cts = new CancellationTokenSource();
            const promise = ipcService.neverCompleteCT(cts.token).then((_) => assert.fail('should not reach here'), (err) => assert(err.message === 'Canceled'));
            cts.cancel();
            return promise;
        });
        test('cancel call with cancellation token (async)', function () {
            const cts = new CancellationTokenSource();
            const promise = ipcService.neverCompleteCT(cts.token).then((_) => assert.fail('should not reach here'), (err) => assert(err.message === 'Canceled'));
            setTimeout(() => cts.cancel());
            return promise;
        });
        test('listen to events', async function () {
            const messages = [];
            store.add(ipcService.onPong((msg) => messages.push(msg)));
            await timeout(0);
            assert.deepStrictEqual(messages, []);
            service.ping('hello');
            await timeout(0);
            assert.deepStrictEqual(messages, ['hello']);
            service.ping('world');
            await timeout(0);
            assert.deepStrictEqual(messages, ['hello', 'world']);
        });
        test('buffers in arrays', async function () {
            const r = await ipcService.buffersLength([VSBuffer.alloc(2), VSBuffer.alloc(3)]);
            return assert.strictEqual(r, 5);
        });
        test('round trips numbers', () => {
            const input = [0, 1, -1, 12345, -12345, 42.6, 123412341234];
            const writer = new BufferWriter();
            serialize(writer, input);
            assert.deepStrictEqual(deserialize(new BufferReader(writer.buffer)), input);
        });
    });
    suite('one to one (proxy)', function () {
        let server;
        let client;
        let service;
        let ipcService;
        const disposables = new DisposableStore();
        setup(function () {
            service = store.add(new TestService());
            const testServer = disposables.add(new TestIPCServer());
            server = testServer;
            server.registerChannel(TestChannelId, ProxyChannel.fromService(service, disposables));
            client = disposables.add(testServer.createConnection('client1'));
            ipcService = ProxyChannel.toService(client.getChannel(TestChannelId));
        });
        teardown(function () {
            disposables.clear();
        });
        test('call success', async function () {
            const r = await ipcService.marco();
            return assert.strictEqual(r, 'polo');
        });
        test('call error', async function () {
            try {
                await ipcService.error('nice error');
                return assert.fail('should not reach here');
            }
            catch (err) {
                return assert.strictEqual(err.message, 'nice error');
            }
        });
        test('listen to events', async function () {
            const messages = [];
            disposables.add(ipcService.onPong((msg) => messages.push(msg)));
            await timeout(0);
            assert.deepStrictEqual(messages, []);
            service.ping('hello');
            await timeout(0);
            assert.deepStrictEqual(messages, ['hello']);
            service.ping('world');
            await timeout(0);
            assert.deepStrictEqual(messages, ['hello', 'world']);
        });
        test('marshalling uri', async function () {
            const uri = URI.file('foobar');
            const r = await ipcService.marshall(uri);
            assert.ok(r instanceof URI);
            return assert.ok(isEqual(r, uri));
        });
        test('buffers in arrays', async function () {
            const r = await ipcService.buffersLength([VSBuffer.alloc(2), VSBuffer.alloc(3)]);
            return assert.strictEqual(r, 5);
        });
    });
    suite('one to one (proxy, extra context)', function () {
        let server;
        let client;
        let service;
        let ipcService;
        const disposables = new DisposableStore();
        setup(function () {
            service = store.add(new TestService());
            const testServer = disposables.add(new TestIPCServer());
            server = testServer;
            server.registerChannel(TestChannelId, ProxyChannel.fromService(service, disposables));
            client = disposables.add(testServer.createConnection('client1'));
            ipcService = ProxyChannel.toService(client.getChannel(TestChannelId), {
                context: 'Super Context',
            });
        });
        teardown(function () {
            disposables.clear();
        });
        test('call extra context', async function () {
            const r = await ipcService.context();
            return assert.strictEqual(r, 'Super Context');
        });
    });
    suite('one to many', function () {
        test('all clients get pinged', async function () {
            const service = store.add(new TestService());
            const channel = new TestChannel(service);
            const server = store.add(new TestIPCServer());
            server.registerChannel('channel', channel);
            let client1GotPinged = false;
            const client1 = store.add(server.createConnection('client1'));
            const ipcService1 = new TestChannelClient(client1.getChannel('channel'));
            store.add(ipcService1.onPong(() => (client1GotPinged = true)));
            let client2GotPinged = false;
            const client2 = store.add(server.createConnection('client2'));
            const ipcService2 = new TestChannelClient(client2.getChannel('channel'));
            store.add(ipcService2.onPong(() => (client2GotPinged = true)));
            await timeout(1);
            service.ping('hello');
            await timeout(1);
            assert(client1GotPinged, 'client 1 got pinged');
            assert(client2GotPinged, 'client 2 got pinged');
        });
        test('server gets pings from all clients (broadcast channel)', async function () {
            const server = store.add(new TestIPCServer());
            const client1 = server.createConnection('client1');
            const clientService1 = store.add(new TestService());
            const clientChannel1 = new TestChannel(clientService1);
            client1.registerChannel('channel', clientChannel1);
            const pings = [];
            const channel = server.getChannel('channel', () => true);
            const service = new TestChannelClient(channel);
            store.add(service.onPong((msg) => pings.push(msg)));
            await timeout(1);
            clientService1.ping('hello 1');
            await timeout(1);
            assert.deepStrictEqual(pings, ['hello 1']);
            const client2 = server.createConnection('client2');
            const clientService2 = store.add(new TestService());
            const clientChannel2 = new TestChannel(clientService2);
            client2.registerChannel('channel', clientChannel2);
            await timeout(1);
            clientService2.ping('hello 2');
            await timeout(1);
            assert.deepStrictEqual(pings, ['hello 1', 'hello 2']);
            client1.dispose();
            clientService1.ping('hello 1');
            await timeout(1);
            assert.deepStrictEqual(pings, ['hello 1', 'hello 2']);
            await timeout(1);
            clientService2.ping('hello again 2');
            await timeout(1);
            assert.deepStrictEqual(pings, ['hello 1', 'hello 2', 'hello again 2']);
            client2.dispose();
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaXBjLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvcGFydHMvaXBjL3Rlc3QvY29tbW9uL2lwYy50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDckQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLDhCQUE4QixDQUFBO0FBQ3ZELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQy9GLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUN2RCxPQUFPLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLDZCQUE2QixDQUFBO0FBQzVELE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDekQsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQy9DLE9BQU8sRUFDTixZQUFZLEVBQ1osWUFBWSxFQUVaLFdBQVcsRUFHWCxTQUFTLEVBQ1QsU0FBUyxFQUVULFlBQVksRUFDWixTQUFTLEdBQ1QsTUFBTSxxQkFBcUIsQ0FBQTtBQUM1QixPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxrQ0FBa0MsQ0FBQTtBQUUxRixNQUFNLGFBQWE7SUFBbkI7UUFDUyxjQUFTLEdBQUcsSUFBSSxDQUFBO1FBQ2hCLFlBQU8sR0FBZSxFQUFFLENBQUE7UUFFZixlQUFVLEdBQUcsSUFBSSxPQUFPLENBQVc7WUFDbkQscUJBQXFCLEVBQUUsR0FBRyxFQUFFO2dCQUMzQixLQUFL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