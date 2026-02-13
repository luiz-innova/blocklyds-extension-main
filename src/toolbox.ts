import * as Blockly from 'blockly/core';
import { pythonGenerator } from 'blockly/python';

pythonGenerator.finish = (code: string): string => {
  const importsSet = new Set<string>();
  const functions: string[] = [];

  Object.keys(pythonGenerator.definitions_).forEach((key) => {
    const def = pythonGenerator.definitions_[key];
    if (def.startsWith("from ") || def.startsWith("import ")) {
      importsSet.add(def);
    } else if (def.startsWith("def ") || def.startsWith("# ")) {
      functions.push(def);
    }
  });

  const imports = Array.from(importsSet).sort();
  pythonGenerator.definitions_ = {};
  pythonGenerator.functionNames_ = {};
  pythonGenerator.nameDB_.reset();

  return `${imports.join("\n")}\n\n${functions.join("\n")}\n\n${code}`;
};


/**
 * Encode the current Blockly workspace as an XML string
 */
export function encodeWorkspace(): string {
  const xml: Element = Blockly.Xml.workspaceToDom(Blockly.getMainWorkspace());
  return Blockly.Xml.domToText(xml);
}

/**
 * Decode an XML string and load the represented blocks into the Blockly workspace
 */
export function decodeWorkspace(xmlText: string): void {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
  const xmlElement = xmlDoc.documentElement;
  Blockly.Xml.domToWorkspace(xmlElement, Blockly.getMainWorkspace() as Blockly.WorkspaceSvg);
};

/**
 * Block for reading a CSV file from a specified URL or file path.
 * Generates code that uses pandas to load the data into a DataFrame.
 * @this Blockly.Block
 */
Blockly.Blocks['read_csv'] = {
  init: function () {
    this.appendValueInput("read")
      .appendField("(Read) ")
      .appendField("DataFrame: ")
    this.setOutput(false);
    this.setColour('#596570');
    this.setTooltip("DataFrame Read");
    this.setTooltip("Reads a CSV file from a given URL or file path and loads it into a DataFrame.");
    this.setOutput(true);
  }
};
pythonGenerator['read_csv'] = function (block: Blockly.Block): [string, number] {
  const dataFrame: string = pythonGenerator.valueToCode(block, 'read', pythonGenerator.ORDER_MEMBER) || '';
  const code: string = 'pd.read_csv(' + dataFrame + ')';
  pythonGenerator.definitions_['import_pandas'] = 'import pandas as pd';
  return [code, pythonGenerator.ORDER_FUNCTION_CALL];
};

/**
 * Block for creating a 'select' operation on a DataFrame,
 * allowing users to specify columns they wish to select.
 * This block includes dynamic input fields that users can expand
 * through the mutator icon to select multiple columns from the DataFrame.
 * @this Blockly.Block
*/
Blockly.Blocks['select'] = {
  init: function () {
    this.updateShape_();
    const mutator = new Blockly.icons.MutatorIcon(['lists_create_with_item'], this);
    this.setMutator(mutator);
    this.itemCount_ = 1;

    this.appendValueInput("select")
      .appendField("(Select) ")
      .appendField("DataFrame: ")

    this.setOutput(true);
    this.setColour('#596570');
    this.setTooltip("Select specific columns from a DataFrame");
    this.setHelpUrl("");
  },
  /**
   * Create XML to represent list inputs.
    @return {!Element} XML storage element.
   * @this Blockly.Block
   */
  mutationToDom: function () {
    var container = document.createElement('mutation');
    container.setAttribute('items', this.itemCount_);
    return container;
  },
  /**
   * Parse XML to restore the list inputs.
   * @param {!Element} xmlElement XML storage element.
   * @this Blockly.Block
   */
  domToMutation: function (xmlElement: any) {
    this.itemCount_ = parseInt(xmlElement.getAttribute('items'), 10);
    this.updateShape_();
  },
  /**
   * Populate the mutator's dialog with this block's components.
   * @param {!Blockly.Workspace} workspace Mutator's workspace.
   * @return {!Blockly.Block} Root block in mutator.
   * @this Blockly.Block
   */
  decompose: function (workspace: any) {
    var containerBlock = workspace.newBlock('lists_create_with_container');
    containerBlock.initSvg();
    var connection = containerBlock.getInput('STACK').connection;
    for (var i = 0; i < this.itemCount_; i++) {
      var itemBlock = workspace.newBlock('lists_create_with_item');
      itemBlock.initSvg();
      connection.connect(itemBlock.previousConnection);
      connection = itemBlock.nextConnection;
    }
    return containerBlock;
  },
  /**
   * Reconfigure this block based on the mutator dialog's components.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this Blockly.Block
   */
  compose: function (containerBlock: any) {
    var itemBlock = containerBlock.getInputTargetBlock('STACK');
    // Count number of inputs.
    var connections = [];
    while (itemBlock) {
      connections.push(itemBlock.valueConnection_);
      itemBlock = itemBlock.nextConnection &&
        itemBlock.nextConnection.targetBlock();
    }
    // Disconnect any children that don't belong.
    for (var i = 0; i < this.itemCount_; i++) {
      var connection = this.getInput('ADD' + i).connection.targetConnection;
      if (connection && connections.indexOf(connection) == -1) {
        connection.disconnect();
      }
    }
    this.itemCount_ = connections.length;
    this.updateShape_();

  },
  /**
   * Store pointers to any connected child blocks.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this Blockly.Block
   */
  saveConnections: function (containerBlock: any) {
    var itemBlock = containerBlock.getInputTargetBlock('STACK');
    var i = 0;
    while (itemBlock) {
      var input = this.getInput('ADD' + i);
      itemBlock.valueConnection_ = input && input.connection.targetConnection;
      i++;
      itemBlock = itemBlock.nextConnection &&
        itemBlock.nextConnection.targetBlock();
    }
  },
  /**
   * Modify this block to have the correct number of inputs.
   * @private
   * @this Blockly.Block
   */
  updateShape_: function () {
    if (this.itemCount_ && this.getInput('EMPTY')) {
      this.removeInput('EMPTY');
    } else if (!this.itemCount_ && !this.getInput('EMPTY')) {
      this.appendDummyInput('EMPTY')
        .appendField('(Select)')
    }
    // Add new inputs.
    for (var i = 0; i < this.itemCount_; i++) {

      if (!this.getInput('ADD' + i)) {

        var input = this.appendValueInput('ADD' + i)
        .setAlign(Blockly.inputs.Align.RIGHT)
        input.appendField('Field')
      }
    }
    // Remove deleted inputs.
    while (this.getInput('ADD' + i)) {
      this.removeInput('ADD' + i);
      i++;
    }
  }
};
pythonGenerator['select'] = function (block: any): [string, number] {
  const dataFrame: string = pythonGenerator.valueToCode(block, 'select', pythonGenerator.ORDER_MEMBER) || '';
  let fields: any = [];
  for (var i = 0; i < block.inputList.length - 1; i++) {
    let field = block.getInputTargetBlock('ADD' + i) ? block.getInputTargetBlock('ADD' + i)!.inputList[0].fieldRow[1].value_ : ''
    fields.push(field)
  }
  if (fields.length > 1) {
    fields = '[' + JSON.stringify(fields) + ']'
  } else {
    fields = JSON.stringify(fields)
  }
  const code: string = dataFrame + fields;
  return [code, pythonGenerator.ORDER_FUNCTION_CALL];
};

