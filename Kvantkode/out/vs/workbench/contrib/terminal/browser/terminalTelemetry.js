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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVybWluYWxUZWxlbWV0cnkuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvS3ZhbnRrb2RlLXByb2plY3QvS3ZhbnRrb2RlL3NyYy8iLCJzb3VyY2VzIjpbInZzL3dvcmtiZW5jaC9jb250cmliL3Rlcm1pbmFsL2Jyb3dzZXIvdGVybWluYWxUZWxlbWV0cnkudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7Ozs7Ozs7Ozs7QUFFaEcsT0FBTyxFQUFFLFVBQVUsRUFBRSxNQUFNLHNDQUFzQyxDQUFBO0FBQ2pFLE9BQU8sRUFBRSxRQUFRLEVBQUUsTUFBTSxpQ0FBaUMsQ0FBQTtBQUMxRCxPQUFPLEVBQUUsaUJBQWlCLEVBQUUsTUFBTSxvREFBb0QsQ0FBQTtBQUd0RixPQUFPLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxlQUFlLENBQUE7QUFFekMsSUFBTSw2QkFBNkIsR0FBbkMsTUFBTSw2QkFBOEIsU0FBUSxVQUFVO2FBQ3JELE9BQUUsR0FBRyxtQkFBbUIsQUFBdEIsQ0FBc0I7SUFFL0IsWUFDbUIsZUFBaUMsRUFDZixpQkFBb0M7UUFFeEUsS0FBSyxFQUFFLENBQUE7UUFGNkIsc0JBQWlCLEdBQWpCLGlCQUFpQixDQUFtQjtRQUl4RSxJQUFJLENBQUMsU0FBUyxDQUNiLGVBQWUsQ0FBQyxtQkFBbUIsQ0FBQyxLQUFLLEVBQUUsUUFBUSxFQUFFLEVBQUU7WUFDdEQsc0VBQXNFO1lBQ3RFLE1BQU0sUUFBUSxDQUFDLFlBQVksQ0FBQTtZQUMzQixJQUFJLENBQUMsa0JBQWtCLENBQUMsUUFBUSxDQUFDLGlCQUFpQixDQUFDLENBQUE7UUFDcEQsQ0FBQyxDQUFDLENBQ0YsQ0FBQTtJQUNGLENBQUM7SUFFTyxrQkFBa0IsQ0FBQyxpQkFBcUM7UUErQi9ELElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxVQUFVLENBRy9CLHlCQUF5QixFQUFFO1lBQzVCLFNBQVMsRUFBRSxxQkFBcUIsQ0FBQyxpQkFB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