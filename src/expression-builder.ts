//Author: Majid Akbari

/// <reference path="jquery.d.ts" />

interface HTMLElement {
    selectionStart: any,
    setSelectionRange: any;
}

function expressionBuilder(selector: string | JQuery, options?: any) {
    
    if (!selector)
        throw new Error("The selector is undefined. It should be a string selctor or a JQuery DOM element.")

    if (!options)
        options = {};

    //up or dopwn
    if (!options.suggestions)
        options.suggestions = 'down';

    if (!options.expression)
        options.expression = '';

    let expressionInput = typeof selector == "string" ? $(selector) : selector,
        lastText = '',
        inVariable = false,
        inString = false,
        suggestions,
        notificaiton,
        isPaste = false,
        variables;

    //Initial for the first time
    initial();

    function initial() {
        if (!expressionInput || expressionInput.length == 0)
            throw new Error('An error occured while initializing the expression biulder. No input element is found! Check your selector: "' + selector + '"');

        if (!expressionInput.attr('exp-id')) {

            let id = new Date().getTime();
            suggestions = $("<div class='exp-suggestions " + options.suggestions + "' exp-id='" + id + "'></div>");
            notificaiton = $("<div class='exp-notification' data-toogle='tooltip' data-placement='right' exp-id='" + id +
                "'><span class='glyphicon glyphicon-ok ok'></span><span class='glyphicon glyphicon-remove error'></span></div>");

            expressionInput.attr('exp-id', id);

            variables = options.variables || [];
            expressionInput.data('variables', variables);

            let parent = $("<div class='exp-container' exp-id='" + id + "'></div>");

            expressionInput.parent().append(parent);

            parent
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
            let id = expressionInput.attr('exp-id');
            suggestions = $('.exp-container .exp-suggestions[exp-id=' + id + "]");
            notificaiton = $('.exp-container .exp-notification[exp-id=' + id + "]");
            if (!variables)
                variables = expressionInput.data('variables');
        }
    }

    function onPaste() {
        isPaste = true;
        setTimeout(function () { isPaste = false; validation(); }, 100);
    }

    function onKeydown(e) {

        if (!inVariable)
            return;

        if (['Up', 'Down', 'ArrowUp', 'ArrowDown'].indexOf(e.key) > -1) {
            let index = parseInt(suggestions.attr('data-index')),
                divs = suggestions.find('div.exp-suggestion-item'),
                isUp = e.key == 'Up' || e.key == 'ArrowUp';

            if (divs.length == 0)
                return;

            if (isUp && index == 0 || !isUp && divs.size() == index + 1)
                return;

            index = isUp ? index - 1 : index + 1;

            suggestions.attr('data-index', index);
            divs.removeClass('selected');

            //set scroll
            let height = suggestions.height(),
                divItem = $(divs.get(index)),
                itemHeight = divItem.height(),
                itemTop = divItem.position().top,
                itemBottom = itemTop + itemHeight,
                scrollTop = suggestions.scrollTop(),
                scrollBottom = height + scrollTop;

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
        function returnAcceptedInput() {
            lastText = val;
            validation();
        }

        //if the expression is ready to accpet new entry (variable, date or string)
        function acceptNewEntry() {
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

        let txt = expressionInput,
            val = txt.val().toString(),
            cursor: number = $(this).get(0).selectionStart,
            lastChar = "",
            input = lastText.length > val.length ? '\b' : val[cursor - 1],
            hasSpace = false,
            _inVariable = false,
            _inString = false;

        if (isPaste) {
            isPaste = false;
            return returnAcceptedInput();
        }

        if (input == "\b")
            lastChar = lastText[cursor];
        else {
            let lastCharLocation = cursor - 2;
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

            return returnAcceptedInput();
        }

        if (isInvalidCharacter(input))
            return setLastText(cursor);

        if (input == '"') {
            if (!acceptNewEntry())
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
                return returnAcceptedInput();
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

        if (!inVariable && isVariableCharacter(input))
            return setLastText(cursor);

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
                let ch = lastText[i];

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

        returnAcceptedInput();
    }

    function setExpresionToInput(expression: string) {
        let exp = parseExpression(expression);

        lastText = exp;
        expressionInput.val(exp);
        validation();
    }

    function parseExpression(expression: string) {
        let exp = '',
            inVariable = false,
            _inString = false,
            stringText = '',
            varId = '';

        for (var i = 0; i < expression.length; i++) {
            let input = expression[i];

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
                let varName = getVariableById(parseInt(varId));

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

    function getVariableById(varId: number) {
        for (var i = 0; i < variables.length; i++)
            if (variables[i].variableId == varId)
                return variables[i].name;

        return undefined;
    }

    function getVariable(varName: string) {
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
        return ['~', '!', '@', '#', '$', '%', '^', '&', '=', '{', '}', '<', '>', '|', '\\', '`', '\'', ';', ':'].indexOf(char) >= 0
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

    function parseInput() {
        let text = expressionInput.val().toString(),
            formula = '',
            expression = '',
            inVariable = false,
            _inString = false,
            varName = '',
            varNames = [],
            stringText = '',
            strings = [];

        for (var i = 0; i < text.length; i++) {
            let input = text[i];

            //check string input
            if (input == '"' && !_inString) {
                _inString = true;
                continue;
            }

            if (input == '"' && _inString) {
                strings.push(stringText);

                formula += '"A"';
                expression += '"' + stringText + '"';

                stringText = '';
                _inString = false;
                continue;
            }

            if (_inString) {
                stringText += input;
                continue;
            }
            //end of check string input

            if (isOperator(input) || ['(', ')'].indexOf(input) > -1) {
                formula += input;
                expression += input;
                continue;
            }

            if (input == '[') {
                inVariable = true;
                continue;
            }

            if (input == ']' && inVariable) {
                varNames.push(varName);

                let variable = getVariable(varName);
                expression += variable ? "[" + variable.variableId + "]" : "[0]";
                formula += 9;

                varName = '';
                inVariable = false;
                continue;
            }

            if (inVariable) {
                varName += input;
                continue;
            }

            formula += input;
            expression += input;
        }

        let x = {
            formula: formula,
            expression: expression,
            variables: varNames,
            strings: strings
        };

        //console.log(x)

        return x;
    }

    function validation() {
        let result = parseInput();
        
        try {
            if (result.expression == '')
                throw new Error("expression is empty!");

            for (var i = 0; i < result.variables.length; i++)
                if (!getVariable(result.variables[i]))
                    throw new Error(result.variables[i] + " does not exists!");

            eval(result.formula);

            notificaiton.parent().removeClass('invalid').addClass('valid');
            notificaiton.removeAttr('title');
        } catch (ex) {
            console.warn("exp.js validation: " + ex.message);
            notificaiton.parent().addClass('invalid').removeClass('valid');
            notificaiton.attr('title', ex.message);
            return false;
        }

        return true;
    }

    function setCursorPosition(position: number) {
        expressionInput.get(0).setSelectionRange(position, position);
    }

    //Suggestions
    function hideSuggestions() {
        suggestions.empty().hide();
    }

    function showSuggestions(val, cursor) {
        let varName = '',
            startIndex = 0;

        for (var i = cursor - 1; i > 0; i--) {
            if (val[i] == '[') {
                startIndex = i;
                break;
            }

            varName = val[i] + varName;
        }

        let optionsHTML = '',
            isFirstItem = true;

        for (var i = 0; i < variables.length; i++) {
            if (variables[i].name.toLowerCase().indexOf(varName.toLowerCase()) > -1) {
                optionsHTML += "<div class='exp-suggestion-item " + (isFirstItem ? "selected" : "") +
                    "' data-start='" + startIndex +
                    "' data-current='" + cursor +
                    "' data-id='" + variables[i].variableId + "'>" + variables[i].name + "</div>";

                isFirstItem = false;
            }
        }

        if (optionsHTML != '')
            suggestions.attr('data-index', 0).html(optionsHTML).slideDown();
        else
            hideSuggestions();
    }

    function selectVariable(div) {
        let text = expressionInput.val().toString(),
            start = parseInt($(div).attr('data-start')) + 1,
            current: number = parseInt($(div).attr('data-current')),
            tail = text.substr(current);

        if (tail != '') {
            let _tail = tail,
                variableIsDone = false;

            tail = '';

            for (var i = 0; i < _tail.length; i++) {
                if (_tail[i] == ']') {
                    variableIsDone = true;
                    continue;
                }

                if (variableIsDone)
                    tail += _tail[i];
            }
        }

        text = text.substr(0, start) + $(div).text() + "] " + tail.trim();

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
            return parseInput().expression;
        },

        setExpression: function (expression: string) {
            setExpresionToInput(expression);
        },

        isValid: function () {
            return validation();
        },

        parseExpression: function (expression: string) {
            return parseExpression(expression);
        },

        getInput: function () {
            return expressionInput.val();
        },

        getVariableById: function (variableId: number) {
            return getVariableById(variableId);
        },

        setVariables: function (vars) {
            variables = vars || [];
        }
    };
}