/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { isWindows } from '../../../../../../base/common/platform.js';
import { format } from '../../../../../../base/common/strings.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { TestInstantiationService } from '../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { TerminalLocalLinkDetector } from '../../browser/terminalLocalLinkDetector.js';
import { TerminalCapabilityStore } from '../../../../../../platform/terminal/common/capabilities/terminalCapabilityStore.js';
import { assertLinkHelper } from './linkTestUtils.js';
import { timeout } from '../../../../../../base/common/async.js';
import { strictEqual } from 'assert';
import { TerminalLinkResolver } from '../../browser/terminalLinkResolver.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { createFileStat } from '../../../../../test/common/workbenchTestServices.js';
import { URI } from '../../../../../../base/common/uri.js';
import { NullLogService } from '../../../../../../platform/log/common/log.js';
import { ITerminalLogService } from '../../../../../../platform/terminal/common/terminal.js';
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
    // URI file://
    { link: 'file:///foo', resource: URI.file('/foo') },
    { link: 'file:///foo/bar', resource: URI.file('/foo/bar') },
    { link: 'file:///foo/bar%20baz', resource: URI.file('/foo/bar baz') },
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
    // URI file://
    { link: 'file:///c:/foo', resource: URI.file('c:\\foo') },
    { link: 'file:///c:/foo/bar', resource: URI.file('c:\\foo\\bar') },
    { link: 'file:///c:/foo/bar%20baz', resource: URI.file('c:\\foo\\bar baz') },
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
    { urlFormat: '{0}' },
    { urlFormat: '{0}" on line {1}', line: '5' },
    { urlFormat: '{0}" on line {1}, column {2}', line: '5', column: '3' },
    { urlFormat: '{0}":line {1}', line: '5' },
    { urlFormat: '{0}":line {1}, column {2}', line: '5', column: '3' },
    { urlFormat: '{0}": line {1}', line: '5' },
    { urlFormat: '{0}": line {1}, col {2}', line: '5', column: '3' },
    { urlFormat: '{0}({1})', line: '5' },
    { urlFormat: '{0} ({1})', line: '5' },
    { urlFormat: '{0}, {1}', line: '5' },
    { urlFormat: '{0}({1},{2})', line: '5', column: '3' },
    { urlFormat: '{0} ({1},{2})', line: '5', column: '3' },
    { urlFormat: '{0}: ({1},{2})', line: '5', column: '3' },
    { urlFormat: '{0}({1}, {2})', line: '5', column: '3' },
    { urlFormat: '{0} ({1}, {2})', line: '5', column: '3' },
    { urlFormat: '{0}: ({1}, {2})', line: '5', column: '3' },
    { urlFormat: '{0}({1}:{2})', line: '5', column: '3' },
    { urlFormat: '{0} ({1}:{2})', line: '5', column: '3' },
    { urlFormat: '{0}:{1}', line: '5' },
    { urlFormat: '{0}:{1}:{2}', line: '5', column: '3' },
    { urlFormat: '{0} {1}:{2}', line: '5', column: '3' },
    { urlFormat: '{0}[{1}]', line: '5' },
    { urlFormat: '{0} [{1}]', line: '5' },
    { urlFormat: '{0}[{1},{2}]', line: '5', column: '3' },
    { urlFormat: '{0} [{1},{2}]', line: '5', column: '3' },
    { urlFormat: '{0}: [{1},{2}]', line: '5', column: '3' },
    { urlFormat: '{0}[{1}, {2}]', line: '5', column: '3' },
    { urlFormat: '{0} [{1}, {2}]', line: '5', column: '3' },
    { urlFormat: '{0}: [{1}, {2}]', line: '5', column: '3' },
    { urlFormat: '{0}[{1}:{2}]', line: '5', column: '3' },
    { urlFormat: '{0} [{1}:{2}]', line: '5', column: '3' },
    { urlFormat: '{0}",{1}', line: '5' },
    { urlFormat: "{0}',{1}", line: '5' },
    { urlFormat: '{0}#{1}', line: '5' },
    { urlFormat: '{0}#{1}:{2}', line: '5', column: '5' },
];
const windowsFallbackLinks = [
    'C:\\foo bar',
    'C:\\foo bar\\baz',
    'C:\\foo\\bar baz',
    'C:\\foo/bar baz',
];
const supportedFallbackLinkFormats = [
    // Python style error: File "<path>", line <line>
    { urlFormat: 'File "{0}"', linkCellStartOffset: 5 },
    { urlFormat: 'File "{0}", line {1}', line: '5', linkCellStartOffset: 5 },
    // Unknown tool #200166: FILE  <path>:<line>:<col>
    { urlFormat: ' FILE  {0}', linkCellStartOffset: 7 },
    { urlFormat: ' FILE  {0}:{1}', line: '5', linkCellStartOffset: 7 },
    { urlFormat: ' FILE  {0}:{1}:{2}', line: '5', column: '3', linkCellStartOffset: 7 },
    // Some C++ compile error formats
    { urlFormat: '{0}({1}) :', line: '5', linkCellEndOffset: -2 },
    { urlFormat: '{0}({1},{2}) :', line: '5', column: '3', linkCellEndOffset: -2 },
    { urlFormat: '{0}({1}, {2}) :', line: '5', column: '3', linkCellEndOffset: -2 },
    { urlFormat: '{0}({1}):', line: '5', linkCellEndOffset: -1 },
    { urlFormat: '{0}({1},{2}):', line: '5', column: '3', linkCellEndOffset: -1 },
    { urlFormat: '{0}({1}, {2}):', line: '5', column: '3', linkCellEndOffset: -1 },
    { urlFormat: '{0}:{1} :', line: '5', linkCellEndOffset: -2 },
    { urlFormat: '{0}:{1}:{2} :', line: '5', column: '3', linkCellEndOffset: -2 },
    { urlFormat: '{0}:{1}:', line: '5', linkCellEndOffset: -1 },
    { urlFormat: '{0}:{1}:{2}:', line: '5', column: '3', linkCellEndOffset: -1 },
    // Cmd prompt
    { urlFormat: '{0}>', linkCellEndOffset: -1 },
    // The whole line is the path
    { urlFormat: '{0}' },
];
suite('Workbench - TerminalLocalLinkDetector', () => {
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
    async function assertLinksWithWrapped(link, resource) {
        const uri = resource ?? URI.file(link);
        await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, link, [
            {
                uri,
                range: [
                    [1, 1],
                    [link.length, 1],
                ],
            },
        ]);
        await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, ` ${link} `, [
            {
                uri,
                range: [
                    [2, 1],
                    [link.length + 1, 1],
                ],
            },
        ]);
        await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, `(${link})`, [
            {
                uri,
                range: [
                    [2, 1],
                    [link.length + 1, 1],
                ],
            },
        ]);
        await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, `[${link}]`, [
            {
                uri,
                range: [
                    [2, 1],
                    [link.length + 1, 1],
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
    suite('platform independent', () => {
        setup(() => {
            detector = instantiationService.createInstance(TerminalLocalLinkDetector, xterm, store.add(new TerminalCapabilityStore()), {
                initialCwd: '/parent/cwd',
                os: 3 /* OperatingSystem.Linux */,
                remoteAuthority: undefined,
                userHome: '/home',
                backend: undefined,
            }, resolver);
        });
        test('should support multiple link results', async () => {
            validResources = [URI.file('/parent/cwd/foo'), URI.file('/parent/cwd/bar')];
            await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, './foo ./bar', [
                {
                    range: [
                        [1, 1],
                        [5, 1],
                    ],
                    uri: URI.file('/parent/cwd/foo'),
                },
                {
                    range: [
                        [7, 1],
                        [11, 1],
                    ],
                    uri: URI.file('/parent/cwd/bar'),
                },
            ]);
        });
        test('should support trimming extra quotes', async () => {
            validResources = [URI.file('/parent/cwd/foo')];
            await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, '"foo"" on line 5', [
                {
                    range: [
                        [1, 1],
                        [16, 1],
                    ],
                    uri: URI.file('/parent/cwd/foo'),
                },
            ]);
        });
        test('should support trimming extra square brackets', async () => {
            validResources = [URI.file('/parent/cwd/foo')];
            await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, '"foo]" on line 5', [
                {
                    range: [
                        [1, 1],
                        [16, 1],
                    ],
                    uri: URI.file('/parent/cwd/foo'),
                },
            ]);
        });
    });
    suite('macOS/Linux', () => {
        setup(() => {
            detector = instantiationService.createInstance(TerminalLocalLinkDetector, xterm, store.add(new TerminalCapabilityStore()), {
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
                    test(`should detect in "${formattedLink}"`, async () => {
                        validResources = [resource];
                        await assertLinksWithWrapped(formattedLink, resource);
                    });
                }
            });
        }
        test('Git diff links', async () => {
            validResources = [URI.file('/parent/cwd/foo/bar')];
            await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, `diff --git a/foo/bar b/foo/bar`, [
                {
                    uri: validResources[0],
                    range: [
                        [14, 1],
                        [20, 1],
                    ],
                },
                {
                    uri: validResources[0],
                    range: [
                        [24, 1],
                        [30, 1],
                    ],
                },
            ]);
            await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, `--- a/foo/bar`, [
                {
                    uri: validResources[0],
                    range: [
                        [7, 1],
                        [13, 1],
                    ],
                },
            ]);
            await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, `+++ b/foo/bar`, [
                {
                    uri: validResources[0],
                    range: [
                        [7, 1],
                        [13, 1],
                    ],
                },
            ]);
        });
    });
    // Only test these when on Windows because there is special behavior around replacing separators
    // in URI that cannot be changed
    if (isWindows) {
        suite('Windows', () => {
            const wslUnixToWindowsPathMap = new Map();
            setup(() => {
                detector = instantiationService.createInstance(TerminalLocalLinkDetector, xterm, store.add(new TerminalCapabilityStore()), {
                    initialCwd: 'C:\\Parent\\Cwd',
                    os: 1 /* OperatingSystem.Windows */,
                    remoteAuthority: undefined,
                    userHome: 'C:\\Home',
                    backend: {
                        async getWslPath(original, direction) {
                            if (direction === 'unix-to-win') {
                                return wslUnixToWindowsPathMap.get(original) ?? original;
                            }
                            return original;
                        },
                    },
                }, resolver);
                wslUnixToWindowsPathMap.clear();
            });
            for (const l of windowsLinks) {
                const baseLink = typeof l === 'string' ? l : l.link;
                const resource = typeof l === 'string' ? URI.file(l) : l.resource;
                suite(`Link "${baseLink}"`, () => {
                    for (let i = 0; i < supportedLinkFormats.length; i++) {
                        const linkFormat = supportedLinkFormats[i];
                        const formattedLink = format(linkFormat.urlFormat, baseLink, linkFormat.line, linkFormat.column);
                        test(`should detect in "${formattedLink}"`, async () => {
                            validResources = [resource];
                            await assertLinksWithWrapped(formattedLink, resource);
                        });
                    }
                });
            }
            for (const l of windowsFallbackLinks) {
                const baseLink = typeof l === 'string' ? l : l.link;
                const resource = typeof l === 'string' ? URI.file(l) : l.resource;
                suite(`Fallback link "${baseLink}"`, () => {
                    for (let i = 0; i < supportedFallbackLinkFormats.length; i++) {
                        const linkFormat = supportedFallbackLinkFormats[i];
                        const formattedLink = format(linkFormat.urlFormat, baseLink, linkFormat.line, linkFormat.column);
                        const linkCellStartOffset = linkFormat.linkCellStartOffset ?? 0;
                        const linkCellEndOffset = linkFormat.linkCellEndOffset ?? 0;
                        test(`should detect in "${formattedLink}"`, async () => {
                            validResources = [resource];
                            await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, formattedLink, [
                                {
                                    uri: resource,
                                    range: [
                                        [1 + linkCellStartOffset, 1],
                                        [formattedLink.length + linkCellEndOffset, 1],
                                    ],
                                },
                            ]);
                        });
                    }
                });
            }
            test('Git diff links', async () => {
                const resource = URI.file('C:\\Parent\\Cwd\\foo\\bar');
                validResources = [resource];
                await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, `diff --git a/foo/bar b/foo/bar`, [
                    {
                        uri: resource,
                        range: [
                            [14, 1],
                            [20, 1],
                        ],
                    },
                    {
                        uri: resource,
                        range: [
                            [24, 1],
                            [30, 1],
                        ],
                    },
                ]);
                await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, `--- a/foo/bar`, [
                    {
                        uri: resource,
                        range: [
                            [7, 1],
                            [13, 1],
                        ],
                    },
                ]);
                await assertLinks("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, `+++ b/foo/bar`, [
                    {
                        uri: resource,
                        range: [
                            [7, 1],
                            [13, 1],
                        ],
                    },
                ]);
            });
            suite('WSL', () => {
                test('Unix -> Windows /mnt/ style links', async () => {
                    wslUnixToWindowsPathMap.set('/mnt/c/foo/bar', 'C:\\foo\\bar');
                    validResources = [URI.file('C:\\foo\\bar')];
                    await assertLinksWithWrapped('/mnt/c/foo/bar', validResources[0]);
                });
                test('Windows -> Unix \\\\wsl$\\ style links', async () => {
                    validResources = [URI.file('\\\\wsl$\\Debian\\home\\foo\\bar')];
                    await assertLinksWithWrapped('\\\\wsl$\\Debian\\home\\foo\\bar');
                });
                test('Windows -> Unix \\\\wsl.localhost\\ style links', async () => {
                    validResources = [URI.file('\\\\wsl.localhost\\Debian\\home\\foo\\bar')];
                    await assertLinksWithWrapped('\\\\wsl.localhost\\Debian\\home\\foo\\bar');
                });
            });
        });
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxMb2NhbExpbmtEZXRlY3Rvci50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2xpbmtzL3Rlc3QvYnJvd3Nlci90ZXJtaW5hbExvY2FsTGlua0RldGVjdG9yLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLFNBQVMsRUFBbUIsTUFBTSwyQ0FBMkMsQ0FBQTtBQUN0RixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDakUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDeEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sa0ZBQWtGLENBQUE7QUFDM0gsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sa0ZBQWtGLENBQUE7QUFFM0gsT0FBTyxFQUFFLHlCQUF5QixFQUFFLE1BQU0sNENBQTRDLENBQUE7QUFDdEYsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sb0ZBQW9GLENBQUE7QUFDNUgsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFckQsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxRQUFRLENBQUE7QUFDcEMsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDNUUsT0FBTyxFQUFFLFlBQVksRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQy9FLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUNwRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDMUQsT0FBTyxFQUFFLGNBQWMsRUFBRSxN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