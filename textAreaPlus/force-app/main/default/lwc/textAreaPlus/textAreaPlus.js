import { LightningElement, api, track } from "lwc";
import { FlowAttributeChangeEvent } from "lightning/flowSupport";

// Used for search and replace temp highlight
// mapping of highlight style to left tag (lt) and right tag (rt)
const hlMap = {
  bright: {lt: `<span style="background-color:#ffd500">`, rt: '</span>'},
  mid: {lt: `<span style="background-color:#fff2b2">`, rt: '</span>'},
  none: {lt: '', rt: ''}
};

// timing for animation of highlights
const hlTimers = [
  {hl: hlMap.mid, ms: 0},
  {hl: hlMap.bright, ms: 75}, // main highlight - bright
  {hl: hlMap.mid, ms: 525}, // start fading out for 75ms
  {hl: hlMap.none, ms: 600} // reset to text without highlight html
];

// Reset all highlight map text values
function resetHighlightMap() {
  for (const prop in hlMap) {
    hlMap[prop].text = null;
  }
}

// Helper for removing html tags for accurate rich text count
function stripHtml(str, isPlainText) {
  if (isPlainText) {
    return str;
  } else {
    return str.replace( /(<([^>]+)>)/g, '');
  }
}

// Convert CB values to a boolean
function cbToBool(value) {
  return value === "CB_TRUE";
}
export default class TextAreaPlus extends LightningElement {
  // Component facing props
  @track _charsLeftTemplate;
  @track autoReplaceEnabled = false;
  @track dirty = false;
  @track disallowedSymbolsRegex;
  @track disallowedWordsRegex;
  @track errorMessage;
  @track isValidCheck = true;
  @track lastChange;
  @track maxLength;
  @track oldRichText;
  @track replaceValue = "";
  @track runningBlockedInput = [];
  @track searchButton = false;
  @track searchTerm = "";
  @track textValue;
  applyTerm = "";
  regTerm = "";
  replaceMap = {};
  instructions =
    "1)  Find and Replace:  Use Magnifying Glass, Enter Terms and Use Check Mark.  " +
    "2)  Auto Replace:  If your Admin has configured it, Use Merge Icon to replace suggested terms.";

  // Flow inputs
  @api autoReplaceMap;
  @api counterTextTemplate;
  @api disallowedSymbolsList;
  @api disallowedWordsList;
  @api label;
  @api placeHolder;
  @api textMode;

  get counterText() {
    // base case - template is blank
    if (!this._charsLeftTemplate) {
      return '';
    }
    return this._charsLeftTemplate
      .replace('$R', this.charsLeft)
      .replace('$M', this.maxLength)
      .replace('$L', this.len)
  }

  get plainText() {
    return this.textMode && this.textMode === "plain";
  }

  get showCounter() {
    return this.maxlen && this.maxlen > 0;
  }

  @api
  get disableAdvancedTools() {
    return cbToBool(this.cb_disableAdvancedTools);
  }
  @api cb_disableAdvancedTools;

  @api
  get warnOnly() {
    return cbToBool(this.cb_warnOnly);
  }
  @api cb_warnOnly;

  @api
  get required() {
    return cbToBool(this.cb_required);
  }
  @api cb_required;

  @api 
  get maxlen() {
    return this.maxLength;
  }
  set maxlen(value) {
    this.maxLength = value;
  }
  
  @api
  get maxlenString() {
    return this.maxlen;
  }
  set maxlenString(value) {
    if (!Number.isNaN(value)) this.maxlen = value;
  }

  @api 
  get value() {
    return this.textValue;
  }
  set value(val) {
    this.textValue = val;
  }
  
  @api
  get charsLeftTemplate() {
    return this._charsLeftTemplate;
  }
  set charsLeftTemplate(value) {
    if (value && value.trim().length > 0) {
      this._charsLeftTemplate = value;
    }
  }
  
