import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { GettingStartedPage, inWelcomeContext } from './gettingStarted.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IWalkthroughsService, } from './gettingStartedService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { GettingStartedInput } from './gettingStartedInput.js';
import { localize } from '../../../../nls.js';
import { Action } from '../../../../base/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { URI } from '../../../../base/common/uri.js';
import { parse } from '../../../../base/common/marshalling.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { ThemeIcon } from '../../../../base/common/themables.js';
import { Codicon } from '../../../../base/common/codicons.js';
export class GettingStartedAccessibleView {
    constructor() {
        this.type = "view" /* AccessibleViewType.View */;
        this.priority = 110;
        this.name = 'walkthroughs';
        this.when = inWelcomeContext;
        this.getProvider = (accessor) => {
            const editorService = accessor.get(IEditorService);
            const editorPane = editorService.activeEditorPane;
            if (!(editorPane instanceof GettingStartedPage)) {
                return;
            }
            const gettingStartedInput = editorPane.input;
            if (!(gettingStartedInput instanceof GettingStartedInput) ||
                !gettingStartedInput.selectedCategory) {
                return;
            }
            const gettingStartedService = accessor.get(IWalkthroughsService);
            const currentWalkthrough = gettingStartedService.getWalkthrough(gettingStartedInput.selectedCategory);
            const currentStepIds = gettingStartedInput.selectedStep;
            if (currentWalkthrough) {
                return new GettingStartedAccessibleProvider(accessor.get(IContextKeyService), accessor.get(ICommandService), accessor.get(IOpenerService), editorPane, currentWalkthrough, currentStepIds);
            }
            return;
        };
    }
}
class GettingStartedAccessibleProvider extends Disposable {
    constructor(contextService, commandService, openerService, _gettingStartedPage, _walkthrough, _focusedStep) {
        super();
        this.contextService = contextService;
        this.commandService = commandService;
        this.openerService = openerService;
        this._gettingStartedPage = _gettingStartedPage;
        this._walkthrough = _walkthrough;
        this._focusedStep = _focusedStep;
        this._currentStepIndex = 0;
        this._activeWalkthroughSteps = [];
        this.id = "walkthrough" /* AccessibleViewProviderId.Walkthrough */;
        this.verbositySettingKey = "accessibility.verbosity.walkthrough" /* AccessibilityVerbositySettingId.Walkthrough */;
        this.options = { type: "view" /* AccessibleViewType.View */ };
        this._activeWalkthroughSteps = _walkthrough.steps.filter((step) => !step.when || this.contextService.contextMatchesRules(step.when));
    }
    get actions() {
        const actions = [];
        const step = this._activeWalkthroughSteps[this._currentStepIndex];
        const nodes = step.description
            .map((lt) => lt.nodes
            .filter((node) => typeof node !== 'string')
            .map((node) => ({ href: node.href, label: node.label })))
            .flat();
        if (nodes.length === 1) {
            const node = nodes[0];
            actions.push(new Action('walthrough.step.action', node.label, ThemeIcon.asClassName(Codicon.run), true, () => {
                const isCommand = node.href.startsWith('command:');
                const command = node.href.replace(/command:(toSide:)?/, 'command:');
                if (isCommand) {
                    const commandURI = URI.parse(command);
                    let args = [];
                    try {
                        args = parse(decodeURIComponent(commandURI.query));
                    }
                    catch {
                        try {
                            args = parse(commandURI.query);
                        }
                        catch {
                            // ignore error
                        }
                    }
                    if (!Array.isArray(args)) {
                        args = [args];
                    }
                    this.commandService.executeCommand(commandURI.path, ...args);
                }
                else {
                    this.openerService.open(command, { allowCommands: true });
                }
            }));
        }
        return actions;
    }
    provideContent() {
        if (this._focusedStep) {
            const stepIndex = this._activeWalkthroughSteps.findIndex((step) => step.id === this._focusedStep);
            if (stepIndex !== -1) {
                this._currentStepIndex = stepIndex;
            }
        }
        return this._getContent(this._walkthrough, this._activeWalkthroughSteps[this._currentStepIndex], 
        /* includeTitle */ true);
    }
    _getContent(waltkrough, step, includeTitle) {
        const description = step.description
            .map((lt) => lt.nodes.filter((node) => typeof node === 'string'))
            .join('\n');
        const stepsContent = localize('gettingStarted.step', '{0}\n{1}', step.title, description);
        if (includeTitle) {
            return [
                localize('gettingStarted.title', 'Title: {0}', waltkrough.title),
                localize('gettingStarted.description', 'Description: {0}', waltkrough.description),
                stepsContent,
            ].join('\n');
        }
        else {
            return stepsContent;
        }
    }
    provideNextContent() {
        if (++this._currentStepIndex >= this._activeWalkthroughSteps.length) {
            --this._currentStepIndex;
            return;
        }
        return this._getContent(this._walkthrough, this._activeWalkthroughSteps[this._currentStepIndex]);
    }
    providePreviousContent() {
        if (--this._currentStepIndex < 0) {
            ++this._currentStepIndex;
            return;
        }
        return this._getContent(this._walkthrough, this._activeWalkthroughSteps[this._currentStepIndex]);
    }
    onClose() {
        if (this._currentStepIndex > -1) {
            const currentStep = this._activeWalkthroughSteps[this._currentStepIndex];
            this._gettingStartedPage.makeCategoryVisibleWhenAvailable(this._walkthrough.id, currentStep.id);
        }
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0dGluZ1N0YXJ0ZWRBY2Nlc3NpYmxlVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvd2VsY29tZUdldHRpbmdTdGFydGVkL2Jyb3dzZXIvZ2V0dGluZ1N0YXJ0ZWRBY2Nlc3NpYmxlVmlldy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFZQSxPQUFPLEVBQUUsa0JBQWtCLEVBQUUsTUFBTSxzREFBc0QsQ0FBQTtBQUV6RixPQUFPLEVBQUUsa0JBQWtCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUMxRSxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDakUsT0FBTyxFQUdOLG9CQUFvQixHQUNwQixNQUFNLDRCQUE0QixDQUFBO0FBRW5DLE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNqRixPQUFPLEVBQUUsbUJBQW1CLEVBQUUsTUFBTSwwQkFBMEIsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDN0MsT0FBTyxFQUFFLE1BQU0sRUFBVyxNQUFNLG9DQUFvQyxDQUFBO0FBRXBFLE9BQU8sRUFBRSxlQUFlLEVBQUUsTUFBTSxrREFBa0QsQ0FBQTtBQUNsRixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sZ0NBQWdDLENBQUE7QUFDcEQsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQzlELE9BQU8sRUFBRSxjQUFjLEVBQUUsTUFBTSw4Q0FBOEMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFDaEUsT0FBTyxFQUFFLE9BQU8sRUFBRSxNQUFNLHFDQUFxQyxDQUFBO0FBRTdELE1BQU0sT0FBTyw0QkFBNEI7SUFBekM7UUFDVSxTQUFJ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