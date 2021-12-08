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

const VALIDATEABLE_INPUTS = ['c-fsc_flow-combobox', 'c-fsc_pick-object-and-field', 'c-field-selector'];

export default class fsc_flexcardCPE extends LightningElement {
    @api automaticOutputVariables;
    typeValue;
    _builderContext = {};
    _values = [];
    _flowVariables = [];
    _typeMappings = [];
    rendered;


    @track inputValues = {
        value: { value: null, valueDataType: null, isCollection: false, label: 'Preselected recordId' },
        icon: { value: null, valueDataType: null, isCollection: false, label: 'Icon name for example standard:account' },
        records: { value: null, valueDataType: null, isCollection: true, label: 'Record Collection', helpText: 'Record collection variable to be displayed in the cards' },
        visibleFieldNames: { value: null, valueDataType: null, isCollection: false, label: 'Show which fields?' },
        fields: { value: null, valueDataType: null, isCollection: true, label: 'Show which fields?', serialized: true },
        visibleFlowNames: { value: null, valueDataType: null, isCollection: false, label: 'Show which flow?' },        
        flows: { value: null, valueDataType: null, isCollection: true, label: 'Show which flow?', serialized: true },
        cardSizeString: { value: null, valueDataType: DATA_TYPE.NUMBER, isCollection: false, label: 'Card Size', helpText: 'This is the size of the card in Pixels' },
        isClickable: { value: null, valueDataType: null, isCollection: false, label: 'Clickable Cards?', helpText: 'When checked cards are clickable and recordId passes to value' },
        cb_isClickable: {value: null, valueDataType: null, isCollection: false, label: ''},
        headerStyle: { value: null, valueDataType: null, isCollection: false, label: 'Style attribute for the card headers ', helpText: 'ie. background-color:red;' },
        allowMultiSelect: { value: null, valueDataType: null, isCollection: false, label: 'Allow MultiSelect?', helpText: 'When checked checkboxes appear on cards and adds selected cards recordId to collection' },
        cb_allowMultiSelect: {value: null, valueDataType: null, isCollection: false, label: ''},
        objectAPIName: { value: null, valueDataType: null, isCollection: false, label: 'Object Name' },
        label: { value: null, valueDataType: null, isCollection: false, label: 'Component Label' },
        transitionOnClick: { value: null, valueDataType: null, isCollection: false, label: 'Transition to next when card clicked?' },
        cb_transitionOnClick: {value: null, valueDataType: null, isCollection: false, label: ''},
    };

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

    @api
    validate() {
        let validity = [];
        for (let inputType of VALIDATEABLE_INPUTS) {
            for (let input of this.template.querySelectorAll(inputType)) {
                if (!input.reportValidity()) {
                    validity.push({
                        key: input.name || ('Error_'+ validity.length),
                        errorString: 'This field has an error (missing or invalid entry)',
                    });            
                }
            }
        }
        return validity;
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

    initializeValues(value) {
        if (this._values && this._values.length) {
            this._values.forEach(curInputParam => {
                if (curInputParam.name && this.inputValues[curInputParam.name]) {
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

    handleObjectChange(event) {
        if (event.target && event.detail) {
            // console.log('handling a dynamic type mapping');
            // console.log('event is ' + JSON.stringify(event));
            let typeValue = event.detail.objectType;
            const typeName = 'T';
            const dynamicTypeMapping = new CustomEvent('configuration_editor_generic_type_mapping_changed', {
                composed: true,
                cancelable: false,
                bubbles: true,
                detail: {
                    typeName,
                    typeValue,
                }
            });
            this.dispatchEvent(dynamicTypeMapping);
            if (this.inputValues.objectAPIName.value != typeValue) {
                this.inputValues.objectAPIName.value = typeValue;
                this.dispatchFlowValueChangeEvent(event.currentTarget.name, typeValue, 'String');
            }
    
            // this.dispatchFlowValueChangeEvent(event.currentTarget.name, event.detail.objectType, DATA_TYPE.STRING);
        }
    }


   // handleFlowComboboxValueChange(event) {
   //     if (event.target && event.detail) {
  //          let changedAttribute = event.target.name;
  //          let newType = event.detail.dataType;
  //          let newValue = event.detail.newValue;
  //          this.dispatchFlowValueChangeEvent(changedAttribute, newValue, newType);
  //      }
  //  }

    handleFlowComboboxValueChange(event) {
        if (event.target && event.detail) {
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
            this.dispatchFlowValueChangeEvent(changedAttribute, event.detail.newValue, 'Boolean');
            this.dispatchFlowValueChangeEvent('cb_'+ changedAttribute, event.detail.newStringValue, event.detail.newValueDataType);
        }
    }

    handlePickIcon(event) {
        // this.inputValues[changedAttribute].value = event.detail;
        this.dispatchFlowValueChangeEvent('icon', event.detail);
    }

    handleFlowSelect(event) {
        let selectedFlow = event.detail;
        let currentFlows = this.inputValues.flows.value || [];
        if (!currentFlows.some(flow => selectedFlow.value === flow.value)) {
            currentFlows.push(selectedFlow);
            this.dispatchFlowValueChangeEvent('flows', currentFlows);
        }
        event.currentTarget.selectedFlowApiName = null;
    }

    handleFlowRemove(event) {
        this.inputValues.flows.value.splice(event.currentTarget.dataset.index, 1);
        this.dispatchFlowValueChangeEvent('flows', this.inputValues.flows.value);

    }    

    handlesliderChange(event) {        
            this.dispatchFlowValueChangeEvent(event.target.name, event.detail.newValue, 'Number');
       }

    updateRecordVariablesComboboxOptions(objectType) {
        const variables = this._flowVariables.filter(
            (variable) => variable.objectType === objectType
        );
        let comboboxOptions = [];
        variables.forEach((variable) => {
            comboboxOptions.push({
                label: variable.name,
                value: "{!" + variable.name + "}"
            });
        });
        return comboboxOptions;
    }

    dispatchFlowValueChangeEvent(id, newValue, dataType = DATA_TYPE.STRING) {
        console.log('in dispatchFlowValueChangeEvent: '+ id, newValue, dataType);
        if (this.inputValues[id] && this.inputValues[id].serialized) {
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


}