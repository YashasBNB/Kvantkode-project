/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { DisposableStore } from '../../../base/common/lifecycle.js';
import { URI } from '../../../base/common/uri.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../base/test/common/utils.js';
import { TestConfigurationService } from '../../../platform/configuration/test/common/testConfigurationService.js';
import { ResourceGlobMatcher } from '../../common/resources.js';
import { TestContextService } from './workbenchTestServices.js';
suite('ResourceGlobMatcher', () => {
    const SETTING = 'test.matcher';
    let contextService;
    let configurationService;
    const disposables = new DisposableStore();
    setup(() => {
        contextService = new TestContextService();
        configurationService = new TestConfigurationService({
            [SETTING]: {
                '**/*.md': true,
                '**/*.txt': false,
            },
        });
    });
    teardown(() => {
        disposables.clear();
    });
    test('Basics', async () => {
        const matcher = disposables.add(new ResourceGlobMatcher(() => configurationService.getValue(SETTING), (e) => e.affectsConfiguration(SETTING), contextService, configurationService));
        // Matching
        assert.equal(matcher.matches(URI.file('/foo/bar')), false);
        assert.equal(matcher.matches(URI.file('/foo/bar.md')), true);
        assert.equal(matcher.matches(URI.file('/foo/bar.txt')), false);
        // Events
        let eventCounter = 0;
        disposables.add(matcher.onExpressionChange(() => eventCounter++));
        await configurationService.setUserConfiguration(SETTING, { '**/*.foo': true });
        configurationService.onDidChangeConfigurationEmitter.fire({
            affectsConfiguration: (key) => key === SETTING,
        });
        assert.equal(eventCounter, 1);
        assert.equal(matcher.matches(URI.file('/foo/bar.md')), false);
        assert.equal(matcher.matches(URI.file('/foo/bar.foo')), true);
        await configurationService.setUserConfiguration(SETTING, undefined);
        configurationService.onDidChangeConfigurationEmitter.fire({
            affectsConfiguration: (key) => key === SETTING,
        });
        assert.equal(eventCounter, 2);
        assert.equal(matcher.matches(URI.file('/foo/bar.md')), false);
        assert.equal(matcher.matches(URI.file('/foo/bar.foo')), false);
        await configurationService.setUserConfiguration(SETTING, {
            '**/*.md': true,
            '**/*.txt': false,
            'C:/bar/**': true,
            '/bar/**': true,
        });
        configurationService.onDidChangeConfigurationEmitter.fire({
            affectsConfiguration: (key) => key === SETTING,
        });
        assert.equal(matcher.matches(URI.file('/bar/foo.1')), true);
        assert.equal(matcher.matches(URI.file('C:/bar/foo.1')), true);
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicmVzb3VyY2VzLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC90ZXN0L2NvbW1vbi9yZXNvdXJjZXMudGVzdC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLE1BQU0sTUFBTSxRQUFRLENBQUE7QUFDM0IsT0FBTyxFQUFFLGVBQWUsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQ25FLE9BQU8sRUFBRSxHQUFHLEVBQUUsTUFBTSw2QkFBNkIsQ0FBQTtBQUNqRCxPQUFPLEVBQUUsdUNBQXVDLEVBQUUsTUFBTSxvQ0FBb0MsQ0FBQTtBQUM1RixPQUFPLEVBQUUsd0JBQXdCLEVBQUUsTUFBTSx5RUFBeUUsQ0FBQTtBQUVsSCxPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSw0QkFBNEIsQ0FBQTtBQUUvRCxLQUFLLENBQUMscUJBQXFCLEVBQUUsR0FBRyxFQUFFO0lBQ2pDLE1BQU0sT0FBTyxHQUFHLGNBQWMsQ0FBQTtJQUU5QixJQUFJLGNBQXdDLENBQUE7SUFDNUMsSUFBSSxvQkFBOEMsQ0FBQTtJQUVsRCxNQUFNLFdBQVcsR0FBRyxJQUFJLGVBQWUsRUFBRSxDQUFBO0lBRXpDLEtBQUssQ0FBQyxHQUFHLEVBQUU7UUFDVixjQUFjLEdBQUcsSUFBSSxrQkFBa0IsRUFBRSxDQUFBO1FBQ3pDLG9CQUFvQixHQUFHLElBQUksd0JBQXdCLENBQUM7WUFDbkQsQ0FBQyxPQUFPLENBQUMsRUFBRTtnQkFDVixTQUFTLEVBQUUsSUFBSTtnQkFDZixVQUFVLEVBQUUsS0FBSzthQUNqQjtTQUNELENBQUMsQ0FBQTtJQUNILENBQUMsQ0FBQyxDQUFBO0lBRUYsUUFBUSxDQUFDLEdBQUcsRUFBRTtRQUNiLFdBQVcsQ0FBQyxL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