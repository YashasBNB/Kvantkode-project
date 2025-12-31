/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual, strictEqual } from 'assert';
import { importAMDNodeModule } from '../../../../../../amdX.js';
import { Color, RGBA } from '../../../../../../base/common/color.js';
import { Emitter } from '../../../../../../base/common/event.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { TerminalCapabilityStore } from '../../../../../../platform/terminal/common/capabilities/terminalCapabilityStore.js';
import { IThemeService } from '../../../../../../platform/theme/common/themeService.js';
import { TestColorTheme, } from '../../../../../../platform/theme/test/common/testThemeService.js';
import { PANEL_BACKGROUND, SIDE_BAR_BACKGROUND } from '../../../../../common/theme.js';
import { XtermTerminal } from '../../../browser/xterm/xtermTerminal.js';
import { TERMINAL_VIEW_ID } from '../../../common/terminal.js';
import { registerColors, TERMINAL_BACKGROUND_COLOR, TERMINAL_CURSOR_BACKGROUND_COLOR, TERMINAL_CURSOR_FOREGROUND_COLOR, TERMINAL_FOREGROUND_COLOR, TERMINAL_INACTIVE_SELECTION_BACKGROUND_COLOR, TERMINAL_SELECTION_BACKGROUND_COLOR, TERMINAL_SELECTION_FOREGROUND_COLOR, } from '../../../common/terminalColorRegistry.js';
import { workbenchInstantiationService } from '../../../../../test/browser/workbenchTestServices.js';
import { XtermAddonImporter, } from '../../../browser/xterm/xtermAddonImporter.js';
registerColors();
class TestWebglAddon {
    constructor() {
        this.onChangeTextureAtlas = new Emitter().event;
        this.onAddTextureAtlasCanvas = new Emitter().event;
        this.onRemoveTextureAtlasCanvas = new Emitter().event;
        this.onContextLoss = new Emitter().event;
    }
    static { this.shouldThrow = false; }
    static { this.isEnabled = false; }
    activate() {
        TestWebglAddon.isEnabled = !TestWebglAddon.shouldThrow;
        if (TestWebglAddon.shouldThrow) {
            throw new Error('Test webgl set to throw');
        }
    }
    dispose() {
        TestWebglAddon.isEnabled = false;
    }
    clearTextureAtlas() { }
}
class TestXtermAddonImporter extends XtermAddonImporter {
    async importAddon(name) {
        if (name === 'webgl') {
            return Promise.resolve(TestWebglAddon);
        }
        return super.importAddon(name);
    }
}
export class TestViewDescriptorService {
    constructor() {
        this._location = 1 /* ViewContainerLocation.Panel */;
        this._onDidChangeLocation = new Emitter();
        this.onDidChangeLocation = this._onDidChangeLocation.event;
    }
    getViewLocationById(id) {
        return this._location;
    }
    moveTerminalToLocation(to) {
        const oldLocation = this._location;
        this._location = to;
        this._onDidChangeLocation.fire({
            views: [{ id: TERMINAL_VIEW_ID }],
            from: oldLocation,
            to,
        });
    }
}
const defaultTerminalConfig = {
    fontFamily: 'monospace',
    fontWeight: 'normal',
    fontWeightBold: 'normal',
    gpuAcceleration: 'off',
    scrollback: 1000,
    fastScrollSensitivity: 2,
    mouseWheelScrollSensitivity: 1,
    unicodeVersion: '6',
};
suite('XtermTerminal', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let configurationService;
    let themeService;
    let xterm;
    let XTermBaseCtor;
    setup(async () => {
        configurationService = new TestConfigurationService({
            editor: {
                fastScrollSensitivity: 2,
                mouseWheelScrollSensitivity: 1,
            },
            files: {},
            terminal: {
                integrated: defaultTerminalConfig,
            },
        });
        instantiationService = workbenchInstantiationService({
            configurationService: () => configurationService,
        }, store);
        themeService = instantiationService.get(IThemeService);
        XTermBaseCtor = (await importAMDNodeModule('@xterm/xterm', 'lib/xterm.js')).Terminal;
        const capabilityStore = store.add(new TerminalCapabilityStore());
        xterm = store.add(instantiationService.createInstance(XtermTerminal, XTermBaseCtor, {
            cols: 80,
            rows: 30,
            xtermColorProvider: { getBackgroundColor: () => undefined },
            capabilities: capabilityStore,
            disableShellIntegrationReporting: true,
            xtermAddonImporter: new TestXtermAddonImporter(),
        }));
        TestWebglAddon.shouldThrow = false;
        TestWebglAddon.isEnabled = false;
    });
    test('should use fallback dimensions of 80x30', () => {
        strictEqual(xterm.raw.cols, 80);
        strictEqual(xterm.raw.rows, 30);
    });
    suite('theme', () => {
        test('should apply correct background color based on getBackgroundColor', () => {
            themeService.setTheme(new TestColorTheme({
                [PANEL_BACKGROUND]: '#ff0000',
                [SIDE_BAR_BACKGROUND]: '#00ff00',
            }));
            xterm = store.add(instantiationService.createInstance(XtermTerminal, XTermBaseCtor, {
                cols: 80,
                rows: 30,
                xtermAddonImporter: new TestXtermAddonImporter(),
                xtermColorProvider: { getBackgroundColor: () => new Color(new RGBA(255, 0, 0)) },
                capabilities: store.add(new TerminalCapabilityStore()),
                disableShellIntegrationReporting: true,
            }));
            strictEqual(xterm.raw.options.theme?.background, '#ff0000');
        });
        test('should react to and apply theme changes', () => {
            themeService.setTheme(new TestColorTheme({
                [TERMINAL_BACKGROUND_COLOR]: '#000100',
                [TERMINAL_FOREGROUND_COLOR]: '#000200',
                [TERMINAL_CURSOR_FOREGROUND_COLOR]: '#000300',
                [TERMINAL_CURSOR_BACKGROUND_COLOR]: '#000400',
                [TERMINAL_SELECTION_BACKGROUND_COLOR]: '#000500',
                [TERMINAL_INACTIVE_SELECTION_BACKGROUND_COLOR]: '#000600',
                [TERMINAL_SELECTION_FOREGROUND_COLOR]: undefined,
                'terminal.ansiBlack': '#010000',
                'terminal.ansiRed': '#020000',
                'terminal.ansiGreen': '#030000',
                'terminal.ansiYellow': '#040000',
                'terminal.ansiBlue': '#050000',
                'terminal.ansiMagenta': '#060000',
                'terminal.ansiCyan': '#070000',
                'terminal.ansiWhite': '#080000',
                'terminal.ansiBrightBlack': '#090000',
                'terminal.ansiBrightRed': '#100000',
                'terminal.ansiBrightGreen': '#110000',
                'terminal.ansiBrightYellow': '#120000',
                'terminal.ansiBrightBlue': '#130000',
                'terminal.ansiBrightMagenta': '#140000',
                'terminal.ansiBrightCyan': '#150000',
                'terminal.ansiBrightWhite': '#160000',
            }));
            xterm = store.add(instantiationService.createInstance(XtermTerminal, XTermBaseCtor, {
                cols: 80,
                rows: 30,
                xtermAddonImporter: new TestXtermAddonImporter(),
                xtermColorProvider: { getBackgroundColor: () => undefined },
                capabilities: store.add(new TerminalCapabilityStore()),
                disableShellIntegrationReporting: true,
            }));
            deepStrictEqual(xterm.raw.options.theme, {
                background: undefined,
                foreground: '#000200',
                cursor: '#000300',
                cursorAccent: '#000400',
                selectionBackground: '#000500',
                selectionInactiveBackground: '#000600',
                selectionForeground: undefined,
                overviewRulerBorder: undefined,
                scrollbarSliderActiveBackground: undefined,
                scrollbarSliderBackground: undefined,
                scrollbarSliderHoverBackground: undefined,
                black: '#010000',
                green: '#030000',
                red: '#020000',
                yellow: '#040000',
                blue: '#050000',
                magenta: '#060000',
                cyan: '#070000',
                white: '#080000',
                brightBlack: '#090000',
                brightRed: '#100000',
                brightGreen: '#110000',
                brightYellow: '#120000',
                brightBlue: '#130000',
                brightMagenta: '#140000',
                brightCyan: '#150000',
                brightWhite: '#160000',
            });
            themeService.setTheme(new TestColorTheme({
                [TERMINAL_BACKGROUND_COLOR]: '#00010f',
                [TERMINAL_FOREGROUND_COLOR]: '#00020f',
                [TERMINAL_CURSOR_FOREGROUND_COLOR]: '#00030f',
                [TERMINAL_CURSOR_BACKGROUND_COLOR]: '#00040f',
                [TERMINAL_SELECTION_BACKGROUND_COLOR]: '#00050f',
                [TERMINAL_INACTIVE_SELECTION_BACKGROUND_COLOR]: '#00060f',
                [TERMINAL_SELECTION_FOREGROUND_COLOR]: '#00070f',
                'terminal.ansiBlack': '#01000f',
                'terminal.ansiRed': '#02000f',
                'terminal.ansiGreen': '#03000f',
                'terminal.ansiYellow': '#04000f',
                'terminal.ansiBlue': '#05000f',
                'terminal.ansiMagenta': '#06000f',
                'terminal.ansiCyan': '#07000f',
                'terminal.ansiWhite': '#08000f',
                'terminal.ansiBrightBlack': '#09000f',
                'terminal.ansiBrightRed': '#10000f',
                'terminal.ansiBrightGreen': '#11000f',
                'terminal.ansiBrightYellow': '#12000f',
                'terminal.ansiBrightBlue': '#13000f',
                'terminal.ansiBrightMagenta': '#14000f',
                'terminal.ansiBrightCyan': '#15000f',
                'terminal.ansiBrightWhite': '#16000f',
            }));
            deepStrictEqual(xterm.raw.options.theme, {
                background: undefined,
                foreground: '#00020f',
                cursor: '#00030f',
                cursorAccent: '#00040f',
                selectionBackground: '#00050f',
                selectionInactiveBackground: '#00060f',
                selectionForeground: '#00070f',
                overviewRulerBorder: undefined,
                scrollbarSliderActiveBackground: undefined,
                scrollbarSliderBackground: undefined,
                scrollbarSliderHoverBackground: undefined,
                black: '#01000f',
                green: '#03000f',
                red: '#02000f',
                yellow: '#04000f',
                blue: '#05000f',
                magenta: '#06000f',
                cyan: '#07000f',
                white: '#08000f',
                brightBlack: '#09000f',
                brightRed: '#10000f',
                brightGreen: '#11000f',
                brightYellow: '#12000f',
                brightBlue: '#13000f',
                brightMagenta: '#14000f',
                brightCyan: '#15000f',
                brightWhite: '#16000f',
            });
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieHRlcm1UZXJtaW5hbC50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWwvdGVzdC9icm93c2VyL3h0ZXJtL3h0ZXJtVGVybWluYWwudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUloRyxPQUFPLEVBQUUsZUFBZSxFQUFFLFdBQVcsRUFBRSxNQUFNLFFBQVEsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsS0FBSyxFQUFFLElBQUksRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3BFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUNoRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUVyRyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxrRkFBa0YsQ0FBQTtBQUUzSCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSxvRkFBb0YsQ0FBQTtBQUM1SCxPQUFPLEVBQUUsYUFBYSxFQUFFLE1BQU0seURBQXlELENBQUE7QUFDdkYsT0FBTyxFQUNOLGNBQWMsR0FFZCxNQUFNLGtFQUFrRSxDQUFBO0FBQ3pFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBTXRGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUN2RSxPQUFPLEVBQTBCLGdCQUFnQixFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDdEYsT0FBTyxFQUNOLGNBQWMsRUFDZCx5QkFBeUIsRUFDekIsZ0NBQWdDLEVBQ2hDLGdDQUFnQyxFQUNoQyx5QkFBeUIsRUFDekIsNENBQTRDLEVBQzVDLG1DQUFtQyxFQUNuQyxtQ0FBbUMsR0FD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