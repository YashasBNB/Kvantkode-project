/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as http from 'http';
import assert from 'assert';
import { CancellationToken, CancellationTokenSource } from '../../../../common/cancellation.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../test/common/utils.js';
import { request } from '../../common/requestImpl.js';
import { streamToBuffer } from '../../../../common/buffer.js';
suite('Request', () => {
    let port;
    let server;
    setup(async () => {
        port = await new Promise((resolvePort, rejectPort) => {
            server = http
                .createServer((req, res) => {
                if (req.url === '/noreply') {
                    return; // never respond
                }
                res.setHeader('Content-Type', 'application/json');
                if (req.headers['echo-header']) {
                    res.setHeader('echo-header', req.headers['echo-header']);
                }
                const data = [];
                req.on('data', (chunk) => data.push(chunk));
                req.on('end', () => {
                    res.end(JSON.stringify({
                        method: req.method,
                        url: req.url,
                        data: Buffer.concat(data).toString(),
                    }));
                });
            })
                .listen(0, '127.0.0.1', () => {
                const address = server.address();
                resolvePort(address.port);
            })
                .on('error', (err) => {
                rejectPort(err);
            });
        });
    });
    teardown(async () => {
        await new Promise((resolve, reject) => {
            server.close((err) => (err ? reject(err) : resolve()));
        });
    });
    test('GET', async () => {
        const context = await request({
            url: `http://127.0.0.1:${port}`,
            headers: {
                'echo-header': 'echo-value',
            },
        }, CancellationToken.None);
        assert.strictEqual(context.res.statusCode, 200);
        assert.strictEqual(context.res.headers['content-type'], 'application/json');
        assert.strictEqual(context.res.headers['echo-header'], 'echo-value');
        const buffer = await streamToBuffer(context.stream);
        const body = JSON.parse(buffer.toString());
        assert.strictEqual(body.method, 'GET');
        assert.strictEqual(body.url, '/');
    });
    test('POST', async () => {
        const context = await request({
            type: 'POST',
            url: `http://127.0.0.1:${port}/postpath`,
            data: 'Some data',
        }, CancellationToken.None);
        assert.strictEqual(context.res.statusCode, 200);
        assert.strictEqual(context.res.headers['content-type'], 'application/json');
        const buffer = await streamToBuffer(context.stream);
        const body = JSON.parse(buffer.toString());
        assert.strictEqual(body.method, 'POST');
        assert.strictEqual(body.url, '/postpath');
        assert.strictEqual(body.data, 'Some data');
    });
    test('timeout', async () => {
        try {
            await request({
                type: 'GET',
                url: `http://127.0.0.1:${port}/noreply`,
                timeout: 123,
            }, CancellationToken.None);
            assert.fail('Should fail with timeout');
        }
        catch (err) {
            assert.strictEqual(err.message, 'Fetch timeout: 123ms');
        }
    });
    test('cancel', async () => {
        try {
            const source = new CancellationTokenSource();
            const res = request({
                type: 'GET',
                url: `http://127.0.0.1:${port}/noreply`,
            }, source.token);
            await new Promise((resolve) => setTimeout(resolve, 100));
            source.cancel();
            await res;
            assert.fail('Should fail with cancellation');
        }
        catch (err) {
            assert.strictEqual(err.message, 'Canceled');
        }
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVxdWVzdC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9wYXJ0cy9yZXF1ZXN0L3Rlc3QvZWxlY3Ryb24tbWFpbi9yZXF1ZXN0LnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxLQUFLLElBQUksTUFBTSxNQUFNLENBQUE7QUFFNUIsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxpQkFBaUIsRUFBRSx1QkFBdUIsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQy9GLE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBQzFGLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOEJBQThCLENBQUE7QUFFN0QsS0FBSyxDQUFDLFNBQVMsRUFBRSxHQUFHLEVBQUU7SUFDckIsSUFBSSxJQUFZLENBQUE7SUFDaEIsSUFBSSxNQUFtQixDQUFBO0lBRXZCLEtBQUssQ0FBQyxLQUFLLElBQUksRUFBRTtRQUNoQixJQUFJLEdBQUcsTUFBTSxJQUFJLE9BQU8sQ0FBUyxDQUFDLFdBQVcsRUFBRSxVQUFVLEVBQUUsRUFBRTtZQUM1RCxNQUFNLEdBQUcsSUFBSTtpQkFDWCxZQUFZLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEVBQUU7Z0JBQzFCLElBQUksR0FBRyxDQUFDLEdBQUcsS0FBSyxVQUFVLEVBQUUsQ0FBQztvQkFDNUIsT0FBTSxDQUFDLGdCQUFnQjtnQkFDeEIsQ0FBQztnQkFDRCxHQUFHLENBQUMsU0FBUyxDQUFDLGNBQWMsRUFBRSxrQkFBa0IsQ0FBQyxDQUFBO2dCQUNqRCxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLEVBQUUsQ0FBQztvQkFDaEMs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