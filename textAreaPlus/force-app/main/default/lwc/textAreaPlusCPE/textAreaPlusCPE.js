import { api, track, LightningElement } from 'lwc';

const DATA_TYPE = {
    STRING: 'String',
    BOOLEAN: 'Boolean',
    NUMBER: 'Number',
    INTEGER: 'Integer'
};

const defaults = {
    inputAttributePrefix: 'select_',
};

const FLOW_EVENT_TYPE = {
    DELETE: 'configuration_editor_input_value_deleted',
    CHANGE: 'configuration_editor_input_value_changed'
}

const VALIDATEABLE_INPUTS = ['c-fsc_flow-combobox'];
export default class textAreaPlusCPE extends LightningElement {
    @api automaticOutputVariables;
    typeValue;
    _builderContext = {};
    _values = [];
    _flowVariables = [];
    _typeMappings = [];
    rendered;

    @track inputValues = {
        value: { value: null, valueDataType: null, isCollection: false, label: 'Text Value' },
        charsLeftTemplate: { value: '$M/$L characters remaining', valueDataType: null, isCollection: false, label: 'Characters Remaining Template', helpText: 'Display a custom message for remaining characters with tokens: $R for remaining chars, $L for current length, and $M for max allowed characters.' },
        label: { value: null, valueDataType: null, isCollection: false, label: 'Component Label' },
        maxlen: { value: null, valueDataType: DATA_TYPE.NUMBER, isCollection: false, label: 'Maximum number of characters allowed' },
        maxlenString: { value: null, valueDataType: DATA_TYPE.NUMBER, isCollection: false, label: 'Maximum number of characters allowed', helpText: 'If set, text length will be limited to this value, and a character counter will be displayed'
            , helpTextRichText: 'If set, text length will be limited to this value, and a character counter will be displayed. NOTE: Rich text character count includes HTML not visible to the user and may not match visible text.' },
        placeHolder: { value: null, valueDataType: null, isCollection: true, label: 'Placeholder Text', helpText: 'Optional placeholder text' },
        textMode: { value: 'Rich Text', valueDataType: null, isCollection: false, label: 'Plain text or Rich text?'},
        disableAdvancedTools: { value: null, valueDataType: null, isCollection: false, label: 'Disable Advanced Tools', helpText: 'Set to true to disable expanded Rich Text tools - Search/Replace, Auto-replace, and blocked words/sybmols.' },
        cb_disableAdvancedTools: {value: null, valueDataType: null, isCollection: false, label:''},
        disallowedWordsList: { value: null, valueDataType: null, isCollection: false, label: 'Blocked Words', helpText: 'Comma-separated list of words to block.  Example: bad,worse,worst' },
        disallowedSymbolsList: { value: null, valueDataType: null, isCollection: false, label: 'Blocked Symbols', helpText: 'Comma-separated list of symbols to block.  Example: /,@,*' },
        autoReplaceMap: { value: null, valueDataType: null, isCollection: false, label: 'Autoreplace Map', helpText: 'JSON for key:value pairs you want to replace.  Key = value to replace, Value = value to replace with.  Example: {"Test":"Great Test"}' },
        warnOnly: { value: null, valueDataType: null, isCollection: false, label: 'Warning Only', helpText:'Set to True if you want disallowed Symbols or Words to only alert and not block next/finish.  Default is false.' },
        cb_warnOnly: {value: null, valueDataType: null, isCollection: false, label:''},
        required: { value: null, valueDataType: null, isCollection: false, label: 'Required', helpText: 'If true requires a value in the text input' },
        cb_required: {value: null, valueDataType: null, isCollection: false, label:''},
    };

    get bannerInfo() {
        // returns common attributes/helptext for rich and plain text
        return [
            {label: 'Component Label', helpText: 'Header Label'},
            {label: 'Placeholder Text', helpText: 'Initial Placeholder Text'},
            {label: 'Text Value', helpText: 'Initial Text Value'}            
        ];
    }

    get hasValidMaxLength() {        
        return this.inputValues.maxlenString.value && Number(this.inputValues.maxlenString.value) > 0;
    }
    
    @api get builderContext() {
        return this._builderContext;
    }

    set builderContext(value) {
        this._builderContext = value;
    }

    @api get inputVariables() {
        return this._values;
    }

    set inputVariables(value) {
        this._values = value;
        this.initializeValues();
    }

    @api get genericTypeMappings() {
        return this._genericTypeMappings;
    }
    set genericTypeMappings(value) {
        this._typeMappings = value;
        this.initializeTypeMappings();
    }

