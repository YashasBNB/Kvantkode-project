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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxXb3JkTGlua0RldGVjdG9yLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9saW5rcy90ZXN0L2Jyb3dzZXIvdGVybWluYWxXb3JkTGlua0RldGVjdG9yLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDL0QsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sNkNBQTZDLENBQUE7QUFDckcsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sa0VBQWtFLENBQUE7QUFDeEcsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sa0ZBQWtGLENBQUE7QUFDM0gsT0FBTyxFQUFFLHdCQUF3QixFQUFFLE1BQU0sa0ZBQWtGLENBQUE7QUFDM0gsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLDZEQUE2RCxDQUFBO0FBRTdGLE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDJDQUEyQyxDQUFBO0FBQ3BGLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQ3JELE9BQU8sRUFBRSxrQkFBa0IsRUFBRSxNQUFNLHFEQUFxRCxDQUFBO0FBR3hGLEtBQUssQ0FBQyxzQ0FBc0MsRUFBRSxHQUFHLEVBQUU7SUFDbEQsTUFBTSxLQUFLLEdBQUcsdUNBQXVDLEVBQUUsQ0FBQTtJQUV2RCxJQUFJLG9CQUE4QyxDQUFBO0lBQ2xELElBQUksUUFBa0MsQ0FBQTtJQUN0QyxJQUFJLEtBQWUsQ0FBQTtJQUNuQixJQUFJLG9CQUE4QyxDQUFBO0lBRWxELEtBQUssQ0FBQyxLQUFLLElBQUksRUFBRTtRQUNoQixvQkFBb0IsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksd0JBQXdCLEVBQUUsQ0FBQyxDQUFBO1FBQ2hFLG9CQUFvQixHQUFHLElBQUksd0JBQXdCLEVBQUUsQ0FBQTtRQUNyRCxNQUFNLG9CQUFvQixDQUFDLG9CQUFvQixDQUFDLFVBQVUsRUFBRTtZQUMzRCxVQUFVLEVBQUUsRUFBRSxjQUFjLEVBQUUsRUFBRSxFQUFFO1NBQ2xDLENBQUMsQ0FBQTtRQUVGLG9CQUFvQixDQUFDLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxvQkFBb0IsQ0FBQyxDQUFBO1FBQ3RFLG9CQUFvQixDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsa0JBQWtCLENBQUMsQ0FBQTtRQUU3RCxNQUFNLFlBQVksR0FBRyxDQUNwQixNQUFNLG1CQUFtQixDQUFnQyxjQUFjLEVBQUUsY0FBYyxDQUFDLENBQ3hGLENBQUMsUUFBUSxDQUFBO1FBQ1YsS0FBSyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxZQUFZLENBQUMsRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEVBQUUsRUFBRSxJQUFJLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ25GLFFBQVEsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLG9CQUFvQixDQUFDLGNBQWMsQ0FBQyx3QkFBd0IsRUFBRSxLQUFLLENBQUMsQ0FBQyxDQUFBO0lBQzNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsS0FBSyxVQUFVLFVBQVUsQ0FDeEIsSUFBWSxFQUNaLFFBQStFO1FBRS9FLE1BQU0sZ0JBQWdCLENBQUMsSUFBSSxFQUFFLFFBQVEsRUFBRSxRQUFRLGdEQUFpQyxDQUFBO0lBQ2pGLENBQUM7SUFFRCxLQUFLLENBQUMsZ0RBQWdELEVBQUUsR0FBRyxFQUFFO1FBQzVELElBQUksQ0FBQyxTQUFTLEVBQUUsS0FBSyxJQUFJLEVBQUU7WUFDMUIsTUFBTSxvQkFBb0IsQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLEVBQUU7Z0JBQzNELFVBQVUsRUFBRSxFQUFFLGNBQWMsRUFBRSxPQUFPLEVBQUU7YUFDdkMsQ0FBQyxDQUFBO1lBQ0Ysb0JBQW9CLENBQUMsK0JBQStCLENBQUMsSUFBSSxDQUFDO2dCQUN6RCxvQkFBb0IsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJO2FBQ3pCLENBQUMsQ0FBQTtZQUNULE1BQU0sVUFBVSxDQUFDLEtBQUssRUFBRTtnQkFDdkI7b0JBQ0MsS0FBSyxFQUFFO3dCQUNOLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQzt3QkFDTixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7cUJBQ047b0JBQ0QsSUFBSSxFQUFFLEtBQUs7aUJBQ1g7YUFDRCxDQUFDLENBQUE7WUFDRixNQUFNLFVBQVUsQ0FBQyxPQUFPLEVBQUU7Z0JBQ3pCO29CQUNDLEtBQUssRUFBRTt3QkFDTixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7d0JBQ04sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO3FCQUNOO29CQUNELElBQUksRUFBRSxLQUFLO2lCQUNYO2FBQ0QsQ0FBQyxDQUFBO1lBQ0YsTUFBTSxVQUFVLENBQUMsT0FBTyxFQUFFO2dCQUN6QjtvQkFDQyxLQUFLLEVBQUU7d0JBQ04sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO3dCQUNOLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztxQkFDTjtvQkFDRCxJQUFJLEVBQUUsS0FBSztpQkFDWDthQUNELENBQUMsQ0FBQTtZQUNGLE1BQU0sVUFBVSxDQUFDLE9BQU8sRUFBRTtnQkFDekI7b0JBQ0MsS0FBSyxFQUFFO3dCQUNOLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQzt3QkFDTixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7cUJBQ047b0JBQ0QsSUFBSSxFQUFFLEtBQUs7aUJBQ1g7YUFDRCxDQUFDLENBQUE7WUFDRixNQUFNLFVBQVUsQ0FBQyxPQUFPLEVBQUU7Z0JBQ3pCO29CQUNDLEtBQUssRUFBRTt3QkFDTixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7d0JBQ04sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO3FCQUNOO29CQUNELElBQUksRUFBRSxPQUFPO2lCQUNiO2FBQ0QsQ0FBQyxDQUFBO1FBQ0gsQ0FBQyxDQUFDLENBQUE7UUFDRixJQUFJLENBQUMsS0FBSyxFQUFFLEtBQUssSUFBSSxFQUFFO1lBQ3RCLE1BQU0sb0JBQW9CLENBQUMsb0JBQW9CLENBQUMsVUFBVSxFQUFFO2dCQUMzRCxVQUFVLEVBQUUsRUFBRSxjQUFjLEVBQUUsR0FBRyxFQUFFO2FBQ25DLENBQUMsQ0FBQTtZQUNGLG9CQUFvQixDQUFDLCtCQUErQixDQUFDLElBQUksQ0FBQztnQkFDekQsb0JBQW9CLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSTthQUN6QixDQUFDLENBQUE7WUFDVCxNQUFNLFVBQVUsQ0FBQyxLQUFLLEVBQUU7Z0JBQ3ZCO29CQUNDLEtBQUssRUFBRTt3QkFDTixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7d0JBQ04sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO3FCQUNOO29CQUNELElBQUksRUFBRSxLQUFLO2lCQUNYO2FBQ0QsQ0FBQyxDQUFBO1lBQ0YsTUFBTSxVQUFVLENBQUMsT0FBTyxFQUFFO2dCQUN6QjtvQkFDQyxLQUFLLEVBQUU7d0JBQ04sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO3dCQUNOLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztxQkFDTjtvQkFDRCxJQUFJLEVBQUUsS0FBSztpQkFDWDthQUNELENBQUMsQ0FBQTtZQUNGLE1BQU0sVUFBVSxDQUFDLE9BQU8sRUFBRTtnQkFDekI7b0JBQ0MsS0FBSyxFQUFFO3dCQUNOLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQzt3QkFDTixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7cUJBQ047b0JBQ0QsSUFBSSxFQUFFLE9BQU87aUJBQ2I7YUFDRCxDQUFDLENBQUE7WUFDRixNQUFNLFVBQVUsQ0FBQyxPQUFPLEVBQUU7Z0JBQ3pCO29CQUNDLEtBQUssRUFBRTt3QkFDTixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7d0JBQ04sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO3FCQUNOO29CQUNELElBQUksRUFBRSxPQUFPO2lCQUNiO2FBQ0QsQ0FBQyxDQUFBO1lBQ0YsTUFBTSxVQUFVLENBQUMsT0FBTyxFQUFFO2dCQUN6QjtvQkFDQyxLQUFLLEVBQUU7d0JBQ04sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO3dCQUNOLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztxQkFDTjtvQkFDRCxJQUFJLEVBQUUsT0FBTztpQkFDYjthQUNELENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO1FBQ0YsSUFBSSxDQUFDLE9BQU8sRUFBRSxLQUFLLElBQUksRUFBRTtZQUN4QixNQUFNLG9CQUFvQixDQUFDLG9CQUFvQixDQUFDLFVBQVUsRUFBRTtnQkFDM0QsVUFBVSxFQUFFLEVBQUUsY0FBYyxFQUFFLEtBQUssRUFBRTthQUNyQyxDQUFDLENBQUE7WUFDRixvQkFBb0IsQ0FBQywrQkFBK0IsQ0FBQyxJQUFJLENBQUM7Z0JBQ3pELG9CQUFvQixFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUk7YUFDekIsQ0FBQyxDQUFBO1lBQ1QsTUFBTSxVQUFVLENBQUMsZUFBZSxFQUFFO2dCQUNqQztvQkFDQyxLQUFLLEVBQUU7d0JBQ04sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO3dCQUNOLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztxQkFDUDtvQkFDRCxJQUFJLEVBQUUsY0FBYztpQkFDcEI7YUFDRCxDQUFDLENBQUE7WUFDRixNQUFNLFVBQVUsQ0FBQyxnQkFBZ0IsRUFBRTtnQkFDbEM7b0JBQ0MsS0FBSyxFQUFFO3dCQUNOLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQzt3QkFDTixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7cUJBQ1A7b0JBQ0QsSUFBSSxFQUFFLGNBQWM7aUJBQ3BCO2FBQ0QsQ0FBQyxDQUFBO1lBQ0YsTUFBTSxVQUFVLENBQUMsa0JBQWtCLEVBQUU7Z0JBQ3BDO29CQUNDLEtBQUssRUFBRTt3QkFDTixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7d0JBQ04sQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO3FCQUNQO29CQUNELElBQUksRUFBRSxjQUFjO2lCQUNwQjthQUNELENBQUMsQ0FBQTtRQUNILENBQUMsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixLQUFLLENBQUMsaUNBQWlDLEVBQUUsR0FBRyxFQUFFO1FBQzdDLEtBQUssSUFBSSxDQUFDLEdBQUcsTUFBTSxFQUFFLENBQUMsSUFBSSxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUN2QyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsS0FBSyxJQUFJLEVBQUU7Z0JBQ3ZDLE1BQU0sVUFBVSxDQUFDLEdBQUcsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsTUFBTSxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7b0JBQ3pFO3dCQUNDLEtBQUssRUFBRTs0QkFDTixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7NEJBQ04sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO3lCQUNOO3dCQUNELElBQUksRUFBRSxLQUFLO3FCQUNYO2lCQUNELENBQUMsQ0FBQTtZQUNILENBQUMsQ0FBQyxDQUFBO1FBQ0gsQ0FBQztJQUNGLENBQUMsQ0FBQyxDQUFBO0lBRUYsbUZBQW1GO0lBQ25GLG9GQUFvRjtJQUNwRixJQUFJLENBQUMsSUFBSSxDQUFDLGdDQUFnQyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQ3RELE1BQU0sb0JBQW9CLENBQUMsb0JBQW9CLENBQUMsVUFBVSxFQUFFO1lBQzNELFVBQVUsRUFBRSxFQUFFLGNBQWMsRUFBRSxLQUFLLEVBQUU7U0FDckMsQ0FBQyxDQUFBO1FBQ0Ysb0JBQW9CLENBQUMsK0JBQStCLENBQUMsSUFBSSxDQUFDO1lBQ3pELG9CQUFvQixFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUk7U0FDekIsQ0FBQyxDQUFBO1FBQ1QsTUFBTSxVQUFVLENBQUMsV0FBVyxFQUFFO1lBQzdCO2dCQUNDLEtBQUssRUFBRTtvQkFDTixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ04sQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2lCQUNQO2dCQUNELElBQUksRUFBRSxVQUFVO2FBQ2hCO1NBQ0QsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxVQUFVLENBQUMsWUFBWSxFQUFFO1lBQzlCO2dCQUNDLEtBQUssRUFBRTtvQkFDTixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ04sQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2lCQUNQO2dCQUNELElBQUksRUFBRSxVQUFVO2FBQ2hCO1NBQ0QsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxVQUFVLENBQUMsY0FBYyxFQUFFO1lBQ2hDO2dCQUNDLEtBQUssRUFBRTtvQkFDTixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ04sQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2lCQUNQO2dCQUNELElBQUksRUFBRSxVQUFVO2FBQ2hCO1NBQ0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQyxDQUFDLENBQUE7SUFFRixJQUFJLENBQUMsc0NBQXNDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDdkQsTUFBTSxvQkFBb0IsQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLEVBQUU7WUFDM0QsVUFBVSxFQUFFLEVBQUUsY0FBYyxFQUFFLEdBQUcsRUFBRTtTQUNuQyxDQUFDLENBQUE7UUFDRixvQkFBb0IsQ0FBQywrQkFBK0IsQ0FBQyxJQUFJLENBQUM7WUFDekQsb0JBQW9CLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSTtTQUN6QixDQUFDLENBQUE7UUFDVCxNQUFNLFVBQVUsQ0FBQyxTQUFTLEVBQUU7WUFDM0I7Z0JBQ0MsS0FBSyxFQUFFO29CQUNOLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztvQkFDTixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7aUJBQ047Z0JBQ0QsSUFBSSxFQUFFLEtBQUs7YUFDWDtZQUNEO2dCQUNDLEtBQUssRUFBRTtvQkFDTixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ04sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2lCQUNOO2dCQUNELElBQUksRUFBRSxLQUFLO2FBQ1g7U0FDRCxDQUFDLENBQUE7SUFDSCxDQUFDLENBQUMsQ0FBQTtJQUVGLElBQUksQ0FBQyxrREFBa0QsRUFBRSxLQUFLLElBQUksRUFBRTtRQUNuRSxNQUFNLG9CQUFvQixDQUFDLG9CQUFvQixDQUFDLFVBQVUsRUFBRTtZQUMzRCxVQUFVLEVBQUUsRUFBRSxjQUFjLEVBQUUsR0FBRyxFQUFFO1NBQ25DLENBQUMsQ0FBQTtRQUNGLG9CQUFvQixDQUFDLCtCQUErQixDQUFDLElBQUksQ0FBQztZQUN6RCxvQkFBb0IsRUFBRSxHQUFHLEVBQUUsQ0FBQyxJQUFJO1NBQ3pCLENBQUMsQ0FBQTtRQUNULE1BQU0sVUFBVSxDQUFDLG9CQUFvQixFQUFFO1lBQ3RDO2dCQUNDLEtBQUssRUFBRTtvQkFDTixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7b0JBQ04sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO2lCQUNOO2dCQUNELElBQUksRUFBRSxTQUFTO2FBQ2Y7WUFDRDtnQkFDQyxLQUFLLEVBQUU7b0JBQ04sQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUNQLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztpQkFDUDtnQkFDRCxJQUFJLEVBQUUsVUFBVTthQUNoQjtTQUNELENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsSUFBSSxDQUFDLHlCQUF5QixFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzFDLE1BQU0sb0JBQW9CLENBQUMsb0JBQW9CLENBQUMsVUFBVSxFQUFFO1lBQzNELFVBQVUsRUFBRSxFQUFFLGNBQWMsRUFBRSxHQUFHLEVBQUU7U0FDbkMsQ0FBQyxDQUFBO1FBQ0Ysb0JBQW9CLENBQUMsK0JBQStCLENBQUMsSUFBSSxDQUFDO1lBQ3pELG9CQUFvQixFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUk7U0FDekIsQ0FBQyxDQUFBO1FBQ1QsTUFBTSxVQUFVLENBQ2YsMk1BQTJNLEVBQzNNO1lBQ0M7Z0JBQ0MsS0FBSyxFQUFFO29CQUNOLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztvQkFDTixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7aUJBQ1A7Z0JBQ0QsSUFBSSxFQUFFLDJNQUEyTTthQUNqTjtTQUNELENBQ0QsQ0FBQTtJQUNGLENBQUMsQ0FBQyxDQUFBO0lBQ0YsSUFBSSxDQUFDLDZDQUE2QyxFQUFFLEtBQUssSUFBSSxFQUFFO1FBQzlELE1BQU0sb0JBQW9CLENBQUMsb0JBQW9CLENBQUMsVUFBVSxFQUFFO1lBQzNELFVBQVUsRUFBRSxFQUFFLGNBQWMsRUFBRSxHQUFHLEVBQUU7U0FDbkMsQ0FBQyxDQUFBO1FBQ0Ysb0JBQW9CLENBQUMsK0JBQStCLENBQUMsSUFBSSxDQUFDO1lBQ3pELG9CQUFvQixFQUFFLEdBQUcsRUFBRSxDQUFDLElBQUk7U0FDekIsQ0FBQyxDQUFBO1FBQ1QsTUFBTSxVQUFVLENBQ2YsNk1BQTZNLEVBQzdNO1lBQ0M7Z0JBQ0MsS0FBSyxFQUFFO29CQUNOLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztvQkFDTixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7aUJBQ1A7Z0JBQ0QsSUFBSSxFQUFFLDZCQUE2QjthQUNuQztZQUNEO2dCQUNDLEtBQUssRUFBRTtvQkFDTixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7b0JBQ1AsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO2lCQUNQO2dCQUNELElBQUksRUFBRSxzQ0FBc0M7YUFDNUM7WUFDRDtnQkFDQyxLQUFLLEVBQUU7b0JBQ04sQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO29CQUNQLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztpQkFDUDtnQkFDRCxJQUFJLEVBQUUsNElBQTRJO2FBQ2xKO1NBQ0QsQ0FDRCxDQUFBO0lBQ0YsQ0FBQyxDQUFDLENBQUE7SUFDRixJQUFJLENBQUMsMENBQTBDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDM0QsTUFBTSxvQkFBb0IsQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLEVBQUU7WUFDM0QsVUFBVSxFQUFFLEVBQUUsY0FBYyxFQUFFLEdBQUcsRUFBRTtTQUNuQyxDQUFDLENBQUE7UUFDRixvQkFBb0IsQ0FBQywrQkFBK0IsQ0FBQyxJQUFJLENBQUM7WUFDekQsb0JBQW9CLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSTtTQUN6QixDQUFDLENBQUE7UUFDVCxNQUFNLFVBQVUsQ0FBQyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFDekIsQ0FBQyxDQUFDLENBQUE7SUFDRixJQUFJLENBQUMsa0NBQWtDLEVBQUUsS0FBSyxJQUFJLEVBQUU7UUFDbkQsTUFBTSxvQkFBb0IsQ0FBQyxvQkFBb0IsQ0FBQyxVQUFVLEVBQUU7WUFDM0QsVUFBVSxFQUFFLEVBQUUsY0FBYyxFQUFFLEdBQUcsRUFBRTtTQUNuQyxDQUFDLENBQUE7UUFDRixvQkFBb0IsQ0FBQywrQkFBK0IsQ0FBQyxJQUFJLENBQUM7WUFDekQsb0JBQW9CLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSTtTQUN6QixDQUFDLENBQUE7UUFDVCxNQUFNLFVBQVUsQ0FBQyxpQ0FBaUMsRUFBRTtZQUNuRDtnQkFDQyxLQUFLLEVBQUU7b0JBQ04sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO29CQUNOLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztpQkFDUDtnQkFDRCxJQUFJLEVBQUUsZ0NBQWdDO2FBQ3RDO1NBQ0QsQ0FBQyxDQUFBO1FBQ0YsTUFBTSxVQUFVLENBQUMsc0NBQXNDLEVBQUU7WUFDeEQ7Z0JBQ0MsS0FBSyxFQUFFO29CQUNOLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztvQkFDTixDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7aUJBQ1A7Z0JBQ0QsSUFBSSxFQUFFLHFDQUFxQzthQUMzQztTQUNELENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0FBQ0gsQ0FBQyxDQUFDLENBQUEifQ==