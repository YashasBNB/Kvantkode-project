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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZXMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL2NvZGVBY3Rpb24vY29tbW9uL3R5cGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBR2hHLE9BQU8sRUFBRSx5QkFBeUIsRUFBRSxNQUFNLG1DQUFtQyxDQUFBO0FBQzdFLE9BQU8sRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLDZDQUE2QyxDQUFBO0FBSzlFLE1BQU0sQ0FBQyxNQUFNLGNBQWMsR0FBRyxJQUFJLENBQUM7SUFBQTtRQUNsQixhQUFRLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUUzQyxhQUFRLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQUMzQyxvQkFBZSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBQ2pELG1CQUFjLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUE7UUFDL0MsaUJBQVksR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQTtRQUMzQyxvQkFBZSxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFBO1FBRWpELGFBQVEsR0FBRyxJQUFJLGdCQUFnQixDQUFDLFVBQVUsQ0FBQyxDQUFBO1FBRTNDLFdBQU0sR0FBRyxJQUFJLGdCQUFnQixDQUFDLFFBQVEsQ0FBQyxDQUFBO1FBQ3ZDLDBCQUFxQixHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFDN0QsaUJBQVksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxR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