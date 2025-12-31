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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb25maWd1cmF0aW9uU2VydmljZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvdGVzdC9icm93c2VyL3Rlcm1pbmFsQ29uZmlndXJhdGlvblNlcnZpY2UudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsY0FBYyxFQUFFLEVBQUUsRUFBRSxXQUFXLEVBQUUsTUFBTSxRQUFRLENBQUE7QUFDeEQsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUNsRSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDaEUsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDM0YsT0FBTyxFQUVOLHFCQUFxQixHQUNyQixNQUFNLCtEQUErRCxDQUFBO0FBQ3RFLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ3hILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLCtFQUErRSxDQUFBO0FBQ3hILE9BQU8sRUFBRSw2QkFBNkIsRUFBZSxNQUFNLDJCQUEyQixDQUFBO0FBQ3RGLE9BQU8sRUFDTixnQ0FBZ0MsRUFDaEMsNkJBQTZCLEdBQzdCLE1BQU0sbURBQW1ELENBQUE7QUFFMUQsS0FBSyxDQUFDLDBDQUEwQyxFQUFFLEdBQUcsRUFBRTtJQUN0RCxNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFBRSxDQUFBO0lBRXZELElBQUksb0JBQThDLENBQUE7SUFDbEQsSUFBSSw0QkFBMkQsQ0FBQTtJQUUvRCxL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