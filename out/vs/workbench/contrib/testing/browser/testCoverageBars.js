/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ExplorerTestCoverageBars_1;
import { h } from '../../../../base/browser/dom.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { MarkdownString } from '../../../../base/common/htmlContent.js';
import { Lazy } from '../../../../base/common/lazy.js';
import { Disposable, DisposableStore, toDisposable } from '../../../../base/common/lifecycle.js';
import { autorun, observableValue } from '../../../../base/common/observable.js';
import { isDefined } from '../../../../base/common/types.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import * as coverUtils from './codeCoverageDisplayUtils.js';
import { getTestingConfiguration, observeTestingConfiguration, } from '../common/configuration.js';
import { ITestCoverageService } from '../common/testCoverageService.js';
let ManagedTestCoverageBars = class ManagedTestCoverageBars extends Disposable {
    /** Gets whether coverage is currently visible for the resource. */
    get visible() {
        return !!this._coverage;
    }
    constructor(options, configurationService, hoverService) {
        super();
        this.options = options;
        this.configurationService = configurationService;
        this.hoverService = hoverService;
        this.el = new Lazy(() => {
            if (this.options.compact) {
                const el = h('.test-coverage-bars.compact', [h('.tpc@overall'), h('.bar@tpcBar')]);
                this.attachHover(el.tpcBar, getOverallHoverText);
                return el;
            }
            else {
                const el = h('.test-coverage-bars', [
                    h('.tpc@overall'),
                    h('.bar@statement'),
                    h('.bar@function'),
                    h('.bar@branch'),
                ]);
                this.attachHover(el.statement, stmtCoverageText);
                this.attachHover(el.function, fnCoverageText);
                this.attachHover(el.branch, branchCoverageText);
                return el;
            }
        });
        this.visibleStore = this._register(new DisposableStore());
        this.customHovers = [];
    }
    attachHover(target, factory) {
        this._register(this.hoverService.setupManagedHover(getDefaultHoverDelegate('element'), target, () => this._coverage && factory(this._coverage)));
    }
    setCoverageInfo(coverage) {
        const ds = this.visibleStore;
        if (!coverage) {
            if (this._coverage) {
                this._coverage = undefined;
                this.customHovers.forEach((c) => c.hide());
                ds.clear();
            }
            return;
        }
        if (!this._coverage) {
            const root = this.el.value.root;
            ds.add(toDisposable(() => root.remove()));
            this.options.container.appendChild(root);
            ds.add(this.configurationService.onDidChangeConfiguration((c) => {
                if (!this._coverage) {
                    return;
                }
                if (c.affectsConfiguration("testing.displayedCoveragePercent" /* TestingConfigKeys.CoveragePercent */) ||
                    c.affectsConfiguration("testing.coverageBarThresholds" /* TestingConfigKeys.CoverageBarThresholds */)) {
                    this.doRender(this._coverage);
                }
            }));
        }
        this._coverage = coverage;
        this.doRender(coverage);
    }
    doRender(coverage) {
        const el = this.el.value;
        const precision = this.options.compact ? 0 : 2;
        const thresholds = getTestingConfiguration(this.configurationService, "testing.coverageBarThresholds" /* TestingConfigKeys.CoverageBarThresholds */);
        const overallStat = coverUtils.calculateDisplayedStat(coverage, getTestingConfiguration(this.configurationService, "testing.displayedCoveragePercent" /* TestingConfigKeys.CoveragePercent */));
        if (this.options.overall !== false) {
            el.overall.textContent = coverUtils.displayPercent(overallStat, precision);
        }
        else {
            el.overall.style.display = 'none';
        }
        if ('tpcBar' in el) {
            // compact mode
            renderBar(el.tpcBar, overallStat, false, thresholds);
        }
        else {
            renderBar(el.statement, coverUtils.percent(coverage.statement), coverage.statement.total === 0, thresholds);
            renderBar(el.function, coverage.declaration && coverUtils.percent(coverage.declaration), coverage.declaration?.total === 0, thresholds);
            renderBar(el.branch, coverage.branch && coverUtils.percent(coverage.branch), coverage.branch?.total === 0, thresholds);
        }
    }
};
ManagedTestCoverageBars = __decorate([
    __param(1, IConfigurationService),
    __param(2, IHoverService)
], ManagedTestCoverageBars);
export { ManagedTestCoverageBars };
const barWidth = 16;
const renderBar = (bar, pct, isZero, thresholds) => {
    if (pct === undefined) {
        bar.style.display = 'none';
        return;
    }
    bar.style.display = 'block';
    bar.style.width = `${barWidth}px`;
    // this is floored so the bar is only completely filled at 100% and not 99.9%
    bar.style.setProperty('--test-bar-width', `${Math.floor(pct * 16)}px`);
    if (isZero) {
        bar.style.color = 'currentColor';
        bar.style.opacity = '0.5';
        return;
    }
    bar.style.color = coverUtils.getCoverageColor(pct, thresholds);
    bar.style.opacity = '1';
};
const nf = new Intl.NumberFormat();
const stmtCoverageText = (coverage) => localize('statementCoverage', '{0}/{1} statements covered ({2})', nf.format(coverage.statement.covered), nf.format(coverage.statement.total), coverUtils.displayPercent(coverUtils.percent(coverage.statement)));
const fnCoverageText = (coverage) => coverage.declaration &&
    localize('functionCoverage', '{0}/{1} functions covered ({2})', nf.format(coverage.declaration.covered), nf.format(coverage.declaration.total), coverUtils.displayPercent(coverUtils.percent(coverage.declaration)));
