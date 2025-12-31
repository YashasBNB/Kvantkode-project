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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVjb3JhdGlvbkFkZG9uLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC90ZXN0L2Jyb3dzZXIveHRlcm0vZGVjb3JhdGlvbkFkZG9uLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxXQUFXLEVBQUUsTUFBTSxFQUFFLE1BQU0sUUFBUSxDQUFBO0FBQ3RELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQy9ELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3JHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGtGQUFrRixDQUFBO0FBSzNILE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxNQUFNLHVGQUF1RixDQUFBO0FBQ2xJLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLG9GQUFvRixDQUFBO0FBQzVILE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsNkJBQTZCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUVwRyxLQUFLLENBQUMsaUJBQWlCLEVBQUUsR0FBRyxFQUFFO0lBQzdCLE1BQU0sS0FBSyxHQUFHLHVDQUF1QyxFQUFFLENBQUE7SUFFdkQsSUFBSSxlQUFnQyxDQUFBO0lBQ3BDLElBQUksS0FBdUIsQ0FBQTtJQUUzQixLQUFLLENBQUMsS0FBSyxJQUFJLEVBQUU7UUFDaEIsTUFBTSxZQUFZLEdBQUcsQ0FDcEIsTUFBTSxtQkFBbUIsQ0FBZ0MsY0FBYyxFQUFFLGNBQWMsQ0FBQyxDQUN4RixDQUFDLFFBQVEsQ0FBQTtRQUNWLE1BQU0sWUFBYSxTQUFRLFlBQVk7WUFDN0Isa0JBQWtCLENBQUMsaUJBQXFDO2dCQUNoRSxJ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