import { LightningElement, api, wire, track } from 'lwc'; import {
    getRecord
} from 'lightning/uiRecordApi';
 
import USER_ID from '@salesforce/user/Id';
import id from '@salesforce/user/Id';


export default class App extends LightningElement {
    @track error ;
    @track Id ; 
        @wire(getRecord, {
        recordId: USER_ID,
        fields: [id]
    }) wireuser({
        error,
        data
    }) {
        if (error) {
           this.error = error ; 
        } else if (data) {
            this.userId = data.fields.Id.value;
                    }
    }
 
    @api sysId = '202';
    theIframe;

    get fullUrl() {

    return `https://recruitmilitary--test.lightning.force.com/lightning/r/User/{userId}view`;
    }

    @api isReloaded = false;


renderedCallback() {
    // eslint-disable-next-line no-console
    console.log('rendred callback called' + this.theIframe);
        // eslint-disable-next-line eqeqeq
        if(this.theIframe==undefined){
            this.theIframe =  this.template.querySelector('iframe');
            this.theIframe.onload = ()=>{
                // eslint-disable-next-line no-console
                console.log('Onload called'+this.isReloaded);

                if(!this.isReloaded){
                    this.isReloaded = true;
                    this.theIframe.src = this.theIframe.src ;

                }
            }
        }   

    }
}