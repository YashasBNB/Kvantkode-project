/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { notEqual, strictEqual, throws } from 'assert';
import { importAMDNodeModule } from '../../../../../../amdX.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { CommandDetectionCapability } from '../../../../../../platform/terminal/common/capabilities/commandDetectionCapability.js';
import { TerminalCapabilityStore } from '../../../../../../platform/terminal/common/capabilities/terminalCapabilityStore.js';
import { DecorationAddon } from '../../../browser/xterm/decorationAddon.js';
import { workbenchInstantiationService } from '../../../../../test/browser/workbenchTestServices.js';
suite('DecorationAddon', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let decorationAddon;
    let xterm;
    setup(async () => {
        const TerminalCtor = (await importAMDNodeModule('@xterm/xterm', 'lib/xterm.js')).Terminal;
        class TestTerminal extends TerminalCtor {
            registerDecoration(decorationOptions) {
                if (decorationOptions.marker.isDisposed) {
                    return undefined;
                }
                const element = document.createElement('div');
                return {
                    marker: decorationOptions.marker,
                    element,
                    onDispose: () => { },
                    isDisposed: false,
                    dispose: () => { },
                    onRender: (element) => {
                        return element;
                    },
                };
            }
        }
        const instantiationService = workbenchInstantiationService({
            configurationService: () => new TestConfigurationService({
                files: {},
                workbench: {
                    hover: { delay: 5 },
                },
                terminal: {
                    integrated: {
                        shellIntegration: {
                            decorationsEnabled: 'both',
                        },
                    },
                },
            }),
        }, store);
        xterm = store.add(new TestTerminal({
            allowProposedApi: true,
            cols: 80,
            rows: 30,
        }));
        const capabilities = store.add(new TerminalCapabilityStore());
        capabilities.add(2 /* TerminalCapability.CommandDetection */, store.add(instantiationService.createInstance(CommandDetectionCapability, xterm)));
        decorationAddon = store.add(instantiationService.createInstance(DecorationAddon, capabilities));
        xterm.loadAddon(decorationAddon);
    });
    suite('registerDecoration', () => {
        test('should throw when command has no marker', async () => {
            throws(() => decorationAddon.registerCommandDecoration({
                command: 'cd src',
                timestamp: Date.now(),
                hasOutput: () => false,
            }));
        });
        test('should return undefined when marker has been disposed of', async () => {
            const marker = xterm.registerMarker(1);
            marker?.dispose();
            strictEqual(decorationAddon.registerCommandDecoration({
                command: 'cd src',
                marker,
                timestamp: Date.now(),
                hasOutput: () => false,
            }), undefined);
        });
        test('should return decoration when marker has not been disposed of', async () => {
            const marker = xterm.registerMarker(2);
            notEqual(decorationAddon.registerCommandDecoration({
                command: 'cd src',
                marker,
                timestamp: Date.now(),
                hasOutput: () => false,
            }), undefined);
        });
        test('should return decoration with mark properties', async () => {
            const marker = xterm.registerMarker(2);
            notEqual(decorationAddon.registerCommandDecoration(undefined, undefined, { marker }), undefined);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvbkFkZG9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL3Rlc3QvYnJvd3Nlci94dGVybS9kZWNvcmF0aW9uQWRkb24udGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLFdBQVcsRUFBRSxNQUFNLEVBQUUsTUFBTSxRQUFRLENBQUE7QUFDdEQsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDL0QsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDckcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sa0ZBQWtGLENBQUE7QUFLM0gsT0FBTyxFQUFFLDBCQUEwQixFQUFFLE1BQU0sdUZBQXVGLENBQUE7QUFDbEksT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sb0ZBQW9GLENBQUE7QUFDNUgsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQzNFLE9BQU8sRUFBRSw2QkFBNkIsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBRXBHLEtBQUssQ0FBQyxpQkFBaUIsRUFBRSxHQUFHLEVBQUU7SUFDN0IsTUFBTSxLQUFLLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUV2RCxJQUFJLGVBQWdDLENBQUE7SUFDcEMsSUFBSSxLQUF1QixDQUFBO0lBRTNCLEtBQUssQ0FBQyxLQUFLLElBQUksRUFBRTtRQUNoQixNQUFNLFlBQVksR0FBRyxDQUNwQixNQUFNLG1CQUFtQixDQUFnQyxjQUFjLEVBQUUsY0FBYyxDQUFDLENBQ3hGLENBQUMsUUFBUSxDQUFBO1FBQ1YsTUFBTSxZQUFhLFNBQVEsWUFBWTtZQUM3QixrQkFBa0IsQ0FBQyxpQkFBcUM7Z0JB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