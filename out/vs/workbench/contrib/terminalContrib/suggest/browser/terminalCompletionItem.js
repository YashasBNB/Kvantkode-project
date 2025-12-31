/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { basename } from '../../../../../base/common/path.js';
import { isWindows } from '../../../../../base/common/platform.js';
import { SimpleCompletionItem, } from '../../../../services/suggest/browser/simpleCompletionItem.js';
export var TerminalCompletionItemKind;
(function (TerminalCompletionItemKind) {
    TerminalCompletionItemKind[TerminalCompletionItemKind["File"] = 0] = "File";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Folder"] = 1] = "Folder";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Method"] = 2] = "Method";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Alias"] = 3] = "Alias";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Argument"] = 4] = "Argument";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Option"] = 5] = "Option";
    TerminalCompletionItemKind[TerminalCompletionItemKind["OptionValue"] = 6] = "OptionValue";
    TerminalCompletionItemKind[TerminalCompletionItemKind["Flag"] = 7] = "Flag";
    // Kinds only for core
    TerminalCompletionItemKind[TerminalCompletionItemKind["InlineSuggestion"] = 100] = "InlineSuggestion";
    TerminalCompletionItemKind[TerminalCompletionItemKind["InlineSuggestionAlwaysOnTop"] = 101] = "InlineSuggestionAlwaysOnTop";
})(TerminalCompletionItemKind || (TerminalCompletionItemKind = {}));
export class TerminalCompletionItem extends SimpleCompletionItem {
    constructor(completion) {
        super(completion);
        this.completion = completion;
        /**
         * A penalty that applies to files or folders starting with the underscore character.
         */
        this.underscorePenalty = 0;
        /**
         * The file extension part from {@link labelLow}.
         */
        this.fileExtLow = '';
        // ensure lower-variants (perf)
        this.labelLowExcludeFileExt = this.labelLow;
        this.labelLowNormalizedPath = this.labelLow;
        if (isFile(completion)) {
            if (isWindows) {
                this.labelLow = this.labelLow.replaceAll('/', '\\');
            }
            // Don't include dotfiles as extensions when sorting
            const extIndex = this.labelLow.lastIndexOf('.');
            if (extIndex > 0) {
                this.labelLowExcludeFileExt = this.labelLow.substring(0, extIndex);
                this.fileExtLow = this.labelLow.substring(extIndex + 1);
            }
        }
        if (isFile(completion) || completion.kind === TerminalCompletionItemKind.Folder) {
            if (isWindows) {
                this.labelLowNormalizedPath = this.labelLow.replaceAll('\\', '/');
            }
            if (completion.kind === TerminalCompletionItemKind.Folder) {
                this.labelLowNormalizedPath = this.labelLowNormalizedPath.replace(/\/$/, '');
            }
            this.underscorePenalty = basename(this.labelLowNormalizedPath).startsWith('_') ? 1 : 0;
        }
    }
}
function isFile(completion) {
    return !!(completion.kind === TerminalCompletionItemKind.File || completion.isFileOverride);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxDb21wbGV0aW9uSXRlbS5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsQ29udHJpYi9zdWdnZXN0L2Jyb3dzZXIvdGVybWluYWxDb21wbGV0aW9uSXRlbS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDN0QsT0FBTyxFQUFFLFNBQVMsRUFBRSxNQUFNLHdDQUF3QyxDQUFBO0FBQ2xFLE9BQU8sRUFFTixvQkFBb0IsR0FDcEIsTUFBTSw4REFBOEQsQ0FBQTtBQUVyRSxNQUFNLENBQU4sSUFBWSwwQkFZWDtBQVpELFdBQVksMEJBQTBCO0lBQ3JDLDJFQUFRLENBQUE7SUFDUiwrRUFBVSxDQUFBO0lBQ1YsK0VBQVUsQ0FBQTtJQUNWLDZFQUFTLENBQUE7SUFDVCxtRkFBWSxDQUFBO0lBQ1osK0VBQVUsQ0FBQTtJQUNWLHlGQUFlLENBQUE7SUFDZiwyRUFBUSxDQUFBO0lBQ1Isc0JBQXNCO0lBQ3RCLHFHQUFzQixDQUFBO0lBQ3RCLDJIQUFpQyxDQUFBO0FBQ2xDLENBQUMsRUFaVywwQkFBMEIsS0FBMUIsMEJBQTBCLFFBWXJDO0FBMkJELE1BQU0sT0FBTyxzQkFBdUIsU0FBUSxvQkFBb0I7SUFzQi9ELFlBQThCLFVBQStCO1FBQzVELEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQTtRQURZLGVBQVUsR0FBVixVQUFVLENBQXFCO1FBVjdEOztXQUVHO1FBQ0gsc0JBQWlCLEdBQVUsQ0FBQyxDQUFBO1FBRTVCOztXQUVHO1FBQ0gsZUFBVSxHQUFXLEVBQUUsQ0FBQTtRQUt0QiwrQkFBK0I7UUFDL0IsSUFBSSxDQUFDLHNCQUFzQixHQUFHLElBQUksQ0FBQyxRQUFRLENBQUE7UUFDM0MsSUFBSSxDQUFDLHNCQUFzQixHQUFHLElBQUksQ0FBQyxRQUFRLENBQUE7UUFFM0MsSUFBSSxNQUFNLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQztZQUN4QixJQUFJLFNBQVMsRUFBRSxDQUFDO2dCQUNmLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsR0FBRyxFQUFFLElBQUksQ0FBQyxDQUFBO1lBQ3BELENBQUM7WUFDRCxvREFBb0Q7WUFDcEQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUE7WUFDL0MsSUFBSSxRQUFRLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ2xCLElBQUksQ0FBQyxzQkFBc0IsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxDQUFDLEVBQUUsUUFBUSxDQUFDLENBQUE7Z0JBQ2xFLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQ3hELENBQUM7UUFDRixDQUFDO1FBRUQsSUFBSSxNQUFNLENBQUMsVUFBVSxDQUFDLElBQUksVUFBVSxDQUFDLElBQUksS0FBSywwQkFBMEIsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNqRixJQUFJLFNBQVMsRUFBRSxDQUFDO2dCQUNmLElBQUksQ0FBQyxzQkFBc0IsR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUE7WUFDbEUsQ0FBQztZQUNELElBQUksVUFBVSxDQUFDLElBQUksS0FBSywwQkFBMEIsQ0FBQyxNQUFNLEVBQUUsQ0FBQztnQkFDM0QsSUFBSSxDQUFDLHNCQUFzQixHQUFHLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxPQUFPLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1lBQzdFLENBQUM7WUFDRCxJQUFJLENBQUMsaUJBQWlCLEdBQUcsUUFBUSxDQUFDLElBQUksQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUE7UUFDdkYsQ0FBQztJQUNGLENBQUM7Q0FDRDtBQUVELFNBQVMsTUFBTSxDQUFDLFVBQStCO0lBQzlDLE9BQU8sQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksS0FBSywwQkFBMEIsQ0FBQyxJQUFJLElBQUksVUFBVSxDQUFDLGNBQWMsQ0FBQyxDQUFBO0FBQzVGLENBQUMifQ==