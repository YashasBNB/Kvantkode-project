/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
// *********************************************************************
// *                                                                   *
// *  We need this to redirect to node_modules from the remote-folder. *
// *  This ONLY applies  when running out of source.                   *
// *                                                                   *
// *********************************************************************
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promises } from 'node:fs';
import { join } from 'node:path';
// SEE https://nodejs.org/docs/latest/api/module.html#initialize
const _specifierToUrl = {};
export async function initialize(injectPath) {
    // populate mappings
    const injectPackageJSONPath = fileURLToPath(new URL('../package.json', pathToFileURL(injectPath)));
    const packageJSON = JSON.parse(String(await promises.readFile(injectPackageJSONPath)));
    for (const [name] of Object.entries(packageJSON.dependencies)) {
        try {
            const path = join(injectPackageJSONPath, `../node_modules/${name}/package.json`);
            let { main } = JSON.parse(String(await promises.readFile(path)));
            if (!main) {
                main = 'index.js';
            }
            if (!main.endsWith('.js')) {
                main += '.js';
            }
            const mainPath = join(injectPackageJSONPath, `../node_modules/${name}/${main}`);
            _specifierToUrl[name] = pathToFileURL(mainPath).href;
        }
        catch (err) {
            console.error(name);
            console.error(err);
        }
    }
    console.log(`[bootstrap-import] Initialized node_modules redirector for: ${injectPath}`);
}
export async function resolve(specifier, context, nextResolve) {
    const newSpecifier = _specifierToUrl[specifier];
    if (newSpecifier !== undefined) {
        return {
            format: 'commonjs',
            shortCircuit: true,
            url: newSpecifier,
        };
    }
    // Defer to the next hook in the chain, which would be the
    // Node.js default resolve if this is the last user-specified loader.
    return nextResolve(specifier, context);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYm9vdHN0cmFwLWltcG9ydC5qcyIsInNvdXJjZVJvb3QiOiJmaWxlOi8vL1VzZXJzL3lhc2hhc25haWR1L0t2YW50Y29kZS92b2lkL3NyYy8iLCJzb3VyY2VzIjpbImJvb3RzdHJhcC1pbXBvcnQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsd0VBQXdFO0FBQ3hFLHdFQUF3RTtBQUN4RSx3RUFBd0U7QUFDeEUsd0VBQXdFO0FBQ3hFLHdFQUF3RTtBQUN4RSx3RUFBd0U7QUFFeEUsT0FBTyxFQUFFLGFBQWEsRUFBRSxhQUFhLEVBQUUsTUFBTSxVQUFVLENBQUE7QUFDdkQsT0FBTyxFQUFFLFFBQVEsRUFBRSxNQUFNLFNBQVMsQ0FBQTtBQUNsQyxPQUFPLEVBQUUsSUFBSSxFQUFFLE1BQU0sV0FBVyxDQUFBO0FBRWhDLGdFQUFnRTtBQUVoRSxNQUFNLGVBQWUsR0FBMkIsRUFBRSxDQUFBO0FBRWxELE1BQU0sQ0FBQyxLQUFLLFVBQVUsVUFBVSxDQUFDLFVBQWtCO0lBQ2xELG9CQUFvQjtJQUVwQixNQUFNLHFCQUFxQixHQUFHLGFBQWEsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxpQkFBaUIsRUFBRSxhQUFhLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ2xHLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sUUFBUSxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUV0RixLQUFLLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsRUFBRSxDQUFDO1FBQy9ELElBQUksQ0FBQztZQUNKLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxxQkFBcUIsRUFBRSxtQkFBbUIsSUFBSSxlQUFlLENBQUMsQ0FBQTtZQUNoRixJQUFJLEVBQUUsSUFBSSxFQUFFLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxRQUFRLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUVoRSxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ1gsSUFBSSxHQUFHLFVBQVUsQ0FBQTtZQUNsQixDQUFDO1lBQ0QsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFDM0IsSUFBSSxJQUFJLEtBQUssQ0FBQTtZQUNkLENBQUM7WUFDRCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMscUJBQXFCLEVBQUUsbUJBQW1CLElBQUksSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFBO1lBQy9FLGVBQWUsQ0FBQyxJQUFJLENBQUMsR0FBRyxhQUFhLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFBO1FBQ3JELENBQUM7UUFBQyxPQUFPLEdBQUcsRUFBRSxDQUFDO1lBQ2QsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQTtZQUNuQixPQUFPLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQ25CLENBQUM7SUFDRixDQUFDO0lBRUQsT0FBTyxDQUFDLEdBQUcsQ0FBQywrREFBK0QsVUFBVSxFQUFFLENBQUMsQ0FBQTtBQUN6RixDQUFDO0FBRUQsTUFBTSxDQUFDLEtBQUssVUFBVSxPQUFPLENBQzVCLFNBQTBCLEVBQzFCLE9BQVksRUFDWixXQUEwQztJQUUxQyxNQUFNLFlBQVksR0FBRyxlQUFlLENBQUMsU0FBUyxDQUFDLENBQUE7SUFDL0MsSUFBSSxZQUFZLEtBQUssU0FBUyxFQUFFLENBQUM7UUFDaEMsT0FBTztZQUNOLE1BQU0sRUFBRSxVQUFVO1lBQ2xCLFlBQVksRUFBRSxJQUFJO1lBQ2xCLEdBQUcsRUFBRSxZQUFZO1NBQ2pCLENBQUE7SUFDRixDQUFDO0lBRUQsMERBQTBEO0lBQzFELHFFQUFxRTtJQUNyRSxPQUFPLFdBQVcsQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUE7QUFDdkMsQ0FBQyJ9