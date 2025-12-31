/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { importAMDNodeModule } from '../../../../../../amdX.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../../../platform/configuration/common/configuration.js';
import { TestConfigurationService } from '../../../../../../platform/configuration/test/common/testConfigurationService.js';
import { TestInstantiationService } from '../../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { IProductService } from '../../../../../../platform/product/common/productService.js';
import { TerminalWordLinkDetector } from '../../browser/terminalWordLinkDetector.js';
import { assertLinkHelper } from './linkTestUtils.js';
import { TestProductService } from '../../../../../test/common/workbenchTestServices.js';
suite('Workbench - TerminalWordLinkDetector', () => {
    const store = ensureNoDisposablesAreLeakedInTestSuite();
    let configurationService;
    let detector;
    let xterm;
    let instantiationService;
    setup(async () => {
        instantiationService = store.add(new TestInstantiationService());
        configurationService = new TestConfigurationService();
        await configurationService.setUserConfiguration('terminal', {
            integrated: { wordSeparators: '' },
        });
        instantiationService.stub(IConfigurationService, configurationService);
        instantiationService.set(IProductService, TestProductService);
        const TerminalCtor = (await importAMDNodeModule('@xterm/xterm', 'lib/xterm.js')).Terminal;
        xterm = store.add(new TerminalCtor({ allowProposedApi: true, cols: 80, rows: 30 }));
        detector = store.add(instantiationService.createInstance(TerminalWordLinkDetector, xterm));
    });
    async function assertLink(text, expected) {
        await assertLinkHelper(text, expected, detector, "Search" /* TerminalBuiltinLinkType.Search */);
    }
    suite('should link words as defined by wordSeparators', () => {
        test('" ()[]"', async () => {
            await configurationService.setUserConfiguration('terminal', {
                integrated: { wordSeparators: ' ()[]' },
            });
            configurationService.onDidChangeConfigurationEmitter.fire({
                affectsConfiguration: () => true,
            });
            await assertLink('foo', [
                {
                    range: [
                        [1, 1],
                        [3, 1],
                    ],
                    text: 'foo',
                },
            ]);
            await assertLink(' foo ', [
                {
                    range: [
                        [2, 1],
                        [4, 1],
                    ],
                    text: 'foo',
                },
            ]);
            await assertLink('(foo)', [
                {
                    range: [
                        [2, 1],
                        [4, 1],
                    ],
                    text: 'foo',
                },
            ]);
            await assertLink('[foo]', [
                {
                    range: [
                        [2, 1],
                        [4, 1],
                    ],
                    text: 'foo',
                },
            ]);
            await assertLink('{foo}', [
                {
                    range: [
                        [1, 1],
                        [5, 1],
                    ],
                    text: '{foo}',
                },
            ]);
        });
        test('" "', async () => {
            await configurationService.setUserConfiguration('terminal', {
                integrated: { wordSeparators: ' ' },
            });
            configurationService.onDidChangeConfigurationEmitter.fire({
                affectsConfiguration: () => true,
            });
            await assertLink('foo', [
                {
                    range: [
                        [1, 1],
                        [3, 1],
                    ],
                    text: 'foo',
                },
            ]);
            await assertLink(' foo ', [
                {
                    range: [
                        [2, 1],
                        [4, 1],
                    ],
                    text: 'foo',
                },
            ]);
            await assertLink('(foo)', [
                {
                    range: [
                        [1, 1],
                        [5, 1],
                    ],
                    text: '(foo)',
                },
            ]);
            await assertLink('[foo]', [
                {
                    range: [
                        [1, 1],
                        [5, 1],
                    ],
                    text: '[foo]',
                },
            ]);
            await assertLink('{foo}', [
                {
                    range: [
                        [1, 1],
                        [5, 1],
                    ],
                    text: '{foo}',
                },
            ]);
        });
        test('" []"', async () => {
            await configurationService.setUserConfiguration('terminal', {
                integrated: { wordSeparators: ' []' },
            });
            configurationService.onDidChangeConfigurationEmitter.fire({
                affectsConfiguration: () => true,
            });
            await assertLink('aabbccdd.txt ', [
                {
                    range: [
                        [1, 1],
                        [12, 1],
                    ],
                    text: 'aabbccdd.txt',
                },
            ]);
            await assertLink(' aabbccdd.txt ', [
                {
                    range: [
                        [2, 1],
                        [13, 1],
                    ],
                    text: 'aabbccdd.txt',
                },
            ]);
            await assertLink(' [aabbccdd.txt] ', [
                {
                    range: [
                        [3, 1],
                        [14, 1],
                    ],
                    text: 'aabbccdd.txt',
                },
            ]);
        });
    });
    suite('should ignore powerline symbols', () => {
        for (let i = 0xe0b0; i <= 0xe0bf; i++) {
            test(`\\u${i.toString(16)}`, async () => {
                await assertLink(`${String.fromCharCode(i)}foo${String.fromCharCode(i)}`, [
                    {
                        range: [
                            [2, 1],
                            [4, 1],
                        ],
                        text: 'foo',
                    },
                ]);
            });
        }
    });
    // These are failing - the link's start x is 1 px too far to the right bc it starts
    // with a wide character, which the terminalLinkHelper currently doesn't account for
    test.skip('should support wide characters', async () => {
        await configurationService.setUserConfiguration('terminal', {
            integrated: { wordSeparators: ' []' },
        });
        configurationService.onDidChangeConfigurationEmitter.fire({
            affectsConfiguration: () => true,
        });
        await assertLink('我是学生.txt ', [
            {
                range: [
                    [1, 1],
                    [12, 1],
                ],
                text: '我是学生.txt',
            },
        ]);
        await assertLink(' 我是学生.txt ', [
            {
                range: [
                    [2, 1],
                    [13, 1],
                ],
                text: '我是学生.txt',
            },
        ]);
        await assertLink(' [我是学生.txt] ', [
            {
                range: [
                    [3, 1],
                    [14, 1],
                ],
                text: '我是学生.txt',
            },
        ]);
    });
    test('should support multiple link results', async () => {
        await configurationService.setUserConfiguration('terminal', {
            integrated: { wordSeparators: ' ' },
        });
        configurationService.onDidChangeConfigurationEmitter.fire({
            affectsConfiguration: () => true,
        });
        await assertLink('foo bar', [
            {
                range: [
                    [1, 1],
                    [3, 1],
                ],
                text: 'foo',
            },
            {
                range: [
                    [5, 1],
                    [7, 1],
                ],
                text: 'bar',
            },
        ]);
    });
    test('should remove trailing colon in the link results', async () => {
        await configurationService.setUserConfiguration('terminal', {
            integrated: { wordSeparators: ' ' },
        });
        configurationService.onDidChangeConfigurationEmitter.fire({
            affectsConfiguration: () => true,
        });
        await assertLink('foo:5:6: bar:0:32:', [
            {
                range: [
                    [1, 1],
                    [7, 1],
                ],
                text: 'foo:5:6',
            },
            {
                range: [
                    [10, 1],
                    [17, 1],
                ],
                text: 'bar:0:32',
            },
        ]);
    });
    test('should support wrapping', async () => {
        await configurationService.setUserConfiguration('terminal', {
            integrated: { wordSeparators: ' ' },
        });
        configurationService.onDidChangeConfigurationEmitter.fire({
            affectsConfiguration: () => true,
        });
        await assertLink('fsdjfsdkfjslkdfjskdfjsldkfjsdlkfjslkdjfskldjflskdfjskldjflskdfjsdklfjsdklfjsldkfjsdlkfjsdlkfjsdlkfjsldkfjslkdfjsdlkfjsldkfjsdlkfjskdfjsldkfjsdlkfjslkdfjsdlkfjsldkfjsldkfjsldkfjslkdfjsdlkfjslkdfjsdklfsd', [
            {
                range: [
                    [1, 1],
                    [41, 3],
                ],
                text: 'fsdjfsdkfjslkdfjskdfjsldkfjsdlkfjslkdjfskldjflskdfjskldjflskdfjsdklfjsdklfjsldkfjsdlkfjsdlkfjsdlkfjsldkfjslkdfjsdlkfjsldkfjsdlkfjskdfjsldkfjsdlkfjslkdfjsdlkfjsldkfjsldkfjsldkfjslkdfjsdlkfjslkdfjsdklfsd',
            },
        ]);
    });
    test('should support wrapping with multiple links', async () => {
        await configurationService.setUserConfiguration('terminal', {
            integrated: { wordSeparators: ' ' },
        });
        configurationService.onDidChangeConfigurationEmitter.fire({
            affectsConfiguration: () => true,
        });
        await assertLink('fsdjfsdkfjslkdfjskdfjsldkfj sdlkfjslkdjfskldjflskdfjskldjflskdfj sdklfjsdklfjsldkfjsdlkfjsdlkfjsdlkfjsldkfjslkdfjsdlkfjsldkfjsdlkfjskdfjsldkfjsdlkfjslkdfjsdlkfjsldkfjsldkfjsldkfjslkdfjsdlkfjslkdfjsdklfsd', [
            {
                range: [
                    [1, 1],
                    [27, 1],
                ],
                text: 'fsdjfsdkfjslkdfjskdfjsldkfj',
            },
            {
                range: [
                    [29, 1],
                    [64, 1],
                ],
                text: 'sdlkfjslkdjfskldjflskdfjskldjflskdfj',
            },
            {
                range: [
                    [66, 1],
                    [43, 3],
                ],
                text: 'sdklfjsdklfjsldkfjsdlkfjsdlkfjsdlkfjsldkfjslkdfjsdlkfjsldkfjsdlkfjskdfjsldkfjsdlkfjslkdfjsdlkfjsldkfjsldkfjsldkfjslkdfjsdlkfjslkdfjsdklfsd',
            },
        ]);
    });
    test('does not return any links for empty text', async () => {
        await configurationService.setUserConfiguration('terminal', {
            integrated: { wordSeparators: ' ' },
        });
        configurationService.onDidChangeConfigurationEmitter.fire({
            affectsConfiguration: () => true,
        });
        await assertLink('', []);
    });
    test('should support file scheme links', async () => {
        await configurationService.setUserConfiguration('terminal', {
            integrated: { wordSeparators: ' ' },
        });
        configurationService.onDidChangeConfigurationEmitter.fire({
            affectsConfiguration: () => true,
        });
        await assertLink('file:///C:/users/test/file.txt ', [
            {
                range: [
                    [1, 1],
                    [30, 1],
                ],
                text: 'file:///C:/users/test/file.txt',
            },
        ]);
        await assertLink('file:///C:/users/test/file.txt:1:10 ', [
            {
                range: [
                    [1, 1],
                    [35, 1],
                ],
                text: 'file:///C:/users/test/file.txt:1:10',
            },
        ]);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxXb3JkTGlua0RldGVjdG9yLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvbGlua3MvdGVzdC9icm93c2VyL3Rlcm1pbmFsV29yZExpbmtEZXRlY3Rvci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBQy9ELE9BQU8sRUFBRSx1Q0FBdUMsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBQ3JHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLGtFQUFrRSxDQUFBO0FBQ3hHLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGtGQUFrRixDQUFBO0FBQzNILE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLGtGQUFrRixDQUFBO0FBQzNILE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSw2REFBNkQsQ0FBQTtBQUU3RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSwyQ0FBMkMsQ0FBQTtBQUNwRixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUNyRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxxREFBcUQsQ0FBQTtBQUd4RixLQUFLLENBQUMsc0NBQXNDLEVBQUUsR0FBRyxFQUFFO0lBQ2xELE1BQU0sS0FBSyxHQUFHLHVDQUF1QyxFQUFFLENBQUE7SUFFdkQsSUFBSSxvQkFBOEMsQ0FBQTtJQUNsRCxJQUFJLFFBQWtDLENBQUE7SUFDdEMsSUFBSSxLQUFlLENBQUE7SUFDbkIsSUFBSSxvQkFBOEMsQ0FBQTtJQUVsRCxLQUFLLENBQUMsS0FBSyxJQUFJLEVBQUU7UUFDaEIsb0JBQW9CLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLHdCQUF3QixFQUFFLENBQUMsQ0FBQTtRQUNoRSxvQkFBb0IsR0FBRyxJQUFJLHdCQUF3QixFQUFFLENBQUE7UUFDckQsTUFBTSxvQkFBb0IsQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLEVBQUU7WUFDM0QsVUFBVSxFQUFFLEVBQUUsY0FBYyxFQUFFLEVBQUUsRUFBRTtTQUNsQyxDQUFDLENBQUE7UUFFRixvQkFBb0IsQ0FBQyxJQUFJLENBQUMscUJBQXFCLEVBQUUsb0JBQW9CLENBQUMsQ0FBQTtRQUN0RSxvQkFBb0IsQ0FBQyxHQUFHLENBQUMsZUFBZSxFQUFFLGtCQUFrQixDQUFDLENBQUE7UUFFN0QsTUFBTSxZQUFZLEdBQUcsQ0FDcEIsTUFBTSxtQkFBbUIsQ0FBZ0MsY0FBYyxFQUFFLGNBQWMsQ0FBQyxDQUN4RixDQUFDLFFBQVEsQ0FBQTtRQUNWLEtBQUssR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksWUFBWSxDQUFDLEVBQUUsZ0JBQWdCLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNuRixRQUFRLEdBQUcsS0FBSyxDQUFDLEdBQUcsQ0FBQyxvQkFBb0IsQ0FBQyxjQUFjLENBQUMsd0JBQXdCLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQTtJQUMzRixDQUFDLENBQUMsQ0FBQTtJQUVGLEtBQUssVUFBVSxVQUFVLENBQ3hCLElBQVksRUFDWixRQUErRTtRQUUvRSxNQUFNLGdCQUFnQixDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsUUFBUSxnREFBaUMsQ0FBQTtJQUNqRixDQUFDO0lBRUQsS0FBSyxDQUFDLGdEQUFnRCxFQUFFLEdBQUcsRUFBRTtRQUM1RCxJQUFJLENBQUMsU0FBUyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQzFCLE1BQU0sb0JBQW9CLENBQUMsb0JBQW9CLENBQUMsVUFBVSxFQUFFO2dCQUMzRCxVQUFVLEVBQUUsRUFBRSxjQUFjLEVBQUUsT0FBTyxFQUFFO2FBQ3ZDLENBQUMsQ0FBQTtZQUNGLG9CQUFvQixDQUFDLCtCQUErQixDQUFDLElBQUksQ0FBQztnQkFDekQsb0JBQW9CLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSTthQUN6QixDQUFDLENBQUE7WUFDVCxNQUFNLFVBQVUsQ0FBQyxLQUFLLEVBQUU7Z0JBQ3ZCO29CQUNDLEtBQUssRUFBRTt3QkFDTixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7d0JBQ04sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO3FCQUNOO29CQUNELElBQUksRUFBRSxLQUFLO2lCQUNYO2FBQ0QsQ0FBQyxDQUFBO1lBQ0YsTUFBTSxVQUFVLENBQUMsT0FBTyxFQUFFO2dCQUN6QjtvQkFDQyxLQUFLLEVBQUU7d0JBQ04sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO3dCQUNOLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztxQkFDTjtvQkFDRCxJQUFJLEVBQUUsS0FBSztpQkFDWDthQUNELENBQUMsQ0FBQTtZQUNGLE1BQU0sVUFBVSxDQUFDLE9BQU8sRUFBRTtnQkFDekI7b0JBQ0MsS0FBSyxFQUFFO3dCQUNOLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQzt3QkFDTixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7cUJBQ047b0JBQ0QsSUFBSSxFQUFFLEtBQUs7aUJBQ1g7YUFDRCxDQUFDLENBQUE7WUFDRixNQUFNLFVBQVUsQ0FBQyxPQUFPLEVBQUU7Z0JBQ3pCO29CQUNDLEtBQUssRUFBRTt3QkFDTixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7d0JBQ04sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO3FCQUNOO29CQUNELElBQUksRUFBRSxLQUFLO2lCQUNYO2FBQ0QsQ0FBQyxDQUFBO1lBQ0YsTUFBTSxVQUFVLENBQUMsT0FBTyxFQUFFO2dCQUN6QjtvQkFDQyxLQUFLLEVBQUU7d0JBQ04sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO3dCQUNOLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztxQkFDTjtvQkFDRCxJQUFJLEVBQUUsT0FBTztpQkFDYjthQUNELENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLEtBQUssRUFBRSxLQUFLLElBQUksRUFBRTtZQUN0QixNQUFNLG9CQUFvQixDQUFDLG9CQUFvQixDQUFDLFVBQVUsRUFBRTtnQkFDM0QsVUFBVSxFQUFFLEVBQUUsY0FBYyxFQUFFLEdBQUcsRUFBRTthQUNuQyxDQUFDLENBQUE7WUFDRixvQkFBb0IsQ0FBQywrQkFBK0IsQ0FBQyxJQUFJLENBQUM7Z0JBQ3pELG9CQUFvQixFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUk7YUFDekIsQ0FBQyxDQUFBO1lBQ1QsTUFBTSxVQUFVLENBQUMsS0FBSyxFQUFFO2dCQUN2QjtvQkFDQyxLQUFLLEVBQUU7d0JBQ04sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO3dCQUNOLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztxQkFDTjtvQkFDRCxJQUFJLEVBQUUsS0FBSztpQkFDWDthQUNELENBQUMsQ0FBQTtZQUNGLE1BQU0sVUFBVSxDQUFDLE9BQU8sRUFBRTtnQkFDekI7b0JBQ0MsS0FBSyxFQUFFO3dCQUNOLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQzt3QkFDTixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7cUJBQ047b0JBQ0QsSUFBSSxFQUFFLEtBQUs7aUJBQ1g7YUFDRCxDQUFDLENBQUE7WUFDRixNQUFNLFVBQVUsQ0FBQyxPQUFPLEVBQUU7Z0JBQ3pCO29CQUNDLEtBQUssRUFBRTt3QkFDTixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7d0JBQ04sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO3FCQUNOO29CQUNELElBQUksRUFBRSxPQUFPO2lCQUNiO2FBQ0QsQ0FBQyxDQUFBO1lBQ0YsTUFBTSxVQUFVLENBQUMsT0FBTyxFQUFFO2dCQUN6QjtvQkFDQyxLQUFLLEVBQUU7d0JBQ04sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO3dCQUNOLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztxQkFDTjtvQkFDRCxJQUFJLEVBQUUsT0FBTztpQkFDYjthQUNELENBQUMsQ0FBQTtZQUNGLE1BQU0sVUFBVSxDQUFDLE9BQU8sRUFBRTtnQkFDekI7b0JBQ0MsS0FBSyxFQUFFO3dCQUNOLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQzt3QkFDTixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7cUJBQ047b0JBQ0QsSUFBSSxFQUFFLE9BQU87aUJBQ2I7YUFDRCxDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FBQTtRQUNGLElBQUksQ0FBQyxPQUFPLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDeEIsTUFBTSxvQkFBb0IsQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLEVBQUU7Z0JBQzNELFVBQVUsRUFBRSxFQUFFLGNBQWMsRUFBRSxLQUFLLEVBQUU7YUFDckMsQ0FBQyxDQUFBO1lBQ0Ysb0JBQW9CLENBQUMsK0JBQStCLENBQUMsSUFBSSxDQUFDO2dCQUN6RCxvQkFBb0IsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJO2FBQ3pCLENBQUMsQ0FBQTtZQUNULE1BQU0sVUFBVSxDQUFDLGVBQWUsRUFBRTtnQkFDakM7b0JBQ0MsS0FBSyxFQUFFO3dCQUNOLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQzt3QkFDTixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7cUJBQ1A7b0JBQ0QsSUFBSSxFQUFFLGNBQWM7aUJBQ3BCO2FBQ0QsQ0FBQyxDQUFBO1lBQ0YsTUFBTSxVQUFVLENBQUMsZ0JBQWdCLEVBQUU7Z0JBQ2xDO29CQUNDLEtBQUssRUFBRTt3QkFDTixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7d0JBQ04sQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO3FCQUNQO29CQUNELElBQUksRUFBRSxjQUFjO2lCQUNwQjthQUNELENBQUMsQ0FBQTtZQUNGLE1BQU0sVUFBVSxDQUFDLGtCQUFrQixFQUFFO2dCQUNwQztvQkFDQyxLQUFLLEVBQUU7d0JBQ04sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO3dCQUNOLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztxQkFDUDtvQkFDRCxJQUFJLEVBQUUsY0FBYztpQkFDcEI7YUFDRCxDQUFDLENBQUE7UUFDSCxDQUFDLENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsS0FBSyxDQUFDLGlDQUFpQyxFQUFFLEdBQUcsRUFBRTtRQUM3QyxLQUFLLElBQUksQ0FBQyxHQUFHLE1BQU0sRUFBRSxDQUFDLElBQUksTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7WUFDdkMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEtBQUssSUFBSSxFQUFFO2dCQUN2QyxNQUFNLFVBQVUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLE1BQU0sTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO29CQUN6RTt3QkFDQyxLQUFLLEVBQUU7NEJBQ04sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDOzRCQUNOLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQzt5QkFDTjt3QkFDRCxJQUFJLEVBQUUsS0FBSztxQkFDWDtpQkFDRCxDQUFDLENBQUE7WUFDSCxDQUFDLENBQUMsQ0FBQTtRQUNILENBQUM7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUVGLG1GQUFtRjtJQUNuRixvRkFBb0Y7SUFDcEYsSUFBSSxDQUFDLElBQUksQ0FBQyxnQ0FBZ0MsRUFBRSxLQUFLLElBQUksRUFBRTtRQUN0RCxNQUFNLG9CQUFvQixDQUFDLG9CQUFvQixDQUFDLFVBQVUsRUFBRTtZQUMzRCxVQUFVLEVBQUUsRUFBRSxjQUFjLEVBQUUsS0FBSyxFQUFFO1NBQ3JDLENBQUMsQ0FBQTtRQUNGLG9CQUFvQixDQUFDLCtCQUErQixDQUFDLElBQUksQ0FBQztZQUN6RCxvQkFBb0IsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJO1NBQ3pCLENBQUMsQ0FBQTtRQUNULE1BQU0sVUFBVSxDQUFDLFdBQVcsRUFBRTtZQUM3QjtnQkFDQyxLQUFLLEVBQUU7b0JBQ04sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUNOLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztpQkFDUDtnQkFDRCxJQUFJLEVBQUUsVUFBVTthQUNoQjtTQUNELENBQUMsQ0FBQTtRQUNGLE1BQU0sVUFBVSxDQUFDLFlBQVksRUFBRTtZQUM5QjtnQkFDQyxLQUFLLEVBQUU7b0JBQ04sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUNOLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztpQkFDUDtnQkFDRCxJQUFJLEVBQUUsVUFBVTthQUNoQjtTQUNELENBQUMsQ0FBQTtRQUNGLE1BQU0sVUFBVSxDQUFDLGNBQWMsRUFBRTtZQUNoQztnQkFDQyxLQUFLLEVBQUU7b0JBQ04sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUNOLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztpQkFDUDtnQkFDRCxJQUFJLEVBQUUsVUFBVTthQUNoQjtTQUNELENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHNDQUFzQyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3ZELE1BQU0sb0JBQW9CLENBQUMsb0JBQW9CLENBQUMsVUFBVSxFQUFFO1lBQzNELFVBQVUsRUFBRSxFQUFFLGNBQWMsRUFBRSxHQUFHLEVBQUU7U0FDbkMsQ0FBQyxDQUFBO1FBQ0Ysb0JBQW9CLENBQUMsK0JBQStCLENBQUMsSUFBSSxDQUFDO1lBQ3pELG9CQUFvQixFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUk7U0FDekIsQ0FBQyxDQUFBO1FBQ1QsTUFBTSxVQUFVLENBQUMsU0FBUyxFQUFFO1lBQzNCO2dCQUNDLEtBQUssRUFBRTtvQkFDTixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ04sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2lCQUNOO2dCQUNELElBQUksRUFBRSxLQUFLO2FBQ1g7WUFDRDtnQkFDQyxLQUFLLEVBQUU7b0JBQ04sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUNOLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztpQkFDTjtnQkFDRCxJQUFJLEVBQUUsS0FBSzthQUNYO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsa0RBQWtELEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDbkUsTUFBTSxvQkFBb0IsQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLEVBQUU7WUFDM0QsVUFBVSxFQUFFLEVBQUUsY0FBYyxFQUFFLEdBQUcsRUFBRTtTQUNuQyxDQUFDLENBQUE7UUFDRixvQkFBb0IsQ0FBQywrQkFBK0IsQ0FBQyxJQUFJLENBQUM7WUFDekQsb0JBQW9CLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSTtTQUN6QixDQUFDLENBQUE7UUFDVCxNQUFNLFVBQVUsQ0FBQyxvQkFBb0IsRUFBRTtZQUN0QztnQkFDQyxLQUFLLEVBQUU7b0JBQ04sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUNOLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztpQkFDTjtnQkFDRCxJQUFJLEVBQUUsU0FBUzthQUNmO1lBQ0Q7Z0JBQ0MsS0FBSyxFQUFFO29CQUNOLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztvQkFDUCxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7aUJBQ1A7Z0JBQ0QsSUFBSSxFQUFFLFVBQVU7YUFDaEI7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyx5QkFBeUIsRUFBRSxLQUFLLElBQUksRUFBRTtRQUMxQyxNQUFNLG9CQUFvQixDQUFDLG9CQUFvQixDQUFDLFVBQVUsRUFBRTtZQUMzRCxVQUFVLEVBQUUsRUFBRSxjQUFjLEVBQUUsR0FBRyxFQUFFO1NBQ25DLENBQUMsQ0FBQTtRQUNGLG9CQUFvQixDQUFDLCtCQUErQixDQUFDLElBQUksQ0FBQztZQUN6RCxvQkFBb0IsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJO1NBQ3pCLENBQUMsQ0FBQTtRQUNULE1BQU0sVUFBVSxDQUNmLDJNQUEyTSxFQUMzTTtZQUNDO2dCQUNDLEtBQUssRUFBRTtvQkFDTixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ04sQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2lCQUNQO2dCQUNELElBQUksRUFBRSwyTUFBMk07YUFDak47U0FDRCxDQUNELENBQUE7SUFDRixDQUFDLENBQUMsQ0FBQTtJQUNGLElBQUksQ0FBQyw2Q0FBNkMsRUFBRSxLQUFLLElBQUksRUFBRTtRQUM5RCxNQUFNLG9CQUFvQixDQUFDLG9CQUFvQixDQUFDLFVBQVUsRUFBRTtZQUMzRCxVQUFVLEVBQUUsRUFBRSxjQUFjLEVBQUUsR0FBRyxFQUFFO1NBQ25DLENBQUMsQ0FBQTtRQUNGLG9CQUFvQixDQUFDLCtCQUErQixDQUFDLElBQUksQ0FBQztZQUN6RCxvQkFBb0IsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJO1NBQ3pCLENBQUMsQ0FBQTtRQUNULE1BQU0sVUFBVSxDQUNmLDZNQUE2TSxFQUM3TTtZQUNDO2dCQUNDLEtBQUssRUFBRTtvQkFDTixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ04sQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2lCQUNQO2dCQUNELElBQUksRUFBRSw2QkFBNkI7YUFDbkM7WUFDRDtnQkFDQyxLQUFLLEVBQUU7b0JBQ04sQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUNQLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztpQkFDUDtnQkFDRCxJQUFJLEVBQUUsc0NBQXNDO2FBQzVDO1lBQ0Q7Z0JBQ0MsS0FBSyxFQUFFO29CQUNOLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztvQkFDUCxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7aUJBQ1A7Z0JBQ0QsSUFBSSxFQUFFLDRJQUE0STthQUNsSjtTQUNELENBQ0QsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBQ0YsSUFBSSxDQUFDLDBDQUEwQyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzNELE1BQU0sb0JBQW9CLENBQUMsb0JBQW9CLENBQUMsVUFBVSxFQUFFO1lBQzNELFVBQVUsRUFBRSxFQUFFLGNBQWMsRUFBRSxHQUFHLEVBQUU7U0FDbkMsQ0FBQyxDQUFBO1FBQ0Ysb0JBQW9CLENBQUMsK0JBQStCLENBQUMsSUFBSSxDQUFDO1lBQ3pELG9CQUFvQixFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUk7U0FDekIsQ0FBQyxDQUFBO1FBQ1QsTUFBTSxVQUFVLENBQUMsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFBO0lBQ3pCLENBQUMsQ0FBQyxDQUFBO0lBQ0YsSUFBSSxDQUFDLGtDQUFrQyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ25ELE1BQU0sb0JBQW9CLENBQUMsb0JBQW9CLENBQUMsVUFBVSxFQUFFO1lBQzNELFVBQVUsRUFBRSxFQUFFLGNBQWMsRUFBRSxHQUFHLEVBQUU7U0FDbkMsQ0FBQyxDQUFBO1FBQ0Ysb0JBQW9CLENBQUMsK0JBQStCLENBQUMsSUFBSSxDQUFDO1lBQ3pELG9CQUFvQixFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUk7U0FDekIsQ0FBQyxDQUFBO1FBQ1QsTUFBTSxVQUFVLENBQUMsaUNBQWlDLEVBQUU7WUFDbkQ7Z0JBQ0MsS0FBSyxFQUFFO29CQUNOLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztvQkFDTixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7aUJBQ1A7Z0JBQ0QsSUFBSSxFQUFFLGdDQUFnQzthQUN0QztTQUNELENBQUMsQ0FBQTtRQUNGLE1BQU0sVUFBVSxDQUFDLHNDQUFzQyxFQUFFO1lBQ3hEO2dCQUNDLEtBQUssRUFBRTtvQkFDTixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ04sQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2lCQUNQO2dCQUNELElBQUksRUFBRSxxQ0FBcUM7YUFDM0M7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtBQUNILENBQUMsQ0FBQyxDQUFBIn0=