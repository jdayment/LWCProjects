
import { LightningElement, api } from 'lwc';

export default class LightningExampleSliderBasic extends LightningElement {
    @api value;
    @api max;
    @api min;
    @api label;
}
