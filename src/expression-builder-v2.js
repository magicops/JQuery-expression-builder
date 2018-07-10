//Author: Majid Akbari
/// <reference path="jquery.d.ts" />
function expressionBuilder2(selector, options) {
    if (!selector)
        throw new Error("The selector is undefined. It should be a string selctor or a JQuery DOM element.");
    if (!options)
        options = {};
    //up or dopwn
    if (!options.suggestions)
        options.suggestions = 'down';
    if (!options.expression)
        options.expression = '';
    var expressionInput = typeof selector == "string" ? $(selector) : selector, lastText = '', inVariable = false, inString = false, suggestions, notificaiton, isPaste = false, variables, parserOptions;
    //Initial for the first time
    initial();
    function initial() {
        if (!expressionInput || expressionInput.length == 0)
            throw new Error('An error occured while initializing the expression biulder. No input element is found! Check your selector: "' + selector + '"');
        if (!expressionInput.attr('exp-id')) {
            var id = new Date().getTime();
            suggestions = $("<div class='exp-suggestions " + options.suggestions + "' exp-id='" + id + "'></div>");
            notificaiton = $("<div class='exp-notification' data-toogle='tooltip' data-placement='right' exp-id='" + id +
                "'><span class='glyphicon glyphicon-ok ok'></span><span class='glyphicon glyphicon-remove error'></span></div>");
            expressionInput.attr('exp-id', id);
            variables = options.variables || [];
            expressionInput.data('variables', variables);
            options.funcs = options.funcs || [];
            expressionInput.data('funcs', options.funcs);
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
            expressionInput.on('blur', validation);
            $('body').click(hideSuggestions);
            expressionInput.click(function (e) { e.stopPropagation(); });
            //set value
            if (options.expression != '')
                setExpresionToInput(options.expression);
        }
        else {
            var id = expressionInput.attr('exp-id');
            suggestions = $('.exp-container .exp-suggestions[exp-id=' + id + "]");
            notificaiton = $('.exp-container .exp-notification[exp-id=' + id + "]");
            if (!variables)
                variables = expressionInput.data('variables');
            if (!options.funcs)
                options.funcs = expressionInput.data('funcs');
        }
        parserOptions = {
            funcs: options.funcs,
            variables: variables
        };
    }
    function onPaste() {
        isPaste = true;
        setTimeout(function () { isPaste = false; validation(); }, 100);
    }
    function onKeydown(e) {
        //if (!inVariable)
        //  return;
        if (e.key == 'Esc') {
            hideSuggestions();
            return false;
        }
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
        if (1 > 2)
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
        var exp = '', inVariable = false, _inString = false, stringText = '', varId = '';
        for (var i = 0; i < expression.length; i++) {
            var input = expression[i];
            //check string input
            if (input == '"' && !_inString) {
                _inString = true;
                continue;
            }
            if (input == '"' && _inString) {
                exp += '"' + stringText + '"';
                stringText = '';
                _inString = false;
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
                if (varName)
                    exp += "[" + varName + "]";
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
        for (var i = 0; i < variables.length; i++)
            if (variables[i].variableId == varId)
                return variables[i].name;
        return undefined;
    }
    function getVariable(varName) {
        for (var j = 0; j < variables.length; j++)
            if (variables[j].name == varName)
                return variables[j];
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
            return true;
        }
        console.warn("exp.js validation: " + v);
        notificaiton.parent().addClass('invalid').removeClass('valid');
        notificaiton.attr('title', v);
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
        for (var l = 0; l < variables.length; l++) {
            if (variables[l].name.toLowerCase().indexOf(varName.toLowerCase()) > -1)
                items.push({ id: variables[l].variableId, text: variables[l].name });
        }
        var funcCount = 1;
        var _loop_1 = function (f) {
            if (f.toString().toLowerCase().indexOf(varName.toLowerCase()) > -1) {
                var args_1 = '';
                //read the function signature
                options.funcs[f].toString().replace(/(function\s*[(](?:\\[\s\S]|[^)])*[)])/, function (text, func) {
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
        for (var f in options.funcs) {
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
            //return parseInput().expression;
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
            variables = vars || [];
        }
    };
}
//# sourceMappingURL=expression-builder-v2.js.map