    @api get textOptions() {
        return [
            { label: 'Plain Text', value: 'plain' },
            { label: 'Rich Text', value: 'rich' },
        ];
    }

    @api
    validate() {
        let validity = [];
        for (let inputType of VALIDATEABLE_INPUTS) {
            for (let input of this.template.querySelectorAll(inputType)) {
                if (!input.reportValidity()) {
                    validity.push({
                        key: input.name || ('Error_' + validity.length),
                        errorString: 'This field has an error (missing or invalid entry)',
                    });
                }
            }
        }
        return validity;
    }

 

    /* LIFECYCLE HOOKS */
    connectedCallback() {

    }

    renderedCallback() {
        if (!this.rendered) {
            this.rendered = true;
            for (let flowCombobox of this.template.querySelectorAll('c-fsc_flow-combobox')) {
                flowCombobox.builderContext = this.builderContext;
                flowCombobox.automaticOutputVariables = this.automaticOutputVariables;
            }
        }
    }

    /* ACTION FUNCTIONS */
    initializeValues(value) {
        if (this._values && this._values.length) {
            this._values.forEach(curInputParam => {
                if (curInputParam.name && this.inputValues[curInputParam.name]) {
                    console.log('in initializeValues: ' + curInputParam.name + ' = ' + curInputParam.value);
                    // console.log('in initializeValues: '+ JSON.stringify(curInputParam));
                    if (this.inputValues[curInputParam.name].serialized) {
                        this.inputValues[curInputParam.name].value = JSON.parse(curInputParam.value);
                    } else {
                        this.inputValues[curInputParam.name].value = curInputParam.value;
                    }
                    this.inputValues[curInputParam.name].valueDataType = curInputParam.valueDataType;
                }
            });
        }
    }

    initializeTypeMappings() {
        this._typeMappings.forEach((typeMapping) => {
            // console.log(JSON.stringify(typeMapping));
            if (typeMapping.name && typeMapping.value) {
                this.typeValue = typeMapping.value;
            }
        });
    }

    /* EVENT HANDLERS */

    handleFlowComboboxValueChange(event) {
        if (event.target && event.detail) {
            // Force update max length value so chars remaining template visibility is reflected
            if (event.target.name === 'maxlenString') {
                this.inputValues.maxlenString.value = event.detail.newValue;
            }
            this.dispatchFlowValueChangeEvent(event.target.name, event.detail.newValue, event.detail.newValueDataType);            
        }
    }

    handleValueChange(event) {
        if (event.detail && event.currentTarget.name) {
            let dataType = DATA_TYPE.STRING;
            if (event.currentTarget.type == 'checkbox') dataType = DATA_TYPE.BOOLEAN;
            if (event.currentTarget.type == 'number') dataType = DATA_TYPE.NUMBER;
            if (event.currentTarget.type == 'integer') dataType = DATA_TYPE.INTEGER;

            let newValue = event.currentTarget.type === 'checkbox' ? event.currentTarget.checked : event.detail.value;
            this.dispatchFlowValueChangeEvent(event.currentTarget.name, newValue, dataType);
        }
    }

    handleCheckboxChange(event) {
        if (event.target && event.detail) {
            let changedAttribute = event.target.name.replace(defaults.inputAttributePrefix, '');
            this.dispatchFlowValueChangeEvent(changedAttribute, event.detail.newValue, event.detail.newValueDataType);
            this.dispatchFlowValueChangeEvent('cb_'+changedAttribute, event.detail.newStringValue, 'String');
        }
    }

    handleTextOptionChange(event) {
        this.dispatchFlowValueChangeEvent('textMode', event.detail.value, 'String');
    }

    dispatchFlowValueChangeEvent(id, newValue, dataType = DATA_TYPE.STRING) {
        console.log('in dispatchFlowValueChangeEvent: ' + id, newValue, dataType);
        if (this.inputValues[id] && this.inputValues[id].serialized) {
            console.log('serializing value');
            newValue = JSON.stringify(newValue);
        }
        const valueChangedEvent = new CustomEvent(FLOW_EVENT_TYPE.CHANGE, {
            bubbles: true,
            cancelable: false,
            composed: true,
            detail: {
                name: id,
                newValue: newValue ? newValue : null,
                newValueDataType: dataType
            }
        });
        this.dispatchEvent(valueChangedEvent);
    }

    get isPlainText () {
        let textType = this.inputValues.textMode.value
        if(textType == 'plain')
            return true;
            return false;
        }

    get showAdvancedTools (){
        let advancedTools = this.inputValues.cb_disableAdvancedTools.value
        if(advancedTools == 'CB_TRUE')
            return true;
            return false;
        } 
    }

   
