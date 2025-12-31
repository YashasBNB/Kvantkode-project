/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../base/test/common/utils.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { MainThreadWorkspace } from '../../browser/mainThreadWorkspace.js';
import { SingleProxyRPCProtocol } from '../common/testRPCProtocol.js';
import { ISearchService } from '../../../services/search/common/search.js';
import { workbenchInstantiationService } from '../../../test/browser/workbenchTestServices.js';
import { URI } from '../../../../base/common/uri.js';
suite('MainThreadWorkspace', () => {
    const disposables = ensureNoDisposablesAreLeakedInTestSuite();
    let configService;
    let instantiationService;
    setup(() => {
        instantiationService = workbenchInstantiationService(undefined, disposables);
        configService = instantiationService.get(IConfigurationService);
        configService.setUserConfiguration('search', {});
    });
    test('simple', () => {
        instantiationService.stub(ISearchService, {
            fileSearch(query) {
                assert.strictEqual(query.folderQueries.length, 1);
                assert.strictEqual(query.folderQueries[0].disregardIgnoreFiles, true);
                assert.deepStrictEqual({ ...query.includePattern }, { foo: true });
                assert.strictEqual(query.maxResults, 10);
                return Promise.resolve({ results: [], messages: [] });
            },
        });
        const mtw = disposables.add(instantiationService.createInstance(MainThreadWorkspace, SingleProxyRPCProtocol({ $initializeWorkspace: () => { } })));
        return mtw.$startFileSearch(null, { maxResults: 10, includePattern: 'foo', disregardSearchExcludeSettings: true }, CancellationToken.None);
    });
    test('exclude defaults', () => {
        configService.setUserConfiguration('search', {
            exclude: { searchExclude: true },
        });
        configService.setUserConfiguration('files', {
            exclude: { filesExclude: true },
        });
        instantiationService.stub(ISearchService, {
            fileSearch(query) {
                assert.strictEqual(query.folderQueries.length, 1);
                assert.strictEqual(query.folderQueries[0].disregardIgnoreFiles, true);
                assert.strictEqual(query.folderQueries[0].excludePattern?.length, 1);
                assert.deepStrictEqual(query.folderQueries[0].excludePattern[0].pattern, {
                    filesExclude: true,
                });
                return Promise.resolve({ results: [], messages: [] });
            },
        });
        const mtw = disposables.add(instantiationService.createInstance(MainThreadWorkspace, SingleProxyRPCProtocol({ $initializeWorkspace: () => { } })));
        return mtw.$startFileSearch(null, { maxResults: 10, includePattern: '', disregardSearchExcludeSettings: true }, CancellationToken.None);
    });
    test('disregard excludes', () => {
        configService.setUserConfiguration('search', {
            exclude: { searchExclude: true },
        });
        configService.setUserConfiguration('files', {
            exclude: { filesExclude: true },
        });
        instantiationService.stub(ISearchService, {
            fileSearch(query) {
                assert.deepStrictEqual(query.folderQueries[0].excludePattern, []);
                assert.deepStrictEqual(query.excludePattern, undefined);
                return Promise.resolve({ results: [], messages: [] });
            },
        });
        const mtw = disposables.add(instantiationService.createInstance(MainThreadWorkspace, SingleProxyRPCProtocol({ $initializeWorkspace: () => { } })));
        return mtw.$startFileSearch(null, {
            maxResults: 10,
            includePattern: '',
            disregardSearchExcludeSettings: true,
            disregardExcludeSettings: true,
        }, CancellationToken.None);
    });
    test('do not disregard anything if disregardExcludeSettings is true', () => {
        configService.setUserConfiguration('search', {
            exclude: { searchExclude: true },
        });
        configService.setUserConfiguration('files', {
            exclude: { filesExclude: true },
        });
        instantiationService.stub(ISearchService, {
            fileSearch(query) {
                assert.strictEqual(query.folderQueries.length, 1);
                assert.strictEqual(query.folderQueries[0].disregardIgnoreFiles, true);
                assert.deepStrictEqual(query.folderQueries[0].excludePattern, []);
                return Promise.resolve({ results: [], messages: [] });
            },
        });
        const mtw = disposables.add(instantiationService.createInstance(MainThreadWorkspace, SingleProxyRPCProtocol({ $initializeWorkspace: () => { } })));
        return mtw.$startFileSearch(null, {
            maxResults: 10,
            includePattern: '',
            disregardExcludeSettings: true,
            disregardSearchExcludeSettings: false,
        }, CancellationToken.None);
    });
    test('exclude string', () => {
        instantiationService.stub(ISearchService, {
            fileSearch(query) {
                assert.deepStrictEqual(query.folderQueries[0].excludePattern, []);
                assert.deepStrictEqual({ ...query.excludePattern }, { 'exclude/**': true });
                return Promise.resolve({ results: [], messages: [] });
            },
        });
        const mtw = disposables.add(instantiationService.createInstance(MainThreadWorkspace, SingleProxyRPCProtocol({ $initializeWorkspace: () => { } })));
        return mtw.$startFileSearch(null, {
            maxResults: 10,
            includePattern: '',
            excludePattern: [{ pattern: 'exclude/**' }],
            disregardSearchExcludeSettings: true,
        }, CancellationToken.None);
    });
    test('Valid revived URI after moving to EH', () => {
        const uriComponents = {
            scheme: 'test',
            path: '/Users/username/Downloads',
        };
        instantiationService.stub(ISearchService, {
            fileSearch(query) {
                assert.strictEqual(query.folderQueries?.length, 1);
                assert.ok(URI.isUri(query.folderQueries[0].folder));
                assert.strictEqual(query.folderQueries[0].folder.path, '/Users/username/Downloads');
                assert.strictEqual(query.folderQueries[0].folder.scheme, 'test');
                return Promise.resolve({ results: [], messages: [] });
            },
        });
        const mtw = disposables.add(instantiationService.createInstance(MainThreadWorkspace, SingleProxyRPCProtocol({ $initializeWorkspace: () => { } })));
        return mtw.$startFileSearch(uriComponents, { filePattern: '*.md' }, CancellationToken.None);
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpblRocmVhZFdvcmtzcGFjZS50ZXN0LmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2FwaS90ZXN0L2Jyb3dzZXIvbWFpblRocmVhZFdvcmtzcGFjZS50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSx5Q0FBeUMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUMvRixPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUdsRyxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw4QkFBOEIsQ0FBQTtBQUNyRSxPQUFPLEVBQWMsY0FBYyxFQUFFLE1BQU0sMkNBQTJDLENBQUE7QUFDdEYsT0FBTyxFQUFFLDZCQUE2QixFQUFFLE1BQU0sZ0RBQWdELENBQUE7QUFDOUYsT0FBTyxFQUFFLEdBQUcsRUFBaUIsTUFBTSxnQ0FBZ0MsQ0FBQTtBQUVuRSxLQUFLLENBQUMscUJBQXFCLEVBQUUsR0FBRyxFQUFFO0lBQ2pDLE1BQU0sV0FBVyxHQUFHLHVDQUF1QyxFQUFFLENBQUE7SUFFN0QsSUFBSSxhQUF1QyxDQUFBO0lBQzNDLElBQUksb0JBQThDLENBQUE7SUFFbEQsS0FBSyxDQUFDLEdBQUcsRUFBRTtRQUNWLG9CQUFvQixHQUFHLDZCQUE2QixDQUNuRCxTQUFTLEVBQ1QsV0FBVyxDQUNpQixDQUFBO1FBRTdCLGFBQWEsR0FBRyxvQkFBb0IsQ0FBQyxHQUFHLENBQUMscUJBQXFCLENBQTZCLENBQUE7UUFDM0YsYUFBYSxDQUFDLG9CQUFvQixDQUFDLFFBQVEs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