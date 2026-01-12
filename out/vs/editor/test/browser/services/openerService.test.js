/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { OpenerService } from '../../../browser/services/openerService.js';
import { TestCodeEditorService } from '../editorTestServices.js';
import { CommandsRegistry } from '../../../../platform/commands/common/commands.js';
import { NullCommandService } from '../../../../platform/commands/test/common/nullCommandService.js';
import { matchesScheme, matchesSomeScheme } from '../../../../base/common/network.js';
import { TestThemeService } from '../../../../platform/theme/test/common/testThemeService.js';
suite('OpenerService', function () {
    const themeService = new TestThemeService();
    const editorService = new TestCodeEditorService(themeService);
    let lastCommand;
    const commandService = new (class {
        constructor() {
            this.onWillExecuteCommand = () => Disposable.None;
            this.onDidExecuteCommand = () => Disposable.None;
        }
        executeCommand(id, ...args) {
            lastCommand = { id, args };
            return Promise.resolve(undefined);
        }
    })();
    setup(function () {
        lastCommand = undefined;
    });
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    test('delegate to editorService, scheme:///fff', async function () {
        const openerService = new OpenerService(editorService, NullCommandService);
        await openerService.open(URI.parse('another:///somepath'));
        assert.strictEqual(editorService.lastInput.options.selection, undefined);
    });
    test('delegate to editorService, scheme:///fff#L123', async function () {
        const openerService = new OpenerService(editorService, NullCommandService);
        await openerService.open(URI.parse('file:///somepath#L23'));
        assert.strictEqual(editorService.lastInput.options.selection.startLineNumber, 23);
        assert.strictEqual(editorService.lastInput.options.selection.startColumn, 1);
        assert.strictEqual(editorService.lastInput.options.selection.endLineNumber, undefined);
        assert.strictEqual(editorService.lastInput.options.selection.endColumn, undefined);
        assert.strictEqual(editorService.lastInput.resource.fragment, '');
        await openerService.open(URI.parse('another:///somepath#L23'));
        assert.strictEqual(editorService.lastInput.options.selection.startLineNumber, 23);
        assert.strictEqual(editorService.lastInput.options.selection.startColumn, 1);
        await openerService.open(URI.parse('another:///somepath#L23,45'));
        assert.strictEqual(editorService.lastInput.options.selection.startLineNumber, 23);
        assert.strictEqual(editorService.lastInput.options.selection.startColumn, 45);
        assert.strictEqual(editorService.lastInput.options.selection.endLineNumber, undefined);
        assert.strictEqual(editorService.lastInput.options.selection.endColumn, undefined);
        assert.strictEqual(editorService.lastInput.resource.fragment, '');
    });
    test('delegate to editorService, scheme:///fff#123,123', async function () {
        const openerService = new OpenerService(editorService, NullCommandService);
        await openerService.open(URI.parse('file:///somepath#23'));
        assert.strictEqual(editorService.lastInput.options.selection.startLineNumber, 23);
        assert.strictEqual(editorService.lastInput.options.selection.startColumn, 1);
        assert.strictEqual(editorService.lastInput.options.selection.endLineNumber, undefined);
        assert.strictEqual(editorService.lastInput.options.selection.endColumn, undefined);
        assert.strictEqual(editorService.lastInput.resource.fragment, '');
        await openerService.open(URI.parse('file:///somepath#23,45'));
        assert.strictEqual(editorService.lastInput.options.selection.startLineNumber, 23);
        assert.strictEqual(editorService.lastInput.options.selection.startColumn, 45);
        assert.strictEqual(editorService.lastInput.options.selection.endLineNumber, undefined);
        assert.strictEqual(editorService.lastInput.options.selection.endColumn, undefined);
        assert.strictEqual(editorService.lastInput.resource.fragment, '');
    });
    test('delegate to commandsService, command:someid', async function () {
        const openerService = new OpenerService(editorService, commandService);
        const id = `aCommand${Math.random()}`;
        store.add(CommandsRegistry.registerCommand(id, function () { }));
        assert.strictEqual(lastCommand, undefined);
        await openerService.open(URI.parse('command:' + id));
        assert.strictEqual(lastCommand, undefined);
    });
    test('delegate to commandsService, command:someid, 2', async function () {
        const openerService = new OpenerService(editorService, commandService);
        const id = `aCommand${Math.random()}`;
        store.add(CommandsRegistry.registerCommand(id, function () { }));
        await openerService.open(URI.parse('command:' + id).with({ query: '\"123\"' }), {
            allowCommands: true,
        });
        assert.strictEqual(lastCommand.id, id);
        assert.strictEqual(lastCommand.args.length, 1);
        assert.strictEqual(lastCommand.args[0], '123');
        await openerService.open(URI.parse('command:' + id), { allowCommands: true });
        assert.strictEqual(lastCommand.id, id);
        assert.strictEqual(lastCommand.args.length, 0);
        await openerService.open(URI.parse('command:' + id).with({ query: '123' }), {
            allowCommands: true,
        });
        assert.strictEqual(lastCommand.id, id);
        assert.strictEqual(lastCommand.args.length, 1);
        assert.strictEqual(lastCommand.args[0], 123);
        await openerService.open(URI.parse('command:' + id).with({ query: JSON.stringify([12, true]) }), { allowCommands: true });
        assert.strictEqual(lastCommand.id, id);
        assert.strictEqual(lastCommand.args.length, 2);
        assert.strictEqual(lastCommand.args[0], 12);
        assert.strictEqual(lastCommand.args[1], true);
    });
    test('links are protected by validators', async function () {
        const openerService = new OpenerService(editorService, commandService);
        store.add(openerService.registerValidator({ shouldOpen: () => Promise.resolve(false) }));
        const httpResult = await openerService.open(URI.parse('https://www.microsoft.com'));
        const httpsResult = await openerService.open(URI.parse('https://www.microsoft.com'));
        assert.strictEqual(httpResult, false);
        assert.strictEqual(httpsResult, false);
    });
    test('links validated by validators go to openers', async function () {
        const openerService = new OpenerService(editorService, commandService);
        store.add(openerService.registerValidator({ shouldOpen: () => Promise.resolve(true) }));
        let openCount = 0;
        store.add(openerService.registerOpener({
            open: (resource) => {
                openCount++;
                return Promise.resolve(true);
            },
        }));
        await openerService.open(URI.parse('http://microsoft.com'));
        assert.strictEqual(openCount, 1);
        await openerService.open(URI.parse('https://microsoft.com'));
        assert.strictEqual(openCount, 2);
    });
    test("links aren't manipulated before being passed to validator: PR #118226", async function () {
        const openerService = new OpenerService(editorService, commandService);
        store.add(openerService.registerValidator({
            shouldOpen: (resource) => {
                // We don't want it to convert strings into URIs
                assert.strictEqual(resource instanceof URI, false);
                return Promise.resolve(false);
            },
        }));
        await openerService.open('https://wwww.microsoft.com');
        await openerService.open('https://www.microsoft.com??params=CountryCode%3DUSA%26Name%3Dvscode"');
    });
    test('links validated by multiple validators', async function () {
        const openerService = new OpenerService(editorService, commandService);
        let v1 = 0;
        openerService.registerValidator({
            shouldOpen: () => {
                v1++;
                return Promise.resolve(true);
            },
        });
        let v2 = 0;
        openerService.registerValidator({
            shouldOpen: () => {
                v2++;
                return Promise.resolve(true);
            },
        });
        let openCount = 0;
        openerService.registerOpener({
            open: (resource) => {
                openCount++;
                return Promise.resolve(true);
            },
        });
        await openerService.open(URI.parse('http://microsoft.com'));
        assert.strictEqual(openCount, 1);
        assert.strictEqual(v1, 1);
        assert.strictEqual(v2, 1);
        await openerService.open(URI.parse('https://microsoft.com'));
        assert.strictEqual(openCount, 2);
        assert.strictEqual(v1, 2);
        assert.strictEqual(v2, 2);
    });
    test('links invalidated by first validator do not continue validating', async function () {
        const openerService = new OpenerService(editorService, commandService);
        let v1 = 0;
        openerService.registerValidator({
            shouldOpen: () => {
                v1++;
                return Promise.resolve(false);
            },
        });
        let v2 = 0;
        openerService.registerValidator({
            shouldOpen: () => {
                v2++;
                return Promise.resolve(true);
            },
        });
        let openCount = 0;
        openerService.registerOpener({
            open: (resource) => {
                openCount++;
                return Promise.resolve(true);
            },
        });
        await openerService.open(URI.parse('http://microsoft.com'));
        assert.strictEqual(openCount, 0);
        assert.strictEqual(v1, 1);
        assert.strictEqual(v2, 0);
        await openerService.open(URI.parse('https://microsoft.com'));
        assert.strictEqual(openCount, 0);
        assert.strictEqual(v1, 2);
        assert.strictEqual(v2, 0);
    });
    test('matchesScheme', function () {
        assert.ok(matchesScheme('https://microsoft.com', 'https'));
        assert.ok(matchesScheme('http://microsoft.com', 'http'));
        assert.ok(matchesScheme('hTTPs://microsoft.com', 'https'));
        assert.ok(matchesScheme('httP://microsoft.com', 'http'));
        assert.ok(matchesScheme(URI.parse('https://microsoft.com'), 'https'));
        assert.ok(matchesScheme(URI.parse('http://microsoft.com'), 'http'));
        assert.ok(matchesScheme(URI.parse('hTTPs://microsoft.com'), 'https'));
        assert.ok(matchesScheme(URI.parse('httP://microsoft.com'), 'http'));
        assert.ok(!matchesScheme(URI.parse('https://microsoft.com'), 'http'));
        assert.ok(!matchesScheme(URI.parse('htt://microsoft.com'), 'http'));
        assert.ok(!matchesScheme(URI.parse('z://microsoft.com'), 'http'));
    });
    test('matchesSomeScheme', function () {
        assert.ok(matchesSomeScheme('https://microsoft.com', 'http', 'https'));
        assert.ok(matchesSomeScheme('http://microsoft.com', 'http', 'https'));
        assert.ok(!matchesSomeScheme('x://microsoft.com', 'http', 'https'));
    });
    test('resolveExternalUri', async function () {
        const openerService = new OpenerService(editorService, NullCommandService);
        try {
            await openerService.resolveExternalUri(URI.parse('file:///Users/user/folder'));
            assert.fail('Should not reach here');
        }
        catch {
            // OK
        }
        const disposable = openerService.registerExternalUriResolver({
            async resolveExternalUri(uri) {
                return { resolved: uri, dispose() { } };
            },
        });
        const result = await openerService.resolveExternalUri(URI.parse('file:///Users/user/folder'));
        assert.deepStrictEqual(result.resolved.toString(), 'file:///Users/user/folder');
        disposable.dispose();
    });
    test("vscode.open command can't open HTTP URL with hash (#) in it [extension development] #140907", async function () {
        const openerService = new OpenerService(editorService, NullCommandService);
        const actual = [];
        openerService.setDefaultExternalOpener({
            async openExternal(href) {
                actual.push(href);
                return true;
            },
        });
        const href = 'https://gitlab.com/viktomas/test-project/merge_requests/new?merge_request%5Bsource_branch%5D=test-%23-hash';
        const uri = URI.parse(href);
        assert.ok(await openerService.open(uri));
        assert.ok(await openerService.open(href));
        assert.deepStrictEqual(actual, [
            encodeURI(uri.toString(true)), // BAD, the encoded # (%23) is double encoded to %2523 (% is double encoded)
            href, // good
        ]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3BlbmVyU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvdGVzdC9icm93c2VyL3NlcnZpY2VzL29wZW5lclNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUNoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUNwRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDMUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDaEUsT0FBTyxFQUFFLGdCQUFnQixFQUFtQixNQUFNLGtEQUFrRCxDQUFBO0FBQ3BHLE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLGlFQUFpRSxDQUFBO0FBRXBHLE9BQU8sRUFBRSxhQUFhLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUNyRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUU3RixLQUFLLENBQUMsZUFBZSxFQUFFO0lBQ3RCLE1BQU0sWUFBWSxHQUFHLElBQUksZ0JBQWdCLEVBQUUsQ0FBQTtJQUMzQyxNQUFNLGFBQWEsR0FBRyxJQUFJLHFCQUFxQixDQUFDLFlBQVksQ0FBQyxDQUFBO0lBRTdELElBQUksV0FBb0QsQ0FBQTtJQUV4RCxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUM7UUFBQTtZQUUzQix5QkFBb0IsR0FBRyxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFBO1lBQzVDLHdCQUFtQixHQUFHLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUE7UUFLNUMsQ0FBQztRQUpBLGNBQWMsQ0FBQyxFQUFVLEVBQUUsR0FBRyxJQUFXO1lBQ3hDLFdBQVcsR0FBRyxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsQ0FBQTtZQUMxQixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUE7UUFDbEMsQ0FBQztLQUNELENBQUMsRUFBRSxDQUFBO0lBRUosS0FBSyxDQUFDO1FBQ0wsV0FBVyxHQUFHLFNBQVMsQ0FBQTtJQUN4QixDQUFDLENBQUMsQ0FBQTtJQUVGLE1BQU0sS0FBSyxHQUFHLHVDQUF1QyxFQUFFLENBQUE7SUFFdkQsSUFBSSxDQUFDLDBDQUEwQyxFQUFFLEtBQUs7UUFDckQsTUFBTSxhQUFhLEdBQUcsSUFBSSxhQUFhLENBQUMsYUFBYSxFQUFFLGtCQUFrQixDQUFDLENBQUE7UUFDMUUsTUFBTSxhQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxXQUFXLENBQ2hCLGFBQWEsQ0FBQyxTQUFVLENBQUMsT0FBK0IsQ0FBQyxTQUFTLEVBQ25FLFNBQVMsQ0FDVCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsK0NBQStDLEVBQUUsS0FBSztRQUMxRCxNQUFNLGFBQWEsR0FBRyxJQUFJLGFBQWEsQ0FBQyxhQUFhLEVBQUUsa0JBQWtCLENBQUMsQ0FBQTtRQUUxRSxNQUFNLGFBQWEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUE7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FDaEIsYUFBYSxDQUFDLFNBQVUsQ0FBQyxPQUErQixDQUFDLFNBQVUsQ0FBQyxlQUFlLEVBQ3BGLEVBQUUsQ0FDRixDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDaEIsYUFBYSxDQUFDLFNBQVUsQ0FBQyxPQUErQixDQUFDLFNBQVUsQ0FBQyxXQUFXLEVBQ2hGLENBQUMsQ0FDRCxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDaEIsYUFBYSxDQUFDLFNBQVUsQ0FBQyxPQUErQixDQUFDLFNBQVUsQ0FBQyxhQUFhLEVBQ2xGLFNBQVMsQ0FDVCxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDaEIsYUFBYSxDQUFDLFNBQVUsQ0FBQyxPQUErQixDQUFDLFNBQVUsQ0FBQyxTQUFTLEVBQzlFLFNBQVMsQ0FDVCxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsU0FBVSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFFbEUsTUFBTSxhQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUFBO1FBQzlELE1BQU0sQ0FBQyxXQUFXLENBQ2hCLGFBQWEsQ0FBQyxTQUFVLENBQUMsT0FBK0IsQ0FBQyxTQUFVLENBQUMsZUFBZSxFQUNwRixFQUFFLENBQ0YsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQ2hCLGFBQWEsQ0FBQyxTQUFVLENBQUMsT0FBK0IsQ0FBQyxTQUFVLENBQUMsV0FBVyxFQUNoRixDQUFDLENBQ0QsQ0FBQTtRQUVELE1BQU0sYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLDRCQUE0QixDQUFDLENBQUMsQ0FBQTtRQUNqRSxNQUFNLENBQUMsV0FBVyxDQUNoQixhQUFhLENBQUMsU0FBVSxDQUFDLE9BQStCLENBQUMsU0FBVSxDQUFDLGVBQWUsRUFDcEYsRUFBRSxDQUNGLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUNoQixhQUFhLENBQUMsU0FBVSxDQUFDLE9BQStCLENBQUMsU0FBVSxDQUFDLFdBQVcsRUFDaEYsRUFBRSxDQUNGLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUNoQixhQUFhLENBQUMsU0FBVSxDQUFDLE9BQStCLENBQUMsU0FBVSxDQUFDLGFBQWEsRUFDbEYsU0FBUyxDQUNULENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUNoQixhQUFhLENBQUMsU0FBVSxDQUFDLE9BQStCLENBQUMsU0FBVSxDQUFDLFNBQVMsRUFDOUUsU0FBUyxDQUNULENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxTQUFVLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUNuRSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxrREFBa0QsRUFBRSxLQUFLO1FBQzdELE1BQU0sYUFBYSxHQUFHLElBQUksYUFBYSxDQUFDLGFBQWEsRUFBRSxrQkFBa0IsQ0FBQyxDQUFBO1FBRTFFLE1BQU0sYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQTtRQUMxRCxNQUFNLENBQUMsV0FBVyxDQUNoQixhQUFhLENBQUMsU0FBVSxDQUFDLE9BQStCLENBQUMsU0FBVSxDQUFDLGVBQWUsRUFDcEYsRUFBRSxDQUNGLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUNoQixhQUFhLENBQUMsU0FBVSxDQUFDLE9BQStCLENBQUMsU0FBVSxDQUFDLFdBQVcsRUFDaEYsQ0FBQyxDQUNELENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUNoQixhQUFhLENBQUMsU0FBVSxDQUFDLE9BQStCLENBQUMsU0FBVSxDQUFDLGFBQWEsRUFDbEYsU0FBUyxDQUNULENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUNoQixhQUFhLENBQUMsU0FBVSxDQUFDLE9BQStCLENBQUMsU0FBVSxDQUFDLFNBQVMsRUFDOUUsU0FBUyxDQUNULENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxTQUFVLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUVsRSxNQUFNLGFBQWEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLENBQUE7UUFDN0QsTUFBTSxDQUFDLFdBQVcsQ0FDaEIsYUFBYSxDQUFDLFNBQVUsQ0FBQyxPQUErQixDQUFDLFNBQVUsQ0FBQyxlQUFlLEVBQ3BGLEVBQUUsQ0FDRixDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDaEIsYUFBYSxDQUFDLFNBQVUsQ0FBQyxPQUErQixDQUFDLFNBQVUsQ0FBQyxXQUFXLEVBQ2hGLEVBQUUsQ0FDRixDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDaEIsYUFBYSxDQUFDLFNBQVUsQ0FBQyxPQUErQixDQUFDLFNBQVUsQ0FBQyxhQUFhLEVBQ2xGLFNBQVMsQ0FDVCxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDaEIsYUFBYSxDQUFDLFNBQVUsQ0FBQyxPQUErQixDQUFDLFNBQVUsQ0FBQyxTQUFTLEVBQzlFLFNBQVMsQ0FDVCxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsU0FBVSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDbkUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNkNBQTZDLEVBQUUsS0FBSztRQUN4RCxNQUFNLGFBQWEsR0FBRyxJQUFJLGFBQWEsQ0FBQyxhQUFhLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFFdEUsTUFBTSxFQUFFLEdBQUcsV0FBVyxJQUFJLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQTtRQUNyQyxLQUFLLENBQUMsR0FBRyxDQUFDLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxFQUFFLEVBQUUsY0FBYSxDQUFDLENBQUMsQ0FBQyxDQUFBO1FBRS9ELE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFBO1FBQzFDLE1BQU0sYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BELE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxDQUFBO0lBQzNDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGdEQUFnRCxFQUFFLEtBQUs7UUFDM0QsTUFBTSxhQUFhLEdBQUcsSUFBSSxhQUFhLENBQUMsYUFBYSxFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBRXRFLE1BQU0sRUFBRSxHQUFHLFdBQVcsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUE7UUFDckMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsRUFBRSxFQUFFLGNBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUUvRCxNQUFNLGFBQWEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUU7WUFDL0UsYUFBYSxFQUFFLElBQUk7U0FDbkIsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFZLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBWSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFBO1FBRS9DLE1BQU0sYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUMsRUFBRSxFQUFFLGFBQWEsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1FBQzdFLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBWSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRS9DLE1BQU0sYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLENBQUMsRUFBRTtZQUMzRSxhQUFhLEVBQUUsSUFBSTtTQUNuQixDQUFDLENBQUE7UUFDRixNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFFN0MsTUFBTSxhQUFhLENBQUMsSUFBSSxDQUN2QixHQUFHLENBQUMsS0FBSyxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFDdEUsRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLENBQ3ZCLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUMvQyxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDNUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFBO0lBQy9DLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLG1DQUFtQyxFQUFFLEtBQUs7UUFDOUMsTUFBTSxhQUFhLEdBQUcsSUFBSSxhQUFhLENBQUMsYUFBYSxFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBRXRFLEtBQUssQ0FBQyxHQUFHLENBQUMsYUFBYSxDQUFDLGlCQUFpQixDQUFDLEVBQUUsVUFBVSxFQUFFLEdBQUcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFFeEYsTUFBTSxVQUFVLEdBQUcsTUFBTSxhQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxDQUFBO1FBQ25GLE1BQU0sV0FBVyxHQUFHLE1BQU0sYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLDJCQUEyQixDQUFDLENBQUMsQ0FBQTtRQUNwRixNQUFNLENBQUMsV0FBVyxDQUFDLFVBQVUsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUNyQyxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQTtJQUN2QyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyw2Q0FBNkMsRUFBRSxLQUFLO1FBQ3hELE1BQU0sYUFBYSxHQUFHLElBQUksYUFBYSxDQUFDLGFBQWEsRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUV0RSxLQUFLLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXZGLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQTtRQUNqQixLQUFLLENBQUMsR0FBRyxDQUNSLGFBQWEsQ0FBQyxjQUFjLENBQUM7WUFDNUIsSUFBSSxFQUFFLENBQUMsUUFBYSxFQUFFLEVBQUU7Z0JBQ3ZCLFNBQVMsRUFBRSxDQUFBO2dCQUNYLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUM3QixDQUFDO1NBQ0QsQ0FBQyxDQUNGLENBQUE7UUFFRCxNQUFNLGFBQWEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUE7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEMsTUFBTSxhQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFBO1FBQzVELE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ2pDLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHVFQUF1RSxFQUFFLEtBQUs7UUFDbEYsTUFBTSxhQUFhLEdBQUcsSUFBSSxhQUFhLENBQUMsYUFBYSxFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBRXRFLEtBQUssQ0FBQyxHQUFHLENBQ1IsYUFBYSxDQUFDLGlCQUFpQixDQUFDO1lBQy9CLFVBQVUsRUFBRSxDQUFDLFFBQVEsRUFBRSxFQUFFO2dCQUN4QixnREFBZ0Q7Z0JBQ2hELE1BQU0sQ0FBQyxXQUFXLENBQUMsUUFBUSxZQUFZLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQTtnQkFDbEQsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFBO1lBQzlCLENBQUM7U0FDRCxDQUFDLENBQ0YsQ0FBQTtRQUNELE1BQU0sYUFBYSxDQUFDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxDQUFBO1FBQ3RELE1BQU0sYUFBYSxDQUFDLElBQUksQ0FBQyxzRUFBc0UsQ0FBQyxDQUFBO0lBQ2pHLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHdDQUF3QyxFQUFFLEtBQUs7UUFDbkQsTUFBTSxhQUFhLEdBQUcsSUFBSSxhQUFhLENBQUMsYUFBYSxFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBRXRFLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUNWLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQztZQUMvQixVQUFVLEVBQUUsR0FBRyxFQUFFO2dCQUNoQixFQUFFLEVBQUUsQ0FBQTtnQkFDSixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDN0IsQ0FBQztTQUNELENBQUMsQ0FBQTtRQUVGLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUNWLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQztZQUMvQixVQUFVLEVBQUUsR0FBRyxFQUFFO2dCQUNoQixFQUFFLEVBQUUsQ0FBQTtnQkFDSixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDN0IsQ0FBQztTQUNELENBQUMsQ0FBQTtRQUVGLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQTtRQUNqQixhQUFhLENBQUMsY0FBYyxDQUFDO1lBQzVCLElBQUksRUFBRSxDQUFDLFFBQWEsRUFBRSxFQUFFO2dCQUN2QixTQUFTLEVBQUUsQ0FBQTtnQkFDWCxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDN0IsQ0FBQztTQUNELENBQUMsQ0FBQTtRQUVGLE1BQU0sYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQTtRQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN6QixNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN6QixNQUFNLGFBQWEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUE7UUFDNUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDekIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDMUIsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsaUVBQWlFLEVBQUUsS0FBSztRQUM1RSxNQUFNLGFBQWEsR0FBRyxJQUFJLGFBQWEsQ0FBQyxhQUFhLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFFdEUsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ1YsYUFBYSxDQUFDLGlCQUFpQixDQUFDO1lBQy9CLFVBQVUsRUFBRSxHQUFHLEVBQUU7Z0JBQ2hCLEVBQUUsRUFBRSxDQUFBO2dCQUNKLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUM5QixDQUFDO1NBQ0QsQ0FBQyxDQUFBO1FBRUYsSUFBSSxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBQ1YsYUFBYSxDQUFDLGlCQUFpQixDQUFDO1lBQy9CLFVBQVUsRUFBRSxHQUFHLEVBQUU7Z0JBQ2hCLEVBQUUsRUFBRSxDQUFBO2dCQUNKLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUM3QixDQUFDO1NBQ0QsQ0FBQyxDQUFBO1FBRUYsSUFBSSxTQUFTLEdBQUcsQ0FBQyxDQUFBO1FBQ2pCLGFBQWEsQ0FBQyxjQUFjLENBQUM7WUFDNUIsSUFBSSxFQUFFLENBQUMsUUFBYSxFQUFFLEVBQUU7Z0JBQ3ZCLFNBQVMsRUFBRSxDQUFBO2dCQUNYLE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUM3QixDQUFDO1NBQ0QsQ0FBQyxDQUFBO1FBRUYsTUFBTSxhQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFBO1FBQzNELE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3pCLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3pCLE1BQU0sYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQTtRQUM1RCxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN6QixNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUMxQixDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxlQUFlLEVBQUU7UUFDckIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxhQUFhLENBQUMsdUJBQXVCLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUMxRCxNQUFNLENBQUMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxzQkFBc0IsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBQ3hELE1BQU0sQ0FBQyxFQUFFLENBQUMsYUFBYSxDQUFDLHVCQUF1QixFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxhQUFhLENBQUMsc0JBQXNCLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUN4RCxNQUFNLENBQUMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLHNCQUFzQixDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUNuRSxNQUFNLENBQUMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsRUFBRSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLHNCQUFzQixDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUNuRSxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFDbkUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLG1CQUFtQixDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQTtJQUNsRSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxtQkFBbUIsRUFBRTtRQUN6QixNQUFNLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDLHVCQUF1QixFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFBO1FBQ3RFLE1BQU0sQ0FBQyxFQUFFLENBQUMsaUJBQWlCLENBQUMsc0JBQXNCLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLG1CQUFtQixFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFBO0lBQ3BFLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLG9CQUFvQixFQUFFLEtBQUs7UUFDL0IsTUFBTSxhQUFhLEdBQUcsSUFBSSxhQUFhLENBQUMsYUFBYSxFQUFFLGtCQUFrQixDQUFDLENBQUE7UUFFMUUsSUFBSSxDQUFDO1lBQ0osTUFBTSxhQUFhLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQywyQkFBMkIsQ0FBQyxDQUFDLENBQUE7WUFDOUUsTUFBTSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFBO1FBQ3JDLENBQUM7UUFBQyxNQUFNLENBQUM7WUFDUixLQUFLO1FBQ04sQ0FBQztRQUVELE1BQU0sVUFBVSxHQUFHLGFBQWEsQ0FBQywyQkFBMkIsQ0FBQztZQUM1RCxLQUFLLENBQUMsa0JBQWtCLENBQUMsR0FBRztnQkFDM0IsT0FBTyxFQUFFLFFBQVEsRUFBRSxHQUFHLEVBQUUsT0FBTyxLQUFJLENBQUMsRUFBRSxDQUFBO1lBQ3ZDLENBQUM7U0FDRCxDQUFDLENBQUE7UUFFRixNQUFNLE1BQU0sR0FBRyxNQUFNLGFBQWEsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLDJCQUEyQixDQUFDLENBQUMsQ0FBQTtRQUM3RixNQUFNLENBQUMsZUFBZSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsMkJBQTJCLENBQUMsQ0FBQTtRQUMvRSxVQUFVLENBQUMsT0FBTyxFQUFFLENBQUE7SUFDckIsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNkZBQTZGLEVBQUUsS0FBSztRQUN4RyxNQUFNLGFBQWEsR0FBRyxJQUFJLGFBQWEsQ0FBQyxhQUFhLEVBQUUsa0JBQWtCLENBQUMsQ0FBQTtRQUUxRSxNQUFNLE1BQU0sR0FBYSxFQUFFLENBQUE7UUFFM0IsYUFBYSxDQUFDLHdCQUF3QixDQUFDO1lBQ3RDLEtBQUssQ0FBQyxZQUFZLENBQUMsSUFBSTtnQkFDdEIsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQTtnQkFDakIsT0FBTyxJQUFJLENBQUE7WUFDWixDQUFDO1NBQ0QsQ0FBQyxDQUFBO1FBRUYsTUFBTSxJQUFJLEdBQ1QsNEdBQTRHLENBQUE7UUFDN0csTUFBTSxHQUFHLEdBQUcsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQTtRQUUzQixNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1FBQ3hDLE1BQU0sQ0FBQyxFQUFFLENBQUMsTUFBTSxhQUFhLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUE7UUFFekMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLEVBQUU7WUFDOUIsU0FBUyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSw0RUFBNEU7WUFDM0csSUFBSSxFQUFFLE9BQU87U0FDYixDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=