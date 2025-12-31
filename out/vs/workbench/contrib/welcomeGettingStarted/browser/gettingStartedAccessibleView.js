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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0dGluZ1N0YXJ0ZWRBY2Nlc3NpYmxlVmlldy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3dlbGNvbWVHZXR0aW5nU3RhcnRlZC9icm93c2VyL2dldHRpbmdTdGFydGVkQWNjZXNzaWJsZVZpZXcudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBWUEsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFFekYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLGdCQUFnQixFQUFFLE1BQU0scUJBQXFCLENBQUE7QUFDMUUsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFHTixvQkFBb0IsR0FDcEIsTUFBTSw0QkFBNEIsQ0FBQTtBQUVuQyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDakYsT0FBTyxFQUFFLG1CQUFtQixFQUFFLE1BQU0sMEJBQTBCLENBQUE7QUFDOUQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBQzdDLE9BQU8sRUFBRSxNQUFNLEVBQVcsTUFBTSxvQ0FBb0MsQ0FBQTtBQUVwRSxPQUFPLEVBQUUsZUFBZSxFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDbEYsT0FBTyxFQUFFLEdBQUcsRUFBRSxNQUFNLGdDQUFnQyxDQUFBO0FBQ3BELE9BQU8sRUFBRSxLQUFLLEVBQUUsTUFBTSx3Q0FBd0MsQ0FBQTtBQUM5RCxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sOENBQThDLENBQUE7QUFDN0UsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2hFLE9BQU8sRUFBRSxPQUFPLEVBQUUsTUFBTSxxQ0FBcUMsQ0FBQTtBQUU3RCxNQUFNLE9BQU8sNEJBQTRCO0lBQXpDO1FBQ1UsU0FBSSx3Q0FB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