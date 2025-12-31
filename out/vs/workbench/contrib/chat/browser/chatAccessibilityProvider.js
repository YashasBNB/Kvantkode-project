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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2hhdEFjY2Vzc2liaWxpdHlQcm92aWRlci5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL2NoYXQvYnJvd3Nlci9jaGF0QWNjZXNzaWJpbGl0eVByb3ZpZGVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBSWhHLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSwwQ0FBMEMsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0JBQW9CLENBQUE7QUFFN0MsT0FBTyxFQUFFLHNCQUFzQixFQUFFLE1BQU0sOERBQThELENBQUE7QUFFckcsT0FBTyxFQUFFLFdBQVcsRUFBRSxZQUFZLEVBQTBCLE1BQU0sNEJBQTRCLENBQUE7QUFFdkYsSUFBTSx5QkFBeUIsR0FBL0IsTUFBTSx5QkFBeUI7SUFDckMsWUFDMEMsc0JBQThDO1FBQTlDLDJCQUFzQixHQUF0QixzQkFBc0IsQ0FBd0I7SUFDckYsQ0FBQztJQUNKLGFBQWE7UUFDWixPQUFPLE1BQU0sQ0FBQTtJQUNkLENBQUM7SUFFRCxPQUFPLENBQUMsT0FBcUI7UUFDNUIsT0FBTyxVQUFVLENBQUE7SUFDbEIsQ0FBQztJQUVELGtCQUFrQjtRQUNqQixPQUFPLFFBQVEsQ0FBQyxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFDaEMsQ0FBQztJQUVELFlBQVksQ0FBQyxPQUFxQjtRQUNqQyxJQUFJLFdBQVcsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQzFCLE9BQU8sT0FBTyxDQUFDLFdBQVcsQ0FBQTtRQUMzQixDQUFDO1FBRUQsSUFBSSxZQUFZLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUMzQixPQUFPLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxPQUFPLENBQUMsQ0FBQTtRQUN2QyxDQUFDO1FBRUQsT0FBTyxFQUFFLENB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