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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsdGVycy5wZXJmLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvdGVzdC9jb21tb24vZmlsdGVycy5wZXJmLnRlc3QudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFDaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sa0JBQWtCLENBQUE7QUFDdEQsT0FBTyxLQUFLLE9BQU8sTUFBTSx5QkFBeUIsQ0FBQTtBQUNsRCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0seUJBQXlCLENBQUE7QUFFcEQsTUFBTSxRQUFRLEdBQUcsQ0FBQyxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxLQUFLLENBQUMsQ0FBQTtBQUVsRyxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUE7QUFFekIsU0FBUyxTQUFTLENBQUMsSUFBWSxFQUFFLFFBQXFDO0lBQ3JFLElBQUksV0FBVyxFQUFFLENBQUM7UUFDakIsS0FBSyxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsQ0FBQTtJQUN0QixDQUFDO0FBQ0YsQ0FBQztBQUVELFNBQVMsQ0FBQywwQkFBMEIsRUFBRSxLQUFLO0lBQzFDLE1BQU0sR0FBRyxHQUFHLFVBQVUsQ0FBQyxZQUFZLENBQUMsdUNBQXVDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUE7SUFDM0YsTUFBTSxFQUFFLElBQUksRUFBRSxHQUFHLE1BQU0sbUJBQW1CLENBQTBDLEdBQUcsRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUU1Rix1Q0FBdUM7SUFDdkMsNkNBQTZDO0lBRTdDLE9BQU8sQ0FBQyxHQUFHLENBQ1YsWUFBWSxJQUFJLENBQUMsTUFBTSxrQkFBa0Is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