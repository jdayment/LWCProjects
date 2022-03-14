import { LightningElement, api, track } from "lwc";
import { FlowAttributeChangeEvent } from "lightning/flowSupport";

// Used for search and replace temp highlight
const LTOKEN = '[-LEFT-]';
const RTOKEN = '[-RIGHT-]';
const leftHighlight = '<span style="background-color:#ffd500">';
const leftMidHighlight = '<span style="background-color:#fff2b2">';
const rightHighlight = '</span>';

function stripHtml(str, isPlainText) {
  if (isPlainText) {
    return str;
  } else {
    return str.replace( /(<([^>]+)>)/ig, '');
  }
}

// Convert CB values to a boolean
function cbToBool(value) {
  return value === "CB_TRUE";
}
export default class TextAreaPlus extends LightningElement {
  // Component facing props
  @track autoReplaceEnabled = false;
  @track dirty = false;
  @track disallowedSymbols;
  @track disallowedSymbolsArray = [];
  @track disallowedWords;
  @track disallowedWordsArray = [];
  @track errorMessage;
  @track interimValue = "";
  @track isValidCheck = true;
  @track maxLength;
  @track oldRichText;
  @track replaceValue = "";
  @track runningBlockedInput = [];
  @track searchButton = false;
  @track searchTerm = "";
  @track symbolsNotAllowed;
  @track textValue;
  @track wordsNotAllowed;
  @track _charsLeftTemplate;
  replaceMap = {};
  regTerm = "";
  applyTerm = "";
  instructions =
    "1)  Find and Replace:  Use Magnifying Glass, Enter Terms and Use Check Mark.  " +
    "2)  Auto Replace:  If your Admin has configured it, Use Merge Icon to replace suggested terms.";

  // Flow inputs
  @api autoReplaceMap;
  @api disallowedSymbolsList;
  @api disallowedWordsList;
  @api label;
  @api placeHolder;
  @api textMode;
  @api counterTextTemplate;

  get counterText() {
    // base case - template is blank
    if (!this._charsLeftTemplate) {
      return '';
    }
    return this._charsLeftTemplate
      .replace('$R', this.charsLeft)
      .replace('$L', this.maxLength)
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

  @api set maxlen(value) {
    this.maxLength = value;
  }
  get maxlen() {
    return this.maxLength;
  }

  @api
  get maxlenString() {
    return this.maxlen;
  }
  set maxlenString(value) {
    if (!Number.isNaN(value)) this.maxlen = value;
  }

  @api set value(val) {
    this.textValue = val;
  }
  get value() {
    return this.textValue;
  }

  @api set charsLeftTemplate(value) {
    if (value && value.trim().length > 0) {
      this._charsLeftTemplate = value;
    }
  }
  get charsLeftTemplate() {
    return this._charsLeftTemplate;
  }

  @api validate() {
    console.log(this.maxLength);
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
          this.runningBlockedInput.toString(),
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
      this.value != undefined
        ? (this.textValue = this.value)
        : (this.textValue = "");
      // this.characterCount = this.textValue.length;
      if (this.disallowedSymbolsList != undefined) {
        this.disallowedSymbolsArray = this.disallowedSymbolsList
          .replace(/\s/g, "")
          .split(",");
        for (let i = 0; i < this.disallowedSymbolsArray.length; i++) {
          if (i == 0) {
            if (this.disallowedSymbolsArray.length != 1) {
              this.disallowedSymbols =
                "[" + this.disallowedSymbolsArray[i] + "|";
            } else {
              this.disallowedSymbols =
                "[" + this.disallowedSymbolsArray[i] + "]";
            }
          } else if (i == this.disallowedSymbolsArray.length - 1) {
            this.disallowedSymbols = this.disallowedSymbols.concat(
              this.disallowedSymbolsArray[i] + "]"
            );
          } else {
            this.disallowedSymbols = this.disallowedSymbols.concat(
              this.disallowedSymbolsArray[i] + "|"
            );
          }
        }
      }

      if (this.disallowedWordsList != undefined) {
        this.disallowedWordsArray = this.disallowedWordsList
          .replace(/\s/g, "")
          .split(",");
        for (let i = 0; i < this.disallowedWordsArray.length; i++) {
          if (i == 0) {
            if (this.disallowedWordsArray.length != 1) {
              this.disallowedWords = "(" + this.disallowedWordsArray[i] + "|";
            } else {
              this.disallowedWords = "(" + this.disallowedWordsArray[i] + ")\b";
            }
          } else if (i == this.disallowedWordsArray.length - 1) {
            this.disallowedWords = this.disallowedWords.concat(
              this.disallowedWordsArray[i] + ")\\b"
            );
          } else {
            this.disallowedWords = this.disallowedWords.concat(
              this.disallowedWordsArray[i] + "|"
            );
          }
        }
      }
      if (this.disallowedSymbols != undefined)
        this.symbolsNotAllowed = new RegExp(this.disallowedSymbols, "g");
      if (this.disallowedWords != undefined)
        this.wordsNotAllowed = new RegExp(this.disallowedWords, "g");
      if (this.autoReplaceMap != undefined) {
        this.replaceMap = JSON.parse(this.autoReplaceMap);
        this.autoReplaceEnabled = true;
      }
    }
  }

