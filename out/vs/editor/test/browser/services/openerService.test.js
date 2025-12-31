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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3BlbmVyU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvZWRpdG9yL3Rlc3QvYnJvd3Nlci9zZXJ2aWNlcy9vcGVuZXJTZXJ2aWNlLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxNQUFNLE1BQU0sUUFBUSxDQUFBO0FBQzNCLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDL0YsT0FBTyxFQUFFLGFBQWEsRUFBRSxNQUFNLDRDQUE0QyxDQUFBO0FBQzFFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDBCQUEwQixDQUFBO0FBQ2hFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBbUIsTUFBTSxrREFBa0QsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxpRUFBaUUsQ0FBQTtBQUVwRyxPQUFPLEVBQUUsYUFBYSxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDckYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFN0YsS0FBSyxDQUFDLGVBQWUsRUFBRTtJQUN0QixNQUFNLFlBQVksR0FBRyxJQUFJLGdCQUFnQixFQUFFLENBQUE7SUFDM0MsTUFBTSxhQUFhLEdBQUcsSUFBSSxxQkFBcUIsQ0FBQyxZQUFZLENBQUMsQ0FBQTtJQUU3RCxJQUFJLFdBQW9ELENBQUE7SUFFeEQsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDO1FBQUE7WUFFM0IseUJBQW9CLEdBQUcsR0FBRyxFQUFFLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQTtZQUM1Qyx3QkFBbUIsR0FBRyxHQUFHLEVBQUUsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFBO1FBSzVDLENBQUM7UUFKQSxjQUFjLENBQUMsRUFBVSxFQUFFLEdBQUcsSUFBVztZQUN4QyxXQUFXLEdBQUcsRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUE7WUFDMUIsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ2xDLENBQUM7S0FDRCxDQUFDLEVBQUUsQ0FBQTtJQUVKLEtBQUssQ0FBQztRQUNMLFdBQVcsR0FBRyxTQUFTLENBQUE7SUFDeEIsQ0FBQyxDQUFDLENBQUE7SUFFRixNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXZELElBQUksQ0FBQywwQ0FBMEMsRUFBRSxLQUFLO1FBQ3JELE1BQU0sYUFBYSxHQUFHLElBQUksYUFBYSxDQUFDLGFBQWEsRUFBRSxrQkFBa0IsQ0FBQyxDQUFBO1FBQzFFLE1BQU0sYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQTtRQUMxRCxNQUFNLENBQUMsV0FBVyxDQUNoQixhQUFhLENBQUMsU0FBVSxDQUFDLE9BQStCLENBQUMsU0FBUyxFQUNuRSxTQUFTLENBQ1QsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLCtDQUErQyxFQUFFLEtBQUs7UUFDMUQsTUFBTSxhQUFhLEdBQUcsSUFBSSxhQUFhLENBQUMsYUFBYSxFQUFFLGtCQUFrQixDQUFDLENBQUE7UUFFMUUsTUFBTSxhQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFBO1FBQzNELE1BQU0sQ0FBQyxXQUFXLENBQ2hCLGFBQWEsQ0FBQyxTQUFVLENBQUMsT0FBK0IsQ0FBQyxTQUFVLENBQUMsZUFBZSxFQUNwRixFQUFFLENBQ0YsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQ2hCLGFBQWEsQ0FBQyxTQUFVLENBQUMsT0FBK0IsQ0FBQyxTQUFVLENBQUMsV0FBVyxFQUNoRixDQUFDLENBQ0QsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQ2hCLGFBQWEsQ0FBQyxTQUFVLENBQUMsT0FBK0IsQ0FBQyxTQUFVLENBQUMsYUFBYSxFQUNsRixTQUFTLENBQ1QsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQ2hCLGFBQWEsQ0FBQyxTQUFVLENBQUMsT0FBK0IsQ0FBQyxTQUFVLENBQUMsU0FBUyxFQUM5RSxTQUFTLENBQ1QsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLFNBQVUsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRWxFLE1BQU0sYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUMsQ0FBQTtRQUM5RCxNQUFNLENBQUMsV0FBVyxDQUNoQixhQUFhLENBQUMsU0FBVSxDQUFDLE9BQStCLENBQUMsU0FBVSxDQUFDLGVBQWUsRUFDcEYsRUFBRSxDQUNGLENBQUE7UUFDRCxNQUFNLENBQUMsV0FBVyxDQUNoQixhQUFhLENBQUMsU0FBVSxDQUFDLE9BQStCLENBQUMsU0FBVSxDQUFDLFdBQVcsRUFDaEYsQ0FBQyxDQUNELENBQUE7UUFFRCxNQUFNLGFBQWEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLENBQUE7UUFDakUsTUFBTSxDQUFDLFdBQVcsQ0FDaEIsYUFBYSxDQUFDLFNBQVUsQ0FBQyxPQUErQixDQUFDLFNBQVUsQ0FBQyxlQUFlLEVBQ3BGLEVBQUUsQ0FDRixDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDaEIsYUFBYSxDQUFDLFNBQVUsQ0FBQyxPQUErQixDQUFDLFNBQVUsQ0FBQyxXQUFXLEVBQ2hGLEVBQUUsQ0FDRixDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDaEIsYUFBYSxDQUFDLFNBQVUsQ0FBQyxPQUErQixDQUFDLFNBQVUsQ0FBQyxhQUFhLEVBQ2xGLFNBQVMsQ0FDVCxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDaEIsYUFBYSxDQUFDLFNBQVUsQ0FBQyxPQUErQixDQUFDLFNBQVUsQ0FBQyxTQUFTLEVBQzlFLFNBQVMsQ0FDVCxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsU0FBVSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDbkUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsa0RBQWtELEVBQUUsS0FBSztRQUM3RCxNQUFNLGFBQWEsR0FBRyxJQUFJLGFBQWEsQ0FBQyxhQUFhLEVBQUUsa0JBQWtCLENBQUMsQ0FBQTtRQUUxRSxNQUFNLGFBQWEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLFdBQVcsQ0FDaEIsYUFBYSxDQUFDLFNBQVUsQ0FBQyxPQUErQixDQUFDLFNBQVUsQ0FBQyxlQUFlLEVBQ3BGLEVBQUUsQ0FDRixDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDaEIsYUFBYSxDQUFDLFNBQVUsQ0FBQyxPQUErQixDQUFDLFNBQVUsQ0FBQyxXQUFXLEVBQ2hGLENBQUMsQ0FDRCxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDaEIsYUFBYSxDQUFDLFNBQVUsQ0FBQyxPQUErQixDQUFDLFNBQVUsQ0FBQyxhQUFhLEVBQ2xGLFNBQVMsQ0FDVCxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FDaEIsYUFBYSxDQUFDLFNBQVUsQ0FBQyxPQUErQixDQUFDLFNBQVUsQ0FBQyxTQUFTLEVBQzlFLFNBQVMsQ0FDVCxDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsU0FBVSxDQUFDLFFBQVEsQ0FBQyxRQUFRLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFFbEUsTUFBTSxhQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFBO1FBQzdELE1BQU0sQ0FBQyxXQUFXLENBQ2hCLGFBQWEsQ0FBQyxTQUFVLENBQUMsT0FBK0IsQ0FBQyxTQUFVLENBQUMsZUFBZSxFQUNwRixFQUFFLENBQ0YsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQ2hCLGFBQWEsQ0FBQyxTQUFVLENBQUMsT0FBK0IsQ0FBQyxTQUFVLENBQUMsV0FBVyxFQUNoRixFQUFFLENBQ0YsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQ2hCLGFBQWEsQ0FBQyxTQUFVLENBQUMsT0FBK0IsQ0FBQyxTQUFVLENBQUMsYUFBYSxFQUNsRixTQUFTLENBQ1QsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQ2hCLGFBQWEsQ0FBQyxTQUFVLENBQUMsT0FBK0IsQ0FBQyxTQUFVLENBQUMsU0FBUyxFQUM5RSxTQUFTLENBQ1QsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQUMsYUFBYSxDQUFDLFNBQVUsQ0FBQyxRQUFRLENBQUMsUUFBUSxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQ25FLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDZDQUE2QyxFQUFFLEtBQUs7UUFDeEQsTUFBTSxhQUFhLEdBQUcsSUFBSSxhQUFhLENBQUMsYUFBYSxFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBRXRFLE1BQU0sRUFBRSxHQUFHLFdBQVcsSUFBSSxDQUFDLE1BQU0sRUFBRSxFQUFFLENBQUE7UUFDckMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxlQUFlLENBQUMsRUFBRSxFQUFFLGNBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQTtRQUUvRCxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUMxQyxNQUFNLGFBQWEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNwRCxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVcsRUFBRSxTQUFTLENBQUMsQ0FBQTtJQUMzQyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxnREFBZ0QsRUFBRSxLQUFLO1FBQzNELE1BQU0sYUFBYSxHQUFHLElBQUksYUFBYSxDQUFDLGFBQWEsRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUV0RSxNQUFNLEVBQUUsR0FBRyxXQUFXLElBQUksQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFBO1FBQ3JDLEtBQUssQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLENBQUMsZUFBZSxDQUFDLEVBQUUsRUFBRSxjQUFhLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFFL0QsTUFBTSxhQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsVUFBVSxHQUFHLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxTQUFTLEVBQUUsQ0FBQyxFQUFFO1lBQy9FLGFBQWEsRUFBRSxJQUFJO1NBQ25CLENBQUMsQ0FBQTtRQUNGLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBWSxDQUFDLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUN2QyxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQy9DLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsQ0FBQTtRQUUvQyxNQUFNLGFBQWEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxhQUFhLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQTtRQUM3RSxNQUFNLENBQUMsV0FBVyxDQUFDLFdBQVksQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFDdkMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFZLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUUvQyxNQUFNLGFBQWEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxDQUFDLEVBQUU7WUFDM0UsYUFBYSxFQUFFLElBQUk7U0FDbkIsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFZLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBWSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFBO1FBRTdDLE1BQU0sYUFBYSxDQUFDLElBQUksQ0FDdkIsR0FBRyxDQUFDLEtBQUssQ0FBQyxVQUFVLEdBQUcsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLEVBQUUsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQ3RFLEVBQUUsYUFBYSxFQUFFLElBQUksRUFBRSxDQUN2QixDQUFBO1FBQ0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFZLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQ3ZDLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBWSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDL0MsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFZLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBQzVDLE1BQU0sQ0FBQyxXQUFXLENBQUMsV0FBWSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQTtJQUMvQyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxtQ0FBbUMsRUFBRSxLQUFLO1FBQzlDLE1BQU0sYUFBYSxHQUFHLElBQUksYUFBYSxDQUFDLGFBQWEsRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUV0RSxLQUFLLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQyxFQUFFLFVBQVUsRUFBRSxHQUFHLEVBQUUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBRXhGLE1BQU0sVUFBVSxHQUFHLE1BQU0sYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLDJCQUEyQixDQUFDLENBQUMsQ0FBQTtRQUNuRixNQUFNLFdBQVcsR0FBRyxNQUFNLGFBQWEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQywyQkFBMkIsQ0FBQyxDQUFDLENBQUE7UUFDcEYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUE7UUFDckMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUE7SUFDdkMsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsNkNBQTZDLEVBQUUsS0FBSztRQUN4RCxNQUFNLGFBQWEsR0FBRyxJQUFJLGFBQWEsQ0FBQyxhQUFhLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFFdEUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUMsaUJBQWlCLENBQUMsRUFBRSxVQUFVLEVBQUUsR0FBRyxFQUFFLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUV2RixJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUE7UUFDakIsS0FBSyxDQUFDLEdBQUcsQ0FDUixhQUFhLENBQUMsY0FBYyxDQUFDO1lBQzVCLElBQUksRUFBRSxDQUFDLFFBQWEsRUFBRSxFQUFFO2dCQUN2QixTQUFTLEVBQUUsQ0FBQTtnQkFDWCxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDN0IsQ0FBQztTQUNELENBQUMsQ0FDRixDQUFBO1FBRUQsTUFBTSxhQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxDQUFBO1FBQzNELE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hDLE1BQU0sYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQTtRQUM1RCxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtJQUNqQyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx1RUFBdUUsRUFBRSxLQUFLO1FBQ2xGLE1BQU0sYUFBYSxHQUFHLElBQUksYUFBYSxDQUFDLGFBQWEsRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUV0RSxLQUFLLENBQUMsR0FBRyxDQUNSLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQztZQUMvQixVQUFVLEVBQUUsQ0FBQyxRQUFRLEVBQUUsRUFBRTtnQkFDeEIsZ0RBQWdEO2dCQUNoRCxNQUFNLENBQUMsV0FBVyxDQUFDLFFBQVEsWUFBWSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUE7Z0JBQ2xELE9BQU8sT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQTtZQUM5QixDQUFDO1NBQ0QsQ0FBQyxDQUNGLENBQUE7UUFDRCxNQUFNLGFBQWEsQ0FBQyxJQUFJLENBQUMsNEJBQTRCLENBQUMsQ0FBQTtRQUN0RCxNQUFNLGFBQWEsQ0FBQyxJQUFJLENBQUMsc0VBQXNFLENBQUMsQ0FBQTtJQUNqRyxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx3Q0FBd0MsRUFBRSxLQUFLO1FBQ25ELE1BQU0sYUFBYSxHQUFHLElBQUksYUFBYSxDQUFDLGFBQWEsRUFBRSxjQUFjLENBQUMsQ0FBQTtRQUV0RSxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDVixhQUFhLENBQUMsaUJBQWlCLENBQUM7WUFDL0IsVUFBVSxFQUFFLEdBQUcsRUFBRTtnQkFDaEIsRUFBRSxFQUFFLENBQUE7Z0JBQ0osT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQzdCLENBQUM7U0FDRCxDQUFDLENBQUE7UUFFRixJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDVixhQUFhLENBQUMsaUJBQWlCLENBQUM7WUFDL0IsVUFBVSxFQUFFLEdBQUcsRUFBRTtnQkFDaEIsRUFBRSxFQUFFLENBQUE7Z0JBQ0osT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQzdCLENBQUM7U0FDRCxDQUFDLENBQUE7UUFFRixJQUFJLFNBQVMsR0FBRyxDQUFDLENBQUE7UUFDakIsYUFBYSxDQUFDLGNBQWMsQ0FBQztZQUM1QixJQUFJLEVBQUUsQ0FBQyxRQUFhLEVBQUUsRUFBRTtnQkFDdkIsU0FBUyxFQUFFLENBQUE7Z0JBQ1gsT0FBTyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQzdCLENBQUM7U0FDRCxDQUFDLENBQUE7UUFFRixNQUFNLGFBQWEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUE7UUFDM0QsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDekIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDekIsTUFBTSxhQUFhLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUMsQ0FBQyxDQUFBO1FBQzVELE1BQU0sQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ2hDLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3pCLE1BQU0sQ0FBQyxXQUFXLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQzFCLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLGlFQUFpRSxFQUFFLEtBQUs7UUFDNUUsTUFBTSxhQUFhLEdBQUcsSUFBSSxhQUFhLENBQUMsYUFBYSxFQUFFLGNBQWMsQ0FBQyxDQUFBO1FBRXRFLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUNWLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQztZQUMvQixVQUFVLEVBQUUsR0FBRyxFQUFFO2dCQUNoQixFQUFFLEVBQUUsQ0FBQTtnQkFDSixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUE7WUFDOUIsQ0FBQztTQUNELENBQUMsQ0FBQTtRQUVGLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUNWLGFBQWEsQ0FBQyxpQkFBaUIsQ0FBQztZQUMvQixVQUFVLEVBQUUsR0FBRyxFQUFFO2dCQUNoQixFQUFFLEVBQUUsQ0FBQTtnQkFDSixPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDN0IsQ0FBQztTQUNELENBQUMsQ0FBQTtRQUVGLElBQUksU0FBUyxHQUFHLENBQUMsQ0FBQTtRQUNqQixhQUFhLENBQUMsY0FBYyxDQUFDO1lBQzVCLElBQUksRUFBRSxDQUFDLFFBQWEsRUFBRSxFQUFFO2dCQUN2QixTQUFTLEVBQUUsQ0FBQTtnQkFDWCxPQUFPLE9BQU8sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUE7WUFDN0IsQ0FBQztTQUNELENBQUMsQ0FBQTtRQUVGLE1BQU0sYUFBYSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQTtRQUMzRCxNQUFNLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNoQyxNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN6QixNQUFNLENBQUMsV0FBVyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUN6QixNQUFNLGFBQWEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUE7UUFDNUQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDaEMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDekIsTUFBTSxDQUFDLFdBQVcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7SUFDMUIsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsZUFBZSxFQUFFO1FBQ3JCLE1BQU0sQ0FBQyxFQUFFLENBQUMsYUFBYSxDQUFDLHVCQUF1QixFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUE7UUFDMUQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxhQUFhLENBQUMsc0JBQXNCLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUN4RCxNQUFNLENBQUMsRUFBRSxDQUFDLGFBQWEsQ0FBQyx1QkFBdUIsRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFBO1FBQzFELE1BQU0sQ0FBQyxFQUFFLENBQUMsYUFBYSxDQUFDLHNCQUFzQixFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFDeEQsTUFBTSxDQUFDLEVBQUUsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFDbkUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxDQUFDLENBQUE7UUFDckUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUE7UUFDbkUsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQTtRQUNyRSxNQUFNLENBQUMsRUFBRSxDQUFDLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMscUJBQXFCLENBQUMsRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFBO1FBQ25FLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUE7SUFDbEUsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsbUJBQW1CLEVBQUU7UUFDekIsTUFBTSxDQUFDLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyx1QkFBdUIsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQTtRQUN0RSxNQUFNLENBQUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDLHNCQUFzQixFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsQ0FBQyxDQUFBO1FBQ3JFLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxtQkFBbUIsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQTtJQUNwRSxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxLQUFLO1FBQy9CLE1BQU0sYUFBYSxHQUFHLElBQUksYUFBYSxDQUFDLGFBQWEsRUFBRSxrQkFBa0IsQ0FBQyxDQUFBO1FBRTFFLElBQUksQ0FBQztZQUNKLE1BQU0sYUFBYSxDQUFDLGtCQUFrQixDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxDQUFBO1lBQzlFLE1BQU0sQ0FBQyxJQUFJLENBQUMsdUJBQXVCLENBQUMsQ0FBQTtRQUNyQyxDQUFDO1FBQUMsTUFBTSxDQUFDO1lBQ1IsS0FBSztRQUNOLENBQUM7UUFFRCxNQUFNLFVBQVUsR0FBRyxhQUFhLENBQUMsMkJBQTJCLENBQUM7WUFDNUQsS0FBSyxDQUFDLGtCQUFrQixDQUFDLEdBQUc7Z0JBQzNCLE9BQU8sRUFBRSxRQUFRLEVBQUUsR0FBRyxFQUFFLE9BQU8sS0FBSSxDQUFDLEVBQUUsQ0FBQTtZQUN2QyxDQUFDO1NBQ0QsQ0FBQyxDQUFBO1FBRUYsTUFBTSxNQUFNLEdBQUcsTUFBTSxhQUFhLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQywyQkFBMkIsQ0FBQyxDQUFDLENBQUE7UUFDN0YsTUFBTSxDQUFDLGVBQWUsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFLDJCQUEyQixDQUFDLENBQUE7UUFDL0UsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFBO0lBQ3JCLENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLDZGQUE2RixFQUFFLEtBQUs7UUFDeEcsTUFBTSxhQUFhLEdBQUcsSUFBSSxhQUFhLENBQUMsYUFBYSxFQUFFLGtCQUFrQixDQUFDLENBQUE7UUFFMUUsTUFBTSxNQUFNLEdBQWEsRUFBRSxDQUFBO1FBRTNCLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQztZQUN0QyxLQUFLLENBQUMsWUFBWSxDQUFDLElBQUk7Z0JBQ3RCLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUE7Z0JBQ2pCLE9BQU8sSUFBSSxDQUFBO1lBQ1osQ0FBQztTQUNELENBQUMsQ0FBQTtRQUVGLE1BQU0sSUFBSSxHQUNULDRHQUE0RyxDQUFBO1FBQzdHLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUE7UUFFM0IsTUFBTSxDQUFDLEVBQUUsQ0FBQyxNQUFNLGFBQWEsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQTtRQUN4QyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sYUFBYSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFBO1FBRXpDLE1BQU0sQ0FBQyxlQUFlLENBQUMsTUFBTSxFQUFFO1lBQzlCLFNBQVMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsNEVBQTRFO1lBQzNHLElBQUksRUFBRSxPQUFPO1NBQ2IsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7QUFDSCxDQUFDLENBQUMsQ0FBQSJ9