/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { IFileService } from '../../../../../../platform/files/common/files.js';
import { TestInstantiationService } from '../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { TerminalLinkResolver } from '../../browser/terminalLinkResolver.js';
import { TerminalUriLinkDetector } from '../../browser/terminalUriLinkDetector.js';
import { assertLinkHelper } from './linkTestUtils.js';
import { createFileStat } from '../../../../../test/common/workbenchTestServices.js';
import { URI } from '../../../../../../base/common/uri.js';
import { importAMDNodeModule } from '../../../../../../amdX.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { NullLogService } from '../../../../../../platform/log/common/log.js';
import { ITerminalLogService } from '../../../../../../platform/terminal/common/terminal.js';
suite('Workbench - TerminalUriLinkDetector', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let configurationService;
    let detector;
    let xterm;
    let validResources = [];
    let instantiationService;
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
        validResources = [];
        const TerminalCtor = (await importAMDNodeModule('@xterm/xterm', 'lib/xterm.js')).Terminal;
        xterm = new TerminalCtor({ allowProposedApi: true, cols: 80, rows: 30 });
        detector = instantiationService.createInstance(TerminalUriLinkDetector, xterm, {
            initialCwd: '/parent/cwd',
            os: 3 /* OperatingSystem.Linux */,
            remoteAuthority: undefined,
            userHome: '/home',
            backend: undefined,
        }, instantiationService.createInstance(TerminalLinkResolver));
    });
    teardown(() => {
        instantiationService.dispose();
    });
    async function assertLink(type, text, expected) {
        await assertLinkHelper(text, expected, detector, type);
    }
    const linkComputerCases = [
        [
            "Url" /* TerminalBuiltinLinkType.Url */,
            'x = "http://foo.bar";',
            [
                {
                    range: [
                        [6, 1],
                        [19, 1],
                    ],
                    uri: URI.parse('http://foo.bar'),
                },
            ],
        ],
        [
            "Url" /* TerminalBuiltinLinkType.Url */,
            'x = (http://foo.bar);',
            [
                {
                    range: [
                        [6, 1],
                        [19, 1],
                    ],
                    uri: URI.parse('http://foo.bar'),
                },
            ],
        ],
        [
            "Url" /* TerminalBuiltinLinkType.Url */,
            "x = 'http://foo.bar';",
            [
                {
                    range: [
                        [6, 1],
                        [19, 1],
                    ],
                    uri: URI.parse('http://foo.bar'),
                },
            ],
        ],
        [
            "Url" /* TerminalBuiltinLinkType.Url */,
            'x =  http://foo.bar ;',
            [
                {
                    range: [
                        [6, 1],
                        [19, 1],
                    ],
                    uri: URI.parse('http://foo.bar'),
                },
            ],
        ],
        [
            "Url" /* TerminalBuiltinLinkType.Url */,
            'x = <http://foo.bar>;',
            [
                {
                    range: [
                        [6, 1],
                        [19, 1],
                    ],
                    uri: URI.parse('http://foo.bar'),
                },
            ],
        ],
        [
            "Url" /* TerminalBuiltinLinkType.Url */,
            'x = {http://foo.bar};',
            [
                {
                    range: [
                        [6, 1],
                        [19, 1],
                    ],
                    uri: URI.parse('http://foo.bar'),
                },
            ],
        ],
        [
            "Url" /* TerminalBuiltinLinkType.Url */,
            '(see http://foo.bar)',
            [
                {
                    range: [
                        [6, 1],
                        [19, 1],
                    ],
                    uri: URI.parse('http://foo.bar'),
                },
            ],
        ],
        [
            "Url" /* TerminalBuiltinLinkType.Url */,
            '[see http://foo.bar]',
            [
                {
                    range: [
                        [6, 1],
                        [19, 1],
                    ],
                    uri: URI.parse('http://foo.bar'),
                },
            ],
        ],
        [
            "Url" /* TerminalBuiltinLinkType.Url */,
            '{see http://foo.bar}',
            [
                {
                    range: [
                        [6, 1],
                        [19, 1],
                    ],
                    uri: URI.parse('http://foo.bar'),
                },
            ],
        ],
        [
            "Url" /* TerminalBuiltinLinkType.Url */,
            '<see http://foo.bar>',
            [
                {
                    range: [
                        [6, 1],
                        [19, 1],
                    ],
                    uri: URI.parse('http://foo.bar'),
                },
            ],
        ],
        [
            "Url" /* TerminalBuiltinLinkType.Url */,
            '<url>http://foo.bar</url>',
            [
                {
                    range: [
                        [6, 1],
                        [19, 1],
                    ],
                    uri: URI.parse('http://foo.bar'),
                },
            ],
        ],
        [
            "Url" /* TerminalBuiltinLinkType.Url */,
            '// Click here to learn more. https://go.microsoft.com/fwlink/?LinkID=513275&clcid=0x409',
            [
                {
                    range: [
                        [30, 1],
                        [7, 2],
                    ],
                    uri: URI.parse('https://go.microsoft.com/fwlink/?LinkID=513275&clcid=0x409'),
                },
            ],
        ],
        [
            "Url" /* TerminalBuiltinLinkType.Url */,
            '// Click here to learn more. https://msdn.microsoft.com/en-us/library/windows/desktop/aa365247(v=vs.85).aspx',
            [
                {
                    range: [
                        [30, 1],
                        [28, 2],
                    ],
                    uri: URI.parse('https://msdn.microsoft.com/en-us/library/windows/desktop/aa365247(v=vs.85).aspx'),
                },
            ],
        ],
        [
            "Url" /* TerminalBuiltinLinkType.Url */,
            '// https://github.com/projectkudu/kudu/blob/master/Kudu.Core/Scripts/selectNodeVersion.js',
            [
                {
                    range: [
                        [4, 1],
                        [9, 2],
                    ],
                    uri: URI.parse('https://github.com/projectkudu/kudu/blob/master/Kudu.Core/Scripts/selectNodeVersion.js'),
                },
            ],
        ],
        [
            "Url" /* TerminalBuiltinLinkType.Url */,
            '<!-- !!! Do not remove !!!   WebContentRef(link:https://go.microsoft.com/fwlink/?LinkId=166007, area:Admin, updated:2015, nextUpdate:2016, tags:SqlServer)   !!! Do not remove !!! -->',
            [
                {
                    range: [
                        [49, 1],
                        [14, 2],
                    ],
                    uri: URI.parse('https://go.microsoft.com/fwlink/?LinkId=166007'),
                },
            ],
        ],
        [
            "Url" /* TerminalBuiltinLinkType.Url */,
            'For instructions, see https://go.microsoft.com/fwlink/?LinkId=166007.</value>',
            [
                {
                    range: [
                        [23, 1],
                        [68, 1],
                    ],
                    uri: URI.parse('https://go.microsoft.com/fwlink/?LinkId=166007'),
                },
            ],
        ],
        [
            "Url" /* TerminalBuiltinLinkType.Url */,
            'For instructions, see https://msdn.microsoft.com/en-us/library/windows/desktop/aa365247(v=vs.85).aspx.</value>',
            [
                {
                    range: [
                        [23, 1],
                        [21, 2],
                    ],
                    uri: URI.parse('https://msdn.microsoft.com/en-us/library/windows/desktop/aa365247(v=vs.85).aspx'),
                },
            ],
        ],
        [
            "Url" /* TerminalBuiltinLinkType.Url */,
            'x = "https://en.wikipedia.org/wiki/Zürich";',
            [
                {
                    range: [
                        [6, 1],
                        [41, 1],
                    ],
                    uri: URI.parse('https://en.wikipedia.org/wiki/Zürich'),
                },
            ],
        ],
        [
            "Url" /* TerminalBuiltinLinkType.Url */,
            '請參閱 http://go.microsoft.com/fwlink/?LinkId=761051。',
            [
                {
                    range: [
                        [8, 1],
                        [53, 1],
                    ],
                    uri: URI.parse('http://go.microsoft.com/fwlink/?LinkId=761051'),
                },
            ],
        ],
        [
            "Url" /* TerminalBuiltinLinkType.Url */,
            '（請參閱 http://go.microsoft.com/fwlink/?LinkId=761051）',
            [
                {
                    range: [
                        [10, 1],
                        [55, 1],
                    ],
                    uri: URI.parse('http://go.microsoft.com/fwlink/?LinkId=761051'),
                },
            ],
        ],
        [
            "LocalFile" /* TerminalBuiltinLinkType.LocalFile */,
            'x = "file:///foo.bar";',
            [
                {
                    range: [
                        [6, 1],
                        [20, 1],
                    ],
                    uri: URI.parse('file:///foo.bar'),
                },
            ],
            URI.parse('file:///foo.bar'),
        ],
        [
            "LocalFile" /* TerminalBuiltinLinkType.LocalFile */,
            'x = "file://c:/foo.bar";',
            [
                {
                    range: [
                        [6, 1],
                        [22, 1],
                    ],
                    uri: URI.parse('file://c:/foo.bar'),
                },
            ],
            URI.parse('file://c:/foo.bar'),
        ],
        [
            "LocalFile" /* TerminalBuiltinLinkType.LocalFile */,
            'x = "file://shares/foo.bar";',
            [
                {
                    range: [
                        [6, 1],
                        [26, 1],
                    ],
                    uri: URI.parse('file://shares/foo.bar'),
                },
            ],
            URI.parse('file://shares/foo.bar'),
        ],
        [
            "LocalFile" /* TerminalBuiltinLinkType.LocalFile */,
            'x = "file://shäres/foo.bar";',
            [
                {
                    range: [
                        [6, 1],
                        [26, 1],
                    ],
                    uri: URI.parse('file://shäres/foo.bar'),
                },
            ],
            URI.parse('file://shäres/foo.bar'),
        ],
        [
            "Url" /* TerminalBuiltinLinkType.Url */,
            'Some text, then http://www.bing.com.',
            [
                {
                    range: [
                        [17, 1],
                        [35, 1],
                    ],
                    uri: URI.parse('http://www.bing.com'),
                },
            ],
        ],
        [
            "Url" /* TerminalBuiltinLinkType.Url */,
            "let url = `http://***/_api/web/lists/GetByTitle('Teambuildingaanvragen')/items`;",
            [
                {
                    range: [
                        [12, 1],
                        [78, 1],
                    ],
                    uri: URI.parse("http://***/_api/web/lists/GetByTitle('Teambuildingaanvragen')/items"),
                },
            ],
        ],
        [
            "Url" /* TerminalBuiltinLinkType.Url */,
            '7. At this point, ServiceMain has been called.  There is no functionality presently in ServiceMain, but you can consult the [MSDN documentation](https://msdn.microsoft.com/en-us/library/windows/desktop/ms687414(v=vs.85).aspx) to add functionality as desired!',
            [
                {
                    range: [
                        [66, 2],
                        [64, 3],
                    ],
                    uri: URI.parse('https://msdn.microsoft.com/en-us/library/windows/desktop/ms687414(v=vs.85).aspx'),
                },
            ],
        ],
        [
            "Url" /* TerminalBuiltinLinkType.Url */,
            'let x = "http://[::1]:5000/connect/token"',
            [
                {
                    range: [
                        [10, 1],
                        [40, 1],
                    ],
                    uri: URI.parse('http://[::1]:5000/connect/token'),
                },
            ],
        ],
        [
            "Url" /* TerminalBuiltinLinkType.Url */,
            '2. Navigate to **https://portal.azure.com**',
            [
                {
                    range: [
                        [18, 1],
                        [41, 1],
                    ],
                    uri: URI.parse('https://portal.azure.com'),
                },
            ],
        ],
        [
            "Url" /* TerminalBuiltinLinkType.Url */,
            'POST|https://portal.azure.com|2019-12-05|',
            [
                {
                    range: [
                        [6, 1],
                        [29, 1],
                    ],
                    uri: URI.parse('https://portal.azure.com'),
                },
            ],
        ],
        [
            "Url" /* TerminalBuiltinLinkType.Url */,
            'aa  https://foo.bar/[this is foo site]  aa',
            [
                {
                    range: [
                        [5, 1],
                        [38, 1],
                    ],
                    uri: URI.parse('https://foo.bar/[this is foo site]'),
                },
            ],
        ],
    ];
    for (const c of linkComputerCases) {
        test('link computer case: `' + c[1] + '`', async () => {
            validResources = c[3] ? [c[3]] : [];
            await assertLink(c[0], c[1], c[2]);
        });
    }
    test('should support multiple link results', async () => {
        await assertLink("Url" /* TerminalBuiltinLinkType.Url */, 'http://foo.bar http://bar.foo', [
            {
                range: [
                    [1, 1],
                    [14, 1],
                ],
                uri: URI.parse('http://foo.bar'),
            },
            {
                range: [
                    [16, 1],
                    [29, 1],
                ],
                uri: URI.parse('http://bar.foo'),
            },
        ]);
    });
    test('should detect file:// links with :line suffix', async () => {
        validResources = [URI.file('c:/folder/file')];
        await assertLink("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, 'file:///c:/folder/file:23', [
            {
                range: [
                    [1, 1],
                    [25, 1],
                ],
                uri: URI.parse('file:///c:/folder/file'),
            },
        ]);
    });
    test('should detect file:// links with :line:col suffix', async () => {
        validResources = [URI.file('c:/folder/file')];
        await assertLink("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, 'file:///c:/folder/file:23:10', [
            {
                range: [
                    [1, 1],
                    [28, 1],
                ],
                uri: URI.parse('file:///c:/folder/file'),
            },
        ]);
    });
    test('should filter out https:// link that exceed 4096 characters', async () => {
        // 8 + 200 * 10 = 2008 characters
        await assertLink("Url" /* TerminalBuiltinLinkType.Url */, `https://${'foobarbaz/'.repeat(200)}`, [
            {
                range: [
                    [1, 1],
                    [8, 26],
                ],
                uri: URI.parse(`https://${'foobarbaz/'.repeat(200)}`),
            },
        ]);
        // 8 + 450 * 10 = 4508 characters
        await assertLink("Url" /* TerminalBuiltinLinkType.Url */, `https://${'foobarbaz/'.repeat(450)}`, []);
    });
    test('should filter out file:// links that exceed 4096 characters', async () => {
        // 8 + 200 * 10 = 2008 characters
        validResources = [URI.file(`/${'foobarbaz/'.repeat(200)}`)];
        await assertLink("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, `file:///${'foobarbaz/'.repeat(200)}`, [
            {
                uri: URI.parse(`file:///${'foobarbaz/'.repeat(200)}`),
                range: [
                    [1, 1],
                    [8, 26],
                ],
            },
        ]);
        // 8 + 450 * 10 = 4508 characters
        validResources = [URI.file(`/${'foobarbaz/'.repeat(450)}`)];
        await assertLink("LocalFile" /* TerminalBuiltinLinkType.LocalFile */, `file:///${'foobarbaz/'.repeat(450)}`, []);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxVcmlMaW5rRGV0ZWN0b3IudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVybWluYWxDb250cmliL2xpbmtzL3Rlc3QvYnJvd3Nlci90ZXJtaW5hbFVyaUxpbmtEZXRlY3Rvci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ3hHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGtGQUFrRixDQUFBO0FBQzNILE9BQU8sRUFBRSxZQUFZLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUMvRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxrRkFBa0YsQ0FBQTtBQUUzSCxPQUFPLEVBQUUsb0JBQW9CLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM1RSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNsRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0scURBQXFELENBQUE7QUFDcEYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBRzFELE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQy9ELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSx3REFBd0QsQ0FBQTtBQUU1RixLQUFLLENBQUMscUNBQXFDLEVBQUUsR0FBRyxFQUFFO0lBQ2pELE1BQU0sS0FBSyxHQUFHLHVDQUF1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