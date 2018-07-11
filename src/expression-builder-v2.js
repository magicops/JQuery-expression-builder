//Author: Majid Akbari
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
/// <reference path="jquery.d.ts" />
jQuery.fn.extend({
    expressionBuilder: function (options) {
        var parser = function (expression, options) {
            var defaults = {
                funcs: {},
                variables: []
            };
            options = $.extend({}, defaults, options);
            //abstract base-class
            var GraphNode = /** @class */ (function () {
                function GraphNode() {
                }
                return GraphNode;
            }());
            //leaf-nodes
            var ValueNode = /** @class */ (function (_super) {
                __extends(ValueNode, _super);
                function ValueNode(value) {
                    var _this = _super.call(this) || this;
                    _this.value = value;
                    return _this;
                }
                ValueNode.prototype.getNumberValue = function () {
                    return parseInt(this.value.toString());
                };
                ValueNode.prototype.getStringValue = function () {
                    return this.value.toString();
                };
                ValueNode.prototype.getArrayValue = function () {
                    return this.value;
                };
                ValueNode.prototype.compute = function () { return this.value; };
                ValueNode.prototype.toString = function (parseVariables) {
                    if (parseVariables === void 0) { parseVariables = false; }
                    if (this.value instanceof Array)
                        return this.value
                            .filter(function (v) { return !(v instanceof CommaNode); })
                            .map(function (v) { return v.toString(true); })
                            .join(",");
                    if (typeof this.value === 'string')
                        return "\"" + this.value + "\"";
                    return this.value.toString();
                };
                return ValueNode;
            }(GraphNode));
            var CommaNode = /** @class */ (function (_super) {
                __extends(CommaNode, _super);
                function CommaNode() {
                    return _super !== null && _super.apply(this, arguments) || this;
                }
                CommaNode.prototype.compute = function () {
                    return ",";
                };
                CommaNode.prototype.toString = function (parseVariables) {
                    return ",";
                };
                return CommaNode;
            }(GraphNode));
            var PropertyNode = /** @class */ (function (_super) {
                __extends(PropertyNode, _super);
                function PropertyNode(property, inBrackets) {
                    if (inBrackets === void 0) { inBrackets = false; }
                    var _this = _super.call(this) || this;
                    _this.property = property;
                    _this.inBrackets = inBrackets;
                    return _this;
                }
                PropertyNode.prototype.compute = function () {
                    var variable;
                    for (var i = 0; i < options.variables.length; i++) {
                        var v = options.variables[i];
                        if (v.name == this.property) {
                            variable = v;
                            break;
                        }
                    }
                    if (variable === undefined) {
                        throw new Error("Property '" + this.property + "' is not defined!");
                        //let x = prompt("Enter a value for " + this.property),
                        //  y: any;
                        //if (!isNaN(parseInt(x)))
                        //  y = parseInt(x);
                        //ctx[this.property] = y;
                    }
                    return variable.value || variable.variableId;
                };
                PropertyNode.prototype.toString = function (parseVariables) {
                    if (parseVariables === void 0) { parseVariables = false; }
                    if (parseVariables)
                        for (var i = 0; i < options.variables.length; i++) {
                            var v = options.variables[i];
                            if (v.name == this.property)
                                return "[" + v.variableId + "]";
                        }
                    return String(this.property);
                };
                return PropertyNode;
            }(GraphNode));
            //tree-nodes
            var FuncNode = /** @class */ (function (_super) {
                __extends(FuncNode, _super);
                function FuncNode(name, node) {
                    var _this = this;
                    if (!(node instanceof GraphNode)) {
                        throw new Error("invalid node passed");
                    }
                    _this = _super.call(this) || this;
                    _this.name = name;
                    _this.node = node;
                    return _this;
                }
                FuncNode.prototype.compute = function () {
                    var v = this.node.compute();
                    var vars = v instanceof Array ? v : [v];
                    var computes = vars
                        .filter(function (v) { return v != ","; }) //remove ,
                        .map(function (v) { return v instanceof GraphNode ? v.compute() : v; }); //compute each one
                    var func = options.funcs[this.name];
                    return func.apply(func, computes);
                };
                FuncNode.prototype.toString = function (parseVariables) {
                    if (parseVariables === void 0) { parseVariables = false; }
                    return this.name + "(" + this.node.toString(parseVariables) + ")";
                };
                return FuncNode;
            }(GraphNode));
            var BinaryNode = /** @class */ (function (_super) {
                __extends(BinaryNode, _super);
                function BinaryNode(op, left, right) {
                    var _this = this;
                    if (!(left instanceof GraphNode && right instanceof GraphNode)) {
                        throw new Error("invalid node passed");
                    }
                    _this = _super.call(this) || this;
                    _this.op = op;
                    _this.left = left;
                    _this.right = right;
                    return _this;
                }
                BinaryNode.prototype.compute = function () {
                    var l = this.left.compute();
                    var r = this.right.compute();
                    switch (this.op) {
                        //computational operators
                        case "+": return l + r;
                        case "-": return l - r;
                        case "*": return l * r;
                        case "/": return l / r;
                    }
                    throw new Error("operator not implemented '" + this.op + "'");
                };
                BinaryNode.prototype.toString = function (parseVariables) {
                    if (parseVariables === void 0) { parseVariables = false; }
                    return this.left.toString(parseVariables) + this.op + this.right.toString(parseVariables);
                };
                BinaryNode.operators = ["*", "/", "+", "-"];
                return BinaryNode;
            }(GraphNode));
            function parse(str) {
                function extractTokens(exp) {
                    //dynamically build my parsing regex:
                    var tokenParser = new RegExp([
                        //properties
                        /\[[a-zA-Z0-9$_]*\]+/.source,
                        //numbers
                        /\d+(?:\.\d*)?|\.\d+/.source,
                        //string-literal
                        /["](?:\\[\s\S]|[^"])+["]|['](?:\\[\s\S]|[^'])+[']/.source,
                        //booleans
                        //"true|false",
                        //operators
                        ["(", ")"].concat(BinaryNode.operators)
                            .map(function (str) { return String(str).replace(/[.*+?^=!:${}()|[\]\/\\]/g, '\\$&'); })
                            .join("|"),
                        //properties
                        //has to be after the operators
                        /[a-zA-Z$_][a-zA-Z0-9$_]*/.source,
                        //remaining (non-whitespace-)chars, just in case
                        //has to be at the end
                        /\S/.source
                    ].map(function (s) { return "(" + s + ")"; }).join("|"), "g");
                    var _tokens = [];
                    //abusing str.replace() as a RegExp.forEach
                    exp.replace(tokenParser, function (token, prop, number, str, op, property) {
                        var t;
                        t = token;
                        if (number)
                            t = new ValueNode(+number);
                        else if (str) {
                            str = str.substr(1, str.length - 2);
                            str = str.replace(/"/g, '\'');
                            t = new ValueNode(JSON.parse('"' + str + '"'));
                        }
                        else if (property)
                            t = new PropertyNode(property);
                        else if (prop)
                            t = new PropertyNode(prop.substring(1, prop.length - 1), true);
                        else if (token == ',')
                            t = new CommaNode();
                        else if (!op)
                            throw new Error("unexpected token '" + token + "'");
                        _tokens.push(t);
                        return "";
                    });
                    return _tokens;
                }
                function handleNegativenumbers(tokens) {
                    //detect negative numbers
                    if (tokens[0] == "-" && tokens[1] instanceof ValueNode) {
                        tokens[1].value = -1 * tokens[1].getNumberValue();
                        tokens.splice(0, 1);
                    }
                    for (var i = 0; i < tokens.length; i++) {
                        if (['(', ',', '/', '*'].indexOf(tokens[i]) > -1 && tokens[i + 1] == "-" && tokens[i + 2] instanceof ValueNode) {
                            tokens[i + 2].value = tokens[i + 2].getNumberValue() * -1;
                            tokens.splice(i + 1, 1);
                        }
                    }
                    //end detect negative numbers
                    return tokens;
                }
                function wrapParenteses(tokens) {
                    function process(tokens) {
                        BinaryNode.operators.forEach(function (token) {
                            for (var i = 1; (i = tokens.indexOf(token, i - 1)) > -1;) {
                                tokens.splice(i - 1, 3, new BinaryNode(token, tokens[i - 1], tokens[i + 1]));
                            }
                        });
                        var hasComma = false;
                        for (var j = 0; j < tokens.length; j++) {
                            if (tokens[j] instanceof CommaNode) {
                                hasComma = true;
                                break;
                            }
                        }
                        if (hasComma) {
                            var commaCount = tokens.filter(function (t) { return t == ","; }).length, argCount = commaCount * 2 + 1;
                            if (tokens.length != argCount)
                                throw new Error("Syntax error for the arguments: " + tokens.filter(function (t) { return !(t instanceof CommaNode); }).join(","));
                            tokens = [new ValueNode(tokens)];
                        }
                        if (tokens.length !== 1) {
                            console.log("error: ", tokens.slice());
                            throw new Error("something went wrong");
                        }
                        return tokens[0];
                    }
                    //wrap inside any parentheses
                    for (var i, j; (i = tokens.lastIndexOf("(")) > -1 && (j = tokens.indexOf(")", i)) > -1;) {
                        //if before parentheses there is a property which means it is a function
                        if (tokens[i - 1] instanceof PropertyNode && !tokens[i - 1].inBrackets) {
                            var op = tokens[i - 1].toString();
                            var funcParam = i + 1 == j ? new ValueNode([]) : process(tokens.slice(i + 1, j));
                            var varsLength = 1;
                            if (funcParam instanceof ValueNode && funcParam.value instanceof Array)
                                varsLength = funcParam.value.filter(function (v) { return !(v instanceof CommaNode); }).length; //remove            
                            var func = options.funcs[op];
                            if (!func) {
                                throw new Error(op + " is not defined.");
                            }
                            if (varsLength != func.length)
                                throw new Error(op + " requires " + func.length + " argument(s)");
                            var funcNode = new FuncNode(op, funcParam);
                            tokens.splice(i - 1, j + 2 - i, funcNode);
                        }
                        else
                            tokens.splice(i, j + 1 - i, process(tokens.slice(i + 1, j)));
                    }
                    if (~tokens.indexOf("(") || ~tokens.indexOf(")")) {
                        throw new Error("mismatching brackets");
                    }
                    return process(tokens);
                }
                var expTokens = extractTokens(str);
                expTokens = handleNegativenumbers(expTokens);
                return wrapParenteses(expTokens);
            }
            return {
                getExpressionTree: function () {
                    try {
                        return parse(expression);
                    }
                    catch (e) {
                        return undefined;
                    }
                },
                runExpressionTree: function () {
                    try {
                        var tree = parse(expression);
                        return tree.compute();
                    }
                    catch (e) {
                        return undefined;
                    }
                },
                validate: function () {
                    var result = "";
                    try {
                        parse(expression).compute();
                    }
                    catch (e) {
                        result = e.message;
                    }
                    return result;
                }
            };
        };
        if (!options)
            options = {};
        if (!options.suggestions)
            options.suggestions = 'down';
        if (!options.expression)
            options.expression = '';
        if (options.preventWrongInput === undefined)
            options.preventWrongInput = false;
        var expressionInput = this, lastText = '', inVariable = false, inString = false, suggestions, notificaiton, isPaste = false, parserOptions = {
            funcs: {},
            variables: []
        };
        //Initial for the first time
        initial();
        //set value
        if (options.expression != '')
            setExpresionToInput(options.expression);
        function initial() {
            if (!expressionInput.attr('exp-id')) {
                var id = new Date().getTime();
                suggestions = $("<div class='exp-suggestions " + options.suggestions + "' exp-id='" + id + "'></div>");
                notificaiton = $("<div class='exp-notification' data-toogle='tooltip' data-placement='top' exp-id='" + id +
                    "'><span class='glyphicon glyphicon-ok ok'></span><span class='glyphicon glyphicon-remove error'></span></div>");
                expressionInput.attr('exp-id', id);
                options.variables = options.variables || [];
                expressionInput.data('variables', options.variables);
                options.functions = options.functions || [];
                expressionInput.data('funcs', options.functions);
                var parent_1 = $("<div class='exp-container' exp-id='" + id + "'></div>");
                expressionInput.parent().append(parent_1);
                parent_1
                    .append(expressionInput)
                    .append(suggestions)
                    .append(notificaiton);
                expressionInput.on('input', onInput);
                expressionInput.keydown(onKeydown);
                expressionInput.on('paste', onPaste);
                suggestions.on('click', '.exp-suggestion-item', function (e) {
                    selectVariable($(this));
                    e.stopPropagation();
                });
                //expressionInput.on('blur', validation);
                $('body').click(hideSuggestions);
                expressionInput.click(function (e) { e.stopPropagation(); });
            }
            else {
                var id = expressionInput.attr('exp-id');
                suggestions = $('.exp-container .exp-suggestions[exp-id=' + id + "]");
                notificaiton = $('.exp-container .exp-notification[exp-id=' + id + "]");
                if (!options.variables)
                    options.variables = expressionInput.data('variables');
                if (!options.functions)
                    options.functions = expressionInput.data('funcs');
            }
            parserOptions = {
                funcs: options.functions,
                variables: options.variables
            };
        }
        function onPaste() {
            isPaste = true;
            setTimeout(function () { isPaste = false; validation(); }, 100);
        }
        function onKeydown(e) {
            if (e.key == 'Esc') {
                hideSuggestions();
                return false;
            }
            if (options.preventWrongInput && !inVariable)
                return;
            if (['Up', 'Down', 'ArrowUp', 'ArrowDown'].indexOf(e.key) > -1) {
                var index = parseInt(suggestions.attr('data-index')), divs = suggestions.find('div.exp-suggestion-item'), isUp = e.key == 'Up' || e.key == 'ArrowUp';
                if (divs.length == 0)
                    return;
                if (isUp && index == 0 || !isUp && divs.size() == index + 1)
                    return;
                index = isUp ? index - 1 : index + 1;
                suggestions.attr('data-index', index);
                divs.removeClass('selected');
                //set scroll
                var height = suggestions.height(), divItem = $(divs.get(index)), itemHeight = divItem.height(), itemTop = divItem.position().top, itemBottom = itemTop + itemHeight, scrollTop = suggestions.scrollTop(), scrollBottom = height + scrollTop;
                divItem.addClass('selected');
                if (itemTop < scrollTop)
                    suggestions.scrollTop(itemTop);
                if (itemBottom > scrollBottom)
                    suggestions.scrollTop(itemTop - height + itemHeight + 5);
                return;
            }
            if (e.key == "Enter") {
                selectVariable(suggestions.find('.exp-suggestion-item.selected'));
                return;
            }
            //Ignore
            //if (['Left', 'Right', 'Up', 'Down', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Control', 'Shift', 'Alt', 'Esc', 'End', 'Home', "Enter"].indexOf(e.key) > -1)
            //    return;
        }
        function onInput() {
            //accept the input character and validate the expression
            function returnAcceptedInput(val) {
                lastText = val;
                validation();
            }
            //if the expression is ready to accpet new entry (variable, date or string)
            function acceptNewEntry(lastChar) {
                if (lastText == '')
                    return true;
                if (inVariable || inString)
                    return false;
                return isOperator(lastChar) || lastChar == '(';
            }
            function setLastText(cur) {
                expressionInput.addClass('in-valid-char');
                expressionInput.val(lastText);
                setCursorPosition(--cur);
                setTimeout(function () { expressionInput.removeClass('in-valid-char'); }, 100);
            }
            function forceCharInput(val, cursor, input) {
                var lastChar = "", hasSpace = false, _inVariable = false, _inString = false;
                if (isPaste) {
                    isPaste = false;
                    return returnAcceptedInput(val);
                }
                if (input == "\b")
                    lastChar = lastText[cursor];
                else {
                    var lastCharLocation = cursor - 2;
                    lastChar = val[lastCharLocation] || "";
                    hasSpace = lastChar == ' ';
                    while (lastChar == ' ') {
                        lastChar = val[--lastCharLocation] || "";
                    }
                }
                //changes in the middle
                for (var i = 0; i < cursor - 1; i++) {
                    if (!_inString && val[i] == '"') {
                        _inString = true;
                        continue;
                    }
                    if (_inString) {
                        if (val[i] == '"')
                            _inString = false;
                        continue;
                    }
                    if (!_inString && val[i] == '[') {
                        _inVariable = true;
                        continue;
                    }
                    if (!_inString && val[i] == ']') {
                        _inVariable = false;
                        continue;
                    }
                }
                inString = _inString;
                inVariable = _inVariable;
                //console.log({ input: input, cursor: cursor, lastChar: lastChar, hasSpace: hasSpace });
                if (inString) {
                    if (input == '"')
                        inString = false;
                    return returnAcceptedInput(val);
                }
                if (isInvalidCharacter(input))
                    return setLastText(cursor);
                if (input == '"') {
                    if (!acceptNewEntry(lastChar))
                        return setLastText(cursor);
                    inString = true;
                }
                //Prevent multiple spaces
                if (input == ' ' && hasSpace)
                    return setLastText(cursor);
                if (input == '-') {
                    //handle negative numbers 
                    if (lastText == '' ||
                        ['(', '*', '/'].indexOf(lastChar) > -1) {
                        return returnAcceptedInput(val);
                    }
                }
                if (isOperator(input)) {
                    if (lastText == '' ||
                        isOperator(lastChar) ||
                        ['[', '('].indexOf(lastChar) > -1)
                        return setLastText(cursor);
                }
                if (input == ")")
                    if (isOperator(lastChar) || lastText == '' || lastChar == "[")
                        return setLastText(cursor);
                if (input == "(" && lastText != '')
                    if (!isOperator(lastChar) && lastChar != "(" && lastChar != '')
                        return setLastText(cursor);
                if (input == "[") {
                    if (lastText != '') {
                        if ([']', '[', ')'].indexOf(lastChar) > -1)
                            return setLastText(cursor);
                        if (!isOperator(lastChar) && lastChar != '(' && lastChar != '')
                            return setLastText(cursor);
                    }
                    inVariable = true;
                    showSuggestions(val, cursor);
                }
                if (input == "]") {
                    if (lastText == '' || isOperator(lastChar) || [']', '[', ')', '('].indexOf(lastChar) > -1)
                        return setLastText(cursor);
                    if (!inVariable)
                        return setLastText(cursor);
                    inVariable = false;
                    hideSuggestions();
                }
                if (isVariableCharacter(input)) {
                    if (lastText != '' &&
                        !isOperator(lastChar) &&
                        ['(', '['].indexOf(lastChar) == -1 &&
                        !isVariableCharacter(lastChar))
                        return setLastText(cursor);
                    if (lastText != '' &&
                        isVariableCharacter(lastChar) &&
                        hasSpace)
                        return setLastText(cursor);
                    inVariable = true;
                    showSuggestions(val, cursor);
                    return returnAcceptedInput(val);
                }
                //if (!inVariable && isVariableCharacter(input))
                //  return setLastText(cursor);
                if (input == '\b' && lastChar == '[') {
                    inVariable = false;
                    hideSuggestions();
                }
                if (input == '\b' && lastChar == ']') {
                    inVariable = true;
                    showSuggestions(val, cursor);
                }
                if (input == '.') {
                    if (!isNumber(lastChar))
                        return setLastText(cursor);
                    //avoid multiple '.' in numbers
                    for (var i = cursor - 2; i >= 0; i--) {
                        var ch = lastText[i];
                        if (isNumber(ch))
                            continue;
                        if (ch == '.')
                            return setLastText(cursor);
                        break;
                    }
                }
                if (isNumber(input) && lastText != '') {
                    if (isNumber(lastChar) && hasSpace)
                        return setLastText(cursor);
                    if (!inVariable && !isOperator(lastChar) && !isNumber(lastChar) && lastChar != '(' && lastChar != '' && lastChar != '.')
                        return setLastText(cursor);
                }
                if (inVariable && (isVariableCharacter(input) || isNumber(input) || input == '\b')) {
                    showSuggestions(val, cursor);
                }
                returnAcceptedInput(val);
            }
            var text = expressionInput.val().toString(), textCursor = $(this).get(0).selectionStart, lastInput = lastText.length > text.length ? '\b' : text[textCursor - 1];
            if (options.preventWrongInput)
                forceCharInput(text, textCursor, lastInput);
            else {
                if (isVariableCharacter(lastInput)) {
                    showSuggestions(text, textCursor);
                }
                lastText = text;
                validation();
            }
        }
        function setExpresionToInput(expression) {
            var exp = parseExpression(expression);
            lastText = exp;
            expressionInput.val(exp);
            validation();
        }
        function parseExpression(expression) {
            var exp = '', inVariable = false, _inString = false, stringText = '', varId = '', quote;
            for (var i = 0; i < expression.length; i++) {
                var input = expression[i];
                //check string input
                if (['"', '\''].indexOf(input) > -1 && !_inString) {
                    quote = input;
                    _inString = true;
                    continue;
                }
                if (input == quote && _inString) {
                    exp += quote + stringText + quote;
                    stringText = '';
                    _inString = false;
                    quote = undefined;
                    continue;
                }
                if (_inString) {
                    stringText += input;
                    continue;
                }
                //end of check string input
                if (input == '[') {
                    inVariable = true;
                    varId = '';
                    continue;
                }
                if (input == ']' && inVariable) {
                    var varName = getVariableById(parseInt(varId));
                    if (varName) {
                        if (isNumber(varName[0]))
                            exp += "[" + varName + "]";
                        else
                            exp += varName;
                    }
                    else
                        exp += "[var" + varId + "]";
                    inVariable = false;
                    continue;
                }
                if (inVariable) {
                    varId += input;
                    continue;
                }
                exp += input;
            }
            return exp;
        }
        function getVariableById(varId) {
            for (var i = 0; i < options.variables.length; i++)
                if (options.variables[i].variableId == varId)
                    return options.variables[i].name;
            return undefined;
        }
        function getVariable(varName) {
            for (var j = 0; j < options.variables.length; j++)
                if (options.variables[j].name == varName)
                    return options.variables[j];
            return undefined;
        }
        //validations
        function isOperator(char) {
            return ['-', '+', '*', '/'].indexOf(char) >= 0;
        }
        function isInvalidCharacter(char) {
            return ['~', '!', '@', '#', '$', '%', '^', '&', '=', '{', '}', '<', '>', '|', '\\', '`', '\'', ';', ':'].indexOf(char) >= 0;
        }
        function isVariableCharacter(char) {
            if (char == '_')
                return true;
            if (char >= 'a' && char <= 'z' || char >= 'A' && char <= 'Z')
                return true;
            return false;
        }
        function isNumber(char) {
            return char >= '0' && char <= '9';
        }
        function validation() {
            var text = expressionInput.val().toString();
            var v = parser(text, parserOptions).validate();
            if (v == '') {
                notificaiton.parent().removeClass('invalid').addClass('valid');
                notificaiton.removeAttr('title');
                notificaiton.tooltip('destroy');
                return true;
            }
            //console.warn("exp.js validation: " + v);
            notificaiton.parent().addClass('invalid').removeClass('valid');
            notificaiton.attr('title', v);
            notificaiton.tooltip('fixTitle');
            return false;
        }
        function setCursorPosition(position) {
            expressionInput.get(0).setSelectionRange(position, position);
        }
        //Suggestions
        function hideSuggestions() {
            suggestions.empty().hide();
        }
        function showSuggestions(val, cursor) {
            var varName = '', startIndex = 0;
            for (var j = cursor; j > 0; j--) {
                var ch = val[j - 1];
                if (['[', '(', ' ', ')', ']', ','].indexOf(ch) > -1 ||
                    isOperator(ch)) {
                    startIndex = j;
                    break;
                }
                varName = ch + varName;
            }
            var optionsHTML = '', isFirstItem = true, items = [];
            for (var l = 0; l < options.variables.length; l++) {
                if (options.variables[l].name.toLowerCase().indexOf(varName.toLowerCase()) > -1)
                    items.push({ id: options.variables[l].variableId, text: options.variables[l].name });
            }
            var funcCount = 1;
            var _loop_1 = function (f) {
                if (f.toString().toLowerCase().indexOf(varName.toLowerCase()) > -1) {
                    var args_1 = '';
                    //read the function signature
                    options.functions[f].toString().replace(/(function\s*[(](?:\\[\s\S]|[^)])*[)])/, function (text, func) {
                        if (args_1 != '')
                            return;
                        if (func)
                            args_1 = func.replace('function ', f);
                    });
                    //for (var k = 0; k < options.funcs[f].length; k++) {
                    //  args += "a" + (k + 1) + (k == options.funcs[f].length - 1 ? "" : ",");
                    //}
                    items.push({ id: f + funcCount++, text: args_1 });
                    //items.push({ id: f + funcCount++, text: `${f}(${args})` });
                }
            };
            for (var f in options.functions) {
                _loop_1(f);
            }
            for (var i = 0; i < items.length; i++) {
                optionsHTML += "<div class='exp-suggestion-item " + (isFirstItem ? "selected" : "") +
                    "' data-start='" + startIndex +
                    "' data-current='" + cursor +
                    "' data-id='" + items[i].id + "'>" + items[i].text + "</div>";
                isFirstItem = false;
            }
            if (optionsHTML != '')
                suggestions.attr('data-index', 0).html(optionsHTML).slideDown();
            else
                hideSuggestions();
        }
        function selectVariable(div) {
            var text = expressionInput.val().toString(), start = parseInt($(div).attr('data-start')), current = parseInt($(div).attr('data-current')), tail = text.substr(current);
            //if (tail != '') {
            //  let _tail = tail,
            //    variableIsDone = false;
            //  tail = '';
            //  for (var i = 0; i < _tail.length; i++) {
            //    if (_tail[i] == ']') {
            //      variableIsDone = true;
            //      continue;
            //    }
            //    if (variableIsDone)
            //      tail += _tail[i];
            //  }
            //}
            var selectedText = $(div).text();
            if (isNumber(selectedText[0])) {
                if (text[start - 1] != '[')
                    text = text.substr(0, start) + "[" + selectedText + "]" + tail.trim();
                else
                    text = text.substr(0, start) + selectedText + "]" + tail.trim();
            }
            else {
                if (text[start - 1] != '[')
                    text = text.substr(0, start) + selectedText + tail.trim();
                else
                    text = text.substr(0, start - 1) + selectedText + tail.trim();
            }
            expressionInput.val(text);
            lastText = text;
            inVariable = false;
            hideSuggestions();
            for (var i = current; i < text.length; i++)
                if (text[i] == "]") {
                    setCursorPosition(i + 2);
                    break;
                }
            validation();
        }
        return {
            getExpression: function () {
                var p = parser(expressionInput.val(), parserOptions);
                var tree = p.getExpressionTree();
                if (tree === undefined)
                    return undefined;
                return tree.toString(true);
            },
            setExpression: function (expression) {
                setExpresionToInput(expression);
            },
            isValid: function () {
                return validation();
            },
            parseExpression: function (expression) {
                return parseExpression(expression);
            },
            getInput: function () {
                return expressionInput.val();
            },
            getVariableById: function (variableId) {
                return getVariableById(variableId);
            },
            setVariables: function (vars) {
                options.variables = vars || [];
            },
            runExpression: function () {
                var p = parser(expressionInput.val(), parserOptions);
                if (p.validate() != '')
                    return undefined;
                var tree = p.getExpressionTree();
                if (tree === undefined)
                    return undefined;
                return tree.compute();
            }
        };
    }
});
//# sourceMappingURL=expression-builder-v2.js.map