import { LightningElement, api, track } from "lwc";
import { FlowAttributeChangeEvent } from "lightning/flowSupport";

// Used for search and replace temp highlight
// mapping of highlight style to left tag (lt) and right tag (rt)
const hlStyles = {
  bright: {lt: `<span style="background-color:#ffd500">`, rt: '</span>'},
  mid: {lt: `<span style="background-color:#fff2b2">`, rt: '</span>'},
  none: {lt: '', rt: ''}
};

// timing for animation of highlights
const hlTimers = [
  {style: 'mid', ms: 0},
  {style: 'bright', ms: 75}, // main highlight - bright
  {style: 'mid', ms: 525}, // start fading out for 75ms
  {style: 'none', ms: 600, finalItem: true} // reset to text without highlight html
];

// Convert CB values to a boolean
function cbToBool(value) {
  return value === "CB_TRUE";
}

export default class TextAreaPlus extends LightningElement {
  // Component facing props
  @track _charsLeftTemplate = '$L/$M Characters'; // Must match CPE.js default setting
  @track autoReplaceEnabled = false;
  @track disallowedSymbolsRegex;
  @track disallowedWordsRegex;
  @track errorMessage;
  @track isValidCheck = true;
  @track maxLength;
  @track replaceValue = "";
  @track runningBlockedInput = [];
  @track searchButton = false;
  @track searchTerm = "";
  @track textValue;
  @track ignoreCase = true;
  @track animating = false;
  @track undoStack = [];
  @track escapedVals = {searchTerm: '', replaceValue: ''};
  
  hlText;
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

  // If either search or autoreplace is enabled, allow case insensitive
  get showCaseInsensitive() {
    return this.searchButton || this.autoReplaceEnabled;
  }

  // This is not a Daft Punk song
  get dirty() {
    return this.undoStack.length > 0;
  }

  // Show help text appropriately based on whether Suggested Terms is enabled
  get caseInsensitiveHelpText() {
    let text = '';
    if (this.showCaseInsensitive) {
      text += `Ignore Case for Search and Replace`;
    } 
    if (this.autoReplaceEnabled) {
      text += ' and Suggested Terms';
    }
    return text;
  }

  get ignoreCaseVariant() {
    return this.ignoreCase ? "brand" : "neutral";
  }

