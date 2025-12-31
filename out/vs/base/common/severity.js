/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as strings from './strings.js';
var Severity;
(function (Severity) {
    Severity[Severity["Ignore"] = 0] = "Ignore";
    Severity[Severity["Info"] = 1] = "Info";
    Severity[Severity["Warning"] = 2] = "Warning";
    Severity[Severity["Error"] = 3] = "Error";
})(Severity || (Severity = {}));
(function (Severity) {
    const _error = 'error';
    const _warning = 'warning';
    const _warn = 'warn';
    const _info = 'info';
    const _ignore = 'ignore';
    /**
     * Parses 'error', 'warning', 'warn', 'info' in call casings
     * and falls back to ignore.
     */
    function fromValue(value) {
        if (!value) {
            return Severity.Ignore;
        }
        if (strings.equalsIgnoreCase(_error, value)) {
            return Severity.Error;
        }
        if (strings.equalsIgnoreCase(_warning, value) || strings.equalsIgnoreCase(_warn, value)) {
            return Severity.Warning;
        }
        if (strings.equalsIgnoreCase(_info, value)) {
            return Severity.Info;
        }
        return Severity.Ignore;
    }
    Severity.fromValue = fromValue;
    function toString(severity) {
        switch (severity) {
            case Severity.Error:
                return _error;
            case Severity.Warning:
                return _warning;
            case Severity.Info:
                return _info;
            default:
                return _ignore;
        }
    }
    Severity.toString = toString;
})(Severity || (Severity = {}));
export default Severity;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V2ZXJpdHkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9iYXNlL2NvbW1vbi9zZXZlcml0eS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7O2dHQUdnRztBQUVoRyxPQUFPLEtBQUssT0FBTyxNQUFNLGNBQWMsQ0FBQTtBQUV2QyxJQUFLLFFBS0o7QUFMRCxXQUFLLFFBQVE7SUFDWiwyQ0FBVSxDQUFBO0lBQ1YsdUNBQVEsQ0FBQTtJQUNSLDZDQUFXLENBQUE7SUFDWCx5Q0FBUyxDQUFBO0FBQ1YsQ0FBQyxFQUxJLFFBQVEsS0FBUixRQUFRLFFBS1o7QUFFRCxXQUFVLFFBQVE7SUFDakIsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFBO0lBQ3RCLE1BQU0sUUFBUSxHQUFHLFNBQVMsQ0FBQTtJQUMxQixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUE7SUFDcEIsTUFBTSxLQUFLLEdBQUcsTUFBTSxDQUFBO0lBQ3BCLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQTtJQUV4Qjs7O09BR0c7SUFDSCxTQUFnQixTQUFTLENBQUMsS0FBYTtRQUN0QyxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7WUFDWixPQUFPLFFBQVEsQ0FBQyxNQUFNLENBQUE7UUFDdkIsQ0FBQztRQUVELElBQUksT0FBTyxDQUFDLGdCQUFnQixDQUFDLE1BQU0sRUFBRSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzdDLE9BQU8sUUFBUSxDQUFDLEtBQUssQ0FBQTtRQUN0QixDQUFDO1FBRUQsSUFBSSxPQUFPLENBQUMsZ0JBQWdCLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxJQUFJLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLEVBQUUsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN6RixPQUFPLFFBQVEsQ0FBQyxPQUFPLENBQUE7UUFDeEIsQ0FBQztRQUVELElBQUksT0FBTyxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzVDLE9BQU8sUUFBUSxDQUFDLElBQUksQ0FBQTtRQUNyQixDQUFDO1FBQ0QsT0FBTyxRQUFRLENBQUMsTUFBTSxDQUFBO0lBQ3ZCLENBQUM7SUFqQmUsa0JBQVMsWUFpQnhCLENBQUE7SUFFRCxTQUFnQixRQUFRLENBQUMsUUFBa0I7UUFDMUMsUUFBUSxRQUFRLEVBQUUsQ0FBQztZQUNsQixLQUFLLFFBQVEsQ0FBQyxLQUFLO2dCQUNsQixPQUFPLE1BQU0sQ0FBQTtZQUNkLEtBQUssUUFBUSxDQUFDLE9BQU87Z0JBQ3BCLE9BQU8sUUFBUSxDQUFBO1lBQ2hCLEtBQUssUUFBUSxDQUFDLElBQUk7Z0JBQ2pCLE9BQU8sS0FBSyxDQUFBO1lBQ2I7Z0JBQ0MsT0FBTyxPQUFPLENBQUE7UUFDaEIsQ0FBQztJQUNGLENBQUM7SUFYZSxpQkFBUSxXQVd2QixDQUFBO0FBQ0YsQ0FBQyxFQTFDUyxRQUFRLEtBQVIsUUFBUSxRQTBDakI7QUFFRCxlQUFlLFFBQVEsQ0FBQSJ9