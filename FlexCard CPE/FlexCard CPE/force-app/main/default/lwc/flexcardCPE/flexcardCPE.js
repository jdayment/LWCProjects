import { api, track, LightningElement } from 'lwc';

const DATA_TYPE = {
    STRING: 'String',
    BOOLEAN: 'Boolean',
    NUMBER: 'Number'
}

const FLOW_EVENT_TYPE = {
    DELETE: 'configuration_editor_input_value_deleted',
    CHANGE: 'configuration_editor_input_value_changed'
}

const VALIDATEABLE_INPUTS = ['c-fsc_flow-combobox', 'c-fsc_pick-object-and-field', 'c-field-selector'];

export default class FlexcardCPE extends LightningElement {
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
        headerStyle: { value: null, valueDataType: null, isCollection: false, label: 'Style attribute for the card headers ', helpText: 'ie. background-color:red;' },
        allowMultiSelect: { value: null, valueDataType: null, isCollection: false, label: 'Allow MultiSelect?', helpText: 'When checked checkboxes appear on cards and adds selected cards recordId to collection' },
        objectAPIName: { value: null, valueDataType: null, isCollection: false, label: 'Object Name' },
        label: { value: null, valueDataType: null, isCollection: false, label: 'Component Label' },
        transitionOnClick: { value: null, valueDataType: null, isCollection: false, label: 'Transition to next when card clicked?' },
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


    handleFlowComboboxValueChange(event) {
        if (event.target && event.detail) {
            let changedAttribute = event.target.name;
            let newType = event.detail.newValueDataType;
            let newValue = event.detail.newValue;
            this.dispatchFlowValueChangeEvent(changedAttribute, newValue, newType);
        }
    }

    handleValueChange(event) {
        if (event.detail && event.currentTarget.name) {
            let dataType = DATA_TYPE.STRING;
            if (event.currentTarget.type == 'checkbox') dataType = DATA_TYPE.BOOLEAN;
            if (event.currentTarget.type == 'number') dataType = DATA_TYPE.NUMBER;

            let newValue = event.currentTarget.type === 'checkbox' ? event.currentTarget.checked : event.detail.value;
            this.dispatchFlowValueChangeEvent(event.currentTarget.name, newValue, dataType);
        }
    }

    handleTransitionChange(event) {
            this.dispatchFlowValueChangeEvent('transitionOnClick', event.detail);            
        }
    
    handleMultiselectChange(event) {
            this.dispatchFlowValueChangeEvent('allowMultiSelect', event.detail);            
        }

    handleClickableChange(event) {
            this.dispatchFlowValueChangeEvent('isClickable', event.detail);            
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