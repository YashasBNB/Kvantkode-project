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
import { Disposable } from '../../../../base/common/lifecycle.js';
import { basename } from '../../../../base/common/path.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { ITerminalService } from './terminal.js';
let TerminalTelemetryContribution = class TerminalTelemetryContribution extends Disposable {
    static { this.ID = 'terminalTelemetry'; }
    constructor(terminalService, _telemetryService) {
        super();
        this._telemetryService = _telemetryService;
        this._register(terminalService.onDidCreateInstance(async (instance) => {
            // Wait for process ready so the shell launch config is fully resolved
            await instance.processReady;
            this._logCreateInstance(instance.shellLaunchConfig);
        }));
    }
    _logCreateInstance(shellLaunchConfig) {
        this._telemetryService.publicLog2('terminal/createInstance', {
            shellType: getSanitizedShellType(shellLaunchConfig),
            isReconnect: !!shellLaunchConfig.attachPersistentProcess,
            isCustomPtyImplementation: !!shellLaunchConfig.customPtyImplementation,
            isLoginShell: (typeof shellLaunchConfig.args === 'string'
                ? shellLaunchConfig.args.split(' ')
                : shellLaunchConfig.args)?.some((arg) => arg === '-l' || arg === '--login') ?? false,
        });
    }
};
TerminalTelemetryContribution = __decorate([
    __param(0, ITerminalService),
    __param(1, ITelemetryService)
], TerminalTelemetryContribution);
export { TerminalTelemetryContribution };
var AllowedShellType;
(function (AllowedShellType) {
    AllowedShellType["Unknown"] = "unknown";
    // Windows only
    AllowedShellType["CommandPrompt"] = "cmd";
    AllowedShellType["GitBash"] = "git-bash";
    AllowedShellType["WindowsPowerShell"] = "windows-powershell";
    AllowedShellType["Wsl"] = "wsl";
    // All platforms
    AllowedShellType["Bash"] = "bash";
    AllowedShellType["Csh"] = "csh";
    AllowedShellType["Dash"] = "dash";
    AllowedShellType["Fish"] = "fish";
    AllowedShellType["Ksh"] = "ksh";
    AllowedShellType["Nushell"] = "nu";
    AllowedShellType["Pwsh"] = "pwsh";
    AllowedShellType["Sh"] = "sh";
    AllowedShellType["Ssh"] = "ssh";
    AllowedShellType["Tcsh"] = "tcsh";
    AllowedShellType["Tmux"] = "tmux";
    AllowedShellType["Zsh"] = "zsh";
    // Lanugage REPLs
    AllowedShellType["Julia"] = "julia";
    AllowedShellType["Node"] = "node";
    AllowedShellType["Python"] = "python";
    AllowedShellType["RubyIrb"] = "irb";
})(AllowedShellType || (AllowedShellType = {}));
// Types that match the executable name directly
const shellTypeExecutableAllowList = new Set([
    "cmd" /* AllowedShellType.CommandPrompt */,
    "wsl" /* AllowedShellType.Wsl */,
    "bash" /* AllowedShellType.Bash */,
    "csh" /* AllowedShellType.Csh */,
    "dash" /* AllowedShellType.Dash */,
    "fish" /* AllowedShellType.Fish */,
    "ksh" /* AllowedShellType.Ksh */,
    "nu" /* AllowedShellType.Nushell */,
    "pwsh" /* AllowedShellType.Pwsh */,
    "sh" /* AllowedShellType.Sh */,
    "ssh" /* AllowedShellType.Ssh */,
    "tcsh" /* AllowedShellType.Tcsh */,
    "tmux" /* AllowedShellType.Tmux */,
    "zsh" /* AllowedShellType.Zsh */,
    "julia" /* AllowedShellType.Julia */,
    "node" /* AllowedShellType.Node */,
    "irb" /* AllowedShellType.RubyIrb */,
]);
// Dynamic executables that map to a single type
const shellTypeExecutableRegexAllowList = [
    { regex: /^python(?:\d+(?:\.\d+)?)?$/i, type: "python" /* AllowedShellType.Python */ },
];
// Path-based look ups
const shellTypePathRegexAllowList = [
    // Git bash uses bash.exe, so look up based on the path
    { regex: /Git\\bin\\bash\.exe$/i, type: "git-bash" /* AllowedShellType.GitBash */ },
    // WindowsPowerShell should always be installed on this path, we cannot just look at the
    // executable name since powershell is the CLI on other platforms sometimes (eg. snap package)
    { regex: /WindowsPowerShell\\v1.0\\powershell.exe$/i, type: "windows-powershell" /* AllowedShellType.WindowsPowerShell */ },
    // WSL executables will represent some other shell in the end, but it's difficult to determine
    // when we log
    { regex: /Windows\\System32\\(?:bash|wsl)\.exe$/i, type: "wsl" /* AllowedShellType.Wsl */ },
];
function getSanitizedShellType(shellLaunchConfig) {
    if (!shellLaunchConfig.executable) {
        return "unknown" /* AllowedShellType.Unknown */;
    }
    const executableFile = basename(shellLaunchConfig.executable);
    const executableFileWithoutExt = executableFile.replace(/\.[^\.]+$/, '');
    for (const entry of shellTypePathRegexAllowList) {
        if (entry.regex.test(shellLaunchConfig.executable)) {
            return entry.type;
        }
    }
    for (const entry of shellTypeExecutableRegexAllowList) {
        if (entry.regex.test(executableFileWithoutExt)) {
            return entry.type;
        }
    }
    if (shellTypeExecutableAllowList.has(executableFileWithoutExt)) {
        return executableFileWithoutExt;
    }
    return "unknown" /* AllowedShellType.Unknown */;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxUZWxlbWV0cnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi90ZXJtaW5hbC9icm93c2VyL3Rlcm1pbmFsVGVsZW1ldHJ5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHOzs7Ozs7Ozs7O0FBRWhHLE9BQU8sRUFBRSxVQUFVLEVBQUUsTUFBTSxzQ0FBc0MsQ0FBQTtBQUNqRSxPQUFPLEVBQUUsUUFBUSxFQUFFLE1BQU0saUNBQWlDLENBQUE7QUFDMUQsT0FBTyxFQUFFLGlCQUFpQixFQUFFLE1BQU0sb0RBQW9ELENBQUE7QUFHdEYsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0sZUFBZSxDQUFBO0FBRXpDLElBQU0sNkJBQTZCLEdBQW5DLE1BQU0sNkJBQThCLFNBQVEsVUFBVTthQUNyRCxPQUFFLEdBQUcsbUJBQW1CLEFBQXRCLENBQXNCO0lBRS9CLFlBQ21CLGVBQWlDLEVBQ2YsaUJBQW9DO1FBRXhFLEtBQUssRUFBRSxDQUFBO1FBRjZCLHNCQUFpQixHQUFqQixpQkFBaUIsQ0FBbUI7UUFJeEUsSUFBSSxDQUFDLFNBQVMsQ0FDYixlQUFlLENBQUMsbUJBQW1CLENBQUMsS0FBSyxFQUFFLFFBQVEsRUFBRSxFQUFFO1lBQ3RELHNFQUFzRTtZQUN0RSxNQUFNLFFBQVEsQ0FBQyxZQUFZLENBQUE7WUFDM0IsSUFBSSxDQUFDLGtCQUFrQixDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFBO1FBQ3BELENBQUMsQ0FBQyxDQUNGLENBQUE7SUFDRixDQUFDO0lBRU8sa0JBQWtCLENBQUMsaUJBQXFDO1FBK0IvRCxJQUFJLENBQUMsaUJBQWlCLENBQUMsVUFBVSxDQUcvQix5QkFBeUIsRUFBRTtZQUM1QixTQUFTLEVBQUUscUJBQXFCLENBQUMsaUJBQWlCLENBQUM7WUFDbkQsV0FBVyxFQUFF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