  @api validate() {
    if (Number(this.maxLength) >= 0) {
      return { isValid: true };
    }

    if (!this.disableAdvancedTools) {
      this.value = this.textValue;
    }

    let errorMessage =
      "You must make a selection in: " + this.label + " to continue";
    if (this.required === true && !this.value) {
      return {
        isValid: false,
        errorMessage: errorMessage,
      };
    }

    if (this.disableAdvancedTools || this.warnOnly) {
      return { isValid: true };
    } 

    //TODO: Handle over char limit in rich text
    // else if (this.characterCap && this.characterCount > this.maxLength) {
    //   //failure scenario so set tempValue in sessionStorage
    //   sessionStorage.setItem("tempValue", this.value);
    //   return {
    //     isValid: false,
    //     errorMessage:
    //       "Cannot Advance - Character Limit Exceeded: " +
    //       this.characterCount +
    //       " > " +
    //       this.maxLength,
    //   };
    // } 
    else if (!this.isValidCheck) {
      //failure scenario so set tempValue in sessionStorage
      sessionStorage.setItem("tempValue", this.value);
      return {
        isValid: false,
        errorMessage:
          "Cannot Advance - Invalid Symbols/Words Remain in Rich Text: " +
          this.runningBlockedInput.join(', '),
      };
    } else {
      return { isValid: false };
    }
  }

  formats = [
    "font",
    "size",
    "bold",
    "italic",
    "underline",
    "strike",
    "list",
    "indent",
    "align",
    "link",
    "image",
    "clean",
    "table",
    "header",
    "color",
    "background",
    "code",
    "code-block",
    "script",
    "blockquote",
    "direction",
  ];

  connectedCallback() {
    //use sessionStorage to fetch and restore latest value before validation failure.
    if (sessionStorage) {
      if (sessionStorage.getItem("tempValue")) {
        this.value = sessionStorage.getItem("tempValue");
        sessionStorage.removeItem("tempValue"); //clear value after selection
      }
    }

    if (!this.disableAdvancedTools) {
      console.log("disableAdvancedTools is false, in connected callback");
      this.textValue = this.value || "";
      this.setRegex('Symbols', s=>`\\${s}`);
      this.setRegex('Words', w=>`\\b${w}\\b`);
      
      if (this.autoReplaceMap != undefined) {
        this.replaceMap = JSON.parse(this.autoReplaceMap);
        this.autoReplaceEnabled = true;
      }
    }
  }

  // Helper to convert comma delimited list of words or symbols to pipe delimited regular expression
  setRegex(type, fn) {
    const list = this[`disallowed${type}List`];
    if (list?.length > 0) {
      const pipedList = list
        .replace(/\s/g, "")
        .split(",")
        .map(fn)
        .join('|');        
      this[`disallowed${type}Regex`] = new RegExp(pipedList, "gi");
    }
  }

  // Dynamically calculate the length of text
  get len() {
    // for plain text, just return the length
    // for rich text, strip the HTML
    return stripHtml(this.textValue, this.plainText).length;
  }

  // Dynamically calculate remaining characters
  get charsLeft() {
    const tlen = this.len;
    return (      
      this.maxLength - (tlen >= 0 ? tlen : 0)
    );
  }

  // Set the class based on rich text vs plain text, and number of chars left
  get charsLeftClass() {
    const padding = this.plainText ?
      'slds-var-p-top_xxx-small slds-var-p-left_x-small' :
      'slds-var-p-left_x-small slds-var-p-right_xxx-small slds-var-p-top_x-small slds-var-p-bottom_xxx-small';
    return `${padding} ${
      this.charsLeft > 0 ? "default" : "warning"
    }`;
  }

  // Event handler for plain text change
  handleChange({ detail }) {
    this.textValue = detail.value;
    // required for Flow
    const attributeChangeEvent = new FlowAttributeChangeEvent(
      "value",
      this.textValue
    );
    this.dispatchEvent(attributeChangeEvent);
  }

  //Handle updates to Rich Text field with no enhanced features
  handleValueChange(event) {
    this.value = event.target.value;
  }

  handleRichTextKeyDown(event) {
    // Allow backspace (keyCode 8) and delete (keyCode 46)
    if (this.showCounter && this.charsLeft <= 0 
      && event.keyCode !== 8 && event.keyCode !== 46) {
      event.preventDefault();
    }
  }

