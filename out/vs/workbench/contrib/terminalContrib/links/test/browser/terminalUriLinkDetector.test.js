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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxVcmlMaW5rRGV0ZWN0b3IudGVzdC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9saW5rcy90ZXN0L2Jyb3dzZXIvdGVybWluYWxVcmlMaW5rRGV0ZWN0b3IudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxrRUFBa0UsQ0FBQTtBQUN4RyxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSxrRkFBa0YsQ0FBQTtBQUMzSCxPQUFPLEVBQUUsWUFBWSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDL0UsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sa0ZBQWtGLENBQUE7QUFFM0gsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sdUNBQXVDLENBQUE7QUFDNUUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFDbEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDckQsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUcxRCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUNyRyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDN0UsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sd0RBQXdELENBQUE7QUFFNUYsS0FBSyxDQUFDLHFDQUFxQyxFQUFFLEdBQUcsRUFBRTtJQUNqRCxNQUFNLEtBQUssR0FBRyx1Q0FBdUMsRUFB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