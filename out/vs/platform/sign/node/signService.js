/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import { AbstractSignService } from '../common/abstractSignService.js';
export class SignService extends AbstractSignService {
    getValidator() {
        return this.vsda().then((vsda) => new vsda.validator());
    }
    signValue(arg) {
        return this.vsda().then((vsda) => new vsda.signer().sign(arg));
    }
    async vsda() {
        const mod = 'vsda';
        const { default: vsda } = await import(mod);
        return vsda;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2lnblNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiZmlsZTovLy9Vc2Vycy95YXNoYXNuYWlkdS9LdmFudGNvZGUvdm9pZC9zcmMvIiwic291cmNlcyI6WyJ2cy9wbGF0Zm9ybS9zaWduL25vZGUvc2lnblNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7OztnR0FHZ0c7QUFFaEcsT0FBTyxFQUFFLG1CQUFtQixFQUFrQixNQUFNLGtDQUFrQyxDQUFBO0FBaUJ0RixNQUFNLE9BQU8sV0FBWSxTQUFRLG1CQUFtQjtJQUNoQyxZQUFZO1FBQzlCLE9BQU8sSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxJQUFJLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQTtJQUN4RCxDQUFDO0lBQ2tCLFNBQVMsQ0FBQyxHQUFXO1FBQ3ZDLE9BQU8sSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksRUFBRSxFQUFFLENBQUMsSUFBSSxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7SUFDL0QsQ0FBQztJQUVPLEtBQUssQ0FBQyxJQUFJO1FBQ2pCLE1BQU0sR0FBRyxHQUFHLE1BQU0sQ0FBQTtRQUNsQixNQUFNLEVBQUUsT0FBTyxFQUFFLElBQUksRUFBRSxHQUFHLE1BQU0sTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFBO1FBQzNDLE9BQU8sSUFBSSxDQUFBO0lBQ1osQ0FBQztDQUNEIn0=