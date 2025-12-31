/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { importAMDNodeModule } from '../../../amdX.js';
import * as filters from '../../common/filters.js';
import { FileAccess } from '../../common/network.js';
const patterns = ['cci', 'ida', 'pos', 'CCI', 'enbled', 'callback', 'gGame', 'cons', 'zyx', 'aBc'];
const _enablePerf = false;
function perfSuite(name, callback) {
    if (_enablePerf) {
        suite(name, callback);
    }
}
perfSuite('Performance - fuzzyMatch', async function () {
    const uri = FileAccess.asBrowserUri('vs/base/test/common/filters.perf.data').toString(true);
    const { data } = await importAMDNodeModule(uri, '');
    // suiteSetup(() => console.profile());
    // suiteTeardown(() => console.profileEnd());
    console.log(`Matching ${data.length} items against ${patterns.length} patterns (${data.length * patterns.length} operations) `);
    function perfTest(name, match) {
        test(name, () => {
            const t1 = Date.now();
            let count = 0;
            for (let i = 0; i < 2; i++) {
                for (const pattern of patterns) {
                    const patternLow = pattern.toLowerCase();
                    for (const item of data) {
                        count += 1;
                        match(pattern, patternLow, 0, item, item.toLowerCase(), 0);
                    }
                }
            }
            const d = Date.now() - t1;
            console.log(name, `${d}ms, ${Math.round(count / d) * 15}/15ms, ${Math.round(count / d)}/1ms`);
        });
    }
    perfTest('fuzzyScore', filters.fuzzyScore);
    perfTest('fuzzyScoreGraceful', filters.fuzzyScoreGraceful);
    perfTest('fuzzyScoreGracefulAggressive', filters.fuzzyScoreGracefulAggressive);
});
perfSuite('Performance - IFilter', async function () {
    const uri = FileAccess.asBrowserUri('vs/base/test/common/filters.perf.data').toString(true);
    const { data } = await importAMDNodeModule(uri, '');
    function perfTest(name, match) {
        test(name, () => {
            const t1 = Date.now();
            let count = 0;
            for (let i = 0; i < 2; i++) {
                for (const pattern of patterns) {
                    for (const item of data) {
                        count += 1;
                        match(pattern, item);
                    }
                }
            }
            const d = Date.now() - t1;
            console.log(name, `${d}ms, ${Math.round(count / d) * 15}/15ms, ${Math.round(count / d)}/1ms`);
        });
    }
    perfTest('matchesFuzzy', filters.matchesFuzzy);
    perfTest('matchesFuzzy2', filters.matchesFuzzy2);
    perfTest('matchesPrefix', filters.matchesPrefix);
    perfTest('matchesContiguousSubString', filters.matchesContiguousSubString);
    perfTest('matchesCamelCase', filters.matchesCamelCase);
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsdGVycy5wZXJmLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL3Rlc3QvY29tbW9uL2ZpbHRlcnMucGVyZi50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBQ2hHLE9BQU8sRUFBRSxtQkFBbUIsRUFBRSxNQUFNLGtCQUFrQixDQUFBO0FBQ3RELE9BQU8sS0FBSyxPQUFPLE1BQU0seUJBQXlCLENBQUE7QUFDbEQsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBRXBELE1BQU0sUUFBUSxHQUFHLENBQUMsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLENBQUE7QUFFbEcsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFBO0FBRXpCLFNBQVMsU0FBUyxDQUFDLElBQVksRUFBRSxRQUFxQztJQUNyRSxJQUFJLFdBQVcsRUFBRSxDQUFDO1FBQ2pCLEtBQUssQ0FBQyxJQUFJLEVBQUUsUUFBUSxDQUFDLENBQUE7SUFDdEIsQ0FBQztBQUNGLENBQUM7QUFFRCxTQUFTLENBQUMsMEJBQTBCLEVBQUUsS0FBSztJQUMxQyxNQUFNLEdBQUcsR0FBRyxVQUFVLENBQUMsWUFBWSxDQUFDLHVDQUF1QyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFBO0lBQzNGLE1BQU0sRUFBRSxJQUFJLEVBQUUsR0FBRyxNQUFNLG1CQUFtQixDQUEwQyxHQUFHLEVBQUUsRUFBRSxDQUFDLENBQUE7SUFFNUYsdUNBQXVDO0lBQ3ZDLDZDQUE2QztJQUU3QyxPQUFPLENBQUMsR0FBRyxDQUNWLFlBQVksSUFBSSxDQUFDLE1BQU0sa0JBQWtCLFFBQVEsQ0FBQyxNQUFNLGNBQWMsSUFB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