const branchCoverageText = (coverage) => coverage.branch &&
    localize('branchCoverage', '{0}/{1} branches covered ({2})', nf.format(coverage.branch.covered), nf.format(coverage.branch.total), coverUtils.displayPercent(coverUtils.percent(coverage.branch)));
const getOverallHoverText = (coverage) => {
    const str = [stmtCoverageText(coverage), fnCoverageText(coverage), branchCoverageText(coverage)]
        .filter(isDefined)
        .join('\n\n');
    return {
        markdown: new MarkdownString().appendText(str),
        markdownNotSupportedFallback: str,
    };
};
/**
 * Renders test coverage bars for a resource in the given container. It will
 * not render anything unless a test coverage report has been opened.
 */
let ExplorerTestCoverageBars = class ExplorerTestCoverageBars extends ManagedTestCoverageBars {
    static { ExplorerTestCoverageBars_1 = this; }
    static { this.hasRegistered = false; }
    static register() {
        if (this.hasRegistered) {
            return;
        }
        this.hasRegistered = true;
        Registry.as("workbench.registry.explorer.fileContributions" /* ExplorerExtensions.FileContributionRegistry */).register({
            create(insta, container) {
                return insta.createInstance(ExplorerTestCoverageBars_1, { compact: true, container });
            },
        });
    }
    constructor(options, configurationService, hoverService, testCoverageService) {
        super(options, configurationService, hoverService);
        this.resource = observableValue(this, undefined);
        const isEnabled = observeTestingConfiguration(configurationService, "testing.showCoverageInExplorer" /* TestingConfigKeys.ShowCoverageInExplorer */);
        this._register(autorun(async (reader) => {
            let info;
            const coverage = testCoverageService.selected.read(reader);
            if (coverage && isEnabled.read(reader)) {
                const resource = this.resource.read(reader);
                if (resource) {
                    info = coverage.getComputedForUri(resource);
                }
            }
            this.setCoverageInfo(info);
        }));
    }
    /** @inheritdoc */
    setResource(resource, transaction) {
        this.resource.set(resource, transaction);
    }
    setCoverageInfo(coverage) {
        super.setCoverageInfo(coverage);
        this.options.container?.classList.toggle('explorer-item-with-test-coverage', this.visible);
    }
};
ExplorerTestCoverageBars = ExplorerTestCoverageBars_1 = __decorate([
    __param(1, IConfigurationService),
    __param(2, IHoverService),
    __param(3, ITestCoverageService)
], ExplorerTestCoverageBars);
export { ExplorerTestCoverageBars };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdENvdmVyYWdlQmFycy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlc3RpbmcvYnJvd3Nlci90ZXN0Q292ZXJhZ2VCYXJzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7OztBQUVoRyxPQUFPLEVBQUUsQ0FBQyxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFLbkQsT0FBTyxFQUFFLHVCQUF1QixFQUFFLE1BQU0sMkRBQTJELENBQUE7QUFDbkcsT0FBTyxFQUFFLGNBQWMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ3ZFLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsVUFBVSxFQUFFLGVBQWUsRUFBRSxZQUFZLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNoRyxPQUFPLEVBQWdCLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSx1Q0FBdUMsQ0FBQTtBQUM5RixPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sa0NBQWtDLENBQUE7QUFFNUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFNM0UsT0FBTyxLQUFLLFVBQVUsTUFBTSwrQkFBK0IsQ0FBQTtBQUMzRCxPQUFPLEVBR04sdUJBQXVCLEVBQ3ZCLDJCQUEyQixHQUMzQixNQUFNLDRCQUE0QixDQUFBO0FBRW5DLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBcUJoRSxJQUFNLHVCQUF1QixHQUE3QixNQUFN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