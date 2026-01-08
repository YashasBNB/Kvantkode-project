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
import { marked } from '../../../../base/common/marked/marked.js';
import { localize } from '../../../../nls.js';
import { IAccessibleViewService } from '../../../../platform/accessibility/browser/accessibleView.js';
import { isRequestVM, isResponseVM } from '../common/chatViewModel.js';
let ChatAccessibilityProvider = class ChatAccessibilityProvider {
    constructor(_accessibleViewService) {
        this._accessibleViewService = _accessibleViewService;
    }
    getWidgetRole() {
        return 'list';
    }
    getRole(element) {
        return 'listitem';
    }
    getWidgetAriaLabel() {
        return localize('chat', 'Chat');
    }
    getAriaLabel(element) {
        if (isRequestVM(element)) {
            return element.messageText;
        }
        if (isResponseVM(element)) {
            return this._getLabelWithInfo(element);
        }
        return '';
    }
    _getLabelWithInfo(element) {
        const accessibleViewHint = this._accessibleViewService.getOpenAriaHint("accessibility.verbosity.panelChat" /* AccessibilityVerbositySettingId.Chat */);
        let label = '';
        const toolInvocation = element.response.value
            .filter((v) => v.kind === 'toolInvocation')
            .filter((v) => !v.isComplete);
        let toolInvocationHint = '';
        if (toolInvocation.length) {
            const titles = toolInvocation.map((v) => v.confirmationMessages?.title).filter((v) => !!v);
            if (titles.length) {
                toolInvocationHint = localize('toolInvocationsHint', 'Action required: {0} ', titles.join(', '));
            }
        }
        const tableCount = marked.lexer(element.response.toString()).filter((token) => token.type === 'table')?.length ??
            0;
        let tableCountHint = '';
        switch (tableCount) {
            case 0:
                break;
            case 1:
                tableCountHint = localize('singleTableHint', '1 table ');
                break;
            default:
                tableCountHint = localize('multiTableHint', '{0} tables ', tableCount);
                break;
        }
        const fileTreeCount = element.response.value.filter((v) => v.kind === 'treeData').length ?? 0;
        let fileTreeCountHint = '';
        switch (fileTreeCount) {
            case 0:
                break;
            case 1:
                fileTreeCountHint = localize('singleFileTreeHint', '1 file tree ');
                break;
            default:
                fileTreeCountHint = localize('multiFileTreeHint', '{0} file trees ', fileTreeCount);
                break;
        }
        const codeBlockCount = marked.lexer(element.response.toString()).filter((token) => token.type === 'code')?.length ??
            0;
        switch (codeBlockCount) {
            case 0:
                label = accessibleViewHint
                    ? localize('noCodeBlocksHint', '{0}{1}{2}{3} {4}', toolInvocationHint, fileTreeCountHint, tableCountHint, element.response.toString(), accessibleViewHint)
                    : localize('noCodeBlocks', '{0} {1}', fileTreeCountHint, element.response.toString());
                break;
            case 1:
                label = accessibleViewHint
                    ? localize('singleCodeBlockHint', '{0}{1}1 code block: {2} {3}{4}', toolInvocationHint, fileTreeCountHint, tableCountHint, element.response.toString(), accessibleViewHint)
                    : localize('singleCodeBlock', '{0} 1 code block: {1}', fileTreeCountHint, element.response.toString());
                break;
            default:
                label = accessibleViewHint
                    ? localize('multiCodeBlockHint', '{0}{1}{2} code blocks: {3}{4}', toolInvocationHint, fileTreeCountHint, tableCountHint, codeBlockCount, element.response.toString(), accessibleViewHint)
                    : localize('multiCodeBlock', '{0} {1} code blocks', fileTreeCountHint, codeBlockCount, element.response.toString());
                break;
        }
        return label;
    }
};
ChatAccessibilityProvider = __decorate([
    __param(0, IAccessibleViewService)
], ChatAccessibilityProvider);
export { ChatAccessibilityProvider };
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEFjY2Vzc2liaWxpdHlQcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvd29ya2JlbmNoL2NvbnRyaWIvY2hhdC9icm93c2VyL2NoYXRBY2Nlc3NpYmlsaXR5UHJvdmlkZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFJaEcsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLDBDQUEwQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxvQkFBb0IsQ0FBQTtBQUU3QyxPQUFPLEVBQUUsc0JBQXNCLEVBQUUsTUFBTSw4REFBOEQsQ0FBQTtBQUVyRyxPQUFPLEVBQUUsV0FBVyxFQUFFLFlBQVksRUFBMEIsTUFBTSw0QkFBNEIsQ0FBQTtBQUV2RixJQUFNLHlCQUF5QixHQUEvQixNQUFNLHlCQUF5QjtJQUNyQyxZQUMwQyxzQkFBOEM7UUFBOUMsMkJBQXNCLEdBQXRCLHNCQUFzQixDQUF3QjtJQUNyRixDQUFDO0lBQ0osYUFBYTtRQUNaLE9BQU8sTUFBTSxDQUFBO0lBQ2QsQ0FBQztJQUVELE9BQU8sQ0FBQyxPQUFxQjtRQUM1QixPQUFPLFVBQVUsQ0FBQTtJQUNsQixDQUFDO0lBRUQsa0JBQWtCO1FBQ2pCLE9BQU8sUUFBUSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQTtJQUNoQyxDQUFDO0lBRUQsWUFBWSxDQUFDLE9BQXFCO1FBQ2pDLElBQUksV0FBVyxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7WUFDMUIsT0FBTyxPQUFPLENBQUMsV0FBVyxDQUFBO1FBQzNCLENBQUM7UUFFRCxJQUFJLFlBQVksQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQzNCLE9BQU8sSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3ZDLENBQUM7UUFFRCxPQUFPLEVB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