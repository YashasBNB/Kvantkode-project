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
var ParameterHintsController_1;
import { Lazy } from '../../../../base/common/lazy.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { EditorAction, EditorCommand, registerEditorAction, registerEditorCommand, registerEditorContribution, } from '../../../browser/editorExtensions.js';
import { EditorContextKeys } from '../../../common/editorContextKeys.js';
import * as languages from '../../../common/languages.js';
import { ILanguageFeaturesService } from '../../../common/services/languageFeatures.js';
import { ParameterHintsModel } from './parameterHintsModel.js';
import { Context } from './provideSignatureHelp.js';
import * as nls from '../../../../nls.js';
import { ContextKeyExpr } from '../../../../platform/contextkey/common/contextkey.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ParameterHintsWidget } from './parameterHintsWidget.js';
let ParameterHintsController = class ParameterHintsController extends Disposable {
    static { ParameterHintsController_1 = this; }
    static { this.ID = 'editor.controller.parameterHints'; }
    static get(editor) {
        return editor.getContribution(ParameterHintsController_1.ID);
    }
    constructor(editor, instantiationService, languageFeaturesService) {
        super();
        this.editor = editor;
        this.model = this._register(new ParameterHintsModel(editor, languageFeaturesService.signatureHelpProvider));
        this._register(this.model.onChangedHints((newParameterHints) => {
            if (newParameterHints) {
                this.widget.value.show();
                this.widget.value.render(newParameterHints);
            }
            else {
                this.widget.rawValue?.hide();
            }
        }));
        this.widget = new Lazy(() => this._register(instantiationService.createInstance(ParameterHintsWidget, this.editor, this.model)));
    }
    cancel() {
        this.model.cancel();
    }
    previous() {
        this.widget.rawValue?.previous();
    }
    next() {
        this.widget.rawValue?.next();
    }
    trigger(context) {
        this.model.trigger(context, 0);
    }
};
ParameterHintsController = ParameterHintsController_1 = __decorate([
    __param(1, IInstantiationService),
    __param(2, ILanguageFeaturesService)
], ParameterHintsController);
export { ParameterHintsController };
export class TriggerParameterHintsAction extends EditorAction {
    constructor() {
        super({
            id: 'editor.action.triggerParameterHints',
            label: nls.localize2('parameterHints.trigger.label', 'Trigger Parameter Hints'),
            precondition: EditorContextKeys.hasSignatureHelpProvider,
            kbOpts: {
                kbExpr: EditorContextKeys.editorTextFocus,
                primary: 2048 /* KeyMod.CtrlCmd */ | 1024 /* KeyMod.Shift */ | 10 /* KeyCode.Space */,
                weight: 100 /* KeybindingWeight.EditorContrib */,
            },
        });
    }
    run(accessor, editor) {
        const controller = ParameterHintsController.get(editor);
        controller?.trigger({
            triggerKind: languages.SignatureHelpTriggerKind.Invoke,
        });
    }
}
registerEditorContribution(ParameterHintsController.ID, ParameterHintsController, 2 /* EditorContributionInstantiation.BeforeFirstInteraction */);
registerEditorAction(TriggerParameterHintsAction);
const weight = 100 /* KeybindingWeight.EditorContrib */ + 75;
const ParameterHintsCommand = EditorCommand.bindToContribution(ParameterHintsController.get);
registerEditorCommand(new ParameterHintsCommand({
    id: 'closeParameterHints',
    precondition: Context.Visible,
    handler: (x) => x.cancel(),
    kbOpts: {
        weight: weight,
        kbExpr: EditorContextKeys.focus,
        primary: 9 /* KeyCode.Escape */,
        secondary: [1024 /* KeyMod.Shift */ | 9 /* KeyCode.Escape */],
    },
}));
registerEditorCommand(new ParameterHintsCommand({
    id: 'showPrevParameterHint',
    precondition: ContextKeyExpr.and(Context.Visible, Context.MultipleSignatures),
    handler: (x) => x.previous(),
    kbOpts: {
        weight: weight,
        kbExpr: EditorContextKeys.focus,
        primary: 16 /* KeyCode.UpArrow */,
        secondary: [512 /* KeyMod.Alt */ | 16 /* KeyCode.UpArrow */],
        mac: {
            primary: 16 /* KeyCode.UpArrow */,
            secondary: [512 /* KeyMod.Alt */ | 16 /* KeyCode.UpArrow */, 256 /* KeyMod.WinCtrl */ | 46 /* KeyCode.KeyP */],
        },
    },
}));
registerEditorCommand(new ParameterHintsCommand({
    id: 'showNextParameterHint',
    precondition: ContextKeyExpr.and(Context.Visible, Context.MultipleSignatures),
    handler: (x) => x.next(),
    kbOpts: {
        weight: weight,
        kbExpr: EditorContextKeys.focus,
        primary: 18 /* KeyCode.DownArrow */,
        secondary: [512 /* KeyMod.Alt */ | 18 /* KeyCode.DownArrow */],
        mac: {
            primary: 18 /* KeyCode.DownArrow */,
            secondary: [512 /* KeyMod.Alt */ | 18 /* KeyCode.DownArrow */, 256 /* KeyMod.WinCtrl */ | 44 /* KeyCode.KeyN */],
        },
    },
}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGFyYW1ldGVySGludHMuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2VkaXRvci9jb250cmliL3BhcmFtZXRlckhpbnRzL2Jyb3dzZXIvcGFyYW1ldGVySGludHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7O0FBR2hHLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUN0RCxPQUFPLEVBQUUsVUFBVSxFQUFFLE1BQU0sc0NBQXNDLENBQUE7QUFFakUsT0FBTyxFQUNOLFlBQVksRUFDWixhQUFhLEVBRWIsb0JBQW9CLEVBQ3BCLHFCQUFxQixFQUNyQiwwQkFBMEIsR0FFMUIsTUFBTSxzQ0FBc0MsQ0FBQTtBQUU3QyxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUN4RSxPQUFPLEtBQUssU0FBUyxNQUFNLDhCQUE4QixDQUFBO0FBQ3pELE9BQU8sRUFBRSx3QkFBd0IsRUFBRSxNQUFNLDhDQUE4QyxDQUFBO0FBQ3ZGLE9BQU8sRUFBRSxtQkFBbUIsRUFBa0IsTUFBTSwwQkFBMEIsQ0FBQTtBQUM5RSxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFDbkQsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQUN6QyxPQUFPLEVBQUUsY0FBYyxFQUFFLE1BQU0sc0RBQXNELENBQUE7QUFDckYsT0FBTyxFQUFFLHFCQUFxQixFQUFFLE1BQU0sNERBQTRELENBQUE7QUFFbEcsT0FBTyxFQUFFLG9CQUFvQixFQUFFLE1BQU0sMkJBQTJCLENBQUE7QUFFekQsSUFBTSx3QkFBd0IsR0FBOUIsTUFBTSx3QkFBeUIsU0FBUSxVQUFVOzthQUNoQyxPQUFFLEdBQUcsa0NBQWtDLEFBQXJDLENBQXFDO0lBRXZELE1BQU0sQ0FBQyxHQUFHLENBQUMs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