/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { localize } from '../../../../../nls.js';
import product from '../../../../../platform/product/common/product.js';
export var TerminalStickyScrollSettingId;
(function (TerminalStickyScrollSettingId) {
    TerminalStickyScrollSettingId["Enabled"] = "terminal.integrated.stickyScroll.enabled";
    TerminalStickyScrollSettingId["MaxLineCount"] = "terminal.integrated.stickyScroll.maxLineCount";
})(TerminalStickyScrollSettingId || (TerminalStickyScrollSettingId = {}));
export const terminalStickyScrollConfiguration = {
    ["terminal.integrated.stickyScroll.enabled" /* TerminalStickyScrollSettingId.Enabled */]: {
        markdownDescription: localize('stickyScroll.enabled', 'Shows the current command at the top of the terminal. This feature requires [shell integration]({0}) to be activated. See {1}.', 'https://code.visualstudio.com/docs/terminal/shell-integration', `\`#${"terminal.integrated.shellIntegration.enabled" /* TerminalSettingId.ShellIntegrationEnabled */}#\``),
        type: 'boolean',
        default: product.quality !== 'stable',
    },
    ["terminal.integrated.stickyScroll.maxLineCount" /* TerminalStickyScrollSettingId.MaxLineCount */]: {
        markdownDescription: localize('stickyScroll.maxLineCount', 'Defines the maximum number of sticky lines to show. Sticky scroll lines will never exceed 40% of the viewport regardless of this setting.'),
        type: 'number',
        default: 5,
        minimum: 1,
        maximum: 10,
    },
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxTdGlja3lTY3JvbGxDb25maWd1cmF0aW9uLmpzIiwic291cmNlUm9vdCI6ImZpbGU6Ly8vVXNlcnMveWFzaGFzbmFpZHUvS3ZhbnRjb2RlL0t2YW50a29kZS1wcm9qZWN0L0t2YW50a29kZS9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbENvbnRyaWIvc3RpY2t5U2Nyb2xsL2NvbW1vbi90ZXJtaW5hbFN0aWNreVNjcm9sbENvbmZpZ3VyYXRpb24udHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFHaEcsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLHVCQUF1QixDQUFBO0FBRWhELE9BQU8sT0FBTyxNQUFNLG1EQUFtRCxDQUFBO0FBR3ZFLE1BQU0sQ0FBTixJQUFrQiw2QkFHakI7QUFIRCxXQUFrQiw2QkFBNkI7SUFDOUMscUZBQW9ELENBQUE7SUFDcEQsK0ZBQThELENBQUE7QUFDL0QsQ0FBQyxFQUhpQiw2QkFBNkIsS0FBN0IsNkJBQTZCLFFBRzlDO0FBT0QsTUFBTSxDQUFDLE1BQU0saUNBQWlDLEdBQW9EO0lBQ2pHLHdGQUF1QyxFQUFFO1FBQ3hDLG1CQUFtQixFQUFFLFFBQVEsQ0FDNUIsc0JBQXNCLEVBQ3RCLGdJQUFnSSxFQUNoSSwrREFBK0QsRUFDL0QsTUFBTSw4RkFBeUMsS0FBSyxDQUNwRDtRQUNELElBQUksRUFBRSxTQUFTO1FBQ2YsT0FBTyxFQUFFLE9BQU8sQ0FBQyxPQUFPLEtBQUssUUFBUTtLQUNyQztJQUNELGtHQUE0QyxFQUFFO1FBQzdDLG1CQUFtQixFQUFFLFFBQVEsQ0FDNUIsMkJBQTJCLEVBQzNCLDJJQUEySSxDQUMzSTtRQUNELElBQUksRUFBRSxRQUFRO1FBQ2QsT0FBTyxFQUFFLENBQUM7UUFDVixPQUFPLEVBQUUsQ0FBQztRQUNWLE9BQU8sRUFBRSxFQUFFO0tBQ1g7Q0FDRCxDQUFBIn0=