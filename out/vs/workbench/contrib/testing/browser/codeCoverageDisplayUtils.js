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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY29kZUNvdmVyYWdlRGlzcGxheVV0aWxzLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXN0aW5nL2Jyb3dzZXIvY29kZUNvdmVyYWdlRGlzcGxheVV0aWxzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSxXQUFXLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUMvRCxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDMUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFDTixXQUFXLEVBQ1gsU0FBUyxFQUNULFlBQVksR0FDWixNQUFNLG9EQUFvRCxDQUFBO0FBQzNELE9BQU8sRUFBRSxpQkFBaUIsRUFBRSxNQUFNLGlEQUFpRCxDQUFBO0FBTW5GLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLDJCQUEyQixDQUFBO0FBS25FLE1BQU0sQ0FBQyxNQUFNLE9BQU8sR0FBRyxDQUFDLEVBQWtCLEVBQUUsRUFBRSxDQUM3QyxLQUFLLENBQUMsRUFBRSxDQUFDLEtBQUssS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLE9BQU8sR0FBRyxFQUFFLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQTtBQUV4RCxNQUFNLGVBQWUsR0FBRztJQUN2QixFQUFFLEtBQUssRUFBRSxPQUFPLGlCQUFpQixDQUFDLFNBQVMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLEtBQUssRUFBRTtJQUM3RCxFQUFFLEtBQUssRUFBRSxPQUFPLGlCQUFpQixDQUFDLFlBQVksQ0FBQyxHQUFHLEVBQUUsR0FBRyxFQUFFLFFBQVEsRUFBRTtJQUNuRSxFQUFFLEtBQUss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