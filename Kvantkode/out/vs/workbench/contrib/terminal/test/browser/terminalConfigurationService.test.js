/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { notStrictEqual, ok, strictEqual } from 'assert';
import { getActiveWindow } from '../../../../../base/browser/dom.js';
import { mainWindow } from '../../../../../base/browser/window.js';
import { isLinux } from '../../../../../base/common/platform.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { EDITOR_FONT_DEFAULTS } from '../../../../../editor/common/config/editorOptions.js';
import { IConfigurationService, } from '../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ITerminalConfigurationService } from '../../browser/terminal.js';
import { TestTerminalConfigurationService, workbenchInstantiationService, } from '../../../../test/browser/workbenchTestServices.js';
suite('Workbench - TerminalConfigurationService', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let configurationService;
    let terminalConfigurationService;
    setup(() => {
        const instantiationService = workbenchInstantiationService(undefined, store);
        configurationService = instantiationService.get(IConfigurationService);
        terminalConfigurationService = instantiationService.get(ITerminalConfigurationService);
    });
    suite('config', () => {
        test('should update on any change to terminal.integrated', () => {
            const originalConfig = terminalConfigurationService.config;
            configurationService.onDidChangeConfigurationEmitter.fire({
                affectsConfiguration: (configuration) => configuration.startsWith('terminal.integrated'),
                affectedKeys: new Set(['terminal.integrated.fontWeight']),
                change: null,
                source: 2 /* ConfigurationTarget.USER */,
            });
            notStrictEqual(terminalConfigurationService.config, originalConfig, 'Object reference must change');
        });
        suite('onConfigChanged', () => {
            test('should fire on any change to terminal.integrated', async () => {
                await new Promise((r) => {
                    store.add(terminalConfigurationService.onConfigChanged(() => r()));
                    configurationService.onDidChangeConfigurationEmitter.fire({
                        affectsConfiguration: (configuration) => configuration.startsWith('terminal.integrated'),
                        affectedKeys: new Set(['terminal.integrated.fontWeight']),
                        change: null,
                        source: 2 /* ConfigurationTarget.USER */,
                    });
                });
            });
        });
    });
    function createTerminalConfigationService(config, linuxDistro) {
        const instantiationService = new TestInstantiationService();
        instantiationService.set(IConfigurationService, new TestConfigurationService(config));
        const terminalConfigurationService = store.add(instantiationService.createInstance(TestTerminalConfigurationService));
        instantiationService.set(ITerminalConfigurationService, terminalConfigurationService);
        terminalConfigurationService.setPanelContainer(mainWindow.document.body);
        if (linuxDistro) {
            terminalConfigurationService.fontMetrics.linuxDistro = linuxDistro;
        }
        return terminalConfigurationService;
    }
    suite('getFont', () => {
        test('fontFamily', () => {
            const terminalConfigurationService = createTerminalConfigationService({
                editor: { fontFamily: 'foo' },
                terminal: { integrated: { fontFamily: 'bar' } },
            });
            ok(terminalConfigurationService.getFont(getActiveWindow()).fontFamily.startsWith('bar'), 'terminal.integrated.fontFamily should be selected over editor.fontFamily');
        });
        test('fontFamily (Linux Fedora)', () => {
            const terminalConfigurationService = createTerminalConfigationService({
                editor: { fontFamily: 'foo' },
                terminal: { integrated: { fontFamily: null } },
            }, 2 /* LinuxDistro.Fedora */);
            ok(terminalConfigurationService
                .getFont(getActiveWindow())
                .fontFamily.startsWith("'DejaVu Sans Mono'"), 'Fedora should have its font overridden when terminal.integrated.fontFamily not set');
        });
        test('fontFamily (Linux Ubuntu)', () => {
            const terminalConfigurationService = createTerminalConfigationService({
                editor: { fontFamily: 'foo' },
                terminal: { integrated: { fontFamily: null } },
            }, 3 /* LinuxDistro.Ubuntu */);
            ok(terminalConfigurationService
                .getFont(getActiveWindow())
                .fontFamily.startsWith("'Ubuntu Mono'"), 'Ubuntu should have its font overridden when terminal.integrated.fontFamily not set');
        });
        test('fontFamily (Linux Unknown)', () => {
            const terminalConfigurationService = createTerminalConfigationService({
                editor: { fontFamily: 'foo' },
                terminal: { integrated: { fontFamily: null } },
            });
            ok(terminalConfigurationService.getFont(getActiveWindow()).fontFamily.startsWith('foo'), 'editor.fontFamily should be the fallback when terminal.integrated.fontFamily not set');
        });
        test('fontSize 10', () => {
            const terminalConfigurationService = createTerminalConfigationService({
                editor: {
                    fontFamily: 'foo',
                    fontSize: 9,
                },
                terminal: {
                    integrated: {
                        fontFamily: 'bar',
                        fontSize: 10,
                    },
                },
            });
            strictEqual(terminalConfigurationService.getFont(getActiveWindow()).fontSize, 10, 'terminal.integrated.fontSize should be selected over editor.fontSize');
        });
        test('fontSize 0', () => {
            let terminalConfigurationService = createTerminalConfigationService({
                editor: {
                    fontFamily: 'foo',
                },
                terminal: {
                    integrated: {
                        fontFamily: null,
                        fontSize: 0,
                    },
                },
            }, 3 /* LinuxDistro.Ubuntu */);
            strictEqual(terminalConfigurationService.getFont(getActiveWindow()).fontSize, 8, 'The minimum terminal font size (with adjustment) should be used when terminal.integrated.fontSize less than it');
            terminalConfigurationService = createTerminalConfigationService({
                editor: {
                    fontFamily: 'foo',
                },
                terminal: {
                    integrated: {
                        fontFamily: null,
                        fontSize: 0,
                    },
                },
            });
            strictEqual(terminalConfigurationService.getFont(getActiveWindow()).fontSize, 6, 'The minimum terminal font size should be used when terminal.integrated.fontSize less than it');
        });
        test('fontSize 1500', () => {
            const terminalConfigurationService = createTerminalConfigationService({
                editor: {
                    fontFamily: 'foo',
                },
                terminal: {
                    integrated: {
                        fontFamily: 0,
                        fontSize: 1500,
                    },
                },
            });
            strictEqual(terminalConfigurationService.getFont(getActiveWindow()).fontSize, 100, 'The maximum terminal font size should be used when terminal.integrated.fontSize more than it');
        });
        test('fontSize null', () => {
            let terminalConfigurationService = createTerminalConfigationService({
                editor: {
                    fontFamily: 'foo',
                },
                terminal: {
                    integrated: {
                        fontFamily: 0,
                        fontSize: null,
                    },
                },
            }, 3 /* LinuxDistro.Ubuntu */);
            strictEqual(terminalConfigurationService.getFont(getActiveWindow()).fontSize, EDITOR_FONT_DEFAULTS.fontSize + 2, 'The default editor font size (with adjustment) should be used when terminal.integrated.fontSize is not set');
            terminalConfigurationService = createTerminalConfigationService({
                editor: {
                    fontFamily: 'foo',
                },
                terminal: {
                    integrated: {
                        fontFamily: 0,
                        fontSize: null,
                    },
                },
            });
            strictEqual(terminalConfigurationService.getFont(getActiveWindow()).fontSize, EDITOR_FONT_DEFAULTS.fontSize, 'The default editor font size should be used when terminal.integrated.fontSize is not set');
        });
        test('lineHeight 2', () => {
            const terminalConfigurationService = createTerminalConfigationService({
                editor: {
                    fontFamily: 'foo',
                    lineHeight: 1,
                },
                terminal: {
                    integrated: {
                        fontFamily: 0,
                        lineHeight: 2,
                    },
                },
            });
            strictEqual(terminalConfigurationService.getFont(getActiveWindow()).lineHeight, 2, 'terminal.integrated.lineHeight should be selected over editor.lineHeight');
        });
        test('lineHeight 0', () => {
            const terminalConfigurationService = createTerminalConfigationService({
                editor: {
                    fontFamily: 'foo',
                    lineHeight: 1,
                },
                terminal: {
                    integrated: {
                        fontFamily: 0,
                        lineHeight: 0,
                    },
                },
            });
            strictEqual(terminalConfigurationService.getFont(getActiveWindow()).lineHeight, isLinux ? 1.1 : 1, 'editor.lineHeight should be the default when terminal.integrated.lineHeight not set');
        });
    });
    suite('configFontIsMonospace', () => {
        test('isMonospace monospace', () => {
            const terminalConfigurationService = createTerminalConfigationService({
                terminal: {
                    integrated: {
                        fontFamily: 'monospace',
                    },
                },
            });
            strictEqual(terminalConfigurationService.configFontIsMonospace(), true, 'monospace is monospaced');
        });
        test('isMonospace sans-serif', () => {
            const terminalConfigurationService = createTerminalConfigationService({
                terminal: {
                    integrated: {
                        fontFamily: 'sans-serif',
                    },
                },
            });
            strictEqual(terminalConfigurationService.configFontIsMonospace(), false, 'sans-serif is not monospaced');
        });
        test('isMonospace serif', () => {
            const terminalConfigurationService = createTerminalConfigationService({
                terminal: {
                    integrated: {
                        fontFamily: 'serif',
                    },
                },
            });
            strictEqual(terminalConfigurationService.configFontIsMonospace(), false, 'serif is not monospaced');
        });
        test('isMonospace monospace falls back to editor.fontFamily', () => {
            const terminalConfigurationService = createTerminalConfigationService({
                editor: {
                    fontFamily: 'monospace',
                },
                terminal: {
                    integrated: {
                        fontFamily: null,
                    },
                },
            });
            strictEqual(terminalConfigurationService.configFontIsMonospace(), true, 'monospace is monospaced');
        });
        test('isMonospace sans-serif falls back to editor.fontFamily', () => {
            const terminalConfigurationService = createTerminalConfigationService({
                editor: {
                    fontFamily: 'sans-serif',
                },
                terminal: {
                    integrated: {
                        fontFamily: null,
                    },
                },
            });
            strictEqual(terminalConfigurationService.configFontIsMonospace(), false, 'sans-serif is not monospaced');
        });
        test('isMonospace serif falls back to editor.fontFamily', () => {
            const terminalConfigurationService = createTerminalConfigationService({
                editor: {
                    fontFamily: 'serif',
                },
                terminal: {
                    integrated: {
                        fontFamily: null,
                    },
                },
            });
            strictEqual(terminalConfigurationService.configFontIsMonospace(), false, 'serif is not monospaced');
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb25maWd1cmF0aW9uU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC90ZXN0L2Jyb3dzZXIvdGVybWluYWxDb25maWd1cmF0aW9uU2VydmljZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxjQUFjLEVBQUUsRUFBRSxFQUFFLFdBQVcsRUFBRSxNQUFNLFFBQVEsQ0FBQTtBQUN4RCxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDcEUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHVDQUF1QyxDQUFBO0FBQ2xFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUMzRixPQUFPLEVBRU4scUJBQXFCLEdBQ3JCLE1BQU0sK0RBQStELENBQUE7QUFDdEUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDeEgsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sK0VBQStFLENBQUE7QUFDeEgsT0FBTyxFQUFFLDZCQUE2QixFQUFlLE1BQU0sMkJBQTJCLENBQUE7QUFDdEYsT0FBTyxFQUNOLGdDQUFnQyxFQUNoQyw2QkFBNkIsR0FDN0IsTUFBTSxtREFBbUQsQ0FBQTtBQUUxRCxLQUFLLENBQUMsMENBQTBDLEVBQUUsR0FBRyxFQUFFO0lBQ3RELE1BQU0sS0FBSyxHQUFHLHVDQUF1QyxFQUFFLENBQUE7SUFFdkQsSUFBSSxvQkFBOEMsQ0FBQTtJQUNsRCxJ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