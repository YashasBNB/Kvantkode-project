/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isWindows } from '../../../../../../base/common/platform.js';
import { format } from '../../../../../../base/common/strings.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { TestInstantiationService } from '../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { assertLinkHelper } from './linkTestUtils.js';
import { timeout } from '../../../../../../base/common/async.js';
import { strictEqual } from 'assert';
import { TerminalLinkResolver } from '../../browser/terminalLinkResolver.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { createFileStat } from '../../../../../test/common/workbenchTestServices.js';
import { URI } from '../../../../../../base/common/uri.js';
import { NullLogService } from '../../../../../../platform/log/common/log.js';
import { ITerminalLogService } from '../../../../../../platform/terminal/common/terminal.js';
import { TerminalMultiLineLinkDetector } from '../../browser/terminalMultiLineLinkDetector.js';
import { importAMDNodeModule } from '../../../../../../amdX.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
const unixLinks = [
    // Absolute
    '/foo',
    '/foo/bar',
    '/foo/[bar]',
    '/foo/[bar].baz',
    '/foo/[bar]/baz',
    '/foo/bar+more',
    // User home
    { link: '~/foo', resource: URI.file('/home/foo') },
    // Relative
    { link: './foo', resource: URI.file('/parent/cwd/foo') },
    { link: './$foo', resource: URI.file('/parent/cwd/$foo') },
    { link: '../foo', resource: URI.file('/parent/foo') },
    { link: 'foo/bar', resource: URI.file('/parent/cwd/foo/bar') },
    { link: 'foo/bar+more', resource: URI.file('/parent/cwd/foo/bar+more') },
];
const windowsLinks = [
    // Absolute
    'c:\\foo',
    { link: '\\\\?\\C:\\foo', resource: URI.file('C:\\foo') },
    'c:/foo',
    'c:/foo/bar',
    'c:\\foo\\bar',
    'c:\\foo\\bar+more',
    'c:\\foo/bar\\baz',
    // User home
    { link: '~\\foo', resource: URI.file('C:\\Home\\foo') },
    { link: '~/foo', resource: URI.file('C:\\Home\\foo') },
    // Relative
    { link: '.\\foo', resource: URI.file('C:\\Parent\\Cwd\\foo') },
    { link: './foo', resource: URI.file('C:\\Parent\\Cwd\\foo') },
    { link: './$foo', resource: URI.file('C:\\Parent\\Cwd\\$foo') },
    { link: '..\\foo', resource: URI.file('C:\\Parent\\foo') },
    { link: 'foo/bar', resource: URI.file('C:\\Parent\\Cwd\\foo\\bar') },
    { link: 'foo/bar', resource: URI.file('C:\\Parent\\Cwd\\foo\\bar') },
    { link: 'foo/[bar]', resource: URI.file('C:\\Parent\\Cwd\\foo\\[bar]') },
    { link: 'foo/[bar].baz', resource: URI.file('C:\\Parent\\Cwd\\foo\\[bar].baz') },
    { link: 'foo/[bar]/baz', resource: URI.file('C:\\Parent\\Cwd\\foo\\[bar]/baz') },
    { link: 'foo\\bar', resource: URI.file('C:\\Parent\\Cwd\\foo\\bar') },
    { link: 'foo\\[bar].baz', resource: URI.file('C:\\Parent\\Cwd\\foo\\[bar].baz') },
    { link: 'foo\\[bar]\\baz', resource: URI.file('C:\\Parent\\Cwd\\foo\\[bar]\\baz') },
    { link: 'foo\\bar+more', resource: URI.file('C:\\Parent\\Cwd\\foo\\bar+more') },
];
const supportedLinkFormats = [
    // 5: file content...                         [#181837]
    //   5:3  error                               [#181837]
    { urlFormat: '{0}\r\n{1}:foo', line: '5' },
    { urlFormat: '{0}\r\n{1}: foo', line: '5' },
    { urlFormat: '{0}\r\n5:another link\r\n{1}:{2} foo', line: '5', column: '3' },
    { urlFormat: '{0}\r\n  {1}:{2} foo', line: '5', column: '3' },
    { urlFormat: '{0}\r\n  5:6  error  another one\r\n  {1}:{2}  error', line: '5', column: '3' },
    {
        urlFormat: `{0}\r\n  5:6  error  ${'a'.repeat(80)}\r\n  {1}:{2}  error`,
        line: '5',
        column: '3',
    },
    // @@ ... <to-file-range> @@ content...       [#182878]   (tests check the entire line, so they don't include the line content at the end of the last @@)
    { urlFormat: '+++ b/{0}\r\n@@ -7,6 +{1},7 @@', line: '5' },
    { urlFormat: '+++ b/{0}\r\n@@ -1,1 +1,1 @@\r\nfoo\r\nbar\r\n@@ -7,6 +{1},7 @@', line: '5' },
];
suite('Workbench - TerminalMultiLineLinkDetector', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let instantiationService;
    let configurationService;
    let detector;
    let resolver;
    let xterm;
    let validResources;
    async function assertLinks(type, text, expected) {
        let to;
        const race = await Promise.race([
            assertLinkHelper(text, expected, detector, type).then(() => 'success'),
            (to = timeout(2)).then(() => 'timeout'),
        ]);
        strictEqual(race, 'success', `Awaiting link assertion for "${text}" timed out`);
        to.cancel();
    }
    async function assertLinksMain(link, resource) {
        const uri = resource ?? URI.file(link);
        const lines = link.split('\r\n');
        const lastLine = lines.at(-1);
        // Count lines, accounting for wrapping
        let lineCount = 0;
        for (const line of lines) {
            lineCount += Math.max(Math.ceil(line.length / 80), 1);
        }
        await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, link, [
            {
                uri,
                range: [
                    [1, lineCount],
                    [lastLine.length, lineCount],
                ],
            },
        ]);
    }
    setup(async () => {
        instantiationService = store.add(new TestInstantiationService());
        configurationService = new TestConfigurationService();
        instantiationService.stub(IConfigurationService, configurationService);
        instantiationService.stub(IFileService, {
            async stat(resource) {
                if (!validResources.map((e) => e.path).includes(resource.path)) {
                    throw new Error("Doesn't exist");
                }
                return createFileStat(resource);
            },
        });
        instantiationService.stub(ITerminalLogService, new NullLogService());
        resolver = instantiationService.createInstance(TerminalLinkResolver);
        validResources = [];
        const TerminalCtor = (await importAMDNodeModule('@xterm/xterm', 'lib/xterm.js')).Terminal;
        xterm = new TerminalCtor({ allowProposedApi: true, cols: 80, rows: 30 });
    });
    suite('macOS/Linux', () => {
        setup(() => {
            detector = instantiationService.createInstance(TerminalMultiLineLinkDetector, xterm, {
                initialCwd: '/parent/cwd',
                os: 3 /* OperatingSystem.Linux */,
                remoteAuthority: undefined,
                userHome: '/home',
                backend: undefined,
            }, resolver);
        });
        for (const l of unixLinks) {
            const baseLink = typeof l === 'string' ? l : l.link;
            const resource = typeof l === 'string' ? URI.file(l) : l.resource;
            suite(`Link: ${baseLink}`, () => {
                for (let i = 0; i < supportedLinkFormats.length; i++) {
                    const linkFormat = supportedLinkFormats[i];
                    const formattedLink = format(linkFormat.urlFormat, baseLink, linkFormat.line, linkFormat.column);
                    test(`should detect in "${escapeMultilineTestName(formattedLink)}"`, async () => {
                        validResources = [resource];
                        await assertLinksMain(formattedLink, resource);
                    });
                }
            });
        }
    });
    // Only test these when on Windows because there is special behavior around replacing separators
    // in URI that cannot be changed
    if (isWindows) {
        suite('Windows', () => {
            setup(() => {
                detector = instantiationService.createInstance(TerminalMultiLineLinkDetector, xterm, {
                    initialCwd: 'C:\\Parent\\Cwd',
                    os: 1 /* OperatingSystem.Windows */,
                    remoteAuthority: undefined,
                    userHome: 'C:\\Home',
                }, resolver);
            });
            for (const l of windowsLinks) {
                const baseLink = typeof l === 'string' ? l : l.link;
                const resource = typeof l === 'string' ? URI.file(l) : l.resource;
                suite(`Link "${baseLink}"`, () => {
                    for (let i = 0; i < supportedLinkFormats.length; i++) {
                        const linkFormat = supportedLinkFormats[i];
                        const formattedLink = format(linkFormat.urlFormat, baseLink, linkFormat.line, linkFormat.column);
                        test(`should detect in "${escapeMultilineTestName(formattedLink)}"`, async () => {
                            validResources = [resource];
                            await assertLinksMain(formattedLink, resource);
                        });
                    }
                });
            }
        });
    }
});
function escapeMultilineTestName(text) {
    return text.replaceAll('\r\n', '\\r\\n');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxNdWx0aUxpbmVMaW5rRGV0ZWN0b3IudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9saW5rcy90ZXN0L2Jyb3dzZXIvdGVybWluYWxNdWx0aUxpbmVMaW5rRGV0ZWN0b3IudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsU0FBUyxFQUFtQixNQUFNLDJDQUEyQyxDQUFBO0FBQ3RGLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUN4RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxrRkFBa0YsQ0FBQTtBQUMzSCxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxrRkFBa0YsQ0FBQTtBQUUzSCxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUVyRCxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDaEUsT0FBTyxFQUFFLFdBQVcsRUFBRSxNQUFNLFFBQVEsQ0FBQTtBQUNwQyxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDL0UsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDN0UsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFDNUYsT0FBTyxFQUFFLDZCQUE2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