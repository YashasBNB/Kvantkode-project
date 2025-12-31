/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { deepStrictEqual, strictEqual } from 'assert';
import { equals } from '../../../../../../base/common/arrays.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { ContextMenuService } from '../../../../../../platform/contextview/browser/contextMenuService.js';
import { IContextMenuService } from '../../../../../../platform/contextview/browser/contextView.js';
import { TestInstantiationService } from '../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { ILogService, NullLogService } from '../../../../../../platform/log/common/log.js';
import { IStorageService } from '../../../../../../platform/storage/common/storage.js';
import { IThemeService } from '../../../../../../platform/theme/common/themeService.js';
import { TestThemeService } from '../../../../../../platform/theme/test/common/testThemeService.js';
import { IViewDescriptorService } from '../../../../../common/views.js';
import { TerminalLinkManager } from '../../browser/terminalLinkManager.js';
import { TestViewDescriptorService } from '../../../../terminal/test/browser/xterm/xtermTerminal.test.js';
import { TestStorageService } from '../../../../../test/common/workbenchTestServices.js';
import { TerminalLinkResolver } from '../../browser/terminalLinkResolver.js';
import { importAMDNodeModule } from '../../../../../../amdX.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
const defaultTerminalConfig = {
    fontFamily: 'monospace',
    fontWeight: 'normal',
    fontWeightBold: 'normal',
    gpuAcceleration: 'off',
    scrollback: 1000,
    fastScrollSensitivity: 2,
    mouseWheelScrollSensitivity: 1,
    unicodeVersion: '11',
    wordSeparators: ' ()[]{}\',"`─‘’“”',
};
class TestLinkManager extends TerminalLinkManager {
    async _getLinksForType(y, type) {
        switch (type) {
            case 'word':
                return this._links?.wordLinks?.[y] ? [this._links?.wordLinks?.[y]] : undefined;
            case 'url':
                return this._links?.webLinks?.[y] ? [this._links?.webLinks?.[y]] : undefined;
            case 'localFile':
                return this._links?.fileLinks?.[y] ? [this._links?.fileLinks?.[y]] : undefined;
        }
    }
    setLinks(links) {
        this._links = links;
    }
}
suite('TerminalLinkManager', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let configurationService;
    let themeService;
    let viewDescriptorService;
    let xterm;
    let linkManager;
    setup(async () => {
        configurationService = new TestConfigurationService({
            editor: {
                fastScrollSensitivity: 2,
                mouseWheelScrollSensitivity: 1,
            },
            terminal: {
                integrated: defaultTerminalConfig,
            },
        });
        themeService = new TestThemeService();
        viewDescriptorService = new TestViewDescriptorService();
        instantiationService = store.add(new TestInstantiationService());
        instantiationService.stub(IContextMenuService, store.add(instantiationService.createInstance(ContextMenuService)));
        instantiationService.stub(IConfigurationService, configurationService);
        instantiationService.stub(ILogService, new NullLogService());
        instantiationService.stub(IStorageService, store.add(new TestStorageService()));
        instantiationService.stub(IThemeService, themeService);
        instantiationService.stub(IViewDescriptorService, viewDescriptorService);
        const TerminalCtor = (await importAMDNodeModule('@xterm/xterm', 'lib/xterm.js')).Terminal;
        xterm = store.add(new TerminalCtor({ allowProposedApi: true, cols: 80, rows: 30 }));
        linkManager = store.add(instantiationService.createInstance(TestLinkManager, xterm, upcastPartial({
            get initialCwd() {
                return '';
            },
        }), {
            get(capability) {
                return undefined;
            },
        }, instantiationService.createInstance(TerminalLinkResolver)));
    });
    suite('registerExternalLinkProvider', () => {
        test('should not leak disposables if the link manager is already disposed', () => {
            linkManager.externalProvideLinksCb = async () => undefined;
            linkManager.dispose();
            linkManager.externalProvideLinksCb = async () => undefined;
        });
    });
    suite('getLinks and open recent link', () => {
        test('should return no links', async () => {
            const links = await linkManager.getLinks();
            equals(links.viewport.webLinks, []);
            equals(links.viewport.wordLinks, []);
            equals(links.viewport.fileLinks, []);
            const webLink = await linkManager.openRecentLink('url');
            strictEqual(webLink, undefined);
            const fileLink = await linkManager.openRecentLink('localFile');
            strictEqual(fileLink, undefined);
        });
        test('should return word links in order', async () => {
            const link1 = {
                range: {
                    start: { x: 1, y: 1 },
                    end: { x: 14, y: 1 },
                },
                text: '1_我是学生.txt',
                activate: () => Promise.resolve(''),
            };
            const link2 = {
                range: {
                    start: { x: 1, y: 1 },
                    end: { x: 14, y: 1 },
                },
                text: '2_我是学生.txt',
                activate: () => Promise.resolve(''),
            };
            linkManager.setLinks({ wordLinks: [link1, link2] });
            const links = await linkManager.getLinks();
            deepStrictEqual(links.viewport.wordLinks?.[0].text, link2.text);
            deepStrictEqual(links.viewport.wordLinks?.[1].text, link1.text);
            const webLink = await linkManager.openRecentLink('url');
            strictEqual(webLink, undefined);
            const fileLink = await linkManager.openRecentLink('localFile');
            strictEqual(fileLink, undefined);
        });
        test('should return web links in order', async () => {
            const link1 = {
                range: { start: { x: 5, y: 1 }, end: { x: 40, y: 1 } },
                text: 'https://foo.bar/[this is foo site 1]',
                activate: () => Promise.resolve(''),
            };
            const link2 = {
                range: { start: { x: 5, y: 2 }, end: { x: 40, y: 2 } },
                text: 'https://foo.bar/[this is foo site 2]',
                activate: () => Promise.resolve(''),
            };
            linkManager.setLinks({ webLinks: [link1, link2] });
            const links = await linkManager.getLinks();
            deepStrictEqual(links.viewport.webLinks?.[0].text, link2.text);
            deepStrictEqual(links.viewport.webLinks?.[1].text, link1.text);
            const webLink = await linkManager.openRecentLink('url');
            strictEqual(webLink, link2);
            const fileLink = await linkManager.openRecentLink('localFile');
            strictEqual(fileLink, undefined);
        });
        test('should return file links in order', async () => {
            const link1 = {
                range: { start: { x: 1, y: 1 }, end: { x: 32, y: 1 } },
                text: 'file:///C:/users/test/file_1.txt',
                activate: () => Promise.resolve(''),
            };
            const link2 = {
                range: { start: { x: 1, y: 2 }, end: { x: 32, y: 2 } },
                text: 'file:///C:/users/test/file_2.txt',
                activate: () => Promise.resolve(''),
            };
            linkManager.setLinks({ fileLinks: [link1, link2] });
            const links = await linkManager.getLinks();
            deepStrictEqual(links.viewport.fileLinks?.[0].text, link2.text);
            deepStrictEqual(links.viewport.fileLinks?.[1].text, link1.text);
            const webLink = await linkManager.openRecentLink('url');
            strictEqual(webLink, undefined);
            linkManager.setLinks({ fileLinks: [link2] });
            const fileLink = await linkManager.openRecentLink('localFile');
            strictEqual(fileLink, link2);
        });
    });
});
function upcastPartial(v) {
    return v;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxMaW5rTWFuYWdlci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2xpbmtzL3Rlc3QvYnJvd3Nlci90ZXJtaW5hbExpbmtNYW5hZ2VyLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLGVBQWUsRUFBRSxXQUFXLEVBQUUsTUFBTSxRQUFRLENBQUE7QUFDckQsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLHlDQUF5QyxDQUFBO0FBRWhFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ3hHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGtGQUFrRixDQUFBO0FBQzNILE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHNFQUFzRSxDQUFBO0FBQ3pHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLCtEQUErRCxDQUFBO0FBQ25HLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGtGQUFrRixDQUFBO0FBQzNILE9BQU8sRUFBRSxXQUFXLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDMUYsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLHNEQUFzRCxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSx5REFBeUQsQ0FBQTtBQUN2RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUN2RSxPQUFPLEVBQWtCLG1CQUFtQixFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFVMUYsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sK0RBQStELENBQUE7QUFDekcsT0FBTyxFQUFF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