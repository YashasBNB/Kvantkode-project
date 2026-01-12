/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { getDefaultHoverDelegate } from '../hover/hoverDelegateFactory.js';
import { Toggle } from '../toggle/toggle.js';
import { Codicon } from '../../../common/codicons.js';
import * as nls from '../../../../nls.js';
const NLS_CASE_SENSITIVE_TOGGLE_LABEL = nls.localize('caseDescription', 'Match Case');
const NLS_WHOLE_WORD_TOGGLE_LABEL = nls.localize('wordsDescription', 'Match Whole Word');
const NLS_REGEX_TOGGLE_LABEL = nls.localize('regexDescription', 'Use Regular Expression');
export class CaseSensitiveToggle extends Toggle {
    constructor(opts) {
        super({
            icon: Codicon.caseSensitive,
            title: NLS_CASE_SENSITIVE_TOGGLE_LABEL + opts.appendTitle,
            isChecked: opts.isChecked,
            hoverDelegate: opts.hoverDelegate ?? getDefaultHoverDelegate('element'),
            inputActiveOptionBorder: opts.inputActiveOptionBorder,
            inputActiveOptionForeground: opts.inputActiveOptionForeground,
            inputActiveOptionBackground: opts.inputActiveOptionBackground,
        });
    }
}
export class WholeWordsToggle extends Toggle {
    constructor(opts) {
        super({
            icon: Codicon.wholeWord,
            title: NLS_WHOLE_WORD_TOGGLE_LABEL + opts.appendTitle,
            isChecked: opts.isChecked,
            hoverDelegate: opts.hoverDelegate ?? getDefaultHoverDelegate('element'),
            inputActiveOptionBorder: opts.inputActiveOptionBorder,
            inputActiveOptionForeground: opts.inputActiveOptionForeground,
            inputActiveOptionBackground: opts.inputActiveOptionBackground,
        });
    }
}
export class RegexToggle extends Toggle {
    constructor(opts) {
        super({
            icon: Codicon.regex,
            title: NLS_REGEX_TOGGLE_LABEL + opts.appendTitle,
            isChecked: opts.isChecked,
            hoverDelegate: opts.hoverDelegate ?? getDefaultHoverDelegate('element'),
            inputActiveOptionBorder: opts.inputActiveOptionBorder,
            inputActiveOptionForeground: opts.inputActiveOptionForeground,
            inputActiveOptionBackground: opts.inputActiveOptionBackground,
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmluZElucHV0VG9nZ2xlcy5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS9LdmFudGtvZGUvc3JjLyIsInNvdXJjZXMiOlsidnMvYmFzZS9icm93c2VyL3VpL2ZpbmRpbnB1dC9maW5kSW5wdXRUb2dnbGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxNQUFNLGtDQUFrQyxDQUFBO0FBRTFFLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxxQkFBcUIsQ0FBQTtBQUM1QyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sNkJBQTZCLENBQUE7QUFDckQsT0FBTyxLQUFLLEdBQUcsTUFBTSxvQkFBb0IsQ0FBQTtBQVd6QyxNQUFNLCtCQUErQixHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUMsaUJBQWlCLEVBQUUsWUFBWSxDQUFDLENBQUE7QUFDckYsTUFBTSwyQkFBMkIsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLGtCQUFrQixFQUFFLGtCQUFrQixDQUFDLENBQUE7QUFDeEYsTUFBTSxzQkFBc0IsR0FBRyxHQUFHLENBQUMsUUFBUSxDQUFDLGtCQUFrQixFQUFFLHdCQUF3QixDQUFDLENBQUE7QUFFekYsTUFBTSxPQUFPLG1CQUFvQixTQUFRLE1BQU07SUFDOUMsWUFBWSxJQUEwQjtRQUNyQyxLQUFLLENBQUM7WUFDTCxJQUFJLEVBQUUsT0FBTyxDQUFDLGFBQWE7WUFDM0IsS0FBSyxFQUFFLCtCQUErQixHQUFHLElBQUksQ0FBQyxXQUFXO1lBQ3pELFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUztZQUN6QixhQUFhLEVBQUUsSUFBSSxDQUFDLGFBQWEsSUFBSSx1QkFBdUIsQ0FBQyxTQUFTLENBQUM7WUFDdkUsdUJBQXVCLEVBQUUsSUFBSSxDQUFDLHVCQUF1QjtZQUNyRCwyQkFBMkIsRUFBRSxJQUFJLENBQUMsMkJBQTJCO1lBQzdELDJCQUEyQixFQUFFLElBQUksQ0FBQywyQkFBMkI7U0FDN0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLGdCQUFpQixTQUFRLE1BQU07SUFDM0MsWUFBWSxJQUEwQjtRQUNyQyxLQUFLLENBQUM7WUFDTCxJQUFJLEVBQUUsT0FBTyxDQUFDLFNBQVM7WUFDdkIsS0FBSyxFQUFFLDJCQUEyQixHQUFHLElBQUksQ0FBQyxXQUFXO1lBQ3JELFNBQVMsRUFBRSxJQUFJLENBQUMsU0FBUztZQUN6QixhQUFhLEVBQUUsSUFBSSxDQUFDLGFBQWEsSUFBSSx1QkFBdUIsQ0FBQyxTQUFTLENBQUM7WUFDdkUsdUJBQXVCLEVBQUUsSUFBSSxDQUFDLHVCQUF1QjtZQUNyRCwyQkFBMkIsRUFBRSxJQUFJLENBQUMsMkJBQTJCO1lBQzdELDJCQUEyQixFQUFFLElBQUksQ0FBQywyQkFBMkI7U0FDN0QsQ0FBQyxDQUFBO0lBQ0gsQ0FBQztDQUNEO0FBRUQsTUFBTSxPQUFPLFdBQVksU0FBUSxNQUFNO0lBQ3RDLFlBQVksSUFBMEI7UUFDckMsS0FBSyxDQUFDO1lBQ0wsSUFBSSxFQUFFLE9BQU8sQ0FBQyxLQUFLO1lBQ25CLEtBQUssRUFBRSxzQkFBc0IsR0FBRyxJQUFJLENBQUMsV0FBVztZQUNoRCxTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVM7WUFDekIsYUFBYSxFQUFFLElBQUksQ0FBQyxhQUFhLElBQUksdUJBQXVCLENBQUMsU0FBUyxDQUFDO1lBQ3ZFLHVCQUF1QixFQUFFLElBQUksQ0FBQyx1QkFBdUI7WUFDckQsMkJBQTJCLEVBQUUsSUFBSSxDQUFDLDJCQUEyQjtZQUM3RCwyQkFBMkIsRUFBRSxJQUFJLENBQUMsMkJBQTJCO1NBQzdELENBQUMsQ0FBQTtJQUNILENBQUM7Q0FDRCJ9