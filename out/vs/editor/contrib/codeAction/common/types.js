/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { onUnexpectedExternalError } from '../../../../base/common/errors.js';
import { HierarchicalKind } from '../../../../base/common/hierarchicalKind.js';
export const CodeActionKind = new (class {
    constructor() {
        this.QuickFix = new HierarchicalKind('quickfix');
        this.Refactor = new HierarchicalKind('refactor');
        this.RefactorExtract = this.Refactor.append('extract');
        this.RefactorInline = this.Refactor.append('inline');
        this.RefactorMove = this.Refactor.append('move');
        this.RefactorRewrite = this.Refactor.append('rewrite');
        this.Notebook = new HierarchicalKind('notebook');
        this.Source = new HierarchicalKind('source');
        this.SourceOrganizeImports = this.Source.append('organizeImports');
        this.SourceFixAll = this.Source.append('fixAll');
        this.SurroundWith = this.Refactor.append('surround');
    }
})();
export var CodeActionAutoApply;
(function (CodeActionAutoApply) {
    CodeActionAutoApply["IfSingle"] = "ifSingle";
    CodeActionAutoApply["First"] = "first";
    CodeActionAutoApply["Never"] = "never";
})(CodeActionAutoApply || (CodeActionAutoApply = {}));
export var CodeActionTriggerSource;
(function (CodeActionTriggerSource) {
    CodeActionTriggerSource["Refactor"] = "refactor";
    CodeActionTriggerSource["RefactorPreview"] = "refactor preview";
    CodeActionTriggerSource["Lightbulb"] = "lightbulb";
    CodeActionTriggerSource["Default"] = "other (default)";
    CodeActionTriggerSource["SourceAction"] = "source action";
    CodeActionTriggerSource["QuickFix"] = "quick fix action";
    CodeActionTriggerSource["FixAll"] = "fix all";
    CodeActionTriggerSource["OrganizeImports"] = "organize imports";
    CodeActionTriggerSource["AutoFix"] = "auto fix";
    CodeActionTriggerSource["QuickFixHover"] = "quick fix hover window";
    CodeActionTriggerSource["OnSave"] = "save participants";
    CodeActionTriggerSource["ProblemsView"] = "problems view";
})(CodeActionTriggerSource || (CodeActionTriggerSource = {}));
export function mayIncludeActionsOfKind(filter, providedKind) {
    // A provided kind may be a subset or superset of our filtered kind.
    if (filter.include && !filter.include.intersects(providedKind)) {
        return false;
    }
    if (filter.excludes) {
        if (filter.excludes.some((exclude) => excludesAction(providedKind, exclude, filter.include))) {
            return false;
        }
    }
    // Don't return source actions unless they are explicitly requested
    if (!filter.includeSourceActions && CodeActionKind.Source.contains(providedKind)) {
        return false;
    }
    return true;
}
export function filtersAction(filter, action) {
    const actionKind = action.kind ? new HierarchicalKind(action.kind) : undefined;
    // Filter out actions by kind
    if (filter.include) {
        if (!actionKind || !filter.include.contains(actionKind)) {
            return false;
        }
    }
    if (filter.excludes) {
        if (actionKind &&
            filter.excludes.some((exclude) => excludesAction(actionKind, exclude, filter.include))) {
            return false;
        }
    }
    // Don't return source actions unless they are explicitly requested
    if (!filter.includeSourceActions) {
        if (actionKind && CodeActionKind.Source.contains(actionKind)) {
            return false;
        }
    }
    if (filter.onlyIncludePreferredActions) {
        if (!action.isPreferred) {
            return false;
        }
    }
    return true;
}
function excludesAction(providedKind, exclude, include) {
    if (!exclude.contains(providedKind)) {
        return false;
    }
    if (include && exclude.contains(include)) {
        // The include is more specific, don't filter out
        return false;
    }
    return true;
}
export class CodeActionCommandArgs {
    static fromUser(arg, defaults) {
        if (!arg || typeof arg !== 'object') {
            return new CodeActionCommandArgs(defaults.kind, defaults.apply, false);
        }
        return new CodeActionCommandArgs(CodeActionCommandArgs.getKindFromUser(arg, defaults.kind), CodeActionCommandArgs.getApplyFromUser(arg, defaults.apply), CodeActionCommandArgs.getPreferredUser(arg));
    }
    static getApplyFromUser(arg, defaultAutoApply) {
        switch (typeof arg.apply === 'string' ? arg.apply.toLowerCase() : '') {
            case 'first':
                return "first" /* CodeActionAutoApply.First */;
            case 'never':
                return "never" /* CodeActionAutoApply.Never */;
            case 'ifsingle':
                return "ifSingle" /* CodeActionAutoApply.IfSingle */;
            default:
                return defaultAutoApply;
        }
    }
    static getKindFromUser(arg, defaultKind) {
        return typeof arg.kind === 'string' ? new HierarchicalKind(arg.kind) : defaultKind;
    }
    static getPreferredUser(arg) {
        return typeof arg.preferred === 'boolean' ? arg.preferred : false;
    }
    constructor(kind, apply, preferred) {
        this.kind = kind;
        this.apply = apply;
        this.preferred = preferred;
    }
}
export class CodeActionItem {
    constructor(action, provider, highlightRange) {
        this.action = action;
        this.provider = provider;
        this.highlightRange = highlightRange;
    }
    async resolve(token) {
        if (this.provider?.resolveCodeAction && !this.action.edit) {
            let action;
            try {
                action = await this.provider.resolveCodeAction(this.action, token);
            }
            catch (err) {
                onUnexpectedExternalError(err);
            }
            if (action) {
                this.action.edit = action.edit;
            }
        }
        return this;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9lZGl0b3IvY29udHJpYi9jb2RlQWN0aW9uL2NvbW1vbi90eXBlcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUdoRyxPQUFPLEVBQUUseUJBQXlCLEVBQUUsTUFBTSxtQ0FBbUMsQ0FBQTtBQUM3RSxPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSw2Q0FBNkMsQ0FBQTtBQUs5RSxNQUFNLENBQUMsTUFBTSxjQUFjLEdBQUcsSUFBSSxDQUFDO0lBQUE7UUFDbEIsYUFBUSxHQUFHLElBQUksZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUE7UUFFM0MsYUFBUSxHQUFHLElBQUksZ0JBQWdCLENBQUMsVUFBVSxDQUFDLENBQUE7UUFDM0Msb0JBQWUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUNqRCxtQkFBYyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQy9DLGlCQUFZLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDM0Msb0JBQWUsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQTtRQUVqRCxhQUFRLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUUzQyxXQUFNLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxRQUFRLENBQUMsQ0FBQTtRQUN2QywwQkFBcUIsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBQzdELGlCQUFZLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDM0MsaUJB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