/**
 * Block for creating a DataFrame from a dictionary input.
 * Allows users to specify multiple key-value pairs, where each key is a column name
 * and each value is a list representing column data.
 * The mutator icon enables dynamic addition of key-value pairs, allowing users to
 * flexibly build a DataFrame structure with as many columns as needed.
 * @this Blockly.Block
*/
Blockly.Blocks['dataframe_dic'] = {
  init: function () {
    this.updateShape_();
    const mutator = new Blockly.icons.MutatorIcon(['lists_create_with_item'], this);
    this.setMutator(mutator);
    this.itemCount_ = 3;

    this.setOutput(true, "Array");
    this.setColour('#596570');
    this.setTooltip("Create a DataFrame from a dictionary of column names and values");
    this.setHelpUrl("");
  },
  /**
   * Create XML to represent list inputs.
    @return {!Element} XML storage element.
   * @this Blockly.Block
   */
  mutationToDom: function () {
    var container = document.createElement('mutation');
    container.setAttribute('items', this.itemCount_);
    return container;
  },
  /**
   * Parse XML to restore the list inputs.
   * @param {!Element} xmlElement XML storage element.
   * @this Blockly.Block
   */
  domToMutation: function (xmlElement: any) {
    this.itemCount_ = parseInt(xmlElement.getAttribute('items'), 10);
    this.updateShape_();
  },
  /**
   * Populate the mutator's dialog with this block's components.
   * @param {!Blockly.Workspace} workspace Mutator's workspace.
   * @return {!Blockly.Block} Root block in mutator.
   * @this Blockly.Block
   */
  decompose: function (workspace: Blockly.WorkspaceSvg) {
    var containerBlock = workspace.newBlock('lists_create_with_container');
    containerBlock.initSvg();
    var connection = containerBlock.getInput('STACK')?.connection;
    for (var i = 0; i < this.itemCount_; i++) {
      var itemBlock = workspace.newBlock('lists_create_with_item');
      itemBlock.initSvg();
      connection?.connect(itemBlock.previousConnection);
      connection = itemBlock.nextConnection;
    }
    return containerBlock;
  },
  /**
   * Reconfigure this block based on the mutator dialog's components.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this Blockly.Block
   */
  compose: function (containerBlock: any) {
    var itemBlock = containerBlock.getInputTargetBlock('STACK');
    // Count number of inputs.
    var connections = [];
    while (itemBlock) {
      connections.push(itemBlock.valueConnection_);
      itemBlock = itemBlock.nextConnection &&
        itemBlock.nextConnection.targetBlock();
    }
    // Disconnect any children that don't belong.
    for (var i = 0; i < this.itemCount_; i++) {
      var connection = this.getInput('ADD' + i).connection.targetConnection;
      if (connection && connections.indexOf(connection) == -1) {
        connection.disconnect();
      }
    }
    this.itemCount_ = connections.length;
    this.updateShape_();
  },
  /**
   * Store pointers to any connected child blocks.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this Blockly.Block
   */
  saveConnections: function (containerBlock: any) {
    var itemBlock = containerBlock.getInputTargetBlock('STACK');
    var i = 0;
    while (itemBlock) {
      var input = this.getInput('ADD' + i);
      itemBlock.valueConnection_ = input && input.connection.targetConnection;
      i++;
      itemBlock = itemBlock.nextConnection &&
        itemBlock.nextConnection.targetBlock();
    }
  },
  /**
   * Modify this block to have the correct number of inputs.
   * @private
   * @this Blockly.Block
   */
  updateShape_: function () {
    if (this.itemCount_ && this.getInput('EMPTY')) {
      this.removeInput('EMPTY');
    } else if (!this.itemCount_ && !this.getInput('EMPTY')) {
      this.appendDummyInput('EMPTY')
        .appendField('(dataFrame dictionary)')
    }
    // Add new inputs.
    for (var i = 0; i < this.itemCount_; i++) {
      var deafultText = '';
      if (!this.getInput('ADD' + i)) {

        var input = this.appendValueInput('ADD' + i)
        if (i == 0) {
          input.appendField('(dataFrame dictionary)  ')
        }
        if (i > 0) {
          input.setAlign(Blockly.inputs.Align.RIGHT)
          input.appendField('')
        }
        input.appendField(new Blockly.FieldTextInput(deafultText),
          'FIELDNAME' + i);
      }
    }
    // Remove deleted inputs.
    while (this.getInput('ADD' + i)) {
      this.removeInput('ADD' + i);
      i++;
    }
  }
};
pythonGenerator['dataframe_dic'] = function (block: Blockly.Block): [string, number] {
  let value_features: string[] = [];
  let index: number = 0;
  while (pythonGenerator.valueToCode(block, 'ADD' + index, pythonGenerator.ORDER_MEMBER) != '') {
    value_features.push(pythonGenerator.valueToCode(block, 'ADD' + index, pythonGenerator.ORDER_MEMBER));
    index++;
  };

  let name_features: string[] = [];
  for (var i = 0; i < this.inputList.length; i++) {
    name_features.push(this.inputList[i].fieldRow[1].value_);
  }

  let dictionary = new Map();
  if (value_features.length == name_features.length) {
    for (var i = 0; i < value_features.length; i++) {

      let vl = value_features[i]
      vl = vl.replace(/'/g, '"')
      vl = JSON.parse(vl)

      dictionary.set(name_features[i], vl)
    }
  }

  let dic: { [key: string]: any } = {};
  for (let value of dictionary) {
    dic[value[0]] = value[1]
  }

  const code: string = 'pd.DataFrame(' + JSON.stringify(dic) + ')'
  return [code, pythonGenerator.ORDER_FUNCTION_CALL];
};

/**
 * Block for selecting the head or tail of a DataFrame.
 * Users can specify whether they want the "head" (top rows) or "tail" (bottom rows)
 * of the DataFrame and can input the number of rows to display.
 * @this Blockly.Block
 */
Blockly.Blocks['headTail'] = {
  init: function () {
    this.appendValueInput('dataframe')
      .appendField('Head Tail:')
      .appendField(new Blockly.FieldDropdown([
        ['Head', 'head'],
        ['Tail', 'tail']
      ]), 'FIELDNAME');

    this.appendValueInput('n')
      .setAlign(Blockly.inputs.Align.RIGHT)
      .appendField('N:')
      .setCheck('Number');

    this.setColour('#596570');
    this.setTooltip("Displays a specified number of rows from the top or bottom of a DataFrame.");
    this.setHelpUrl("");
    this.setOutput(true);
  }
};
pythonGenerator['headTail'] = function (block: Blockly.Block): [string, number] {
  const df: string = pythonGenerator.valueToCode(block, 'dataframe', pythonGenerator.ORDER_MEMBER) || '';
  const n: string = pythonGenerator.valueToCode(block, 'n', pythonGenerator.ORDER_MEMBER) || '5';
  const operation: string = block.getFieldValue('FIELDNAME');
  const code: string = `${df}.${operation ?? 'head'}(${n})`;

  if (!df) {
    console.warn(`No DataFrame input provided in 'headTail' block. Generated code may be invalid.`);
    return ['', pythonGenerator.ORDER_FUNCTION_CALL];
  };
  return [code, pythonGenerator.ORDER_FUNCTION_CALL];
};

/**
 * Block for performing a "Group By" operation on a DataFrame.
 * This block enables users to group data in a DataFrame based on a specified column.
 * The 'dataframe' input takes a reference to the DataFrame on which the operation is applied,
 * and the 'by' input takes the column name (as a string) to group the data by.
 * The output of this block is a new grouped DataFrame that can be further aggregated or analyzed.
 * This is useful for summarizing and segmenting data by categorical values in the specified column.
 * 
 * @this {Blockly.Block}
 */
Blockly.Blocks['groupby'] = {
  init: function () {
    this.appendValueInput('dataframe')
      .appendField('(Group By)')
      .appendField('DataFrame:');

    this.appendValueInput('by')
      .setAlign(Blockly.inputs.Align.RIGHT)
      .appendField('By:')
      .setCheck('String');

    this.setColour('#596570');
    this.setTooltip("Groups a DataFrame by a specified column name, creating a grouped DataFrame.");
    this.setHelpUrl("");
    this.setOutput(true);
  }
};
pythonGenerator['groupby'] = function (block: Blockly.Block): [string, number] {
  const dataframe: string = pythonGenerator.valueToCode(block, 'dataframe', pythonGenerator.ORDER_MEMBER) || '';
  const by: string = pythonGenerator.valueToCode(block, 'by', pythonGenerator.ORDER_MEMBER) || 'None';

  if (!dataframe) {
    console.warn('No DataFrame input provided in "groupby" block. Generated code may be invalid.');
    return ['', pythonGenerator.ORDER_FUNCTION_CALL];
  };

  const code: string = dataframe + '.groupby(' + by + ')';
  return [code, pythonGenerator.ORDER_FUNCTION_CALL];
};

/**
 * Block for applying an aggregation function to a specified column in a DataFrame.
 * This block allows users to select from common aggregation functions (mean, sum, count, max, min, std, and variance)
 * which will be applied to the specified column.
 * The 'dataframe' input expects a reference to the DataFrame,
 * and the 'on' input specifies the column on which to perform the aggregation.
 * The selected aggregation function is chosen via a dropdown menu, providing flexibility in data summarization.
 * Useful for reducing grouped data into summary statistics by a particular column.
 * 
 * @this {Blockly.Block}
 */
Blockly.Blocks['aggFunc'] = {
  init: function () {
    this.appendValueInput('dataframe')
      .appendField('AggFunc:')
      .appendField(new Blockly.FieldDropdown([
        ['mean', 'mean'],
        ['sum', 'sum'],
        ['count', 'count'],
        ['max', 'max'],
        ['min', 'min'],
        ['std', 'std'],
        ['variance', 'var'],
      ]), 'FIELDNAME');

    this.appendValueInput('on')
      .setAlign(Blockly.inputs.Align.RIGHT)
      .appendField('On:');

    this.setColour('#596570');
    this.setTooltip("Applies a specified aggregation function (e.g., mean, sum) to a chosen DataFrame column.");
    this.setHelpUrl("");
    this.setOutput(true);
  }
};
pythonGenerator['aggFunc'] = function (block: Blockly.Block): [string, number] {
  const dataframe: string = pythonGenerator.valueToCode(block, 'dataframe', pythonGenerator.ORDER_MEMBER) || '';
  const columnCode: string = pythonGenerator.valueToCode(block, 'on', pythonGenerator.ORDER_MEMBER) || '';
  const aggFunction: string = block.getFieldValue('FIELDNAME');

  if (!dataframe) {
    console.warn('No DataFrame input provided in "aggFunc" block. Generated code may be invalid.');
    return ['', pythonGenerator.ORDER_NONE];
  };

  if (columnCode === 'None') {
    console.warn('No column specified for aggregation.');
  };

  const code: string = `${dataframe}[${columnCode}].${aggFunction}()`;
  return [code, pythonGenerator.ORDER_FUNCTION_CALL];
};

/**
 * Extracts field values from the block input list.
 * @this {Blockly.Block} The current block context.
 * @returns {string[]} Array of field values.
 */
function getFieldValues(this: Blockly.Block): string[] {
  return this.inputList.slice(1).map((input: any) => {
    return input.fieldRow[1]?.value_ || ''; // Optional chaining to avoid undefined errors
  });
}

/**
 * Retrieves dropdown values from the block.
 * @param {Blockly.Block} block - The current block.
 * @returns {string[]} Array of dropdown values.
 */
function getDropdownValues(block: Blockly.Block): string[] {
  const dropdown: string[] = [];
  let index = 0;
  while (block.getFieldValue(`DROPDOWN${index}`) != null) {
    dropdown.push(block.getFieldValue(`DROPDOWN${index}`));
    index++;
  };
  return dropdown;
};

/**
 * Extracts input values from the block.
 * @param {Blockly.Block} block - The current block.
 * @returns {string[]} Array of input values.
 */
function getInputValues(block: Blockly.Block): string[] {
  const inputValues: string[] = [];
  let index = 0;
  while (pythonGenerator.valueToCode(block, `ADD${index}`, pythonGenerator.ORDER_MEMBER) != '') {
    inputValues.push(pythonGenerator.valueToCode(block, `ADD${index}`, pythonGenerator.ORDER_MEMBER));
    index++;
  };
  return inputValues;
};

/**
 * Retrieves middle values from the block.
 * @param {Blockly.Block} block - The current block.
 * @returns {string[]} Array of middle values.
 */
function getMiddleValues(block: Blockly.Block): string[] {
  const middle: string[] = [];
  let index = 1;
  while (block.getFieldValue(`MIDDLE${index}`) != null) {
    middle.push(block.getFieldValue(`MIDDLE${index}`));
    index++;
  };
  return middle;
};

/**
 * Builds the query string based on the conditions defined in the block.
 * @param {string} dataframe - The name of the DataFrame.
 * @param {string[]} fieldValues - Array of field names.
 * @param {string[]} dropdownValues - Array of dropdown values.
 * @param {string[]} inputValues - Array of input values.
 * @param {string[]} middleValues - Array of middle values.
 * @param {Map<string, string>} dropdownMap - Mapping of dropdown values to operators.
 * @param {Map<string, string>} conditionMap - Mapping of condition keywords to symbols.
 * @returns {string} The constructed query string.
 */
function buildQuery(dataframe: string, fieldValues: string[], dropdownValues: string[], inputValues: string[], middleValues: string[], dropdownMap: Map<string, string>, conditionMap: Map<string, string>): string {
  let queryParts: string[] = [];
  let counter = 0;

  while (counter < fieldValues.length) {
    const field = fieldValues[counter] ? `["${fieldValues[counter]}"]` : '';
    const operator = dropdownValues[counter] ? dropdownMap.get(dropdownValues[counter]) : '';
    const value = inputValues[counter] ? `${inputValues[counter]}` : '';

    queryParts.push(`(${dataframe}${field}${operator}${value})`);

    if (middleValues[counter]) {
      const condition = conditionMap.get(middleValues[counter]);
      if (condition) {
        queryParts.push(condition);
      }
    }
    counter++;
  };
  return queryParts.join(' ');
};

/**
 * Block for filtering a DataFrame based on specified conditions.
 * Users can create complex filter expressions by adding multiple conditions
 * using the mutator. Each condition will be applied to the DataFrame,
 * returning a new DataFrame that meets the specified criteria.
 * This block facilitates data analysis by allowing users to isolate
 * relevant subsets of data based on dynamic filtering criteria.
 * @this Blockly.Block
 */
Blockly.Blocks['filter'] = {
  init: function () {
    this.updateShape_();
    const mutator = new Blockly.icons.MutatorIcon(['lists_create_with_item'], this);
    this.setMutator(mutator);
    this.itemCount_ = 1;

    this.appendValueInput("dataframe")
      .appendField("(Filter) ")
      .appendField("DataFrame: ")

    this.setOutput(true);
    this.setColour('#596570');
    this.setTooltip("Filter a DataFrame based on specified conditions.");
    this.setHelpUrl("");
  },
  /**
   * Create XML to represent list inputs.
    @return {!Element} XML storage element.
   * @this Blockly.Block
   */
  mutationToDom: function () {
    var container = document.createElement('mutation');
    container.setAttribute('items', this.itemCount_);
    return container;
  },
  /**
   * Parse XML to restore the list inputs.
   * @param {!Element} xmlElement XML storage element.
   * @this Blockly.Block
   */
  domToMutation: function (xmlElement: any) {
    this.itemCount_ = parseInt(xmlElement.getAttribute('items'), 10);
    this.updateShape_();
  },
  /**
   * Populate the mutator's dialog with this block's components.
   * @param {!Blockly.Workspace} workspace Mutator's workspace.
   * @return {!Blockly.Block} Root block in mutator.
   * @this Blockly.Block
   */
  decompose: function (workspace: any) {
    var containerBlock = workspace.newBlock('lists_create_with_container');
    containerBlock.initSvg();
    var connection = containerBlock.getInput('STACK').connection;
    for (var i = 0; i < this.itemCount_; i++) {
      var itemBlock = workspace.newBlock('lists_create_with_item');
      itemBlock.initSvg();
      connection.connect(itemBlock.previousConnection);
      connection = itemBlock.nextConnection;
    }
    return containerBlock;
  },
  /**
   * Reconfigure this block based on the mutator dialog's components.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this Blockly.Block
   */
  compose: function (containerBlock: any) {
    var itemBlock = containerBlock.getInputTargetBlock('STACK');
    // Count number of inputs.
    var connections = [];
    while (itemBlock) {
      connections.push(itemBlock.valueConnection_);
      itemBlock = itemBlock.nextConnection &&
        itemBlock.nextConnection.targetBlock();
    }
    // Disconnect any children that don't belong.
    for (var i = 0; i < this.itemCount_; i++) {
      var connection = this.getInput('ADD' + i).connection.targetConnection;
      if (connection && connections.indexOf(connection) == -1) {
        connection.disconnect();
      }
    }
    this.itemCount_ = connections.length;
    this.updateShape_();
  },
  /**
   * Store pointers to any connected child blocks.
   * @param {!Blockly.Block} containerBlock Root block in mutator.
   * @this Blockly.Block
   */
  saveConnections: function (containerBlock: any) {
    var itemBlock = containerBlock.getInputTargetBlock('STACK');
    var i = 0;
    while (itemBlock) {
      var input = this.getInput('ADD' + i);
      itemBlock.valueConnection_ = input && input.connection.targetConnection;
      i++;
      itemBlock = itemBlock.nextConnection &&
        itemBlock.nextConnection.targetBlock();
    }
  },
  /**
   * Modify this block to have the correct number of inputs.
   * @private
   * @this Blockly.Block
   */
  updateShape_: function () {
    if (this.itemCount_ && this.getInput('EMPTY')) {
      this.removeInput('EMPTY');
    } else if (!this.itemCount_ && !this.getInput('EMPTY')) {
      this.appendDummyInput('EMPTY')
    }
    // Add new inputs.
    for (var i = 0; i < this.itemCount_; i++) {

      if (!this.getInput('ADD' + i)) {

        var input = this.appendValueInput('ADD' + i) //input values

        if (i == 0) {
          input.setAlign(Blockly.inputs.Align.RIGHT)
          input.appendField('')
        }

        if (i > 0) {
          input.appendField(new Blockly.FieldDropdown([
            ['AND', 'and'],
            ['OR', 'or']
          ]), 'MIDDLE' + i)
        }

        input.appendField(new Blockly.FieldTextInput('Field'),
          'FIELDNAME' + i);

        input.appendField(new Blockly.FieldDropdown([
          ['>', 'gt'],
          ['<', 'lt'],
          ['>=', 'ge'],
          ['<=', 'le'],
          ['==', 'eq'],
          ['!=', 'ne'],
        ]), 'DROPDOWN' + i)

      }
    }
    // Remove deleted inputs.
    while (this.getInput('ADD' + i)) {
      this.removeInput('ADD' + i);
      i++;
    }
  }
};
pythonGenerator['filter'] = function (block: Blockly.Block): [string, number] {
  const dataframe = pythonGenerator.valueToCode(block, 'dataframe', pythonGenerator.ORDER_MEMBER) || '';

  const fieldValues: string[] = getFieldValues.call(block);
  const dropdownValues: string[] = getDropdownValues(block);
  const inputValues: string[] = getInputValues(block);
  const middleValues: string[] = getMiddleValues(block);

  const dropdownMap = new Map<string, string>([
    ['ge', '>='],
    ['le', '<='],
    ['gt', '>'],
    ['lt', '<'],
    ['eq', '=='],
    ['ne', '!=']
  ]);

  const conditionMap = new Map<string, string>([
    ['and', '&'],
    ['or', '|']
  ]);

  const queryString = buildQuery(dataframe, fieldValues, dropdownValues, inputValues, middleValues, dropdownMap, conditionMap);

  const code: string = `${dataframe}[${queryString}]`;
  return [code, pythonGenerator.ORDER_FUNCTION_CALL];
};

/**
 * Block for splitting a DataFrame into training and testing datasets.
 * The user can specify the test size, the DataFrame to be split,
 * the label column for prediction, and the feature columns to use.
 * This block is essential for preparing data for machine learning models,
 * enabling users to easily partition their dataset into training and testing sets.
 * @this Blockly.Block
 */
Blockly.Blocks['train_test_split'] = {
  init: function () {
    this.appendValueInput('teste_size')
      .setAlign(Blockly.inputs.Align.RIGHT)
      .appendField('Test Size')
      .setCheck('Number');

    this.appendValueInput('dataframe')
      .appendField('(train test split)')
      .appendField('DataFrame');

    this.appendValueInput('label')
      .setAlign(Blockly.inputs.Align.RIGHT)
      .appendField('Label');

    this.appendValueInput('features')
      .setAlign(Blockly.inputs.Align.RIGHT)
      .appendField('Features');

    this.setColour('#596570');
    this.setTooltip("Split a DataFrame into training and testing datasets.");
    this.setHelpUrl("");
    this.setOutput(true);
  }
};
pythonGenerator['train_test_split'] = function (block: Blockly.Block): [string, number] {
  const testSize: string = pythonGenerator.valueToCode(block, 'teste_size', pythonGenerator.ORDER_MEMBER) || '0.2';
  const dataframe: string = pythonGenerator.valueToCode(block, 'dataframe', pythonGenerator.ORDER_MEMBER) || '[]';
  const label: string = pythonGenerator.valueToCode(block, 'label', pythonGenerator.ORDER_MEMBER) || '[]';
  const features: string = pythonGenerator.valueToCode(block, 'features', pythonGenerator.ORDER_MEMBER) || '[]';
  pythonGenerator.definitions_['import_sklearn.model_selection'] = 'from sklearn.model_selection import train_test_split';
  if (!dataframe || !label || !features) {
    console.warn('Invalid inputs for train_test_split block. Using default values.');
  };

  const code: string = `train_test_split(${dataframe}[${features}], ${dataframe}[${label}], test_size=${testSize})`;
  return [code, pythonGenerator.ORDER_FUNCTION_CALL];
}

/**
 * Block for selecting train/test split outputs.
 * @this Blockly.Block
 */
Blockly.Blocks['selector_train_test_split'] = {
  init: function () {
    this.appendValueInput('train_test')
      .appendField('Train Test Split:')
      .appendField(new Blockly.FieldDropdown([
        ['X Train', 'x_train'],
        ['X Test', 'x_test'],
        ['Y Train', 'y_train'],
        ['Y Test', 'y_test'],
      ]), 'FIELDNAME');

    this.setColour('#596570');
    this.setTooltip("Selects the output of the train/test split (X Train, X Test, Y Train, Y Test).");
    this.setHelpUrl("");
    this.setOutput(true);
  }
};
pythonGenerator['selector_train_test_split'] = function (block: Blockly.Block): [string, number] {
  const dataframe: string = pythonGenerator.valueToCode(block, 'train_test', pythonGenerator.ORDER_MEMBER) || '';
  const field: string = block.getFieldValue('FIELDNAME') || '';

  if (!dataframe) {
    console.warn('No DataFrame input provided in "aggFunc" block. Generated code may be invalid.');
    return ['', pythonGenerator.ORDER_NONE];
  };

  let code = '';
  switch (field) {
    case "x_train":
      code = dataframe + '[0]';
      break;
    case "x_test":
      code = dataframe + '[1]';
      break;
    case "y_train":
      code = dataframe + '[2]';
      break;
    case "y_test":
      code = dataframe + '[3]';
      break;
  };
  return [code, pythonGenerator.ORDER_FUNCTION_CALL];
};

/**
 * Processes the loaded blocks and calls getModelAtributes for relevant blocks.
 * @param workspace The current Blockly workspace.
 */
export function processLoadedBlocks(workspace: Blockly.Workspace): void {
  // Get all the blocks currently in the workspace
  const allBlocks = workspace.getAllBlocks();

  // Iterate over the blocks and call getModelAtributes when necessary
  allBlocks.forEach(block => {
    const parentBlock = block.getParent();  // Get the parent block
    if (parentBlock && parentBlock.type === "variables_set") {
      // Call getModelAtributes for blocks of type "variables_set"
      getModelAtributes(block, parentBlock, workspace);
    }
  });
}

const globalVariableRepository: { [varName: string]: [string, string, string] | null } = {};

export function getModelAtributes(block: any, parentBlock: any, workspace: Blockly.Workspace) {

  pythonGenerator.init(workspace);

  if (block && block.type.includes("model")) {
    const label = pythonGenerator.valueToCode(block, 'label', pythonGenerator.ORDER_MEMBER) || '[]';
    const features = pythonGenerator.valueToCode(block, 'features', pythonGenerator.ORDER_MEMBER) || '[]';
    const blockType = block.type;

    const variableId = parentBlock.getFieldValue('VAR');
    const variable = workspace.getVariableById(variableId);
    if (variable) {
      const variableName = variable.name;
      globalVariableRepository[variableName] = [label, features, blockType];
    }
  } else if (block && block.type.includes("lists_create_with")) {
    const blockType = block.type;
    const features = new Array();
    for (var i = 0; i < block.itemCount_; i++) {
      features[i] = pythonGenerator.valueToCode(block, 'ADD' + i,
        pythonGenerator.ORDER_NONE) || 'null';
    };

    const variableId = parentBlock.getFieldValue('VAR');
    const variable = workspace.getVariableById(variableId);
    if (variable) {
      const variableName = variable.name;
      globalVariableRepository[variableName] = ["", JSON.stringify(features), blockType];
    }
  } else if (block && block.type.includes("aggFunc")) {
    const blockType = block.type;
    const variableId = parentBlock.getFieldValue('VAR');
    const variable = workspace.getVariableById(variableId);
    if (variable) {
      const variableName = variable.name;
      globalVariableRepository[variableName] = ["", "", blockType];
    }
  }
};

/**
 * Block for creating a Linear Regression model.
 * This block allows the user to input a label array (dependent variable) 
 * and a features array (independent variables) for the regression model.
 * Generates code that constructs a Linear Regression model based on the inputs.
 * @this Blockly.Block
 */
Blockly.Blocks['linear_regression_model'] = {
  init: function () {
    this.appendValueInput("label")
      .setCheck("Array")
      .appendField("(LR Model)")
      .appendField("Label:");

    this.appendValueInput("features")
      .setAlign(Blockly.inputs.Align.RIGHT)
      .setCheck("Array")
      .appendField("Features:");

    this.setOutput(true)
    this.setColour('#5566A6')
    this.setTooltip("Creates a Linear Regression model using the specified label and features.");
    this.setHelpUrl("")
  }
};
pythonGenerator['linear_regression_model'] = function (block: Blockly.Block): [string, number] {
  const label: string = pythonGenerator.valueToCode(block, 'label', pythonGenerator.ORDER_MEMBER) || '';
  let features: string = pythonGenerator.valueToCode(block, 'features', pythonGenerator.ORDER_MEMBER) || '';

  const repositoryEntry: [string, string, string] | null = globalVariableRepository[features];
  if (repositoryEntry) {
    const [, , blockType] = repositoryEntry;
    if (blockType == "lists_create_with") {
      features = 'pd.DataFrame(' + features + ').T';
    }
  }

  pythonGenerator.definitions_['import_sklearn.linear_regression'] = 'from sklearn.linear_model import LinearRegression';
  const code: string = 'LinearRegression().fit(' + features + ', ' + label + ')';
  return [code, pythonGenerator.ORDER_FUNCTION_CALL];
};

/**
 * Block for making predictions using a linear regression model.
 * Expects a trained linear regression model and feature values as input.
 * The block outputs an array of predicted values based on the input features.
 * @this {Blockly.Block}
 */
Blockly.Blocks['linear_regression_predictor'] = {
  init: function () {
    this.appendValueInput("model")
      .setCheck("Array")
      .appendField("(LR Predictor)")
      .appendField("Model:");

    this.appendValueInput("features")
      .setAlign(Blockly.inputs.Align.RIGHT)
      .setCheck("Array")
      .appendField("Features:");

    this.setOutput(true, "Array");
    this.setColour('#9D65A6');
    this.setTooltip("Generates predictions using a trained linear regression model based on input features.");
    this.setHelpUrl("");
  }
};
pythonGenerator['linear_regression_predictor'] = function (block: Blockly.Block): [string, number] {
  const model: string = pythonGenerator.valueToCode(block, 'model', pythonGenerator.ORDER_MEMBER) || '';
  let features: string = pythonGenerator.valueToCode(block, 'features', pythonGenerator.ORDER_MEMBER) || '';
  const repositoryEntry: [string, string, string] | null = globalVariableRepository[features];
  if (repositoryEntry) {
    const [, , blockType] = repositoryEntry;
    if (blockType == "lists_create_with") {
      features = 'pd.DataFrame(' + features + ').T';
    }
  }
  const code: string = model + '.predict(' + features + ')';
  return [code, pythonGenerator.ORDER_FUNCTION_CALL];
};

/**
 * Block for defining a logistic regression model.
 * Users can specify the label (target variable) and features (predictor variables) for training the model.
 * Outputs a model object for logistic regression predictions.
 * @this Blockly.Block
 */
Blockly.Blocks['logistic_regression_model'] = {
  init: function () {
    this.appendValueInput("label")
      .setCheck("Array")
      .appendField("(logReg Model)")
      .appendField("Label:");

    this.appendValueInput("features")
      .setAlign(Blockly.inputs.Align.RIGHT)
      .setCheck("Array")
      .appendField("Features:");

    this.setOutput(true);
    this.setColour('#5566A6');
    this.setTooltip("Creates a logistic regression model using specified label and features.");
    this.setHelpUrl("");
  }
};
pythonGenerator['logistic_regression_model'] = function (block: Blockly.Block): [string, number] {
  const label: string = pythonGenerator.valueToCode(block, 'label', pythonGenerator.ORDER_MEMBER) || '';
  let features: string = pythonGenerator.valueToCode(block, 'features', pythonGenerator.ORDER_MEMBER) || '';
  const repositoryEntry: [string, string, string] | null = globalVariableRepository[features];
  if (repositoryEntry) {
    const [, , blockType] = repositoryEntry;
    if (blockType == "lists_create_with") {
      features = 'pd.DataFrame(' + features + ').T';
    }
  }
  pythonGenerator.definitions_['import_sklearn.linear_logistc'] = 'from sklearn.linear_model import LogisticRegression';
  const code: string = 'LogisticRegression().fit(' + features + ', ' + label + ')';
  return [code, pythonGenerator.ORDER_FUNCTION_CALL];
};

/**
 * Block for making predictions with a logistic regression model.
 * Allows users to input a trained model and features for prediction, outputting the predicted values.
 * Typically used for binary classification tasks where the logistic regression model predicts classes based on input features.
 * @this Blockly.Block
 */
Blockly.Blocks['logistic_regression_predictor'] = {
  init: function () {
    this.appendValueInput("model")
      .setCheck("Array")
      .appendField("(logReg Predictor)")
      .appendField("Model:");

    this.appendValueInput("features")
      .setAlign(Blockly.inputs.Align.RIGHT)
      .setCheck("Array")
      .appendField("Features:");

    this.setOutput(true, "Array");
    this.setColour('#9D65A6');
    this.setTooltip("Generates predictions using a logistic regression model and input features.");
    this.setHelpUrl("");
  }
};
pythonGenerator['logistic_regression_predictor'] = function (block: Blockly.Block): [string, number] {
  const model: string = pythonGenerator.valueToCode(block, 'model', pythonGenerator.ORDER_MEMBER) || '';
  let features: string = pythonGenerator.valueToCode(block, 'features', pythonGenerator.ORDER_MEMBER) || '';
  const repositoryEntry: [string, string, string] | null = globalVariableRepository[features];
  if (repositoryEntry) {
    const [, , blockType] = repositoryEntry;
    if (blockType == "lists_create_with") {
      features = 'pd.DataFrame(' + features + ').T';
    }
  }
  const code: string = model + '.predict(' + features + ')';
  return [code, pythonGenerator.ORDER_FUNCTION_CALL]
};

/**
 * Block for creating a K-Nearest Neighbors (KNN) model.
 * Allows the user to input the number of neighbors (K), along with label and feature arrays.
 * The KNN model can be used for classification or regression tasks by finding the K nearest data points in the feature space.
 * @this Blockly.Block
 */
Blockly.Blocks['knn_model'] = {
  init: function () {
    this.appendValueInput("k")
      .setCheck("Number")
      .appendField("(knn Model)")
      .appendField("K:");

    this.appendValueInput("label")
      .setAlign(Blockly.inputs.Align.RIGHT)
      .setCheck("Array")
      .appendField("Label:");

    this.appendValueInput("features")
      .setAlign(Blockly.inputs.Align.RIGHT)
      .setCheck("Array")
      .appendField("Features:");

    this.setOutput(true, "Array");
    this.setColour('#5566A6');
    this.setTooltip("K-Nearest Neighbors (KNN) Model: Set K, label, and feature arrays.");
    this.setHelpUrl("");
  }
};
pythonGenerator['knn_model'] = function (block: Blockly.Block): [string, number] {
  const value_k: string = pythonGenerator.valueToCode(block, 'k', pythonGenerator.ORDER_MEMBER) || '1';
  const label: string = pythonGenerator.valueToCode(block, 'label', pythonGenerator.ORDER_MEMBER) || '';
  let features: string = pythonGenerator.valueToCode(block, 'features', pythonGenerator.ORDER_MEMBER) || '';
  const repositoryEntry: [string, string, string] | null = globalVariableRepository[features];
  if (repositoryEntry) {
    const [, , blockType] = repositoryEntry;
    if (blockType == "lists_create_with") {
      features = 'pd.DataFrame(' + features + ').T';
    }
  }
  pythonGenerator.definitions_['import_sklearn.neighbors'] = 'from sklearn.neighbors import KNeighborsClassifier';
  const code: string = `KNeighborsClassifier(n_neighbors=${value_k}).fit(${features}, ${label})`;
  return [code, pythonGenerator.ORDER_FUNCTION_CALL];
};

/**
 * Block for making predictions using a K-Nearest Neighbors (KNN) model.
 * Allows the user to provide a trained KNN model and a set of feature values for prediction.
 * Outputs an array containing the predicted results based on the nearest neighbors.
 * @this Blockly.Block
 */
Blockly.Blocks['knn_predictor'] = {
  init: function () {
    this.appendValueInput("model")
      .setCheck("Array")
      .appendField("(knn Predictor)")
      .appendField("Model: ");

    this.appendValueInput("features")
      .setAlign(Blockly.inputs.Align.RIGHT)
      .setCheck("Array")
      .appendField("Features:");

    this.setOutput(true, "Array");
    this.setColour('#9D65A6');
    this.setTooltip("K-Nearest Neighbors (KNN) Predictor: Use model and features to generate predictions.");
    this.setHelpUrl("");
  }
};
pythonGenerator['knn_predictor'] = function (block: Blockly.Block): [string, number] {
  const model: string = pythonGenerator.valueToCode(block, 'model', pythonGenerator.ORDER_ATOMIC) || '';
  let features: string = pythonGenerator.valueToCode(block, 'features', pythonGenerator.ORDER_ATOMIC) || '';
  const repositoryEntry: [string, string, string] | null = globalVariableRepository[features];
  if (repositoryEntry) {
    const [, , blockType] = repositoryEntry;
    if (blockType == "lists_create_with") {
      features = 'pd.DataFrame(' + features + ').T';
    }
  }
  const code: string = model + '.predict(' + features + ')';
  return [code, pythonGenerator.ORDER_FUNCTION_CALL]
};

/**
 * Block for creating a Naive Bayes regression model.
 * Enables the user to specify label data and feature data arrays to train the model.
 * Outputs an array representing the trained Naive Bayes model.
 * @this Blockly.Block
 */
Blockly.Blocks['naive_bayes_model'] = {
  init: function () {
    this.appendValueInput("label")
      .setCheck("Array")
      .appendField("(naive bayes model)")
      .appendField("Label:");

    this.appendValueInput("features")
      .setAlign(Blockly.inputs.Align.RIGHT)
      .appendField("Features:");

    this.setOutput(true, "Array");
    this.setColour('#5566A6');
    this.setTooltip("Naive Bayes Regression Model: Set label and feature data for training.");
    this.setHelpUrl("");
  }
};
pythonGenerator['naive_bayes_model'] = function (block: Blockly.Block): [string, number] {
  const label: string = pythonGenerator.valueToCode(block, 'label', pythonGenerator.ORDER_MEMBER) || '';
  let features: string = pythonGenerator.valueToCode(block, 'features', pythonGenerator.ORDER_MEMBER) || '';
  const repositoryEntry: [string, string, string] | null = globalVariableRepository[features];
  if (repositoryEntry) {
    const [, , blockType] = repositoryEntry;
    if (blockType == "lists_create_with") {
      features = 'pd.DataFrame(' + features + ').T';
    }
  }
  pythonGenerator.definitions_['import_sklearn.naive_bayes'] = 'from sklearn.naive_bayes import MultinomialNB';
  const code: string = `MultinomialNB().fit(${features}, ${label})`;
  return [code, pythonGenerator.ORDER_FUNCTION_CALL];
};

/**
 * Block for using a Naive Bayes regression model to make predictions.
 * Accepts a trained model and an array of features as inputs.
 * Outputs an array representing the model's predictions based on the given features.
 * @this Blockly.Block
 */
Blockly.Blocks['naive_bayes_predictor'] = {
  init: function () {
    this.appendValueInput("model")
      .setCheck("Array")
      .appendField("(naive bayes predictor)")
      .appendField("Model:");

    this.appendValueInput("features")
      .setAlign(Blockly.inputs.Align.RIGHT)
      .setCheck("Array")
      .appendField("Features:");

    this.setOutput(true, "Array");
    this.setColour('#9D65A6');
    this.setTooltip("Naive Bayes Predictor: Provide model and feature data to get predictions.");
    this.setHelpUrl("");
  }
};
pythonGenerator['naive_bayes_predictor'] = function (block: Blockly.Block): [string, number] {
  const model: string = pythonGenerator.valueToCode(block, 'model', pythonGenerator.ORDER_MEMBER) || '';
  let features: string = pythonGenerator.valueToCode(block, 'features', pythonGenerator.ORDER_MEMBER) || '';
  const repositoryEntry: [string, string, string] | null = globalVariableRepository[features];
  if (repositoryEntry) {
    const [, , blockType] = repositoryEntry;
    if (blockType == "lists_create_with") {
      features = 'pd.DataFrame(' + features + ').T';
    }
  }
  const code: string = model + '.predict(' + features + ')';
  return [code, pythonGenerator.ORDER_FUNCTION_CALL]
};

/**
 * Block for configuring a Decision Tree model.
 * Allows setting the maximum depth, label data, and features for the model.
 * Outputs a configured Decision Tree model object.
 * @this Blockly.Block
 */
Blockly.Blocks['decision_tree_model'] = {
  init: function () {
    this.appendValueInput("max_depth")
      .setCheck("Number")
      .appendField("(Decision Tree Model)")
      .appendField("max Depth:");

    this.appendValueInput("label")
      .setAlign(Blockly.inputs.Align.RIGHT)
      .setCheck("Array")
      .appendField("Label:");

    this.appendValueInput("features")
      .setAlign(Blockly.inputs.Align.RIGHT)
      .setCheck("Array")
      .appendField("Features:");

    this.setOutput(true, "Array");
    this.setColour('#5566A6');
    this.setTooltip("Decision Tree Model: Configure max depth, label, and features for training.");
    this.setHelpUrl("");
  }
};
pythonGenerator['decision_tree_model'] = function (block: Blockly.Block): [string, number] {
  const label: string = pythonGenerator.valueToCode(block, 'label', pythonGenerator.ORDER_MEMBER) || '';
  const maxDepth: string = pythonGenerator.valueToCode(block, 'max_depth', pythonGenerator.ORDER_MEMBER) || '2';
  let features: string = pythonGenerator.valueToCode(block, 'features', pythonGenerator.ORDER_MEMBER) || '';
  const repositoryEntry: [string, string, string] | null = globalVariableRepository[features];
  if (repositoryEntry) {
    const [, , blockType] = repositoryEntry;
    if (blockType == "lists_create_with") {
      features = 'pd.DataFrame(' + features + ').T';
    }
  }
  pythonGenerator.definitions_['import_sklearn.tree'] = 'from sklearn.tree import DecisionTreeClassifier, export_graphviz\nfrom graphviz import Source';
  let decision_tree_function = pythonGenerator.provideFunction_(
    'decisionTree',
    [
      'def ' + pythonGenerator.FUNCTION_NAME_PLACEHOLDER_ + '(label, features, maxDepth):',
      '  tree = DecisionTreeClassifier(max_depth=maxDepth).fit(features, label)',
      '  labels = [str(x) for x in label.unique()]',
      '  labels.sort()',
      '  display(Source(export_graphviz(tree, filled=True, feature_names=features.columns.tolist(), class_names = labels)))',
      '  return tree'
    ]);
  const code: string = decision_tree_function + '(' + label + ', ' + features + ', ' + maxDepth + ')';
  return [code, pythonGenerator.ORDER_FUNCTION_CALL];
};

/**
 * Block for using a trained Decision Tree model to make predictions.
 * Accepts a model input and feature data to produce predictions.
 * Outputs an array of predictions based on the input features.
 * @this Blockly.Block
 */
Blockly.Blocks['decision_tree_predictor'] = {
  init: function () {
    this.appendValueInput("model")
      .setCheck("Array")
      .appendField("(Decision Tree Predictor)")
      .appendField("Model:");

    this.appendValueInput("features")
      .setAlign(Blockly.inputs.Align.RIGHT)
      .setCheck("Array")
      .appendField("Features:");

    this.setOutput(true, "Array");
    this.setColour('#9D65A6');
    this.setTooltip("Decision Tree Predictor: Use a trained model to predict outcomes based on features.");
    this.setHelpUrl("");
  }
};
pythonGenerator['decision_tree_predictor'] = function (block: Blockly.Block): [string, number] {
  const model: string = pythonGenerator.valueToCode(block, 'model', pythonGenerator.ORDER_MEMBER) || '';
  let features: string = pythonGenerator.valueToCode(block, 'features', pythonGenerator.ORDER_MEMBER) || '';
  const repositoryEntry: [string, string, string] | null = globalVariableRepository[features];
  if (repositoryEntry) {
    const [, , blockType] = repositoryEntry;
    if (blockType == "lists_create_with") {
      features = 'pd.DataFrame(' + features + ').T';
    }
  }
  const code: string = model + '.predict(' + features + ')';
  return [code, pythonGenerator.ORDER_FUNCTION_CALL];
};

/**
 * Block for defining a Neural Network model.
 * Accepts inputs for hidden layers, label, and features.
 * Outputs an array representation of the defined Neural Network model.
 * @this Blockly.Block
 */
Blockly.Blocks['neural_network_model'] = {
  init: function () {
    this.appendValueInput("hidden_layers")
      .setAlign(Blockly.inputs.Align.RIGHT)
      .setCheck("Array")
      .appendField("Hidden Layers: ");

    this.appendValueInput("label")
      .setCheck("Array")
      .appendField("(Neural Network Model)")
      .appendField("Label:");

    this.appendValueInput("features")
      .setAlign(Blockly.inputs.Align.RIGHT)
      .setCheck("Array")
      .appendField("Features:");

    this.setOutput(true, "Array");
    this.setColour('#5566A6');
    this.setTooltip("Neural Network Model: Define a neural network with specified hidden layers, label, and features.");
    this.setHelpUrl("");
  }
};
pythonGenerator['neural_network_model'] = function (block: Blockly.Block): [string, number] {
  const label: string = pythonGenerator.valueToCode(block, 'label', pythonGenerator.ORDER_MEMBER) || '';
  let features: string = pythonGenerator.valueToCode(block, 'features', pythonGenerator.ORDER_MEMBER) || '';
  const value_hiddenLayers: string = pythonGenerator.valueToCode(block, 'hidden_layers', pythonGenerator.ORDER_MEMBER) || '[]';
  let kerasLength = '.T';
  const repositoryEntry: [string, string, string] | null = globalVariableRepository[features];
  if (repositoryEntry) {
    const [, , blockType] = repositoryEntry;
    if (blockType == "lists_create_with") {
      features = 'np.array(' + features + ').T.tolist()';
      kerasLength = '[0]';
    }
  }
  const hiddenLayers = JSON.parse(value_hiddenLayers);
  let layers = '';
  for (var i = 0; i < hiddenLayers.length; i++) {
    let text = '  keras.layers.Dense(' + hiddenLayers[i] + ', activation="relu"),\n';
    layers = layers + text;
  }
  let neuralNetworkFunction = pythonGenerator.provideFunction_(
    'neuralNetworkModel',
    [
      'def ' + pythonGenerator.FUNCTION_NAME_PLACEHOLDER_ + '(features, labels):',
      '  nn = keras.Sequential([',
      '    keras.layers.Input(shape=(len(features' + kerasLength + '),)),',
      layers,
      '    keras.layers.Dense(1, activation="sigmoid")',
      '  ])',
      '',
      '  nn.compile(optimizer="adam" , loss="binary_crossentropy")',
      '  nn.fit(features, labels)',
      '  return nn'
    ]);
  pythonGenerator.definitions_['import_sklearn.metrics_nn'] = 'from sklearn.metrics import accuracy_score\nimport tensorflow\nfrom tensorflow import keras';
  const code: string = neuralNetworkFunction + '(' + features + ', ' + label + ')';
  return [code, pythonGenerator.ORDER_FUNCTION_CALL];
};

/**
 * Block for predicting outcomes using a Neural Network model.
 * Accepts inputs for the model and features.
 * Outputs the prediction as an array.
 * @this Blockly.Block
 */
Blockly.Blocks['neural_network_predictor'] = {
  init: function () {
    this.appendValueInput("model")
      .setCheck("Array")
      .appendField("(Neural Network Predictor)")
      .appendField("Model:");

    this.appendValueInput("features")
      .setAlign(Blockly.inputs.Align.RIGHT)
      .setCheck("Array")
      .appendField("Features:");

    this.setOutput(true, "Array");
    this.setColour('#9D65A6');
    this.setTooltip("Neural Network Predictor: Use a neural network model to predict outcomes based on provided features.");
    this.setHelpUrl("");
  }
};
pythonGenerator['neural_network_predictor'] = function (block: Blockly.Block): [string, number] {
  const model: string = pythonGenerator.valueToCode(block, 'model', pythonGenerator.ORDER_MEMBER) || '';
  let features: string = pythonGenerator.valueToCode(block, 'features', pythonGenerator.ORDER_MEMBER) || '';
  const repositoryEntry: [string, string, string] | null = globalVariableRepository[features];
  if (repositoryEntry) {
    const [, , blockType] = repositoryEntry;
    if (blockType == "lists_create_with") {
      features = 'pd.DataFrame(' + features + ').T';
    }
  }
  const code: string = model + '.predict(' + features + ') > 0.5';
  return [code, pythonGenerator.ORDER_FUNCTION_CALL];
};

/**
 * Block for performing K-Means clustering.
 * Accepts input for the number of clusters (K) and the features to be clustered.
 * Outputs the cluster assignments as an array.
 * @this Blockly.Block
 */
Blockly.Blocks['kmeans'] = {
  init: function () {
    this.appendValueInput("k")
      .setCheck("Number")
      .appendField("(KMeans)")
      .appendField("K:");

    this.appendValueInput("features")
      .setAlign(Blockly.inputs.Align.RIGHT)
      .setCheck("Array")
      .appendField("Features:");

    this.setOutput(true, "Array");
    this.setColour('#5566A6');
    this.setTooltip("KMeans: Perform K-Means clustering on the provided features using the specified number of clusters.");
    this.setHelpUrl("");
  }
};
pythonGenerator['kmeans'] = function (block: Blockly.Block): [string, number] {
  const value_k: string = pythonGenerator.valueToCode(block, "k", pythonGenerator.ORDER_MEMBER) || '2';
  let features: string = pythonGenerator.valueToCode(block, "features", pythonGenerator.ORDER_MEMBER) || '';
  const repositoryEntry: [string, string, string] | null = globalVariableRepository[features];
  if (repositoryEntry) {
    const [, , blockType] = repositoryEntry;
    if (blockType == "lists_create_with") {
      features = 'pd.DataFrame(' + features + ').T';
    }
  }
  pythonGenerator.definitions_['import_sklearn.cluster'] = 'from sklearn.cluster import KMeans';
  const code: string = `KMeans(n_clusters=${value_k}).fit(${features}).labels_`;
  return [code, pythonGenerator.ORDER_FUNCTION_CALL];
};

/**
 * Block to calculate the score of a model.
 * Accepts a trained model as input and outputs the score as a number.
 * @this Blockly.Block
 */
Blockly.Blocks['score'] = {
  init: function () {
    this.appendValueInput("model")
      .setCheck("Array")
      .appendField("(Score)")
      .appendField("Model:");

    this.setOutput(true, "Number");
    this.setColour('#659AA6');
    this.setTooltip("Calculate the score for a given model.");
    this.setHelpUrl("");
  }
};
pythonGenerator['score'] = function (block: Blockly.Block): [string, number] {
  const model: string = pythonGenerator.valueToCode(block, 'model', pythonGenerator.ORDER_MEMBER) || '';
  let code: string = '';
  const repositoryEntry: [string, string, string] | null = globalVariableRepository[model];
  if (repositoryEntry) {
    const [label, features, blockType] = repositoryEntry;
    code = `${model}.score(${features}, ${label})`;
    if (blockType === 'neural_network_model') {
      code = `accuracy_score(${model}.predict(${features}) > 0.5, ${label})`;
    }
  } else {
    const model_block: Blockly.Block | null = block.getInputTargetBlock('model');
    if (model_block) {
      const label: string = pythonGenerator.valueToCode(model_block, 'label', pythonGenerator.ORDER_MEMBER) || '';
      const features: string = pythonGenerator.valueToCode(model_block, 'features', pythonGenerator.ORDER_MEMBER) || '';
      code = model + '.score(' + features + ', ' + label + ')';
      if (model_block.type == 'neural_network_model') {
        code = 'accuracy_score(' + model + '.predict(' + features + ') > 0.5, ' + label + ')';
      }
    }
  }
  return [code, pythonGenerator.ORDER_FUNCTION_CALL];
};

/**
 * Block to calculate the accuracy of predictions.
 * Accepts a predictor and expected labels, outputting the accuracy as a number.
 * @this Blockly.Block
 */
Blockly.Blocks['accuracy'] = {
  init: function () {
    this.appendValueInput("predictor")
      .appendField("(Accuracy)")
      .appendField("Predictor: ");

    this.appendValueInput("expected_y")
      .setAlign(Blockly.inputs.Align.RIGHT)
      .setCheck("Array")
      .appendField("Expected Y:");

    this.setOutput(true, "Number");
    this.setColour('#659AA6');
    this.setTooltip("Calculate the accuracy of a predictor using expected labels.");
    this.setHelpUrl("");
  }
};
pythonGenerator['accuracy'] = function (block: Blockly.Block): [string, number] {
  let predictor: string = pythonGenerator.valueToCode(block, 'predictor', pythonGenerator.ORDER_ATOMIC) || '';
  let expected_y: string = pythonGenerator.valueToCode(block, 'expected_y', pythonGenerator.ORDER_ATOMIC) || '';
  const repositoryEntry: [string, string, string] | null = globalVariableRepository[expected_y];
  if (repositoryEntry) {
    const [, , blockType] = repositoryEntry;
    if (blockType == "lists_create_with") {
      expected_y = 'pd.DataFrame(' + expected_y + ')';
    }
  }
  pythonGenerator.definitions_['import_sklearn.metrics'] = 'from sklearn.metrics import accuracy_score';
  const code: string = 'accuracy_score(' + predictor + ', ' + expected_y + ')';
  return [code, pythonGenerator.ORDER_FUNCTION_CALL];
};

/**
 * Block to compute the confusion matrix.
 * Accepts predicted and true labels, outputting the confusion matrix.
 * @this Blockly.Block
 */
Blockly.Blocks['confusionMatrix'] = {
  init: function () {
    this.appendValueInput("predictor")
      .appendField("(Confusion Matrix)")
      .appendField("Predicted: ");

    this.appendValueInput("true_labels")
      .setCheck("Array")
      .setAlign(Blockly.inputs.Align.RIGHT)
      .appendField("True Labels:");

    this.setOutput(true, "Number");
    this.setColour('#659AA6');
    this.setTooltip("Generate a confusion matrix for predicted and true labels.");
    this.setHelpUrl("");
  }
};
pythonGenerator['confusionMatrix'] = function (block: Blockly.Block): [string, number] {
  const predictedLabels: string = pythonGenerator.valueToCode(block, 'predictor', pythonGenerator.ORDER_ATOMIC) || '';
  let trueLabels: string = pythonGenerator.valueToCode(block, 'true_labels', pythonGenerator.ORDER_ATOMIC) || '';
  const repositoryEntry: [string, string, string] | null = globalVariableRepository[trueLabels];
  if (repositoryEntry) {
    const [, , blockType] = repositoryEntry;
    if (blockType == "lists_create_with") {
      trueLabels = 'pd.DataFrame(' + trueLabels + ')';
    }
  }
  pythonGenerator.definitions_['import_sklearn.metrics_confusion'] = 'from sklearn.metrics import confusion_matrix';
  const code: string = 'confusion_matrix(' + predictedLabels + ', ' + trueLabels + ')';
  return [code, pythonGenerator.ORDER_MEMBER];
};

/**
 * Block to calculate precision and recall.
 * Accepts predicted and true labels, outputting precision and recall as a number.
 * @this Blockly.Block
 */
Blockly.Blocks['precisionRecall'] = {
  init: function () {
    this.appendValueInput("predictor")
      .appendField("(Precision, Recall)")
      .appendField("Predicted: ");

    this.appendValueInput("true_labels")
      .setAlign(Blockly.inputs.Align.RIGHT)
      .setCheck("Array")
      .appendField("True Labels:");

    this.setOutput(true, "Number");
    this.setColour('#659AA6');
    this.setTooltip("Calculate precision and recall using predicted and true labels.");
    this.setHelpUrl("");
  }
};
pythonGenerator['precisionRecall'] = function (block: Blockly.Block): [string, number] {
  const predictedLabels: string = pythonGenerator.valueToCode(block, 'predictor', pythonGenerator.ORDER_ATOMIC) || '';
  let trueLabels: string = pythonGenerator.valueToCode(block, 'true_labels', pythonGenerator.ORDER_ATOMIC) || '';
  const repositoryEntry: [string, string, string] | null = globalVariableRepository[trueLabels];
  if (repositoryEntry) {
    const [, , blockType] = repositoryEntry;
    if (blockType == "lists_create_with") {
      trueLabels = 'pd.DataFrame(' + trueLabels + ')';
    }
  }
  pythonGenerator.definitions_['import_sklearn.metrics_classification'] = 'from sklearn.metrics import classification_report';
  const code: string = 'classification_report(' + trueLabels + ', ' + predictedLabels + ')';
  return [code, pythonGenerator.ORDER_MEMBER];
};

/**
 * Block to calculate the R-squared (R2) score.
 * Accepts the model's predictions and expected labels, outputting the R2 score.
 * @this Blockly.Block
 */
Blockly.Blocks['r2'] = {
  init: function () {
    this.appendValueInput("model")
      .setAlign(Blockly.inputs.Align.RIGHT)
      .appendField("(R2)")
      .appendField("Y:");

    this.appendValueInput("expected_y")
      .setCheck("Array")
      .appendField("Expected Y:");

    this.setOutput(true, "Array");
    this.setColour('#659AA6');
    this.setTooltip("Calculate the R-squared (R2) score for predictions and expected values.");
    this.setHelpUrl("");
  }
};
pythonGenerator['r2'] = function (block: Blockly.Block): [string, number] {
  let model: string = pythonGenerator.valueToCode(block, 'model', pythonGenerator.ORDER_MEMBER) || '';
  let expected_y: string = pythonGenerator.valueToCode(block, 'expected_y', pythonGenerator.ORDER_MEMBER) || '';
  const repositoryEntry_y: [string, string, string] | null = globalVariableRepository[expected_y];
  if (repositoryEntry_y) {
    const [, , blockType] = repositoryEntry_y;
    if (blockType == "lists_create_with") {
      expected_y = 'pd.DataFrame(' + expected_y + ')';
    }
  }
  const repositoryEntry: [string, string, string] | null = globalVariableRepository[model];
  if (repositoryEntry) {
    const [, features] = repositoryEntry;
    model = `${model}.predict(${features})`;
  }
  pythonGenerator.definitions_['import_sklearn.metrics_'] = 'from sklearn import metrics';
  const code: string = 'metrics.r2_score(' + expected_y + ', ' + model + ')';
  return [code, pythonGenerator.ORDER_FUNCTION_CALL];
};

/**
  * Block for calculating the correlation matrix of a given DataFrame.
  * This block takes a DataFrame as input and outputs the correlation matrix.
 */
Blockly.Blocks['correlation'] = {
  init: function () {
    this.appendValueInput('dataframe')
      .appendField('(Correlation)')
      .appendField('DataFrame:');

    this.setOutput(true);
    this.setColour('#2E5159');
    this.setTooltip("Calculate the correlation of the given DataFrame.");
    this.setHelpUrl("");
  }
};
pythonGenerator['correlation'] = function (block: Blockly.Block): [string, number] {
  const dataframe: string = pythonGenerator.valueToCode(block, 'dataframe', pythonGenerator.ORDER_MEMBER) || '';
  const code: string = dataframe + '.corr()';
  return [code, pythonGenerator.ORDER_FUNCTION_CALL];
};

/**
 * Block for calculating the frequency distribution of elements in a dataset.
 * @this Blockly.Block
 */
Blockly.Blocks['frequency'] = {
  init: function () {
    this.appendValueInput("x")
      .appendField("(Frequency) ")
      .appendField("X: ")
      .setCheck('Array');

    this.appendValueInput('bins')
      .setAlign(Blockly.inputs.Align.RIGHT)
      .appendField('bins:')
      .setCheck('Array');

    this.setOutput(false);
    this.setColour('#2E5159');
    this.setTooltip("Calculate the frequency distribution for the given data and bins.");
    this.setHelpUrl("");
    this.setOutput(true);
  }
};
pythonGenerator['frequency'] = function (block: Blockly.Block): [string, number] {
  let value_x = pythonGenerator.valueToCode(block, 'x', pythonGenerator.ORDER_MEMBER) || '';
  let bins: string = pythonGenerator.valueToCode(block, 'bins', pythonGenerator.ORDER_MEMBER) || '';
  let getBaseCode = value_x;
  const repositoryEntry: [string, string, string] | null = globalVariableRepository[value_x];
  if (repositoryEntry) {
    const [, , blockType] = repositoryEntry;
    if (blockType == "lists_create_with") {
      getBaseCode = `pd.DataFrame(${value_x})`;
      pythonGenerator.definitions_['import_pandas'] = 'import pandas as pd';
    }
  }
  const code: string = bins
    ? `pd.value_counts(pd.cut(${getBaseCode}, bins=${bins}))`
    : `${getBaseCode}.value_counts()`;
  return [code, pythonGenerator.ORDER_FUNCTION_CALL];
};

/**
 * Block for calculating the quartiles of a dataset.
 * @this Blockly.Block
 */
Blockly.Blocks['quartis'] = {
  init: function () {
    this.appendValueInput("x")
      .appendField("(Quartiles) ")
      .appendField("X: ")
      .setCheck('Array');

    this.setOutput(false);
    this.setColour('#2E5159');
    this.setTooltip("Calculate the quartiles for the given data.");
    this.setHelpUrl("");
    this.setOutput(true);
  }
};
pythonGenerator['quartis'] = function (block: Blockly.Block): [string, number] {
  let value_x: string = pythonGenerator.valueToCode(block, 'x', pythonGenerator.ORDER_MEMBER) || '';
  let child: Blockly.Block | null = (block.getInputTargetBlock('x')) ? block.getInputTargetBlock('x') : null;
  let code: string = value_x + '.describe()'
  const repositoryEntry: [string, string, string] | null = globalVariableRepository[value_x];
  if (repositoryEntry) {
    const [, , blockType] = repositoryEntry;
    if (blockType == "lists_create_with" || child?.type == "lists_create_with") {
      code = 'pd.DataFrame(' + value_x + ').describe()';
    }
  }
  if (code.includes('pd.')) {
    pythonGenerator.definitions_['import_pandas'] = 'import pandas as pd';
  }
  return [code, pythonGenerator.ORDER_FUNCTION_CALL];
};

/**
 * Block for creating a line graph from data arrays for the X and Y axes and an optional layout configuration.
 * @this Blockly.Block
 */
Blockly.Blocks['lineGraph'] = {
  init: function () {
    this.appendValueInput("x")
      .appendField("(Line Graph):")
      .appendField("X: ")
      .setCheck("Array");

    this.appendValueInput("y")
      .setAlign(Blockly.inputs.Align.RIGHT)
      .appendField("Y: ")
      .setCheck("Array");

    this.appendValueInput("layout")
      .setAlign(Blockly.inputs.Align.RIGHT)
      .appendField("layout:");

    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setOutput(false);
    this.setColour('green');
    this.setTooltip("Create a line graph with specified X and Y data arrays and optional layout.");
    this.setHelpUrl("");
  }
};
pythonGenerator['lineGraph'] = function (block: any): string {
  let value_x: string = pythonGenerator.valueToCode(block, 'x', pythonGenerator.ORDER_MEMBER) || 'None';
  let value_y: string = pythonGenerator.valueToCode(block, 'y', pythonGenerator.ORDER_MEMBER) || 'None';
  let layout: string = pythonGenerator.valueToCode(block, 'layout', pythonGenerator.ORDER_MEMBER) || '{}';
  let x_block = block.getInputTargetBlock('x');
  if (x_block && x_block.type === 'variables_get') {
    let myblocks = Blockly.getMainWorkspace().getAllBlocks();
    for (var i = 0; i < myblocks.length; i++) {
      if (myblocks[i].type == 'variables_set') {
        var aux = pythonGenerator.nameDB_.getName(myblocks[i].getFieldValue('VAR'), Blockly.VARIABLE_CATEGORY_NAME)
        if (aux === value_x) {
          x_block = myblocks[i].getInputTargetBlock('VALUE')
        }
      }
    }
  }
  if (x_block && x_block.type == "aggFunc") {
    return 'sns.lineplot(' + value_x + ').set(**' + layout + ')\n'
  }
  const repositoryEntry: [string, string, string] | null = globalVariableRepository[value_x];
  if (repositoryEntry) {
    const [, , blockType] = repositoryEntry;
    if (blockType == "aggFunc") {
      return 'sns.lineplot(' + value_x + ').set(**' + layout + ')\n';
    }
  }
  if (block.getInputTargetBlock('x')) {
    let block_x_type = block.getInputTargetBlock('x')?.type
    if (block_x_type != 'lists_create_with' && block_x_type != 'select' && !block.getInputTargetBlock('y')) {
      return 'sns.lineplot(' + value_x + '.index, ' + value_x + '.values).set(**' + layout + ')\n'
    }
  }
  if (block.getInputTargetBlock('y')) {
    let block_y_type = block.getInputTargetBlock('y')?.type
    if (block_y_type != 'lists_create_with' && block_y_type != 'select' && !block.getInputTargetBlock('x')) {
      return 'sns.lineplot(' + value_y + '.index, ' + value_y + '.values).set(**' + layout + ')\n'
    }
  }
  let y_block = block.getInputTargetBlock('y')
  if (y_block && y_block.type === 'variables_get') {
    var myblocks = Blockly.getMainWorkspace().getAllBlocks()
    for (var i = 0; i < myblocks.length; i++) {
      if (myblocks[i].type == 'variables_set') {
        var aux = pythonGenerator.nameDB_.getName(myblocks[i].getFieldValue('VAR'), Blockly.VARIABLE_CATEGORY_NAME)
        if (aux === value_x) {
          y_block = myblocks[i].getInputTargetBlock('VALUE')
        }
      }
    }
  }
  let dataframe = '""'
  let x: any = ''
  let y: any = ''
  if (x_block?.type == "select") {
    dataframe = pythonGenerator.valueToCode(x_block, 'select', pythonGenerator.ORDER_MEMBER) || 'None';
    x = new Array(x_block.itemCount_)
    for (var i = 0; i < x_block.itemCount_; i++) {
      x[i] = pythonGenerator.valueToCode(x_block, 'ADD' + i,
        pythonGenerator.ORDER_NONE) || 'null';
    };
  }
  if (y_block?.type == "select") {
    dataframe = pythonGenerator.valueToCode(y_block, 'select', pythonGenerator.ORDER_MEMBER) || 'None';
    y = new Array(y_block.itemCount_)
    for (var i = 0; i < y_block.itemCount_; i++) {
      y[i] = pythonGenerator.valueToCode(y_block, 'ADD' + i,
        pythonGenerator.ORDER_NONE) || 'null';
    };
  }
  if (y.length > 1) {
    var code = 'melted_df = pd.melt(' + dataframe + ', id_vars=[' + x + '], value_vars=[' + y + '], var_name="hue", value_name="value")\n'
    code += 'sns.lineplot(data=melted_df, x=' + x + ', y="value", hue="hue").set(**' + layout + ')\n'
    return code
  }
  pythonGenerator.definitions_['import_seaborn'] = 'import seaborn as sns';
  return 'sns.lineplot(x = ' + value_x + ', y = ' + value_y + ').set(**' + layout + ')\n'
};

/**
 * Block for creating a pie chart from data arrays for the X (categories) and Y (values) axes 
 * and an optional layout configuration.
 * @this Blockly.Block
 */
Blockly.Blocks['pieGraph'] = {
  init: function () {
    this.appendValueInput("x")
      .appendField("(Pie Graph):")
      .appendField("X: ")
      .setCheck("Array");

    this.appendValueInput("y")
      .setAlign(Blockly.inputs.Align.RIGHT)
      .appendField("Y: ")
      .setCheck("Array");

    this.appendValueInput("layout")
      .setAlign(Blockly.inputs.Align.RIGHT)
      .appendField("layout:");

    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setOutput(false);
    this.setColour('green');
    this.setTooltip("Create a pie chart with specified X (categories) and Y (values) data arrays and optional layout.");
    this.setHelpUrl("");
  }
};
pythonGenerator['pieGraph'] = function (block: Blockly.Block): string {
  var value_x: string = pythonGenerator.valueToCode(block, 'x', pythonGenerator.ORDER_MEMBER) || '';
  var value_y: string = pythonGenerator.valueToCode(block, 'y', pythonGenerator.ORDER_MEMBER) || '';
  var layout: string = pythonGenerator.valueToCode(block, 'layout', pythonGenerator.ORDER_MEMBER) || '{}';
  let code: string = 'plt.pie(' + value_y + ', labels=' + value_x + ')';
  if (block.getInputTargetBlock('x')) {
    let block_x_type = block.getInputTargetBlock('x')?.type
    if (block_x_type != 'lists_create_with' && block_x_type != 'select' && !block.getInputTargetBlock('y')) {
      code = 'plt.pie(' + value_x + '.values, labels=' + value_x + '.index)'
    }
  }
  if (block.getInputTargetBlock('y')) {
    let block_y_type = block.getInputTargetBlock('y')?.type
    if (block_y_type != 'lists_create_with' && block_y_type != 'select' && !block.getInputTargetBlock('x')) {
      code = 'plt.pie(' + value_y + '.values, labels=' + value_y + '.index)'
    }
  }
  layout = layout.replace(/,.+/gm, '')
  if (layout.length > 2) {
    layout = layout + '}'
  }
  if (layout != '{}') {
    code += '\nplt.legend(**' + layout + ')'
  }
  pythonGenerator.definitions_['import_matplotlib.pyplot'] = 'import matplotlib.pyplot as plt';
  return code + '\n';
};

/**
 * Block for creating a bar graph from data arrays for the X (categories) and Y (values) axes 
 * and an optional layout configuration.
 * @this Blockly.Block
 */
Blockly.Blocks['barGraph'] = {
  init: function () {
    this.appendValueInput("x")
      .appendField("(Bar Graph): ")
      .appendField("X: ")
      .setCheck("Array");

    this.appendValueInput("y")
      .setAlign(Blockly.inputs.Align.RIGHT)
      .appendField("Y: ")
      .setCheck("Array");

    this.appendValueInput("layout")
      .setAlign(Blockly.inputs.Align.RIGHT)
      .appendField("layout:");

    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setOutput(false);
    this.setColour('green');
    this.setTooltip("Create a bar graph with specified X (categories) and Y (values) data arrays and optional layout.");
    this.setHelpUrl("");
  }
};
pythonGenerator['barGraph'] = function (block: any): string {
  var value_x: string = pythonGenerator.valueToCode(block, 'x', pythonGenerator.ORDER_MEMBER) || '[]';
  var value_y: string = pythonGenerator.valueToCode(block, 'y', pythonGenerator.ORDER_MEMBER) || '[]';
  var layout: string = pythonGenerator.valueToCode(block, 'layout', pythonGenerator.ORDER_MEMBER) || '{}';
  if (block.getInputTargetBlock('x')) {
    let block_x_type = block.getInputTargetBlock('x')?.type
    if (block_x_type != 'lists_create_with' && block_x_type != 'select' && !block.getInputTargetBlock('y')) {
      return `sns.barplot(x = ${value_x}.index, y = ${value_x}.values).set(**${layout})\n`
    }
  }
  if (block.getInputTargetBlock('y')) {
    let block_y_type = block.getInputTargetBlock('y')?.type
    if (block_y_type != 'lists_create_with' && block_y_type != 'select' && !block.getInputTargetBlock('x')) {
      return `sns.barplot(x = ${value_y}.index, y = ${value_y}.values).set(**${layout})\n`
    }
  }
  let df_block = block.getInputTargetBlock('x')
  if (df_block && df_block.type === 'variables_get') {
    var myblocks = Blockly.getMainWorkspace().getAllBlocks()
    for (var i = 0; i < myblocks.length; i++) {
      if (myblocks[i].type == 'variables_set') {
        var aux = pythonGenerator.nameDB_.getName(myblocks[i].getFieldValue('VAR'), Blockly.VARIABLE_CATEGORY_NAME)
        if (aux === value_x) {
          df_block = myblocks[i].getInputTargetBlock('VALUE')
        }
      }
    }
  }
  let y_block = block.getInputTargetBlock('y')
  if (y_block && y_block.type === 'variables_get') {
    var myblocks = Blockly.getMainWorkspace().getAllBlocks()
    for (var i = 0; i < myblocks.length; i++) {
      if (myblocks[i].type == 'variables_set') {
        var aux = pythonGenerator.nameDB_.getName(myblocks[i].getFieldValue('VAR'), Blockly.VARIABLE_CATEGORY_NAME)
        if (aux === value_x) {
          y_block = myblocks[i].getInputTargetBlock('VALUE')
        }
      }
    }
  }
  let dataframe = '""'
  let x: any = ''
  let y: any = ''
  if (df_block.type == "select") {
    dataframe = pythonGenerator.valueToCode(df_block, 'select', pythonGenerator.ORDER_MEMBER) || 'None';
    x = new Array(df_block.itemCount_)
    for (var i = 0; i < df_block.itemCount_; i++) {
      x[i] = pythonGenerator.valueToCode(df_block, 'ADD' + i,
        pythonGenerator.ORDER_NONE) || 'null';
    };
  }
  if (y_block.type == "select") {
    dataframe = pythonGenerator.valueToCode(y_block, 'select', pythonGenerator.ORDER_MEMBER) || 'None';
    y = new Array(y_block.itemCount_)
    for (var i = 0; i < y_block.itemCount_; i++) {
      y[i] = pythonGenerator.valueToCode(y_block, 'ADD' + i,
        pythonGenerator.ORDER_NONE) || 'null';
    };
  }
  if (y.length > 1) {
    var code = 'melted_df = pd.melt(' + dataframe + ', id_vars=[' + x + '], value_vars=[' + y + '], var_name="hue", value_name="value")\n'
    code += 'sns.barplot(data=melted_df, x=' + x + ', y="value", hue="hue")\n'
    return code
  }
  pythonGenerator.definitions_['import_seaborn'] = 'import seaborn as sns';
  return 'sns.barplot(x = ' + value_x + ', y = ' + value_y + ').set(**' + layout + ')\n'
};

/**
 * Block for creating a histogram from data arrays for the X (values) axis 
 * and a specified number of bins, with an optional layout configuration.
 * @this Blockly.Block
 */
Blockly.Blocks['histogramGraph'] = {
  init: function () {
    this.appendValueInput("x")
      .appendField("(Histogram Graph) ")
      .appendField("X: ")
      .setCheck("Array");

    this.appendValueInput("y")
      .setAlign(Blockly.inputs.Align.RIGHT)
      .appendField("Bins: ")

    this.appendValueInput("layout")
      .setAlign(Blockly.inputs.Align.RIGHT)
      .appendField("layout:");

    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setOutput(false);
    this.setColour('green');
    this.setTooltip("Create a histogram with specified X (values) data array, number of bins, and optional layout.");
    this.setHelpUrl("");
  }
};
pythonGenerator['histogramGraph'] = function (block: Blockly.Block): string {
  var value_x: string = pythonGenerator.valueToCode(block, 'x', pythonGenerator.ORDER_MEMBER) || '[]';
  var bins: string = pythonGenerator.valueToCode(block, 'y', pythonGenerator.ORDER_MEMBER) || '';
  var layout: string = pythonGenerator.valueToCode(block, 'layout', pythonGenerator.ORDER_MEMBER) || '{}';
  if (bins) {
    return `sns.histplot(${value_x}, bins = ${bins}, kde=False).set(**${layout})\n`
  }
  pythonGenerator.definitions_['import_seaborn'] = 'import seaborn as sns';
  return `sns.histplot(${value_x}, kde=False).set(**${layout})\n`;
};

/**
 * Block for creating a boxplot graph from data arrays for the X axis and an optional layout configuration.
 * @this Blockly.Block
 */
Blockly.Blocks['boxplotGraph'] = {
  init: function () {
    this.appendValueInput("x")
      .appendField("(Boxplot Graph) ")
      .appendField("X: ")
      .setCheck("Array");

    this.appendValueInput("layout")
      .setAlign(Blockly.inputs.Align.RIGHT)
      .appendField("layout:");

    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setOutput(false);
    this.setColour('green');
    this.setTooltip("Create a boxplot graph with specified X data array and optional layout.");
    this.setHelpUrl("");
  }
};
pythonGenerator['boxplotGraph'] = function (block: Blockly.Block): string {
  var value_x: string = pythonGenerator.valueToCode(block, 'x', pythonGenerator.ORDER_MEMBER) || '[]';
  var layout: string = pythonGenerator.valueToCode(block, 'layout', pythonGenerator.ORDER_MEMBER) || '{}';
  pythonGenerator.definitions_['import_seaborn'] = 'import seaborn as sns';
  return `sns.boxplot(${value_x}).set(**${layout})\n`;
};

/**
 * Block for creating a scatter plot from data arrays for the X and Y axes, 
 * a color array for data points, and an optional layout configuration.
 * @this Blockly.Block
 */
Blockly.Blocks['scatterGraph'] = {
  init: function () {
    this.appendValueInput("x")
      .appendField("(Scatter Graph) ")
      .appendField("X: ")
      .setCheck("Array");

    this.appendValueInput("y")
      .setAlign(Blockly.inputs.Align.RIGHT)
      .appendField("Y: ")
      .setCheck("Array");

    this.appendValueInput("colour")
      .setAlign(Blockly.inputs.Align.RIGHT)
      .appendField("Colour: ")
      .setCheck("Array");

    this.appendValueInput("layout")
      .setAlign(Blockly.inputs.Align.RIGHT)
      .appendField("layout:");

    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setOutput(false);
    this.setColour('green');
    this.setTooltip("Create a scatter plot with specified X, Y data arrays, a color array, and optional layout.");
    this.setHelpUrl("");
  }
};
pythonGenerator['scatterGraph'] = function (block: any): string {
  let value_x: string = pythonGenerator.valueToCode(block, 'x', pythonGenerator.ORDER_MEMBER) || '[]';
  let value_y: string = pythonGenerator.valueToCode(block, 'y', pythonGenerator.ORDER_MEMBER) || '[]';
  let colour: string = pythonGenerator.valueToCode(block, 'colour', pythonGenerator.ORDER_MEMBER) || '';
  let layout: string = pythonGenerator.valueToCode(block, 'layout', pythonGenerator.ORDER_MEMBER) || '{}';

  const hue: string = colour ? `, hue = ${colour}` : ''

  if (block.getInputTargetBlock('x')) {
    let block_x_type = block.getInputTargetBlock('x').type
    if (block_x_type != 'lists_create_with' && block_x_type != 'select' && !block.getInputTargetBlock('y')) {
      return `sns.scatterplot(x = ${value_x}.index, y = ${value_x}.values ${hue}).set(**${layout})\n`
    }
  }
  if (block.getInputTargetBlock('y')) {
    let block_y_type = block.getInputTargetBlock('y').type
    if (block_y_type != 'lists_create_with' && block_y_type != 'select' && !block.getInputTargetBlock('x')) {
      return `sns.scatterplot(x = ${value_y}.index, y = ${value_y}.values ${hue}).set(**${layout})\n`
    }
  }
  pythonGenerator.definitions_['import_seaborn'] = 'import seaborn as sns';
  return `sns.scatterplot(x = ${value_x}, y = ${value_y} ${hue}).set(**${layout})\n`
};


/**
 * Block for displaying data in a table view format using a DataFrame.
 * @this Blockly.Block
 */
Blockly.Blocks['tableViewGraph'] = {
  init: function () {
    this.appendValueInput("tableView")
      .appendField("(Table View Graph) ")
      .appendField("DataFrame: ");

    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setOutput(false);
    this.setColour('green');
    this.setTooltip("Display data in a table view format using a DataFrame.");
    this.setHelpUrl("");
  }
};
pythonGenerator['tableViewGraph'] = function (block: Blockly.Block): string {
  const dataFrame: string = pythonGenerator.valueToCode(block, 'tableView', pythonGenerator.ORDER_MEMBER) || '';
  return 'print(' + dataFrame + ')\n';
}

/**
 * Block for creating a map graph based on the selected country, location, values, and zoom level.
 * @this Blockly.Block
 */
Blockly.Blocks['mapGraph'] = {
  init: function () {
    this.appendDummyInput('map')
      .appendField("Country")
      .appendField(new Blockly.FieldDropdown([
        ['Brazil', 'brazil'],
        ['USA', 'usa'],
        ['World', 'world']
      ]), 'COUNTRY');

    this.appendValueInput("location")
      .setAlign(Blockly.inputs.Align.RIGHT)
      .appendField("(Maps)")
      .appendField("Location: ");

    this.appendValueInput("values")
      .setAlign(Blockly.inputs.Align.RIGHT)
      .appendField("Values: ");

    this.appendValueInput("zoom")
      .setAlign(Blockly.inputs.Align.RIGHT)
      .appendField("Zoom: ");

    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setOutput(false);
    this.setColour('green');
    this.setTooltip("Create a map graph for the selected country, location, values, and zoom level.");
    this.setHelpUrl("");
  }
};
pythonGenerator['mapGraph'] = function (block: any): string {
  let country: string = block.getFieldValue('COUNTRY') || '';
  let location: string = pythonGenerator.valueToCode(block, 'location', pythonGenerator.ORDER_MEMBER) || '""';
  let values: string = pythonGenerator.valueToCode(block, 'values', pythonGenerator.ORDER_MEMBER) || '[]';
  let zoom: string = pythonGenerator.valueToCode(block, 'zoom', pythonGenerator.ORDER_MEMBER) || '5';
  let location_block = block.getInputTargetBlock('location');
  if (location_block && location_block.type === 'variables_get') {
    var myblocks = Blockly.getMainWorkspace().getAllBlocks()
    for (var i = 0; i < myblocks.length; i++) {
      if (myblocks[i].type == 'variables_set') {
        var aux = pythonGenerator.nameDB_.getName(myblocks[i].getFieldValue('VAR'), Blockly.VARIABLE_CATEGORY_NAME)
        if (aux === location) {
          location_block = myblocks[i].getInputTargetBlock('VALUE')
        }
      }
    }
  }
  let values_block = block.getInputTargetBlock('values')
  if (values_block && values_block.type === 'variables_get') {
    var myblocks = Blockly.getMainWorkspace().getAllBlocks()
    for (var i = 0; i < myblocks.length; i++) {
      if (myblocks[i].type == 'variables_set') {
        var aux = pythonGenerator.nameDB_.getName(myblocks[i].getFieldValue('VAR'), Blockly.VARIABLE_CATEGORY_NAME)
        if (aux === values) {
          values_block = myblocks[i].getInputTargetBlock('VALUE')
        }
      }
    }
  }
  let df: string = "";
  let fields = []
  if (location_block && location_block.type == "select") {
    df = pythonGenerator.valueToCode(location_block, 'select', pythonGenerator.ORDER_MEMBER) || '""';
    fields.push(location_block.getInputTargetBlock('ADD0').inputList[0].fieldRow[1].value_)
  }
  if (values_block && values_block.type == "select") {
    fields.push(values_block.getInputTargetBlock('ADD0').inputList[0].fieldRow[1].value_)
  }
  const geo = new Map()
  geo.set("usa", {
    geojson: "https://raw.githubusercontent.com/lcbjrrr/quant/master/us_states.json",
    lon: 43,
    lat: -85
  })
  geo.set("brazil", {
    geojson: "https://raw.githubusercontent.com/lcbjrrr/quant/master/br_states.json",
    lon: -15.8299,
    lat: -47.8599
  })
  geo.set("world", {
    geojson: "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json",
    lon: -15.8299,
    lat: -30
  })
  let map = pythonGenerator.provideFunction_(
    'choroplethMap',
    [
      'def ' + pythonGenerator.FUNCTION_NAME_PLACEHOLDER_ + '(dataframe, columns, zoom):',
      '  map = folium.Map(location=[' + geo.get(country).lon + ', ' + geo.get(country).lat + '], zoom_start=zoom)',
      '  folium.Choropleth(',
      '    geo_data = "' + geo.get(country).geojson + '",',
      '    data = dataframe,',
      '    columns = columns,',
      '    key_on = "feature.id",',
      '  ).add_to(map)',
      '  return map'
    ])
  pythonGenerator.definitions_['import_folium'] = 'import folium';
  const code: string = map + '(' + df + ', ' + JSON.stringify(fields) + ', ' + zoom + ')\n';
  return code;
}


/**
 * Block for creating a heat map using a given data array.
 * @this Blockly.Block
 */
Blockly.Blocks['heatMap'] = {
  init: function () {
    this.appendValueInput('data')
      .appendField('(Heat Map)')
      .appendField('Data:');

    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setOutput(false);
    this.setColour('green');
    this.setTooltip("Create a heat map using the provided data.");
    this.setHelpUrl("");
  }
};
pythonGenerator['heatMap'] = function (block: Blockly.Block): string {
  let data: string = pythonGenerator.valueToCode(block, 'data', pythonGenerator.ORDER_MEMBER) || '[]';
  pythonGenerator.definitions_['import_sns'] = 'import seaborn as sns';
  return 'sns.heatmap(' + data + ', annot=True)\n';
}

/**
 * Block for creating a layout with customizable fields for axis labels, title, and other chart settings.
 * @this Blockly.Block
 */
Blockly.Blocks['layout'] = {
  init: function () {
    this.updateShape_();
    const mutator = new Blockly.icons.MutatorIcon(['lists_create_with_item'], this);
    this.setMutator(mutator);
    this.itemCount_ = 3;

    this.setOutput(true, "Array");
    this.setColour('green');
    this.setTooltip("Create a layout with customizable fields for chart settings like axes and title.");
    this.setHelpUrl("");
  },
  mutationToDom: function () {
    var container = document.createElement('mutation');
    container.setAttribute('items', this.itemCount_);
    return container;
  },
  domToMutation: function (xmlElement: any) {
    this.itemCount_ = parseInt(xmlElement.getAttribute('items'), 10);
    this.updateShape_();
  },
  decompose: function (workspace: Blockly.WorkspaceSvg) {
    var containerBlock = workspace.newBlock('lists_create_with_container');
    containerBlock.initSvg();
    var connection = containerBlock.getInput('STACK')?.connection;
    for (var i = 0; i < this.itemCount_; i++) {
      var itemBlock = workspace.newBlock('lists_create_with_item');
      itemBlock.initSvg();
      connection?.connect(itemBlock.previousConnection);
      connection = itemBlock.nextConnection;
    }
    return containerBlock;
  },
  compose: function (containerBlock: any) {
    var itemBlock = containerBlock.getInputTargetBlock('STACK');
    var connections = [];
    while (itemBlock) {
      connections.push(itemBlock.valueConnection_);
      itemBlock = itemBlock.nextConnection &&
        itemBlock.nextConnection.targetBlock();
    }
    for (var i = 0; i < this.itemCount_; i++) {
      var connection = this.getInput('ADD' + i).connection.targetConnection;
      if (connection && connections.indexOf(connection) == -1) {
        connection.disconnect();
      }
    }
    this.itemCount_ = connections.length;
    this.updateShape_();
  },
  saveConnections: function (containerBlock: any) {
    var itemBlock = containerBlock.getInputTargetBlock('STACK');
    var i = 0;
    while (itemBlock) {
      var input = this.getInput('ADD' + i);
      itemBlock.valueConnection_ = input && input.connection.targetConnection;
      i++;
      itemBlock = itemBlock.nextConnection &&
        itemBlock.nextConnection.targetBlock();
    }
  },
  updateShape_: function () {
    if (this.itemCount_ && this.getInput('EMPTY')) {
      this.removeInput('EMPTY');
    } else if (!this.itemCount_ && !this.getInput('EMPTY')) {
      this.appendDummyInput('EMPTY')
        .appendField('Layout  ');
    }
    for (var i = 0; i < this.itemCount_; i++) {
      var deafultText = '';
      if (!this.getInput('ADD' + i)) {
        if (i == 0) { deafultText = 'xaxis'; }
        if (i == 1) { deafultText = 'yaxis'; }
        if (i == 2) { deafultText = 'title'; }

        var input = this.appendValueInput('ADD' + i);
        if (i == 0) { input.appendField('Layout'); }
        if (i > 0) {
          input.setAlign(Blockly.inputs.Align.RIGHT)
          input.appendField('');
        }
        input.appendField(new Blockly.FieldTextInput(deafultText), 'FIELDNAME' + i);
      }
    }
    while (this.getInput('ADD' + i)) {
      this.removeInput('ADD' + i);
      i++;
    }
  }
};
pythonGenerator['layout'] = function (block: any): [string, number] {
  let values = new Array(block.itemCount_);
  for (let i = 0; i < block.itemCount_; i++) {
    values[i] = pythonGenerator.valueToCode(block, 'ADD' + i,
      pythonGenerator.ORDER_NONE) || 'None';
  };
  let keys = [];
  for (let i = 0; i < block.inputList.length; i++) {
    keys.push(block.inputList[i].fieldRow[1].value_);
  }
  let x = '';
  let y = '';
  let title = '';
  if (keys.indexOf('xaxis') >= 0) {
    x = values[keys.indexOf('xaxis')];
  }
  else if (keys.indexOf('x') >= 0) {
    x = values[keys.indexOf('x')];
  }

  if (keys.indexOf('yaxis') >= 0) {
    y = values[keys.indexOf('yaxis')];
  }
  else if (keys.indexOf('y') >= 0) {
    y = values[keys.indexOf('y')];
  }

  if (keys.indexOf('title') >= 0) {
    title = values[keys.indexOf('title')];
  }
  const code: string = `{'title':${title}, 'xlabel':${x}, 'ylabel':${y}}`;
  return [code, pythonGenerator.ORDER_FUNCTION_CALL];
};

export const toolbox = `
<xml xmlns=\"https://developers.google.com/blockly/xml\" id=\"toolbox\" style=\"display: none\">
  <category name=\"LOGIC\" colour=\"%{BKY_LOGIC_HUE}\">
    <block type=\"controls_if\"></block>
    <block type=\"logic_compare\"></block>
    <block type=\"logic_operation\"></block>
    <block type=\"logic_negate\"></block>
    <block type=\"logic_boolean\"></block>
    <block type=\"logic_null\"></block>
    <block type=\"logic_ternary\"></block>
  </category>
  <category name=\"LOOPS\" colour=\"%{BKY_LOOPS_HUE}\">
    <block type=\"controls_repeat_ext\">
      <value name=\"TIMES\">
        <shadow type=\"math_number\">
          <field name=\"NUM\">10</field>
        </shadow>
      </value>
    </block>
    <block type=\"controls_whileUntil\"></block>
    <block type=\"controls_for\">
      <value name=\"FROM\">
        <shadow type=\"math_number\">
          <field name=\"NUM\">1</field>
        </shadow>
      </value>
      <value name=\"TO\">
        <shadow type=\"math_number\">
          <field name=\"NUM\">10</field>
        </shadow>
      </value>
      <value name=\"BY\">
        <shadow type=\"math_number\">
          <field name=\"NUM\">1</field>
        </shadow>
      </value>
    </block>
    <block type=\"controls_forEach\"></block>
    <block type=\"controls_flow_statements\"></block>
  </category>
  <category name=\"MATH\" colour=\"%{BKY_MATH_HUE}\">
    <block type=\"math_number\">
      <field name=\"NUM\">123</field>
    </block>
    <block type=\"math_arithmetic\">
      <value name=\"A\">
        <shadow type=\"math_number\">
          <field name=\"NUM\">1</field>
        </shadow>
      </value>
      <value name=\"B\">
        <shadow type=\"math_number\">
          <field name=\"NUM\">1</field>
        </shadow>
      </value>
    </block>
    <block type=\"math_single\">
      <value name=\"NUM\">
        <shadow type=\"math_number\">
          <field name=\"NUM\">9</field>
        </shadow>
      </value>
    </block>
    <block type=\"math_trig\">
      <value name=\"NUM\">
        <shadow type=\"math_number\">
          <field name=\"NUM\">45</field>
        </shadow>
      </value>
    </block>
    <block type=\"math_constant\"></block>
    <block type=\"math_number_property\">
      <value name=\"NUMBER_TO_CHECK\">
        <shadow type=\"math_number\">
          <field name=\"NUM\">0</field>
        </shadow>
      </value>
    </block>
    <block type=\"math_round\">
      <value name=\"NUM\">
        <shadow type=\"math_number\">
          <field name=\"NUM\">3.1</field>
        </shadow>
      </value>
    </block>
    <block type=\"math_on_list\"></block>
    <block type=\"math_modulo\">
      <value name=\"DIVIDEND\">
        <shadow type=\"math_number\">
          <field name=\"NUM\">64</field>
        </shadow>
      </value>
      <value name=\"DIVISOR\">
        <shadow type=\"math_number\">
          <field name=\"NUM\">10</field>
        </shadow>
      </value>
    </block>
    <block type=\"math_constrain\">
      <value name=\"VALUE\">
        <shadow type=\"math_number\">
          <field name=\"NUM\">50</field>
        </shadow>
      </value>
      <value name=\"LOW\">
        <shadow type=\"math_number\">
          <field name=\"NUM\">1</field>
        </shadow>
      </value>
      <value name=\"HIGH\">
        <shadow type=\"math_number\">
          <field name=\"NUM\">100</field>
        </shadow>
      </value>
    </block>
    <block type=\"math_random_int\">
      <value name=\"FROM\">
        <shadow type=\"math_number\">
          <field name=\"NUM\">1</field>
        </shadow>
      </value>
      <value name=\"TO\">
        <shadow type=\"math_number\">
          <field name=\"NUM\">100</field>
        </shadow>
      </value>
    </block>
    <block type=\"math_random_float\"></block>
    <block type=\"math_atan2\">
      <value name=\"X\">
        <shadow type=\"math_number\">
          <field name=\"NUM\">1</field>
        </shadow>
      </value>
      <value name=\"Y\">
        <shadow type=\"math_number\">
          <field name=\"NUM\">1</field>
        </shadow>
      </value>
    </block>
  </category>
  <category name=\"TEXT\" colour=\"%{BKY_TEXTS_HUE}\">
    <block type=\"text\"></block>
    <block type=\"text_print\">
      <value name=\"TEXT\">
        <shadow type=\"text\">
          <field name=\"TEXT\">abc</field>
        </shadow>
      </value>
    </block>
    <block type=\"text_join\"></block>
    <block type=\"text_append\">
      <value name=\"TEXT\">
        <shadow type=\"text\"></shadow>
      </value>
    </block>
    <block type=\"text_length\">
      <value name=\"VALUE\">
        <shadow type=\"text\">
          <field name=\"TEXT\">abc</field>
        </shadow>
      </value>
    </block>
    <block type=\"text_isEmpty\">
      <value name=\"VALUE\">
        <shadow type=\"text\">
          <field name=\"TEXT\"></field>
        </shadow>
      </value>
    </block>
    <block type=\"text_indexOf\">
      <value name=\"VALUE\">
        <block type=\"variables_get\">
          <field name=\"VAR\">{textVariable}</field>
        </block>
      </value>
      <value name=\"FIND\">
        <shadow type=\"text\">
          <field name=\"TEXT\">abc</field>
        </shadow>
      </value>
    </block>
    <block type=\"text_charAt\">
      <value name=\"VALUE\">
        <block type=\"variables_get\">
          <field name=\"VAR\">{textVariable}</field>
        </block>
      </value>
    </block>
    <block type=\"text_getSubstring\">
      <value name=\"STRING\">
        <block type=\"variables_get\">
          <field name=\"VAR\">{textVariable}</field>
        </block>
      </value>
    </block>
    <block type=\"text_changeCase\">
      <value name=\"TEXT\">
        <shadow type=\"text\">
          <field name=\"TEXT\">abc</field>
        </shadow>
      </value>
    </block>
    <block type=\"text_trim\">
      <value name=\"TEXT\">
        <shadow type=\"text\">
          <field name=\"TEXT\">abc</field>
        </shadow>
      </value>
    </block>
    <block type=\"text_prompt_ext\">
      <value name=\"TEXT\">
        <shadow type=\"text\">
          <field name=\"TEXT\">abc</field>
        </shadow>
      </value>
    </block>
  </category>
  <category name=\"LISTS\" colour=\"%{BKY_LISTS_HUE}\">
    <block type=\"lists_create_with\">
      <mutation items=\"0\"></mutation>
    </block>
    <block type=\"lists_create_with\"></block>
    <block type=\"lists_repeat\">
      <value name=\"NUM\">
        <shadow type=\"math_number\">
          <field name=\"NUM\">5</field>
        </shadow>
      </value>
    </block>
    <block type=\"lists_length\"></block>
    <block type=\"lists_isEmpty\"></block>
    <block type=\"lists_indexOf\">
      <value name=\"VALUE\">
        <block type=\"variables_get\">
          <field name=\"VAR\">{listVariable}</field>
        </block>
      </value>
    </block>
    <block type=\"lists_getIndex\">
      <value name=\"VALUE\">
        <block type=\"variables_get\">
          <field name=\"VAR\">{listVariable}</field>
        </block>
      </value>
    </block>
    <block type=\"lists_setIndex\">
      <value name=\"LIST\">
        <block type=\"variables_get\">
          <field name=\"VAR\">{listVariable}</field>
        </block>
      </value>
    </block>
    <block type=\"lists_getSublist\">
      <value name=\"LIST\">
        <block type=\"variables_get\">
          <field name=\"VAR\">{listVariable}</field>
        </block>
      </value>
    </block>
    <block type=\"lists_split\">
      <value name=\"DELIM\">
        <shadow type=\"text\">
          <field name=\"TEXT\">,</field>
        </shadow>
      </value>
    </block>
    <block type="lists_sort"></block>
  </category>
  <category name=\"COLOUR\" colour=\"%{BKY_COLOUR_HUE}\">
    <block type=\"colour_picker\"></block>
    <block type=\"colour_random\"></block>
    <block type=\"colour_rgb\">
      <value name=\"RED\">
        <shadow type=\"math_number\">
          <field name=\"NUM\">100</field>
        </shadow>
      </value>
      <value name=\"GREEN\">
        <shadow type=\"math_number\">
          <field name=\"NUM\">50</field>
        </shadow>
      </value>
      <value name=\"BLUE\">
        <shadow type=\"math_number\">
          <field name=\"NUM\">0</field>
        </shadow>
      </value>
    </block>
    <block type=\"colour_blend\">
      <value name=\"COLOUR1\">
        <shadow type=\"colour_picker\">
          <field name=\"COLOUR\">#ff0000</field>
        </shadow>
      </value>
      <value name=\"COLOUR2\">
        <shadow type=\"colour_picker\">
          <field name=\"COLOUR\">#3333ff</field>
        </shadow>
      </value>
      <value name=\"RATIO\">
        <shadow type=\"math_number\">
          <field name=\"NUM\">0.5</field>
        </shadow>
      </value>
    </block>
  </category>
  <sep></sep>
  <category name=\"VARIABLES\" colour=\"%{BKY_VARIABLES_HUE}\" custom=\"VARIABLE\"></category>
  <category name=\"FUNCTIONS\" colour=\"%{BKY_PROCEDURES_HUE}\" custom=\"PROCEDURE\"></category>
  <sep></sep>
  <category name=\"MODELS\" colour="#5566A6">
    <block type="linear_regression_model"></block>
    <block type="logistic_regression_model"></block>
    <block type="knn_model"></block>
    <block type="naive_bayes_model"></block>
    <block type="decision_tree_model"></block>
    <block type="neural_network_model"></block>
    <block type="kmeans"></block>
    </category>
    <category name="PREDICTORS" colour="#9D65A6">
      <block type="linear_regression_predictor"></block>
      <block type="logistic_regression_predictor"></block>
      <block type="knn_predictor"></block>
      <block type="naive_bayes_predictor"></block>
      <block type="decision_tree_predictor"></block>
      <block type="neural_network_predictor"></block>
    </category>
    <category name="METRICS" colour="#659AA6">
      <block type="score"></block>
      <block type="accuracy"></block>
      <block type="confusionMatrix"></block>
      <block type="precisionRecall"></block>
      <block type="r2"></block>
  </category>
  <sep></sep>
  <category name="DATA VISUALIZATION" colour="green">
    <block type="lineGraph"></block>
    <block type="pieGraph"></block>
    <block type="barGraph"></block>
    <block type="histogramGraph"></block>
    <block type="boxplotGraph"></block>
    <block type="scatterGraph"></block>
    <block type="tableViewGraph"></block>
    <block type="mapGraph"></block>
    <block type="heatMap"></block>
    <block type="layout"></block>
  </category>
  <category name="STATISTICS" colour="#2E5159">
      <block type="frequency"></block>
      <block type="quartis"></block>
      <block type="correlation"></block>
  </category>
  <category name="DATA ANALYTICS" colour="#596570">
    <block type="read_csv"></block>
    <block type="select"></block>
    <block type="dataframe_dic"></block>
    <block type="headTail"></block>
    <block type="groupby"></block>
    <block type="aggFunc"></block>
    <block type="filter"></block>
    <block type="train_test_split"></block>
    <block type="selector_train_test_split"></block>
  </category>
</xml>`;
