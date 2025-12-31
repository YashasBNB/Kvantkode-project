/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import assert from 'assert';
import { URI } from '../../../../../base/common/uri.js';
import { isMacintosh, isLinux, isWindows } from '../../../../../base/common/platform.js';
import { OutputLinkComputer } from '../../common/outputLinkComputer.js';
import { TestContextService } from '../../../../test/common/workbenchTestServices.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
suite('OutputLinkProvider', () => {
    function toOSPath(p) {
        if (isMacintosh || isLinux) {
            return p.replace(/\\/g, '/');
        }
        return p;
    }
    test('OutputLinkProvider - Link detection', function () {
        const rootFolder = isWindows
            ? URI.file('C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala')
            : URI.file('C:/Users/someone/AppData/Local/Temp/_monacodata_9888/workspaces/mankala');
        const patterns = OutputLinkComputer.createPatterns(rootFolder);
        const contextService = new TestContextService();
        let line = toOSPath('Foo bar');
        let result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 0);
        // Example: at C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts
        line = toOSPath(' at C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts in');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/Game.ts').toString());
        assert.strictEqual(result[0].range.startColumn, 5);
        assert.strictEqual(result[0].range.endColumn, 84);
        // Example: at C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts:336
        line = toOSPath(' at C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts:336 in');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/Game.ts').toString() + '#336');
        assert.strictEqual(result[0].range.startColumn, 5);
        assert.strictEqual(result[0].range.endColumn, 88);
        // Example: at C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts:336:9
        line = toOSPath(' at C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts:336:9 in');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/Game.ts').toString() + '#336,9');
        assert.strictEqual(result[0].range.startColumn, 5);
        assert.strictEqual(result[0].range.endColumn, 90);
        line = toOSPath(' at C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts:336:9 in');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/Game.ts').toString() + '#336,9');
        assert.strictEqual(result[0].range.startColumn, 5);
        assert.strictEqual(result[0].range.endColumn, 90);
        // Example: at C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts>dir
        line = toOSPath(' at C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts>dir in');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/Game.ts').toString());
        assert.strictEqual(result[0].range.startColumn, 5);
        assert.strictEqual(result[0].range.endColumn, 84);
        // Example: at [C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts:336:9]
        line = toOSPath(' at C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts:336:9] in');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/Game.ts').toString() + '#336,9');
        assert.strictEqual(result[0].range.startColumn, 5);
        assert.strictEqual(result[0].range.endColumn, 90);
        // Example: at [C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts]
        line = toOSPath(' at C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts] in');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/Game.ts]').toString());
        // Example: C:\Users\someone\AppData\Local\Temp\_monacodata_9888\workspaces\express\server.js on line 8
        line = toOSPath('C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts on line 8');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/Game.ts').toString() + '#8');
        assert.strictEqual(result[0].range.startColumn, 1);
        assert.strictEqual(result[0].range.endColumn, 90);
        // Example: C:\Users\someone\AppData\Local\Temp\_monacodata_9888\workspaces\express\server.js on line 8, column 13
        line = toOSPath('C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts on line 8, column 13');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/Game.ts').toString() + '#8,13');
        assert.strictEqual(result[0].range.startColumn, 1);
        assert.strictEqual(result[0].range.endColumn, 101);
        line = toOSPath('C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts on LINE 8, COLUMN 13');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/Game.ts').toString() + '#8,13');
        assert.strictEqual(result[0].range.startColumn, 1);
        assert.strictEqual(result[0].range.endColumn, 101);
        // Example: C:\Users\someone\AppData\Local\Temp\_monacodata_9888\workspaces\express\server.js:line 8
        line = toOSPath('C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts:line 8');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/Game.ts').toString() + '#8');
        assert.strictEqual(result[0].range.startColumn, 1);
        assert.strictEqual(result[0].range.endColumn, 87);
        // Example: at File.put (C:/Users/someone/AppData/Local/Temp/_monacodata_9888/workspaces/mankala/Game.ts)
        line = toOSPath(' at File.put (C:/Users/someone/AppData/Local/Temp/_monacodata_9888/workspaces/mankala/Game.ts)');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/Game.ts').toString());
        assert.strictEqual(result[0].range.startColumn, 15);
        assert.strictEqual(result[0].range.endColumn, 94);
        // Example: at File.put (C:/Users/someone/AppData/Local/Temp/_monacodata_9888/workspaces/mankala/Game.ts:278)
        line = toOSPath(' at File.put (C:/Users/someone/AppData/Local/Temp/_monacodata_9888/workspaces/mankala/Game.ts:278)');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/Game.ts').toString() + '#278');
        assert.strictEqual(result[0].range.startColumn, 15);
        assert.strictEqual(result[0].range.endColumn, 98);
        // Example: at File.put (C:/Users/someone/AppData/Local/Temp/_monacodata_9888/workspaces/mankala/Game.ts:278:34)
        line = toOSPath(' at File.put (C:/Users/someone/AppData/Local/Temp/_monacodata_9888/workspaces/mankala/Game.ts:278:34)');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/Game.ts').toString() + '#278,34');
        assert.strictEqual(result[0].range.startColumn, 15);
        assert.strictEqual(result[0].range.endColumn, 101);
        line = toOSPath(' at File.put (C:/Users/someone/AppData/Local/Temp/_monacodata_9888/workspaces/mankala/Game.ts:278:34)');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/Game.ts').toString() + '#278,34');
        assert.strictEqual(result[0].range.startColumn, 15);
        assert.strictEqual(result[0].range.endColumn, 101);
        // Example: C:/Users/someone/AppData/Local/Temp/_monacodata_9888/workspaces/mankala/Features.ts(45): error
        line = toOSPath('C:/Users/someone/AppData/Local/Temp/_monacodata_9888/workspaces/mankala/lib/something/Features.ts(45): error');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/lib/something/Features.ts').toString() + '#45');
        assert.strictEqual(result[0].range.startColumn, 1);
        assert.strictEqual(result[0].range.endColumn, 102);
        // Example: C:/Users/someone/AppData/Local/Temp/_monacodata_9888/workspaces/mankala/Features.ts (45,18): error
        line = toOSPath('C:/Users/someone/AppData/Local/Temp/_monacodata_9888/workspaces/mankala/lib/something/Features.ts (45): error');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/lib/something/Features.ts').toString() + '#45');
        assert.strictEqual(result[0].range.startColumn, 1);
        assert.strictEqual(result[0].range.endColumn, 103);
        // Example: C:/Users/someone/AppData/Local/Temp/_monacodata_9888/workspaces/mankala/Features.ts(45,18): error
        line = toOSPath('C:/Users/someone/AppData/Local/Temp/_monacodata_9888/workspaces/mankala/lib/something/Features.ts(45,18): error');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/lib/something/Features.ts').toString() + '#45,18');
        assert.strictEqual(result[0].range.startColumn, 1);
        assert.strictEqual(result[0].range.endColumn, 105);
        line = toOSPath('C:/Users/someone/AppData/Local/Temp/_monacodata_9888/workspaces/mankala/lib/something/Features.ts(45,18): error');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/lib/something/Features.ts').toString() + '#45,18');
        assert.strictEqual(result[0].range.startColumn, 1);
        assert.strictEqual(result[0].range.endColumn, 105);
        // Example: C:/Users/someone/AppData/Local/Temp/_monacodata_9888/workspaces/mankala/Features.ts (45,18): error
        line = toOSPath('C:/Users/someone/AppData/Local/Temp/_monacodata_9888/workspaces/mankala/lib/something/Features.ts (45,18): error');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/lib/something/Features.ts').toString() + '#45,18');
        assert.strictEqual(result[0].range.startColumn, 1);
        assert.strictEqual(result[0].range.endColumn, 106);
        line = toOSPath('C:/Users/someone/AppData/Local/Temp/_monacodata_9888/workspaces/mankala/lib/something/Features.ts (45,18): error');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/lib/something/Features.ts').toString() + '#45,18');
        assert.strictEqual(result[0].range.startColumn, 1);
        assert.strictEqual(result[0].range.endColumn, 106);
        // Example: C:/Users/someone/AppData/Local/Temp/_monacodata_9888/workspaces/mankala/Features.ts(45): error
        line = toOSPath('C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\lib\\something\\Features.ts(45): error');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/lib/something/Features.ts').toString() + '#45');
        assert.strictEqual(result[0].range.startColumn, 1);
        assert.strictEqual(result[0].range.endColumn, 102);
        // Example: C:/Users/someone/AppData/Local/Temp/_monacodata_9888/workspaces/mankala/Features.ts (45,18): error
        line = toOSPath('C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\lib\\something\\Features.ts (45): error');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/lib/something/Features.ts').toString() + '#45');
        assert.strictEqual(result[0].range.startColumn, 1);
        assert.strictEqual(result[0].range.endColumn, 103);
        // Example: C:/Users/someone/AppData/Local/Temp/_monacodata_9888/workspaces/mankala/Features.ts(45,18): error
        line = toOSPath('C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\lib\\something\\Features.ts(45,18): error');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/lib/something/Features.ts').toString() + '#45,18');
        assert.strictEqual(result[0].range.startColumn, 1);
        assert.strictEqual(result[0].range.endColumn, 105);
        line = toOSPath('C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\lib\\something\\Features.ts(45,18): error');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/lib/something/Features.ts').toString() + '#45,18');
        assert.strictEqual(result[0].range.startColumn, 1);
        assert.strictEqual(result[0].range.endColumn, 105);
        // Example: C:/Users/someone/AppData/Local/Temp/_monacodata_9888/workspaces/mankala/Features.ts (45,18): error
        line = toOSPath('C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\lib\\something\\Features.ts (45,18): error');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/lib/something/Features.ts').toString() + '#45,18');
        assert.strictEqual(result[0].range.startColumn, 1);
        assert.strictEqual(result[0].range.endColumn, 106);
        line = toOSPath('C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\lib\\something\\Features.ts (45,18): error');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/lib/something/Features.ts').toString() + '#45,18');
        assert.strictEqual(result[0].range.startColumn, 1);
        assert.strictEqual(result[0].range.endColumn, 106);
        // Example: C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\lib\\something\\Features Special.ts (45,18): error.
        line = toOSPath('C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\lib\\something\\Features Special.ts (45,18): error');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/lib/something/Features Special.ts').toString() + '#45,18');
        assert.strictEqual(result[0].range.startColumn, 1);
        assert.strictEqual(result[0].range.endColumn, 114);
        // Example: at C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts.
        line = toOSPath(' at C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts. in');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/Game.ts').toString());
        assert.strictEqual(result[0].range.startColumn, 5);
        assert.strictEqual(result[0].range.endColumn, 84);
        // Example: at C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game
        line = toOSPath(' at C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game in');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        // Example: at C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game\\
        line = toOSPath(' at C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game\\ in');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        // Example: at "C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts"
        line = toOSPath(' at "C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts" in');
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/Game.ts').toString());
        assert.strictEqual(result[0].range.startColumn, 6);
        assert.strictEqual(result[0].range.endColumn, 85);
        // Example: at 'C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts'
        line = toOSPath(" at 'C:\\Users\\someone\\AppData\\Local\\Temp\\_monacodata_9888\\workspaces\\mankala\\Game.ts' in");
        result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 1);
        assert.strictEqual(result[0].url, contextService.toResource('/Game.ts').toString());
        assert.strictEqual(result[0].range.startColumn, 6);
        assert.strictEqual(result[0].range.endColumn, 85);
    });
    test('OutputLinkProvider - #106847', function () {
        const rootFolder = isWindows
            ? URI.file('C:\\Users\\username\\Desktop\\test-ts')
            : URI.file('C:/Users/username/Desktop');
        const patterns = OutputLinkComputer.createPatterns(rootFolder);
        const contextService = new TestContextService();
        const line = toOSPath('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa C:\\Users\\username\\Desktop\\test-ts\\prj.conf C:\\Users\\username\\Desktop\\test-ts\\prj.conf C:\\Users\\username\\Desktop\\test-ts\\prj.conf');
        const result = OutputLinkComputer.detectLinks(line, 1, patterns, contextService);
        assert.strictEqual(result.length, 3);
        for (const res of result) {
            assert.ok(res.range.startColumn > 0 && res.range.endColumn > 0);
        }
    });
    ensureNoDisposablesAreLeakedInTestSuite();
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoib3V0cHV0TGlua1Byb3ZpZGVyLnRlc3QuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy93b3JrYmVuY2gvY29udHJpYi9vdXRwdXQvdGVzdC9icm93c2VyL291dHB1dExpbmtQcm92aWRlci50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7Z0dBR2dHO0FBRWhHLE9BQU8sTUFBTSxNQUFNLFFBQVEsQ0FBQTtBQUMzQixPQUFPLEVBQUUsR0FBRyxFQUFFLE1BQU0sbUNBQW1DLENBQUE7QUFDdkQsT0FBTyxFQUFFLFdBQVcsRUFBRSxPQUFPLEVBQUUsU0FBUyxFQUFFLE1BQU0sd0NBQXdDLENBQUE7QUFDeEYsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sb0NBQW9DLENBQUE7QUFDdkUsT0FBTyxFQUFFLGtCQUFrQixFQUFFLE1BQU0sa0RBQWtELENBQUE7QUFDckYsT0FBTyxFQUFFLHVDQUF1QyxFQUFFLE1BQU0sMENBQTBDLENBQUE7QUFFbEcsS0FBSyxDQUFDLG9CQUFvQixFQUFFLEdBQUcsRUFBRTtJQUNoQyxTQUFTLFFBQVEsQ0FBQyxDQUFTO1FBQzFCLElBQUksV0FBVyxJQUFJLE9BQU8sRUFBRSxDQUFDO1lBQzVCLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUE7UUFDN0IsQ0FBQztRQUVELE9BQU8sQ0FBQyxDQUFBO0lBQ1QsQ0FBQztJQUVELElBQUksQ0FBQyxxQ0FBcUMsRUFBRTtRQUMzQyxNQUFNLFVBQVUsR0FBRyxTQUFTO1lBQzNCLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLGlGQUFpRixDQUFDO1lBQzdGLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLHlFQUF5RSxDQUFDLENBQUE7UUFFdEYsTUFBTSxRQUFRLEdBQUcsa0JBQWtCLENBQUMsY0FBYyxDQUFDLFVBQVUs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aUgsQ0FDakgsQ0FBQTtRQUNELE1BQU0sR0FBRyxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQ2IsY0FBYyxDQUFDLFVBQVUsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLFFBQVEsRUFBRSxHQUFHLFFBQVEsQ0FDN0UsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUVsRCw4R0FBOEc7UUFDOUcsSUFBSSxHQUFHLFFBQVEsQ0FDZCxrSEFBa0gsQ0FDbEgsQ0FBQTtRQUNELE1BQU0sR0FBRyxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQ2IsY0FBYyxDQUFDLFVBQVUsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLFFBQVEsRUFBRSxHQUFHLFFBQVEsQ0FDN0UsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxN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QkFBa0IsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxXQUFXLENBQ2pCLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQ2IsY0FBYyxDQUFDLFVBQVUsQ0FBQyxvQ0FBb0MsQ0FBQyxDQUFDLFFBQVEsRUFBRSxHQUFHLFFBQVEsQ0FDckYsQ0FBQTtRQUNELE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUE7UUFDbEQsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsRUFBRSxHQUFHLENBQUMsQ0FBQTtRQUVsRCx3R0FBd0c7UUFDeEcsSUFBSSxHQUFHLFFBQVEsQ0FDZCxrR0FBa0csQ0FDbEcsQ0FBQTtRQUNELE1BQU0sR0FBRyxrQkFBa0IsQ0FBQyxXQUFXLENBQUMsSUFBSSxFQUFFLENBQUMsRUFBRSxRQUFRLEVBQUUsY0FBYyxDQUFDLENBQUE7UUFDMUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFBO1FBQ3BDLE1BQU0sQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxjQUFjLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLFFBQVEsRUFBRSxDQUFDLENBQUE7UUFDbkYsTUFBTSxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQTtRQUNsRCxNQUFNLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsU0FBUyxFQUFF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