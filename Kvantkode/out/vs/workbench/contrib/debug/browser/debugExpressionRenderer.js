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
import * as dom from '../../../../base/browser/dom.js';
import { getDefaultHoverDelegate } from '../../../../base/browser/ui/hover/hoverDelegateFactory.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { CommandsRegistry, ICommandService } from '../../../../platform/commands/common/commands.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { observableConfigValue } from '../../../../platform/observable/common/platformObservableUtils.js';
import { Expression, ExpressionContainer, Variable } from '../common/debugModel.js';
import { ReplEvaluationResult } from '../common/replModel.js';
import { splitExpressionOrScopeHighlights } from './baseDebugView.js';
import { handleANSIOutput } from './debugANSIHandling.js';
import { COPY_EVALUATE_PATH_ID, COPY_VALUE_ID } from './debugCommands.js';
import { LinkDetector, } from './linkDetector.js';
const MAX_VALUE_RENDER_LENGTH_IN_VIEWLET = 1024;
const booleanRegex = /^(true|false)$/i;
const stringRegex = /^(['"]).*\1$/;
var Cls;
(function (Cls) {
    Cls["Value"] = "value";
    Cls["Unavailable"] = "unavailable";
    Cls["Error"] = "error";
    Cls["Changed"] = "changed";
    Cls["Boolean"] = "boolean";
    Cls["String"] = "string";
    Cls["Number"] = "number";
})(Cls || (Cls = {}));
const allClasses = Object.keys({
    ["value" /* Cls.Value */]: 0,
    ["unavailable" /* Cls.Unavailable */]: 0,
    ["error" /* Cls.Error */]: 0,
    ["changed" /* Cls.Changed */]: 0,
    ["boolean" /* Cls.Boolean */]: 0,
    ["string" /* Cls.String */]: 0,
    ["number" /* Cls.Number */]: 0,
});
let DebugExpressionRenderer = class DebugExpressionRenderer {
    constructor(commandService, configurationService, instantiationService, hoverService) {
        this.commandService = commandService;
        this.hoverService = hoverService;
        this.linkDetector = instantiationService.createInstance(LinkDetector);
        this.displayType = observableConfigValue('debug.showVariableTypes', false, configurationService);
    }
    renderVariable(data, variable, options = {}) {
        const displayType = this.displayType.get();
        const highlights = splitExpressionOrScopeHighlights(variable, options.highlights || []);
        if (variable.available) {
            data.type.textContent = '';
            let text = variable.name;
            if (variable.value && typeof variable.name === 'string') {
                if (variable.type && displayType) {
                    text += ': ';
                    data.type.textContent = variable.type + ' =';
                }
                else {
                    text += ' =';
                }
            }
            data.label.set(text, highlights.name, variable.type && !displayType ? variable.type : variable.name);
            data.name.classList.toggle('virtual', variable.presentationHint?.kind === 'virtual');
            data.name.classList.toggle('internal', variable.presentationHint?.visibility === 'internal');
        }
        else if (variable.value && typeof variable.name === 'string' && variable.name) {
            data.label.set(':');
        }
        data.expression.classList.toggle('lazy', !!variable.presentationHint?.lazy);
        const commands = [{ id: COPY_VALUE_ID, args: [variable, [variable]] }];
        if (variable.evaluateName) {
            commands.push({ id: COPY_EVALUATE_PATH_ID, args: [{ variable }] });
        }
        return this.renderValue(data.value, variable, {
            showChanged: options.showChanged,
            maxValueLength: MAX_VALUE_RENDER_LENGTH_IN_VIEWLET,
            hover: { commands },
            highlights: highlights.value,
            colorize: true,
            session: variable.getSession(),
        });
    }
    renderValue(container, expressionOrValue, options = {}) {
        const store = new DisposableStore();
        // Use remembered capabilities so REPL elements can render even once a session ends
        const supportsANSI = options.session?.rememberedCapabilities?.supportsANSIStyling ?? options.wasANSI ?? false;
        let value = typeof expressionOrValue === 'string' ? expressionOrValue : expressionOrValue.value;
        // remove stale classes
        for (const cls of allClasses) {
            container.classList.remove(cls);
        }
        container.classList.add("value" /* Cls.Value */);
        // when resolving expressions we represent errors from the server as a variable with name === null.
        if (value === null ||
            ((expressionOrValue instanceof Expression ||
                expressionOrValue instanceof Variable ||
                expressionOrValue instanceof ReplEvaluationResult) &&
                !expressionOrValue.available)) {
            container.classList.add("unavailable" /* Cls.Unavailable */);
            if (value !== Expression.DEFAULT_VALUE) {
                container.classList.add("error" /* Cls.Error */);
            }
        }
        else {
            if (typeof expressionOrValue !== 'string' &&
                options.showChanged &&
                expressionOrValue.valueChanged &&
                value !== Expression.DEFAULT_VALUE) {
                // value changed color has priority over other colors.
                container.classList.add("changed" /* Cls.Changed */);
                expressionOrValue.valueChanged = false;
            }
            if (options.colorize && typeof expressionOrValue !== 'string') {
                if (expressionOrValue.type === 'number' ||
                    expressionOrValue.type === 'boolean' ||
                    expressionOrValue.type === 'string') {
                    container.classList.add(expressionOrValue.type);
                }
                else if (!isNaN(+value)) {
                    container.classList.add("number" /* Cls.Number */);
                }
                else if (booleanRegex.test(value)) {
                    container.classList.add("boolean" /* Cls.Boolean */);
                }
                else if (stringRegex.test(value)) {
                    container.classList.add("string" /* Cls.String */);
                }
            }
        }
        if (options.maxValueLength && value && value.length > options.maxValueLength) {
            value = value.substring(0, options.maxValueLength) + '...';
        }
        if (!value) {
            value = '';
        }
        const session = options.session ??
            (expressionOrValue instanceof ExpressionContainer
                ? expressionOrValue.getSession()
                : undefined);
        // Only use hovers for links if thre's not going to be a hover for the value.
        const hoverBehavior = options.hover === false
            ? { type: 0 /* DebugLinkHoverBehavior.Rich */, store }
            : { type: 2 /* DebugLinkHoverBehavior.None */ };
        dom.clearNode(container);
        const locationReference = options.locationReference ??
            (expressionOrValue instanceof ExpressionContainer && expressionOrValue.valueLocationReference);
        let linkDetector = this.linkDetector;
        if (locationReference && session) {
            linkDetector = this.linkDetector.makeReferencedLinkDetector(locationReference, session);
        }
        if (supportsANSI) {
            container.appendChild(handleANSIOutput(value, linkDetector, session ? session.root : undefined, options.highlights));
        }
        else {
            container.appendChild(linkDetector.linkify(value, false, session?.root, true, hoverBehavior, options.highlights));
        }
        if (options.hover !== false) {
            const { commands = [] } = options.hover || {};
            store.add(this.hoverService.setupManagedHover(getDefaultHoverDelegate('mouse'), container, () => {
                const container = dom.$('div');
                const markdownHoverElement = dom.$('div.hover-row');
                const hoverContentsElement = dom.append(markdownHoverElement, dom.$('div.hover-contents'));
                const hoverContentsPre = dom.append(hoverContentsElement, dom.$('pre.debug-var-hover-pre'));
                if (supportsANSI) {
                    // note: intentionally using `this.linkDetector` so we don't blindly linkify the
                    // entire contents and instead only link file paths that it contains.
                    hoverContentsPre.appendChild(handleANSIOutput(value, this.linkDetector, session ? session.root : undefined, options.highlights));
                }
                else {
                    hoverContentsPre.textContent = value;
                }
                container.appendChild(markdownHoverElement);
                return container;
            }, {
                actions: commands.map(({ id, args }) => {
                    const description = CommandsRegistry.getCommand(id)?.metadata?.description;
                    return {
                        label: typeof description === 'string'
                            ? description
                            : description
                                ? description.value
                                : id,
                        commandId: id,
                        run: () => this.commandService.executeCommand(id, ...args),
                    };
                }),
            }));
        }
        return store;
    }
};
DebugExpressionRenderer = __decorate([
    __param(0, ICommandService),
    __param(1, IConfigurationService),
    __param(2, IInstantiationService),
    __param(3, IHoverService)
], DebugExpressionRenderer);
export { DebugExpressionRenderer };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVidWdFeHByZXNzaW9uUmVuZGVyZXIuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2RlYnVnL2Jyb3dzZXIvZGVidWdFeHByZXNzaW9uUmVuZGVyZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxLQUFLLEdBQUcsTUFBTSxpQ0FBaUMsQ0FBQTtBQUV0RCxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsTUFBTSwyREFBMkQsQ0FBQTtBQUNuRyxPQUFPLEVBQUUsZUFBZSxFQUFlLE1BQU0sc0NBQXNDLENBQUE7QUFFbkYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLGVBQWUsRUFBRSxNQUFNLGtEQUFrRCxDQUFBO0FBQ3BHLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxNQUFNLDREQUE0RCxDQUFBO0FBQ2xHLE9BQU8sRUFBRSxhQUFhLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUMzRSxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSw0REFBNEQsQ0FBQTtBQUNsRyxPQUFPLEVBQUUscUJBQXFCLEVBQUUsTUFBTSxtRUFBbUUsQ0FBQTtBQUV6RyxPQUFPLEVBQUUsVUFBVSxFQUFFLG1CQUFtQixFQUFFLFFBQVEsRUFBRSxNQUFNLHlCQUF5QixDQUFBO0FBQ25GLE9BQU8sRUFBRSxvQkFBb0IsRUFBRSxNQUFNLHdCQUF3QixDQUFBO0FBQzdELE9BQU8sRUFBeUIsZ0NBQWdDLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUM1RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSx3QkFBd0IsQ0FBQTtBQUN6RCxPQUFPLEVBQUUscUJBQXFCLEVBQUUsYUFBYSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFDekUsT0FBTyxFQUlOLFlBQVksR0FDWixNQUFN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