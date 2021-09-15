import { LightningElement, api, track, wire } from 'lwc';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import { FlowAttributeChangeEvent, FlowNavigationNextEvent } from 'lightning/flowSupport';


export default class FlexcardFlow extends LightningElement {

    @api value;
    @api selectedLabel;
    @api records;
    @api visibleFieldNames;
    @api visibleFlowNames;
    @api src;
    @api icon;
    @api cardSize = 300;
    @api avatarField;
    @api objectAPIName;
    @api isClickable;
    @api headerStyle;
    @api allowMultiSelect;
    @api recordValue;
    @api transitionOnClick;
    @api selectedRecordIds = [];
    @api label;
    @api availableActions = [];
    @track Cardcss;
    @track fieldHTML = '';
    @track recordLayoutData = {};
    @track objectInfo;
    @track recs = [];
    @api
    get fields() {
        return this._fields;
    }
    set fields(value) {
        this._fields = value;
        this.visibleFieldNames = JSON.parse(value).map(field => field.name).join();
    }
    @track _fields;
    @api
    get flows() {
        return this._flows;
    }
    set flows(value) {
        this._flows = value;
        this.flows = JSON.parse(value).map(flow => flow.value).join();
    }
    @track _flows;
    @api
    get cardSizeString() {
        return this.cardSize;
    }
    set cardSizeString(value) {
        if (!Number.isNaN(value))
            this.cardSize = value;
    }
    
    curRecord;
    @wire(getObjectInfo, { objectApiName: '$objectAPIName' })
    recordInfo({ data, error }) {
        if (data) {
            this.objectInfo = data;
            //console.log('AssignedResource Label => ', data.fields.AssignedResource.label);
        }
    }
    connectedCallback() {
        console.log('entering connectedCallback');
        if (!this.records) {
            throw new Exception("Flexcard component received a null when it expected a collection of records. Make sure you have set the Object API Name in both locations and specified a Card Data Record Collection");
        }
        console.log('records are: ' + JSON.stringify(this.records));
        this.recs = JSON.parse(JSON.stringify(this.records));
        this.recs.find(record => {
            record.Cardcss = 'card';
        })
    }
    //for each record:
    // for each fieldname, create a data structure called fieldData with that fieldname, the label of that field, and the value
    // add the fieldData to recordLayoutData 
    //TODO: remove this because it's not used? 
    assembleFieldLayout(item, index) {
        this.curRecord = item;
        console.log('visibleFieldNames is: ' + JSON.stringify(this.visibleFieldNames));
        this.visibleFieldNames.split(",").forEach(this.appendFieldInfo, this);

    }


    retrieveFieldLabels(item, index) {
        console.log('retrieving field label for field named: ' + item);
        //call apex to get field labels for fields
    }

    appendFieldInfo(item, index) {
        console.log('entering append...fieldName is: ' + item);
        console.log('and record is: ' + JSON.stringify(this.curRecord));
        //console.log('this is: ' + this);
        this.fieldHTML = this.fieldHTML + ' <h2> ' + item + ' </h2>';
        console.log('fieldHTML is now: ' + this.fieldHTML);
    }

    get isDataLoaded() {
        return this.objectInfo && this.records.length > 0;
    }

    //set card width and height

    get sizeWidth() {
        return 'width: ' + this.cardSize + 'px ; height: ' + this.cardSize + 'px';
    }


    handleChange(event) {
        console.log(event.target.checked);
        if (event.target.checked == true) {
            this.recordValue = event.target.value;
            this.selectedRecordIds.push(this.recordValue);
        }
        else {
            const remove = this.selectedRecordIds.indexOf(this.selectedRecordIds.find(element => element.Id === event.target.value));
            this.selectedRecordIds.splice(remove, 1);
        }
    }

    handleClick(event) {

        this.recs.find(record => {
            if (record.Id === event.currentTarget.dataset.id && this.isClickable == true) {
                record.Cardcss = 'clickedCard';
                this.selectedRecord = event.currentTarget.dataset.id;
                console.log(this.value = this.selectedRecord);
            }
            else {
                record.Cardcss = 'card';
            }
        });

        if (this.transitionOnClick === true && this.availableActions.find(action => action === 'NEXT')) {
            // navigate to the next screen
            const navigateNextEvent = new FlowNavigationNextEvent();
            this.dispatchEvent(navigateNextEvent);
        }
    }



}