  // based on whether ignore case is selected, use the modifier
  get regexMod() {
    return this.ignoreCase ? "gi" : "g";
  }

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
    return this.textMode === "plain";
  }

  get showCounter() {
    return this.maxLength && this.maxLength > 0;
  }

  @api
  get advancedTools() {
    return cbToBool(this.cb_advancedTools);
  }
  @api cb_advancedTools;

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
  get showCharCounter() {
    return cbToBool(this.cb_showCharCounter);
  }
  @api cb_showCharCounter;

  @api 
  get maxlen() {
    return this.maxLength;
  }
  set maxlen(value) {
    if (!Number.isNaN(value)) {
      this.maxLength = Number(value);
    };
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

    if (!this.advancedTools || this.warnOnly) {
      return { isValid: true };
    } 

    if (this.advancedTools) {
      this.value = this.textValue;
    }

    let errorMessage = 'This field is required';
    if (this.required === true && (!this.value || this.value.Trim().length === 0)) {
      this.isValidCheck = false;
    }

    if (this.showCharCounter && this.characterCount < 0) {
      //failure scenario so set tempValue in sessionStorage
      sessionStorage.setItem("tempValue", this.value);
      errorMessage
      return {
        isValid: false,
        errorMessage: "Cannot Advance - Character Limit Exceeded."
      };
    } 
    
    if (!this.isValidCheck) {
      //failure scenario so set tempValue in sessionStorage
      sessionStorage.setItem("tempValue", this.value);
      return {
        isValid: false,
        errorMessage:
          `Cannot Advance - Invalid Symbols/Words Remain in Rich Text:
          ${this.runningBlockedInput.join(', ')}`
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

  // Helper for removing html tags for accurate rich text count
  stripHtml(str) {
    if (this.plainText) {
      return str;
    } else {
      return str?.replace( /(<([^>]+)>)/g, '');
    }
  }


  connectedCallback() {
    //use sessionStorage to fetch and restore latest value before validation failure.
    if (sessionStorage) {
      if (sessionStorage.getItem("tempValue")) {
        this.value = sessionStorage.getItem("tempValue");
        sessionStorage.removeItem("tempValue"); //clear value after selection
      }
    }

    if (this.advancedTools) {
      this.textValue = this.value || "";
      // Build regex for disallowed symbols and words (if listed)
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
      this[`disallowed${type}Regex`] = new RegExp(pipedList, this.regexMod);
    }
  }

  // Dynamically calculate the length of text
  get len() {
    // for plain text, just return the length
    // for rich text, strip the HTML
    return this.stripHtml(this.textValue)?.length || 0;
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

  handleIgnoreCaseToggle() {
    this.ignoreCase = !this.ignoreCase;
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

  //Handle updates to Rich Text field
  handleTextChange(event) {
    // Rich Text with out enhanced tools
    if (!this.advancedTools) {
      this.textValue = event.target.value;      
      return;
    }
    
    this.runningBlockedInput = [];
    this.textValue = event.target.value;

    // base case, there are no disallowed symbols or words
    if (!this.disallowedSymbolsRegex && !this.disallowedWordsRegex) {
      this.isValidCheck = true;      
      return;
    }
    
    const text = this.stripHtml(event.target.value);
    if (this.checkBlockedItems(text)) {
      this.isValidCheck = false;
    }

    // TODO: why are these the same
    if (this.runningBlockedInput.length > 0) {
      this.errorMessage = "Error - Invalid Symbols/Words found: " +
        this.runningBlockedInput.join(', ');
    } else {
      this.errorMessage = null;
    }
  }

  handleRichTextKeyDown(event) {
    // Allow backspace (keyCode 8) and delete (keyCode 46)
    if (this.showCounter && this.charsLeft <= 0 
      && event.keyCode !== 8 && event.keyCode !== 46) {
      event.preventDefault();
    }
  }

  checkBlockedItems(text) {
    // Create a list of disallowed words/symbols that actually contain elements
    const naughtyLists = [this.disallowedWordsRegex, this.disallowedSymbolsRegex]
      .filter(x => !!x);
    
    // Update runningBlockedInput
    for (const rx of naughtyLists) {
      const matches = text.match(rx);
      if (matches?.length > 0) {
        this.addBlockedItems(matches);
        this.isValidCheck = false;
      }
    }
  }

  // Create a unique list of items, add any that aren't already in the blocked list
  addBlockedItems(items) {
    items = items.map(w => w.toLowerCase());
    this.runningBlockedInput = Array.from(new Set([...this.runningBlockedInput,...items]));
  }

  //Handle initiation of Search and Replace
  handleOpenSearch(event) {
    this.searchButton = !this.searchButton;
  }

  //Search and Replace Search for Value
  handleSearchReplaceChange(event) {
    //TODO: Fix infinite loop, block invalid chars @ keypress
    const filteredValue = event.target.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const targetValue = event.target.dataset.id === 'search' ? 'searchTerm' : 'replaceValue';
    this.escapedVals[targetValue] = filteredValue; 
  }

  // Helper function to build text for search replace with
  // different highlight styles and store it on the highlight map object
  setReplaceText(hl, prop, text, term, value) {    
    // Creates highlight HTML (e.g. bright, mid) with the left and right tags (lt/rt)    
    this.hlText[prop] = text.replaceAll(term,`${hl.lt}${value}${hl.rt}`);    
  }

  //Execute Search and REplace
  searchReplace() {
    if (this.escapedVals.searchTerm === '') {
      // This will replace between every character!  So let's just not do anything here.
      return;
    }
    // prep for undo
    this.undoStack.push(this.textValue);
    const term = new RegExp(this.escapedVals.searchTerm, this.regexMod);
    const value = this.escapedVals.replaceValue;

    // Store the text in three forms: 
    // no highlight (none), bright highlight (bright), and mid-level highlight (mid)
    this.hlText = {};
    for (const prop in hlStyles) {
      this.setReplaceText(hlStyles[prop], prop, this.textValue, term, value);
    }

    // Flash highlight
    this.animateHighlight();    
  }

  // pseudo animated flash highlight of replacement text
  // Use array of animation timing to flash, then remove highlight
  animateHighlight() {
    this.animating = true;
    for (const timer of hlTimers) {
      this.setHighlightTimer(timer);
    }
  }

  // Sets a future highlight change
  setHighlightTimer({style, ms, finalItem}) {
    setTimeout(() => {
      this.textValue = this.hlText[style];
      if (finalItem) {
        // re-enable any buttons related to animating
        this.animating = false;
      }
    }, ms);
  }
  
  //Execute Auto-Replacement based on map.
  applySuggested(event) {
    this.undoStack.push(this.textValue);
    // Reset all text values in the highlight map
    // so highlights will work correctly
    this.hlText = {};
    for (const term in this.replaceMap) {
      for (const prop in hlStyles) {
        const rex = new RegExp(term, this.regexMod);
        const text = this.hlText[prop] || this.textValue;
        const value = this.replaceMap[term];
        this.setReplaceText(hlStyles[prop], prop, text, rex, value);
      }      
    }

    // Animate highlights
    this.animateHighlight();    
  }

  //Undo last change
  handleRevert() {
    this.textValue = this.undoStack.pop();    
  }

  //Clean input for RegExp
  escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");    
  }
}