  // Dynamic properties
  get charsLeft() {
    // for plain text, just return the length
    // for rich text, strip the HTML
    const tlen = stripHtml(this.textValue, this.plainText).length;
    return (      
      this.maxLength - (tlen >= 0 ? tlen : 0)
    );
  }

  get charsLeftClass() {
    const padding = this.plainText ?
      'slds-var-p-top_xxx-small slds-var-p-left_x-small' :
      'slds-var-p-left_x-small slds-var-p-right_xxx-small slds-var-p-top_x-small slds-var-p-bottom_xxx-small';
    return `${padding} ${
      this.charsLeft > 0 ? "default" : "warning"
    }`;
  }

  // Event handler
  handleChange({ detail }) {
    this.textValue = detail.value;
    // required for Flow
    const attributeChangeEvent = new FlowAttributeChangeEvent(
      "value",
      this.textValue
    );
    this.dispatchEvent(attributeChangeEvent);
  }

  get plainText() {
    return this.textMode && this.textMode === "plain";
  }

  get showCounter() {
    return this.maxlen && this.maxlen > 0;
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

  //Handle updates to Rich Text field with enhanced features
  handleTextChange(event) {    
    this.runningBlockedInput = [];
    this.isValidCheck = true;
    if (
      this.symbolsNotAllowed != undefined ||
      this.wordsNotAllowed != undefined
    ) {
      this.interimValue = event.target.value.toLowerCase();
      this.interimValue = stripHtml(this.interimValue);
      //Symbol check section
      if (this.symbolsNotAllowed != undefined) {
        let matchesSymbol = this.interimValue.match(this.symbolsNotAllowed);
        if (matchesSymbol != null && matchesSymbol.length > 0) {
          for (let i = 0; i < matchesSymbol.length; i++) {
            this.runningBlockedInput.push(matchesSymbol[i]);
          }
          this.isValidCheck = false;
        } else {
          this.textValue = event.target.value;
        }
      }

      if (this.wordsNotAllowed != undefined) {
        let matchesWords = this.interimValue.match(this.wordsNotAllowed);
        if (matchesWords != null && matchesWords.length > 0) {
          for (let i = 0; i < matchesWords.length; i++) {
            this.runningBlockedInput.push(matchesWords[i]);
          }
          this.isValidCheck = false;
        } else {
          this.textValue = event.target.value;
        }
      }
    } else {
      this.isValidCheck = true;
      this.textValue = event.target.value;
    }
    // Can't happen if it's prevented
    // if (this.characterCap && this.characterCount > this.maxLength) {
    //   this.isValidCheck = false;
    // }
    //Display different message if warn only - validation also won't be enforced on Next.
    // if (this.characterCap && this.characterCount > this.maxLength) {
    //   this.errorMessage = "Error - Character Limit Exceeded";
    // } else 

    // TODO: why are these the same
    if (!this.warnOnly) {
      this.errorMessage =
        "Error - Invalid Symbols/Words found: " +
        this.runningBlockedInput.toString();
    } else {
      this.errorMessage =
        "Warning - Invalid Symbols/Words found: " +
        this.runningBlockedInput.toString();
    }
  }

  //Handle initiation of Search and Replace
  handleOpenSearch(event) {
    this.searchButton = !this.searchButton;
  }

  //Search and Replace Search for Value
  handleSearchChange(event) {
    this.searchTerm = event.target.value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  //Search and Replace Replace with Value
  handleReplaceChange(event) {
    this.replaceValue = event.target.value.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );
  }

  //Execute Search and REplace
  searchReplace() {    
    this.oldRichText = this.textValue;
    this.dirty = true;
    let draftValue = this.textValue;
    this.searchTerm = this.escapeRegExp(this.searchTerm);
    this.replaceValue = this.escapeRegExp(this.replaceValue);
    draftValue = this.replaceAll(
      draftValue,
      this.searchTerm,
      LTOKEN + this.replaceValue + RTOKEN
    );
    // temp highlight - replace the left and right token with highlight HTML
    const highlightValue = draftValue
      .replaceAll(LTOKEN, leftHighlight)
      .replaceAll(RTOKEN, rightHighlight);

    // lighter value - so it doesn't flash out and since we can't use CSS webkit animation
    const midValue = draftValue
      .replaceAll(LTOKEN, leftMidHighlight)
      .replaceAll(RTOKEN, rightHighlight);

    // final text value - completely remove the highlights
    const finalValue = draftValue
      .replaceAll(LTOKEN, '')
      .replaceAll(RTOKEN, '');

    // pseudo animated flash highlight of replacement text
    this.textValue = midValue;
    setTimeout(() => {
      this.textValue = highlightValue;
    }, 75);
    setTimeout(() => {
      this.textValue = midValue;
    }, 525);
    setTimeout(() => {
      this.textValue = finalValue;
    }, 600);
  }

  //Execute Auto-Replacement based on map.
  applySuggested(event) {
    this.oldRichText = this.textValue;
    this.dirty = true;
    let draftValue = this.textValue;
    for (var key in this.replaceMap) {
      this.applyTerm = this.replaceMap[key];
      this.regTerm = key;
      draftValue = this.replaceAll(draftValue, this.regTerm, this.applyTerm);
    }
    this.textValue = draftValue;
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
