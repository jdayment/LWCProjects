import { api, LightningElement } from 'lwc';
import getSobjects from '@salesforce/apex/DataFetcherController.getSobjects';
import { FlowAttributeChangeEvent } from 'lightning/flowSupport';
export default class DataFetcher extends LightningElement {
    @api queryString;
    @api retrievedRecords = [];
    @api error;

    //using a renderedCallback vs connectedCallback seems to work when using reactivity
    renderedCallback() {
        //I needed to look for an empty string vs null on query string because it wasn't treating it as null for some reason
        if(this.queryString != ""){
            this.getRecords()}
        }

    getRecords() {
        {
        
            getSobjects({queryString : this.queryString}).then(
                result => {
                    
                    this.retrievedRecords = result;
                    this.dispatchEvent(new FlowAttributeChangeEvent('retrievedRecords', this.retrievedRecords));
                                 
                }
            ).catch(
                error => {
                    this.error = error.body.message;
                    console.error('error', error);
                    this.dispatchEvent(new FlowAttributeChangeEvent('error', this.error.body.message)); 
                }
            );
        }
    }

}
