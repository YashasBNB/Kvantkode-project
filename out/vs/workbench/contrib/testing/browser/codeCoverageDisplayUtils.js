/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { assertNever } from '../../../../base/common/assert.js';
import { clamp } from '../../../../base/common/numbers.js';
import { localize } from '../../../../nls.js';
import { chartsGreen, chartsRed, chartsYellow, } from '../../../../platform/theme/common/colorRegistry.js';
import { asCssVariableName } from '../../../../platform/theme/common/colorUtils.js';
import { getTotalCoveragePercent } from '../common/testCoverage.js';
export const percent = (cc) => clamp(cc.total === 0 ? 1 : cc.covered / cc.total, 0, 1);
const colorThresholds = [
    { color: `var(${asCssVariableName(chartsRed)})`, key: 'red' },
    { color: `var(${asCssVariableName(chartsYellow)})`, key: 'yellow' },
    { color: `var(${asCssVariableName(chartsGreen)})`, key: 'green' },
];
export const getCoverageColor = (pct, thresholds) => {
    let best = colorThresholds[0].color; //  red
    let distance = pct;
    for (const { key, color } of colorThresholds) {
        const t = thresholds[key] / 100;
        if (t && pct >= t && pct - t < distance) {
            best = color;
            distance = pct - t;
        }
    }
    return best;
};
const epsilon = 10e-8;
export const displayPercent = (value, precision = 2) => {
    const display = (value * 100).toFixed(precision);
    // avoid showing 100% coverage if it just rounds up:
    if (value < 1 - epsilon && display === '100') {
        return `${100 - 10 ** -precision}%`;
    }
    return `${display}%`;
};
export const calculateDisplayedStat = (coverage, method) => {
    switch (method) {
        case "statement" /* TestingDisplayedCoveragePercent.Statement */:
            return percent(coverage.statement);
        case "minimum" /* TestingDisplayedCoveragePercent.Minimum */: {
            let value = percent(coverage.statement);
            if (coverage.branch) {
                value = Math.min(value, percent(coverage.branch));
            }
            if (coverage.declaration) {
                value = Math.min(value, percent(coverage.declaration));
            }
            return value;
        }
        case "totalCoverage" /* TestingDisplayedCoveragePercent.TotalCoverage */:
            return getTotalCoveragePercent(coverage.statement, coverage.branch, coverage.declaration);
        default:
            assertNever(method);
    }
};
export function getLabelForItem(result, testId, commonPrefixLen) {
    const parts = [];
    for (const id of testId.idsFromRoot()) {
        const item = result.getTestById(id.toString());
        if (!item) {
            break;
        }
        parts.push(item.label);
    }
    return parts.slice(commonPrefixLen).join(' \u203a ');
}
export var labels;
(function (labels) {
    labels.showingFilterFor = (label) => localize('testing.coverageForTest', 'Showing "{0}"', label);
    labels.clickToChangeFiltering = localize('changePerTestFilter', 'Click to view coverage for a single test');
    labels.percentCoverage = (percent, precision) => localize('testing.percentCoverage', '{0} Coverage', displayPercent(percent, precision));
    labels.allTests = localize('testing.allTests', 'All tests');
    labels.pickShowCoverage = localize('testing.pickTest', 'Pick a test to show coverage for');
})(labels || (labels = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUNvdmVyYWdlRGlzcGxheVV0aWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL3ZvaWQvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvdGVzdGluZy9icm93c2VyL2NvZGVDb3ZlcmFnZURpc3BsYXlVdGlscy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsV0FBVyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDL0QsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLG9DQUFvQyxDQUFBO0FBQzFELE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM3QyxPQUFPLEVBQ04sV0FBVyxFQUNYLFNBQVMsRUFDVCxZQUFZLEdBQ1osTUFBTSxvREFBb0QsQ0FBQTtBQUMzRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxpREFBaUQsQ0FBQTtBQU1uRixPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyQkFBMkIsQ0FBQTtBQUtuRSxNQUFNLENBQUMsTUFBTSxPQUFPLEdBQUcsQ0FBQyxFQUFrQixFQUFFLEVBQUUsQ0FDN0MsS0FBSyxDQUFDLEVBQUUsQ0FBQyxLQUFLLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxPQUFPLEdBQUcsRUFBRSxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFFeEQsTUFBTSxlQUFlLEdBQUc7SUFDdkIsRUFBRSxLQUFLLEVBQUUsT0FBTyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxLQUFLLEVBQUU7SUFDN0QsRUFBRSxLQUFLLEVBQUUsT0FBTyxpQkFBaUIsQ0FBQyxZQUFZLENBQUMsR0FBRyxFQUFFLEdBQUcsRUFBRSxRQUFRLEVBQUU7SUFDbkUsRUFBRSxLQUFLLEVBQUUs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