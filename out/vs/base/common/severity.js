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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2V2ZXJpdHkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL2Jhc2UvY29tbW9uL3NldmVyaXR5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sS0FBSyxPQUFPLE1BQU0sY0FBYyxDQUFBO0FBRXZDLElBQUssUUFLSjtBQUxELFdBQUssUUFBUTtJQUNaLDJDQUFVLENBQUE7SUFDVix1Q0FBUSxDQUFBO0lBQ1IsNkNBQVcsQ0FBQTtJQUNYLHlDQUFTLENBQUE7QUFDVixDQUFDLEVBTEksUUFBUSxLQUFSLFFBQVEsUUFLWjtBQUVELFdBQVUsUUFBUTtJQUNqQixNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUE7SUFDdEIsTUFBTSxRQUFRLEdBQUcsU0FBUyxDQUFBO0lBQzFCLE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQTtJQUNwQixNQUFNLEtBQUssR0FBRyxNQUFNLENBQUE7SUFDcEIsTUFBTSxPQUFPLEdBQUcsUUFBUSxDQUFBO0lBRXhCOzs7T0FHRztJQUNILFNBQWdCLFNBQVMsQ0FBQyxLQUFhO1FBQ3RDLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztZQUNaLE9BQU8sUUFBUSxDQUFDLE1BQU0sQ0FBQTtRQUN2QixDQUFDO1FBRUQsSUFBSSxPQUFPLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxFQUFFLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDN0MsT0FBTyxRQUFRLENBQUMsS0FBSyxDQUFBO1FBQ3RCLENBQUM7UUFFRCxJQUFJLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLElBQUksT0FBTyxDQUFDLGdCQUFnQixDQUFDLEtBQUssRUFBRSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3pGLE9BQU8sUUFBUSxDQUFDLE9BQU8sQ0FBQTtRQUN4QixDQUFDO1FBRUQsSUFBSSxPQUFPLENBQUMsZ0JBQWdCLENBQUMsS0FBSyxFQUFFLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDNUMsT0FBTyxRQUFRLENBQUMsSUFBSSxDQUFBO1FBQ3JCLENBQUM7UUFDRCxPQUFPLFFBQVEsQ0FBQyxNQUFNLENBQUE7SUFDdkIsQ0FBQztJQWpCZSxrQkFBUyxZQWlCeEIsQ0FBQTtJQUVELFNBQWdCLFFBQVEsQ0FBQyxRQUFrQjtRQUMxQyxRQUFRLFFBQVEsRUFBRSxDQUFDO1lBQ2xCLEtBQUssUUFBUSxDQUFDLEtBQUs7Z0JBQ2xCLE9BQU8sTUFBTSxDQUFBO1lBQ2QsS0FBSyxRQUFRLENBQUMsT0FBTztnQkFDcEIsT0FBTyxRQUFRLENBQUE7WUFDaEIsS0FBSyxRQUFRLENBQUMsSUFBSTtnQkFDakIsT0FBTyxLQUFLLENBQUE7WUFDYjtnQkFDQyxPQUFPLE9BQU8sQ0FBQTtRQUNoQixDQUFDO0lBQ0YsQ0FBQztJQVhlLGlCQUFRLFdBV3ZCLENBQUE7QUFDRixDQUFDLEVBMUNTLFFBQVEsS0FBUixRQUFRLFFBMENqQjtBQUVELGVBQWUsUUFBUSxDQUFBIn0=