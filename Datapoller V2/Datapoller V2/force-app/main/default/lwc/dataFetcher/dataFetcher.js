import { api, LightningElement } from "lwc";
import getSObjects from "@salesforce/apex/DataFetcherController.getSObjects";
import { FlowAttributeChangeEvent } from "lightning/flowSupport";

export default class DataFetcher extends LightningElement {
  @api queryString;
  @api firstRetrievedRecord;
  @api retrievedRecords = [];
  @api error;

  renderedCallback() {
    this.getRecords();
  }

  getRecords() {
    this.error = undefined;
    if (this.queryString) {
      getSObjects({ queryString: this.queryString })
        .then(({ results, firstResult }) => {
          this.retrievedRecords = results;
          this.firstRetrievedRecord = firstResult;
          this._fireFlowEvent("firstRetrievedRecord", this.firstRetrievedRecord);
          this._fireFlowEvent("retrievedRecords", this.retrievedRecords);
        })
        .catch(this._displayError);
    }
  }

  _displayError(error) {
    this.error = error?.body?.message ?? JSON.stringify(error);
    console.error(error);
    this._fireFlowEvent("error", this.error);
  }

  _fireFlowEvent(eventName, data) {
    this.dispatchEvent(new FlowAttributeChangeEvent(eventName, data));
  }
}
