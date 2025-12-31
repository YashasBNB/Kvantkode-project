/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { ShellIntegrationAddon } from '../../../../../../platform/terminal/common/xterm/shellIntegrationAddon.js';
import { workbenchInstantiationService } from '../../../../../test/browser/workbenchTestServices.js';
import { NullLogService } from '../../../../../../platform/log/common/log.js';
import { InitialHintAddon } from '../../browser/terminal.initialHint.contribution.js';
import { getActiveDocument } from '../../../../../../base/browser/dom.js';
import { Emitter } from '../../../../../../base/common/event.js';
import { strictEqual } from 'assert';
import { ExtensionIdentifier } from '../../../../../../platform/extensions/common/extensions.js';
import { importAMDNodeModule } from '../../../../../../amdX.js';
import { ChatAgentLocation } from '../../../../chat/common/constants.js';
suite('Terminal Initial Hint Addon', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let eventCount = 0;
    let xterm;
    let initialHintAddon;
    const onDidChangeAgentsEmitter = new Emitter();
    const onDidChangeAgents = onDidChangeAgentsEmitter.event;
    const agent = {
        id: 'termminal',
        name: 'terminal',
        extensionId: new ExtensionIdentifier('test'),
        extensionPublisherId: 'test',
        extensionDisplayName: 'test',
        metadata: {},
        slashCommands: [{ name: 'test', description: 'test' }],
        disambiguation: [],
        locations: [ChatAgentLocation.fromRaw('terminal')],
        invoke: async () => {
            return {};
        },
    };
    const editorAgent = {
        id: 'editor',
        name: 'editor',
        extensionId: new ExtensionIdentifier('test-editor'),
        extensionPublisherId: 'test-editor',
        extensionDisplayName: 'test-editor',
        metadata: {},
        slashCommands: [{ name: 'test', description: 'test' }],
        locations: [ChatAgentLocation.fromRaw('editor')],
        disambiguation: [],
        invoke: async () => {
            return {};
        },
    };
    setup(async () => {
        const instantiationService = workbenchInstantiationService({}, store);
        const TerminalCtor = (await importAMDNodeModule('@xterm/xterm', 'lib/xterm.js')).Terminal;
        xterm = store.add(new TerminalCtor());
        const shellIntegrationAddon = store.add(new ShellIntegrationAddon('', true, undefined, new NullLogService()));
        initialHintAddon = store.add(instantiationService.createInstance(InitialHintAddon, shellIntegrationAddon.capabilities, onDidChangeAgents));
        store.add(initialHintAddon.onDidRequestCreateHint(() => eventCount++));
        const testContainer = document.createElement('div');
        getActiveDocument().body.append(testContainer);
        xterm.open(testContainer);
        xterm.loadAddon(shellIntegrationAddon);
        xterm.loadAddon(initialHintAddon);
    });
    suite('Chat providers', () => {
        test('hint is not shown when there are no chat providers', () => {
            eventCount = 0;
            xterm.focus();
            strictEqual(eventCount, 0);
        });
        test('hint is not shown when there is just an editor agent', () => {
            eventCount = 0;
            onDidChangeAgentsEmitter.fire(editorAgent);
            xterm.focus();
            strictEqual(eventCount, 0);
        });
        test('hint is shown when there is a terminal chat agent', () => {
            eventCount = 0;
            onDidChangeAgentsEmitter.fire(editorAgent);
            xterm.focus();
            strictEqual(eventCount, 0);
            onDidChangeAgentsEmitter.fire(agent);
            strictEqual(eventCount, 1);
        });
        test('hint is not shown again when another terminal chat agent is added if it has already shown', () => {
            eventCount = 0;
            onDidChangeAgentsEmitter.fire(agent);
            xterm.focus();
            strictEqual(eventCount, 1);
            onDidChangeAgentsEmitter.fire(agent);
            strictEqual(eventCount, 1);
        });
    });
    suite('Input', () => {
        test('hint is not shown when there has been input', () => {
            onDidChangeAgentsEmitter.fire(agent);
            xterm.writeln('data');
            setTimeout(() => {
                xterm.focus();
                strictEqual(eventCount, 0);
            }, 50);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxJbml0aWFsSGludC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2NoYXQvdGVzdC9icm93c2VyL3Rlcm1pbmFsSW5pdGlhbEhpbnQudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNyRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSwyRUFBMkUsQ0FBQTtBQUNqSCxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUNwRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDN0UsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFDckYsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDekUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxRQUFRLENBQUE7QUFDcEMsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDL0QsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFeEUsS0FBSyxDQUFDLDZCQUE2QixFQUFFLEdBQUcsRUFBRTtJQUN6QyxNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFBO0lBQ3ZELElBQUksVUFBVSxHQUFHLENBQUMsQ0FBQTtJQUNsQixJQUFJLEtBQWUsQ0FBQTtJQUNuQixJQUFJLGdCQUFrQyxDQUFBO0lBQ3RDLE1BQU0sd0JBQXdC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