  checkBlockedItems(text, naughtyList) {
    if (naughtyList) {
      let matches = text.match(naughtyList);
      if (matches?.length > 0) {
        this.addBlockedItems(matches);
        this.isValidCheck = false;
      }
    }
  }

  addBlockedItems(items) {
    for (const item of items) {
      if (!this.runningBlockedInput.includes(item)) {
        this.runningBlockedInput.push(item);
      }
    }
  }
  //Handle updates to Rich Text field with enhanced features
  handleTextChange(event) {    
    this.runningBlockedInput = [];
    this.textValue = event.target.value;

    // base case, there are no disallowed symbols or words
    if (!this.disallowedSymbolsRegex && !this.disallowedWordsRegex) {
      this.isValidCheck = true;      
      return;
    }
    
    const text = stripHtml(event.target.value);
    if (this.checkBlockedItems(text, this.disallowedSymbolsRegex)) {
      this.isValidCheck = false;
    }
    if (this.checkBlockedItems(text, this.disallowedWordsRegex)) {
      this.isValidCheck = false;
    }

    // TODO: why are these the same
    if (this.runningBlockedInput.length > 0) {
      this.errorMessage = "Error - Invalid Symbols/Words found: " +
        this.runningBlockedInput.join(', ');
    } else {
      this.errorMessage = '';
    }
  }

  //Handle initiation of Search and Replace
  handleOpenSearch(event) {
    this.searchButton = !this.searchButton;
  }

  //Search and Replace Search for Value
  handleSearchChange(event) {
    //TODO: Fix infinite loop, block invalid chars @ keypress
    this.searchTerm = event.target.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  //Search and Replace Replace with Value
  handleReplaceChange(event) {
    //TODO: Fix infinite loop, block invalid chars @ keypress
    this.replaceValue = event.target.value.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );
  }

  // Helper function to build text for search replace with
  // different highlight styles and store it on the highlight map object
  setReplaceText(hl, text, term, value) {    
    // Creates highlight HTML (e.g. bright, mid) with the left and right tags (lt/rt)    
    //const hl = highlightMap[style];
    hl.text = text.replaceAll(term,`${hl.lt}${value}${hl.rt}`);    
  }

  // Sets a future highlight change
  setHighlightTimer({hl, ms}) {
    setTimeout(() => {
      this.textValue = hl.text;
    }, ms);
  }

  //Execute Search and REplace
  searchReplace() {
    this.lastChange = 'Undo Find and Replace';
    // prep for undo
    this.oldRichText = this.textValue;
    this.dirty = true;
    const term = this.escapeRegExp(this.searchTerm);
    const value = this.escapeRegExp(this.replaceValue);    

    // Store the text in three forms: 
    // no highlight (none), bright highlight (bright), and mid-level highlight (mid)
    for (const prop in hlMap) {
      this.setReplaceText(hlMap[prop], this.textValue, term, value);
    }

    // Flash highlight
    this.animateHighlight();    
  }

  // pseudo animated flash highlight of replacement text
  // Use array of animation timing to flash, then remove highlight
  animateHighlight() {    
    for (const timer of hlTimers) {
      this.setHighlightTimer(timer);
    }    
  }

  //Execute Auto-Replacement based on map.
  applySuggested(event) {
    this.lastChange = 'Undo Apply Suggestions';
    this.oldRichText = this.textValue;
    this.dirty = true;
    
    // Reset all text values in the highlight map
    // so highlights will work correctly
    resetHighlightMap();
    for (const term in this.replaceMap) {
      for (const prop in hlMap) {
        const rex = new RegExp(term,"gi");
        const text = hlMap[prop].text || this.textValue;
        const value = this.replaceMap[term];
        this.setReplaceText(hlMap[prop], text, rex, value);
      }      
    }

    // Animate highlights
    this.animateHighlight();    
  }

  //Replace All function helper
  replaceAll(str, term, replacement) {
    return str.replace(new RegExp(term, "ig"), replacement);
  }

  //Undo last change
  handleRevert() {
    this.textValue = this.oldRichText;
    this.dirty = false;
  }

  //Clean input for RegExp
  escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
}
